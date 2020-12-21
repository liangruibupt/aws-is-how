import boto3
from botocore.exceptions import ClientError
import json

global_secret_name = "/prod/global/credential"
secrets_client = boto3.client("secretsmanager")


def get_secret():
    secret = 'NONE'
    try:
        secret = secrets_client.get_secret_value(
            SecretId=global_secret_name)['SecretString']
    except ClientError as e:
        raise e
    return secret


def lambda_handler(event, context):
    return_msg = 'Lambda invoke amazon connect successfully.'
    try:
        credential_value = get_secret()
        credential_json = json.loads(credential_value)
        connect_client = boto3.client('connect', 
                        aws_access_key_id=credential_json['AWS_ACCESS_KEY_ID'],
                        aws_secret_access_key=credential_json['AWS_SECRET_ACCESS_KEY'],
                        region_name='ap-northeast-1')
    except ClientError as e:
        return_msg = json.dumps(
            'Lambda invoke amazon connect failed to get global credential {}.'.format(e.response['Error']))
        return {
            'statusCode': 500,
            'body': return_msg
        }
    
    try:
        response = connect_client.start_outbound_voice_contact(
            DestinationPhoneNumber='replace-with-number-you-want-call-out',
            ContactFlowId='replace-with-your-ContactFlowId',
            InstanceId='replace-with-your-InstanceId',
            SourcePhoneNumber='replace-with-your-SourcePhoneNumber',
            Attributes={
                'name': 'alert'
            }
        )
    except ClientError as e:
        return_msg = json.dumps(
            'Lambda invoke amazon connect failed {}.'.format(e.response['Error']))
        return {
            'statusCode': 500,
            'body': return_msg
        }

    return {
        'statusCode': 200,
        'body': return_msg
    }
