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


def single_account_invoke(role_arn):
    message = "Success refresh trusted advisor for {}".format(role_arn)

    try:
        sts_client = boto3.client('sts')
        sts_response = sts_client.assume_role(
            RoleArn=role_arn,
            RoleSessionName='TA_Role',
        )
        support_client = boto3.client('support',
                                      aws_access_key_id=sts_response['Credentials']['AccessKeyId'],
                                      aws_secret_access_key=sts_response['Credentials']['SecretAccessKey'],
                                      aws_session_token=sts_response['Credentials']['SessionToken']
                                      )
        ta_checks = support_client.describe_trusted_advisor_checks(
            language='en')
        for checks in ta_checks['checks']:
            try:
                support_client.refresh_trusted_advisor_check(
                    checkId=checks['id'])
                logging.info('Refreshing check: ' + checks['name'])
            except ClientError:
                logging.info('Cannot refresh check: ' + checks['name'])
                continue
    except ClientError as e:
        message = "Failed! invoke trusted_advisor for {} {}".format(role_arn, json.dumps(e.response['Error']))
        logging.error(message)
        raise CustomError("Failed_Refresh_Trusted_Advisor")
    return message


def lambda_handler(event, context):
    sts_role_list = sts_role_arn.split("|")
    for sts_role in sts_role_list:
        message = single_account_invoke(sts_role)
        logging.info(message)

    return {
        "statusCode": 200,
        "data": message
    }


if __name__ == '__main__':
    lambda_handler('event', 'handler')
