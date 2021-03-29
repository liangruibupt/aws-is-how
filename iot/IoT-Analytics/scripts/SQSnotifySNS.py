import boto3
from botocore.exceptions import ClientError
import os
import json

sns_topic_arn = os.environ.get('SNS_TOPIC_ARN', default=None)


class CustomError(Exception):
    pass


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
            'Charset': 'UTF-8',
            'Data': email_body
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
        print(message)
        raise CustomError("Failed_Sent_Check_Summary")

    return message


def lambda_handler(event, context):
    message = []
    for record in event['Records']:
        payload = record["body"]
        message.append(json.loads(payload))
        print(message)

    email_notification_sns("SQS Notification", message)

    return {
        "statusCode": 200,
        "data": "Notify successfully"
    }
