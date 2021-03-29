import json
import boto3


def lambda_handler(event, context):
    client = boto3.client('lambda')
    for i in range(30):
        payload = {"execution_id": i}
        client.invoke(
            FunctionName='IoTAnalyticsIngest',
            InvocationType='Event',
            Payload=json.dumps(payload)
        )
        print("Trigger executed for {}".format(i))
    print("Master function execution completed!")
    return {
        'statusCode': 200,
        'body': json.dumps('Master function execution completed!')
    }
