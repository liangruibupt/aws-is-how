import json
import os
import boto3
import base64
from botocore.exceptions import ClientError

def lambda_handler():
    secret_name = "quickstart/ExternalCMKSecret"
    region_name = "cn-north-1"

    # Create a Secrets Manager client
    session = boto3.Session(profile_name='cn-north-1-second-external')
    client = session.client('secretsmanager', region_name=region_name)

    # In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
    # See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    # We rethrow the exception by default.

    try:
        describe_secret_response = client.describe_secret(
            SecretId=secret_name
        )
        print ("describe_secret_response %s" % (describe_secret_response) )
        get_secret_value_response = client.get_secret_value(
            SecretId=describe_secret_response['ARN']
        )
        # print ("get_secret_value_response %s" % (get_secret_value_response) )
    except ClientError as e:
        if e.response['Error']['Code'] == 'DecryptionFailureException':
            # Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InternalServiceErrorException':
            # An error occurred on the server side.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InvalidParameterException':
            # You provided an invalid value for a parameter.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InvalidRequestException':
            # You provided a parameter value that is not valid for the current state of the resource.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'ResourceNotFoundException':
            # We can't find the resource that you asked for.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
    else:
        # Decrypts secret using the associated KMS CMK.
        # Depending on whether the secret is a string or binary, one of these fields will be populated.
        if 'SecretString' in get_secret_value_response:
            secret = get_secret_value_response['SecretString']
            # print ("secret %s " % (secret) )
        else:
            decoded_binary_secret = base64.b64decode(get_secret_value_response['SecretBinary'])
            # print ("decoded_binary_secret %s " % (decoded_binary_secret) )
            
    # Your code goes here.
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda Secret Manager Demo!')
    }

if __name__ == '__main__':
    lambda_handler()
