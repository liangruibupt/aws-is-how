import json
import boto3
import os
import urllib.parse
from botocore.exceptions import ClientError


def test_description(self):
    print("hello")


def lambda_handler(event, context):
    # TODO implement
    #alert = event["alert_name"]
    #db_url = os.env["db_url"]
    print(event)
    s3 = boto3.client("s3")
    bucket = event['Records'][0]['s3']['bucket']['name']
    key = urllib.parse.unquote_plus(
        event['Records'][0]['s3']['object']['key'], encoding='utf-8')
    try:
        # Download
        response = s3.get_object(Bucket=bucket, Key=key)
        print("CONTENT TYPE: " + response['ContentType'])
        # iterator = response['Body'].iter_lines()
        # for line in iterator:
        #     print(line.decode('utf-8'))
        file_content = response['Body'].read().decode('utf-8')
        json_content = json.loads(file_content)
        print(json_content)
        # ETL

        # Upload
        LAMBDA_FILE_NAME = '/tmp/{}'.format('new_file.log')
        S3_BUCKET_NAME = bucket
        S3_KEY_NAME = 'rclone_copy/lambda_test_dest/new_file.log'
        with open(LAMBDA_FILE_NAME, 'w') as outfile:
            json.dump(json_content, outfile)
        print('write done')
        try:
            response = s3.upload_file(
                LAMBDA_FILE_NAME, S3_BUCKET_NAME, S3_KEY_NAME)
        except ClientError as e:
            print(e)
    except Exception as e:
        print(e)
        print('Error getting object {} from bucket {}. Make sure they exist and your bucket is in the same region as this function.'.format(key, bucket))
        raise e
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }
