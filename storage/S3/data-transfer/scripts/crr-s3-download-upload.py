import boto3
import os
from botocore.exceptions import ClientError
import datetime
import json

# AWS_ACCESS_KEY_ID_CN = os.environ['AWS_ACCESS_KEY_ID_CN']
# AWS_SECRET_ACCESS_KEY_CN = os.environ['AWS_SECRET_ACCESS_KEY_CN']
S3_BUCKET_NAME_CN = os.environ['S3_BUCKET_NAME_CN']
S3_KEY_NAME_CN = os.environ['S3_KEY_NAME_CN']
S3_BUCKET_NAME_GLB = os.environ['S3_BUCKET_NAME_GLB']
S3_KEY_NAME_GLB = os.environ['S3_KEY_NAME_GLB']
AWS_ACCESS_KEY_ID_GLB = os.environ['AWS_ACCESS_KEY_ID_GLB']
AWS_SECRET_ACCESS_KEY_GLB = os.environ['AWS_SECRET_ACCESS_KEY_GLB']

# client_cn = boto3.client(
#     's3',
#     aws_access_key_id=AWS_ACCESS_KEY_ID_CN,
#     aws_secret_access_key=AWS_SECRET_ACCESS_KEY_CN,
#     region_name='cn-north-1'
# )
client_cn = boto3.client(
    's3',
    region_name='cn-north-1'
)

client_glb = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID_GLB,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY_GLB,
    region_name='ap-southeast-1'
)

def lambda_handler(event, context):
    # now = datetime.datetime.strftime(datetime.datetime.now(), '%s%f')[:13]
    # now_shift = datetime.datetime.strftime(datetime.datetime.now(), '%s%f')[:13]
    # ts_timedelta = now_shift - now
    now = datetime.datetime.now()
    LAMBDA_FILE_NAME_CN = '/tmp/{}'.format(S3_KEY_NAME_CN)
    try:
        response =  client_cn.download_file(S3_BUCKET_NAME_CN, S3_KEY_NAME_CN, LAMBDA_FILE_NAME_CN)
    except ClientError as e:
        print(e)
    now_shift = datetime.datetime.now()
    print(response)
    ts_timedelta = now_shift - now
    print ('timedelta for download: %d' % ts_timedelta.seconds)

    now = datetime.datetime.now()
    try:
        response = client_glb.upload_file(LAMBDA_FILE_NAME_CN, S3_BUCKET_NAME_GLB, S3_KEY_NAME_GLB)
    except ClientError as e:
        print(e)
    now_shift = datetime.datetime.now()
    print(response)
    ts_timedelta = now_shift - now
    print ('timedelta for upload: %d' % ts_timedelta.seconds)
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
}


