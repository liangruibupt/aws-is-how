import os
import boto3
from collections import OrderedDict
from botocore.exceptions import ClientError
import logging
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

region = os.environ['AWS_DEFAULT_REGION']
colour_map = {'error': '#ff0000', 'warning': '#ffff00', 'ok': '#00ff00'}
to_email = os.environ.get('TO_EMAIL', default=None)
from_email = os.environ.get('FROM_EMAIL', default=None)
sts_role_arn = os.environ['STS_ROLE_ARN']
sns_topic_arn = os.environ.get('SNS_TOPIC_ARN', default=None)

class CustomError(Exception):
    pass

def get_console_url(region):
    url_path = 'https://console.aws.amazon.com/trustedadvisor/home?region=' + \
        region + '#/category/'
    if (region == 'cn-north-1' or region == 'cn-northwest-1'):
        url_path = 'https: // console.amazonaws.cn/trustedadvisor/home?region=' + \
            region + '#/category/'
    return url_path

def email_notification(email_subject, email_to, email_from, email_body):
    message = "Send email successfully"

    if (to_email == None or from_email == None):
        message = "Failed to get the environment variable TO_EMAIL or FROM_EMAIL"
        raise CustomError(message)

    client = boto3.client('ses')
    try:
        send_response = client.send_email(Source=email_from,
                                          Destination={'ToAddresses': [email_to]},
                                          Message={
                                              'Subject': {
                                                  'Charset': 'UTF-8',
                                                  'Data': email_subject,
                                              },
                                              'Body': {
                                                  'Html': {
                                                      'Charset': 'UTF-8',
                                                      'Data': email_body
                                                  }
                                              }
                                          })
        print('Successfuly send the email with message ID: ' +
              send_response['MessageId'])
    except ClientError as e:
        message = "Failed to send email, check the stack trace below." + \
            json.dumps(e.response['Error'])
        logging.error(message)
        raise CustomError("Failed_Sent_Check_Summary")
    
    return message


def email_notification_sns(email_subject, email_body):
    message = "Send SNS email successfully"

    if (sns_topic_arn == None):
        message = "Failed to get the environment variable SNS_TOPIC_ARN"
        raise CustomError(message)

    client = boto3.client('sns')
    sns_message = {
        'Subject': {
            'Charset': 'UTF-8',
            'Data': email_subject,
        },
        'Body': {
            'Html': {
                'Charset': 'UTF-8',
                'Data': email_body
            }
        }
    }
    try:
        send_response = client.publish(TopicArn=sns_topic_arn,
                                       Subject=email_subject,
                                       Message=json.dumps(sns_message))
        print('Successfuly send the email SNS with message ID: ' +
              send_response['MessageId'])
    except ClientError as e:
        message = "Failed to send email, check the stack trace below." + \
            json.dumps(e.response['Error'])
        logging.error(message)
        raise CustomError("Failed_Sent_Check_Summary")

    return message

def lambda_handler(event, context):
    message = "Successfuly get Trusted Advisor Check Summary and send the email"
    via_sns = event.get('via_sns', None)

    try:
        sts_client = boto3.client('sts')
        sts_response = sts_client.assume_role(
            RoleArn=sts_role_arn,
            RoleSessionName='TA_Role',
        )
        #support_client = boto3.client('support')
        support_client = boto3.client('support',
            aws_access_key_id=sts_response['Credentials']['AccessKeyId'],
            aws_secret_access_key=sts_response['Credentials']['SecretAccessKey'],
            aws_session_token=sts_response['Credentials']['SessionToken']
        )
        ta_checks = support_client.describe_trusted_advisor_checks(language='en')
        checks_list = {ctgs: [] for ctgs in list(
            set([checks['category'] for checks in ta_checks['checks']]))}
        for checks in ta_checks['checks']:
            print('Getting check:' + checks['name'])
            try:
                check_summary = support_client.describe_trusted_advisor_check_summaries(
                    checkIds=[checks['id']])['summaries'][0]
                if check_summary['status'] != 'not_available':
                    checks_list[checks['category']].append(
                        [checks['name'], check_summary['status'],
                         str(check_summary['resourcesSummary']
                             ['resourcesProcessed']),
                         str(check_summary['resourcesSummary']
                             ['resourcesFlagged']),
                         str(check_summary['resourcesSummary']
                             ['resourcesSuppressed']),
                         str(check_summary['resourcesSummary']['resourcesIgnored'])])
            except ClientError as e:
                message = 'Failed to get check: ' + checks['id'] + ' --- ' + checks['name'] + \
                    json.dumps(e.response['Error'])
                logging.error(message)
                continue
        # print(checks_list)
        email_content = '<style>table, th, td {border: 1px solid black;border-collapse: collapse;}th,' + \
                        ' td{padding: 5px;text-align: left;}</style><table border="1"><tr><th>Category' + \
                        '</th><th>Check</th><th>Status</th><th>Resources Processed</th><th>Resources Flagged</th>' + \
                        '<th>Resources Suppressed</th><th>Resources Ignored</th></tr>'
        url_path = get_console_url(region)
        for catg, chks in OrderedDict(sorted(checks_list.items())).items():
            first_item = True
            for rit in chks:
                if first_item:
                    email_content += "<tr><th rowspan=" + str(len(checks_list[catg])) + "><a href=\"" \
                                     + url_path + catg.replace("_", "-") + "\">" + catg.replace("_", " ").title() \
                                     + "</a></th>"
                    first_item = False
                else:
                    email_content += "<tr>"
                email_content += "<td>" + rit[0] + "</td><td bgcolor=\"" + colour_map[rit[1]] + "\">" + rit[1] \
                                 + "</td><td>" + rit[2] + "</td><td>" + rit[3] + "</td><td>" + rit[4] + "</td><td>" \
                                 + rit[5] + "</td></tr>"
        email_content += "</table>"
        # print(email_content)
        subject = 'AWS Trusted Advisor Check Summary'
        if (via_sns == None):
            email_notification(subject, to_email, from_email, email_content)
        else:
            email_notification_sns(subject, email_content)
    except ClientError as e:
        message = 'Failed to get check_summary: ' + json.dumps(e.response['Error'])
        logging.error(message)
        raise CustomError("Failed_Get_Delivery_Check_Summary")

    return {
        "statusCode": 200,
        "data": message
    }


if __name__ == '__main__':
    lambda_handler('event', 'handler')
