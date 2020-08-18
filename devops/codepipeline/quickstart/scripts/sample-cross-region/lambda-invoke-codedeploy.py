import boto3
from botocore.client import Config
import os
from botocore.exceptions import ClientError,WaiterError
import datetime
import time
import json
import base64

S3_BUCKET_NAME_CHINA = os.environ['S3_BUCKET_NAME_CHINA']
S3_ARTIFACT_NAME_CHINA = os.environ['S3_ARTIFACT_NAME_CHINA']

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
    
def lambda_handler(event, context):
    
    # Retrieve the Job ID from the Lambda action
    job_id = event["CodePipeline.job"]["id"];
    
    try:
        credential_value = get_secret()
        credential_json = json.loads(credential_value)
    
        #print('credential_value: {}'.format(credential_json))
        codedeploy_client_cn = boto3.client(
            'codedeploy',
            aws_access_key_id=credential_json['AWS_ACCESS_KEY_ID_CN'],
            aws_secret_access_key=credential_json['AWS_SECRET_ACCESS_KEY_CN'],
            region_name=china_region_name,
            config=Config(connect_timeout=15, read_timeout=15, retries=dict(max_attempts=10))
        )
    except ClientError as e:
        return_msg = json.dumps('Lambda invoke codedeploy in {} failed'.format(china_region_name))
        response = codepipeline_client.put_job_failure_result(jobId=job_id, failureDetails={'type': 'JobFailed',
            'message': e})
        return {
            'statusCode': 500,
            'body': return_msg
        }
        
    try:
        response = codedeploy_client_cn.create_deployment(applicationName='MyDemoApplication', deploymentGroupName='CodePipelineProductionFleetChina',
        revision={'revisionType':'S3', 's3Location':{'bucket':S3_BUCKET_NAME_CHINA, 'key':S3_ARTIFACT_NAME_CHINA, 'bundleType':'zip'}})
        deployment_id = response['deploymentId']
        print ('create_deployment %s' % (deployment_id))
        
        waiter = codedeploy_client_cn.get_waiter('deployment_successful')
        waiter.wait(deploymentId=deployment_id, WaiterConfig={'Delay': 15, 'MaxAttempts': 20})
        response = codedeploy_client_cn.get_deployment(deploymentId=deployment_id)
        print ('get_deployment %s' % response['deploymentInfo']['status'])
        print ('get_deployment detail %s' % response)
        
    except (ClientError, WaiterError) as e:
        return_msg = json.dumps('Lambda invoke codedeploy in {} failed'.format(china_region_name))
        response = codepipeline_client.put_job_failure_result(jobId=job_id, failureDetails={'type': 'JobFailed',
                'message': e})
        return {
            'statusCode': 500,
            'body': return_msg
        }
    
    return_msg = json.dumps('Lambda invoke codedeploy in {} successfully'.format(china_region_name))
    codepipeline_client.put_job_success_result(jobId=job_id, executionDetails={'summary':return_msg})   
    return {
        'statusCode': 200,
        'body': return_msg
    }
        
