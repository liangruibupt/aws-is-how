import boto3
import traceback
from botocore.exceptions import ClientError
import logging
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

class CustomError(Exception):
    pass

def lambda_handler(event, context):
    message = "Success refresh trusted advisor"
    try:
        support_client = boto3.client('support')
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
