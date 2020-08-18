import boto3
from botocore.client import Config
import os
from botocore.exceptions import ClientError
import datetime
import time
import json
import base64

S3_BUCKET_NAME_GLOBAL = os.environ['S3_BUCKET_NAME_GLOBAL']
S3_BUCKET_NAME_CHINA = os.environ['S3_BUCKET_NAME_CHINA']

global_secret_name = "/codepipeline/china/credential"
global_region_name = "ap-southeast-1"

china_region_name = "cn-north-1"

# Create a Secrets Manager client
session = boto3.session.Session()
secretsmanager_client = session.client(
    service_name='secretsmanager',
    region_name=global_region_name
)

codepipeline_client = session.client(
    service_name='codepipeline',
    region_name=global_region_name
)
    
def get_secret():

    # In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
    # See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    # We rethrow the exception by default.
    secret = 'NONE'
    try:
        describe_secret_response = secretsmanager_client.describe_secret(
            SecretId=global_secret_name
        )
        #print ("describe_secret_response %s" % (describe_secret_response) )
        get_secret_value_response = secretsmanager_client.get_secret_value(
            SecretId=describe_secret_response['ARN']
        )
        #print ("get_secret_value_response %s" % (get_secret_value_response) )
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
        return {
                'statusCode': 500,
                'body': json.dumps('Lambda copy s3 get_secret_value_response failed')
            }
    else:
        # Decrypts secret using the associated KMS CMK.
        # Depending on whether the secret is a string or binary, one of these fields will be populated.
        if 'SecretString' in get_secret_value_response:
            secret = get_secret_value_response['SecretString']
            #print ("secret %s " % (secret) )
        else:
            secret = base64.b64decode(get_secret_value_response['SecretBinary'])
            #print ("decoded_binary_secret %s " % (secret) )
    return secret

s3_client_glb = boto3.client(
    's3',
    region_name=global_region_name,
    config=Config(connect_timeout=15, read_timeout=15, retries=dict(max_attempts=10))
)
    
def get_all_s3_keys(bucket):
    """Get a list of all keys in an S3 bucket."""
    keys = []

    kwargs = {'Bucket': bucket}
    while True:
        resp = s3_client_glb.list_objects_v2(**kwargs)
        for obj in resp['Contents']:
            keys.append(obj['Key'])

        try:
            kwargs['ContinuationToken'] = resp['NextContinuationToken']
        except KeyError:
            break
    return keys

    
def lambda_handler(event, context):
    
    # Retrieve the Job ID from the Lambda action
    job_id = event["CodePipeline.job"]["id"];
    
    try:
        credential_value = get_secret()
        credential_json = json.loads(credential_value)
    
        #print('credential_value: {}'.format(credential_json))
        s3_client_cn = boto3.client(
            's3',
            aws_access_key_id=credential_json['AWS_ACCESS_KEY_ID_CN'],
            aws_secret_access_key=credential_json['AWS_SECRET_ACCESS_KEY_CN'],
            region_name=china_region_name,
            config=Config(connect_timeout=15, read_timeout=15, retries=dict(max_attempts=10))
        )
        file_list = get_all_s3_keys(S3_BUCKET_NAME_GLOBAL)
    except ClientError as e:
        return_msg = json.dumps('Lambda copy s3 file failed!')
        response = codepipeline_client.put_job_failure_result(jobId=job_id, failureDetails={'type': 'JobFailed',
            'message': e})
        return {
            'statusCode': 500,
            'body': return_msg
        }
    
    for file in file_list:
        now = datetime.datetime.now()
        LAMBDA_FILE_NAME_GLB = '/tmp/{}'.format(os.path.basename(file))
        print('file name: {} and local file: {}'.format(file, LAMBDA_FILE_NAME_GLB))
        try:
            response = s3_client_glb.download_file(S3_BUCKET_NAME_GLOBAL, file, LAMBDA_FILE_NAME_GLB)
            now_shift = datetime.datetime.now()
            ts_timedelta = now_shift - now
            print ('timedelta for download: %d microseconds' % ts_timedelta.microseconds)
            
            now = datetime.datetime.now()
            response = s3_client_cn.upload_file(LAMBDA_FILE_NAME_GLB, S3_BUCKET_NAME_CHINA, file)
            now_shift = datetime.datetime.now()
            ts_timedelta = now_shift - now
            print ('timedelta for upload: %d microseconds' % ts_timedelta.microseconds)
            
            if os.path.exists(LAMBDA_FILE_NAME_GLB):
                os.remove(LAMBDA_FILE_NAME_GLB)
        except ClientError as e:
            return_msg = json.dumps('Lambda copy s3 file!')
            response = codepipeline_client.put_job_failure_result(jobId=job_id, failureDetails={'type': 'JobFailed',
                'message': e})
            return {
                'statusCode': 500,
                'body': return_msg
            }
    
    return_msg = json.dumps('Lambda copy s3 file!')
    codepipeline_client.put_job_success_result(jobId=job_id, executionDetails={'summary':return_msg})    
    return {
        'statusCode': 200,
        'body': return_msg
    }
