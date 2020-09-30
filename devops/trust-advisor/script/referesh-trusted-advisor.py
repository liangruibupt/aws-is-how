import boto3
import traceback
from botocore.exceptions import ClientError
import logging
import json
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)

sts_role_arn = os.environ['STS_ROLE_ARN']

class CustomError(Exception):
    pass

def lambda_handler(event, context):
    message = "Success refresh trusted advisor"
    try:
        sts_client = boto3.client('sts')
        sts_response = sts_client.assume_role(
            RoleArn=sts_role_arn,
            RoleSessionName='TA_Role',
        )
        support_client = boto3.client('support',
            aws_access_key_id=sts_response['Credentials']['AccessKeyId'],
            aws_secret_access_key=sts_response['Credentials']['SecretAccessKey'],
            aws_session_token=sts_response['Credentials']['SessionToken']
        )
        ta_checks = support_client.describe_trusted_advisor_checks(language='en')
        for checks in ta_checks['checks']:
            try:
                support_client.refresh_trusted_advisor_check(checkId=checks['id'])
                print('Refreshing check: ' + checks['name'])
            except ClientError:
                print('Cannot refresh check: ' + checks['name'])
                continue
    except ClientError as e:
        message = "Failed! invoke trusted_advisor." + json.dumps(e.response['Error'])
        logging.error(message)
        raise CustomError("Failed_Refresh_Trusted_Advisor")

    return {
        "statusCode": 200,
        "data": message
    }

if __name__ == '__main__':
    lambda_handler('event', 'handler')
