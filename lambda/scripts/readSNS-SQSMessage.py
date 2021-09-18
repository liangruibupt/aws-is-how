from __future__ import print_function
import json
print('Loading function')

def readSNS(event):
    message = event['Records'][0]['Sns']['Message']
    print("From SNS: " + json.dumps(message, indent=2))

def readSQS(event):
    for record in event['Records']:
        print("test")
        payload = record["body"]
        print(json.dumps(str(payload), indent=2))

def lambda_handler(event, context):
    print("Received event: " + json.dumps(event, indent=2))
    readSNS(event)
    readSQS(event)
    
    return {
        'statusCode': 200,
        'body': 'Complete read sns and sqs message'
    }
