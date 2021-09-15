import boto3
from decimal import Decimal
import json
import os
from botocore.client import Config
import datetime


config = Config(
        retries = dict(
            max_attempts = 30
        )    
    )
s3 = boto3.resource('s3', config=config)
ddb = boto3.resource('dynamodb', config=config)

rekognition = boto3.client('rekognition', config=config)


def writeToS3(content, bucketName, s3FileName):
    object = s3.Object(bucketName, s3FileName)
    object.put(Body=content)

def saveDDBTable(params):
    
    tableName = params['ddbTable']
    table = ddb.Table(tableName)
    
    #response = table.get_item(Key={'partitionKey': 'user-photo-recognize', 'sortKey': params['objectName']})
    
    now = datetime.datetime.now()
    itemData = {
                'partitionKey': 'user-photo-recognize',
                'sortKey': params['objectName'],
                'eventTime': now.strftime("%Y-%m-%d %H:%M:%S"),
                'URL': params['URL'],
                'faceDetectComplete': False
            }
    ddbResponse = table.put_item(Item=itemData)
    print("saveDDBTable {}".format(ddbResponse))
    return ddbResponse
    
def updateDDBTable(params, ageRange, gender):
    tableName = params['ddbTable']
    table = ddb.Table(tableName)

    response = table.update_item(
        Key={
            'partitionKey': 'user-photo-recognize',
            'sortKey': params['objectName']
        },
        UpdateExpression="set faceDetectComplete=:c, ageRange=:a, gender=:g",
        ExpressionAttributeValues={
            ':c': True,
            ':a': ageRange,
            ':g': gender
        },
        ReturnValues="UPDATED_NEW"
    )
    return response

def callRekognition(bucketName, objectName, apiName):
    print("bucketName {}, objectName {}, apiName {}".format(bucketName, objectName, apiName))
    if(apiName == "labels"):
        response = rekognition.detect_labels(
            Image={
                'S3Object': {
                    'Bucket': bucketName,
                    'Name': objectName
                }
            }
        )
    elif (apiName == "text"):
        response = rekognition.detect_text(
            Image={
                'S3Object': {
                    'Bucket': bucketName,
                    'Name': objectName
                }
            }
        )
    elif (apiName == "faces"):
        response = rekognition.detect_faces(
            Attributes=["ALL"],
            Image={
                'S3Object': {
                    'Bucket': bucketName,
                    'Name': objectName
                }
            }
        )
    elif (apiName == "moderation"):
        response = rekognition.detect_moderation_labels(
            Image={
                'S3Object': {
                    'Bucket': bucketName,
                    'Name': objectName
                }
            }
        )
    elif (apiName == "celebrities"):
        response = rekognition.recognize_celebrities(
            Image={
                'S3Object': {
                    'Bucket': bucketName,
                    'Name': objectName
                }
            }
        )
    else:
        response = rekognition.detect_labels(
            Image={
                'S3Object': {
                    'Bucket': bucketName,
                    'Name': objectName
                }
            }
        )
    return response


def processImage(params):
    
    bucketName = params['bucketName']
    objectName = params['objectName']
    outputBucket = params['outputBucket']
    ddbTable = params['ddbTable']
    objectKey = params["objectKey"]
    apiName = params["apiName"]
    
    response = callRekognition(bucketName, objectKey, apiName)

    print("Generating output for ItemId: {}".format(objectName))
    print(response)
    
    ageRange = response['FaceDetails'][0]['AgeRange']
    gender = response['FaceDetails'][0]['Gender']['Value']

    outputPath = "rek/{}-analysis/".format(objectName)
    opath = "{}response.json".format(outputPath)
    print("save to s3 {}".format(opath))
    writeToS3(json.dumps(response), outputBucket, opath)

    
    print("Save item {} result to DynamoDBTable".format(objectName))
    updateDDBTable(params, ageRange, gender)

# --------------- Main handler ------------------

def processRequest(params):

    output = ""

    print("request: {}".format(params))

    bucketName = params['bucketName']
    objectName = params['objectName']
    objectKey = params["objectKey"]
    
    if(objectKey and bucketName and objectName):
        print("bucketName: {}, objectKey: {}, objectName: {}".format(bucketName, objectKey, objectName))
        
        saveDDBTable(params)
        
        processImage(params)

        output = "Item: {}, Object: {}/{} processed.".format(objectName, bucketName, objectKey)
        print(output)

    return {
        'statusCode': 200,
        'body': output
    }

def lambda_handler(event, context):

    print("event: {}".format(json.dumps(event)))
    message = event['Records'][0]
    objectKey = message['s3']['object']['key']
    bucketName = message['s3']['bucket']['name']
    url_str = "https://{}.s3.amazonaws.com/{}".format(bucketName, objectKey)
    params = {
      'bucketName': bucketName,
      'objectKey': objectKey,
      'objectName': os.path.basename(objectKey),
      'URL': url_str,
      'outputBucket' : os.environ['OUTPUT_BUCKET'], #// Add S3 bucket theme-park-backend-finalbucket-
      'ddbTable': os.environ['DDB_TABLE_NAME'], #//Add DDB table theme-park-backend-DynamoDBTable-
      'apiName': 'faces'
    }

    return processRequest(params)