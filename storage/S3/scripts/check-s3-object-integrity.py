import boto3
import os
from botocore.exceptions import ClientError
import datetime
import json
import logging

logging.basicConfig(filename='example.log', level=logging.DEBUG)

s3_client_cn = boto3.client(
    's3',
    region_name='cn-north-1'
)

SNS_TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN', default=None)
S3_BUCKET_NAME_CN = os.environ.get('S3_BUCKET_NAME_CN', default=None)
S3_KEY_NAME_CN = os.environ.get('S3_KEY_NAME_CN', default=None)

sns_client_cn = boto3.client(
    'sns',
    region_name='cn-north-1'
)

def email_notification_sns(email_subject, email_body):
    message = "Send SNS email successfully"

    if (SNS_TOPIC_ARN == None):
        message = "Failed to get the environment variable SNS_TOPIC_ARN"
        logging.error(message)

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
        send_response = sns_client_cn.publish(TopicArn=SNS_TOPIC_ARN,
                                       Subject=email_subject,
                                       Message=json.dumps(sns_message))
        logging.info('Successfuly send the email SNS with message ID: ' +
              send_response['MessageId'])
    except ClientError as e:
        message = "Failed to send email, check the stack trace below." + \
            json.dumps(e.response['Error'])
        logging.error(message)

    return message

def lambda_handler(event, context):
    file_path = event.get('file_path', 'awscliv2.zip')
    s3_bucket_name = event.get('s3_bucket_name', S3_BUCKET_NAME_CN)
    s3_key_name = event.get('s3_key_name', S3_KEY_NAME_CN)
    now = datetime.datetime.now()
    try:
        response = s3_client_cn.list_objects_v2(Bucket=s3_bucket_name)
        #response = s3_client_cn.upload_file(file_path, s3_bucket_name, s3_key_name)
        #response = s3_client_cn.put_object(Body=file_path, Bucket=s3_bucket_name, Key=s3_key_name, ContentMD5='thisisinvalidvalue5555===')
    except ClientError as e:
        message = "Failed to upload s3 bucket, check the stack trace below." + \
            json.dumps(e.response['Error'])
        email_notification_sns('upload file to s3 failed', message)
        logging.error(message)
        raise e

    now_shift = datetime.datetime.now()
    logging.info(response)
    ts_timedelta = now_shift - now
    logging.info ('timedelta for upload: %d' % ts_timedelta.seconds)
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
}


if __name__ == '__main__':
    event = {'file_path':'awscliv2.zip','s3_bucket_name':'ray-data-engineering-lab','s3_key_name':'raw_data/sample_data/awscliv2.zip'}
    lambda_handler(event, 'handler')