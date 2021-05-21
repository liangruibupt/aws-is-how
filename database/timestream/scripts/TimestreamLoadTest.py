import json
import boto3
import random

client = boto3.client('lambda')

# Function to get the randomvin
def rand_n(n):
    start = pow(10, n-1)
    end = pow(10, n) - 1
    return random.randint(start, end)


def random_vin():
    VIN = 'vin-' + str(rand_n(14))
    #print(VIN)
    return VIN

def lambda_handler(event, context):
    vin = random_vin()
    for i in range(50):
        payload = {"vin": vin}
        client.invoke(
            FunctionName='TimestreamIngest',
            InvocationType='Event',
            Payload=json.dumps(payload)
        )
        print("Trigger executed for {}".format(i))
    print("Master function execution completed!")
    return {
        'statusCode': 200,
        'body': json.dumps('Master function execution completed!')
    }
