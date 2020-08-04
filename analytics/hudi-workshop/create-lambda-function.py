##
## create-lambda-function.py
##
import json
import boto3
import uuid
import time

# read stack info
with open('stack-info.json') as json_file:
    stack = json.load(json_file)

kafka_bootstrap_servers=','.join([k+":9094" for k in stack['MSKBrokerNodes']])
s3_bucket=stack['S3Bucket']

# init boto3 clients
ec2 = boto3.client('ec2')
lambda_client = boto3.client('lambda')
sts = boto3.client("sts")

# get account id
account_id = sts.get_caller_identity()["Account"]

lambda_role = 'arn:aws-cn:iam::'+account_id+':role/LambdaExecutionRole'
print (lambda_role)

# get security groups
filters = [{'Name':'tag:Name', 'Values':['Workshop Security Group']}]
response=ec2.describe_security_groups(Filters=filters)
security_group = response['SecurityGroups'][0]['GroupId']

# get subnets
filters = [{'Name':'tag:aws:cloudformation:logical-id', 'Values':['Public*']},
          {'Name':'tag:Name', 'Values':['Hudi*']}]
response = ec2.describe_subnets(
    Filters=filters)
#print (response)
subnets=[k['SubnetId'] for k in response['Subnets']]

# create lambda layer
response = lambda_client.publish_layer_version(
    LayerName='kafka-python',
    Description='kafka-python libraries',
    Content={
        'S3Bucket':  stack['S3Bucket'],
        'S3Key': 'scripts/kafka-python.zip'
    },
    CompatibleRuntimes=[
        'python3.7',
    ],
    LicenseInfo='MIT'
)
layer_arn=response['LayerVersionArn']

# create lambda function
response = lambda_client.create_function(
    FunctionName='s3-event-processor',
    Runtime='python3.7',
    Role=lambda_role,
    Handler='lambda_function.lambda_handler',
    Code={
        'S3Bucket': s3_bucket,
        'S3Key': 'scripts/s3-event-processor-lambda.zip'
    },
    Timeout=30,
    MemorySize=128,
    Publish=True,
    VpcConfig={
        'SubnetIds': subnets,
        'SecurityGroupIds': [
            security_group,
        ]
    },
    Layers=[
        layer_arn,
    ],
    Environment={
        'Variables': {
            'kafka_bootstrap_servers': kafka_bootstrap_servers
        }
    }
)
lambda_arn=response['FunctionArn']
print (lambda_arn)

# add s3 permissions to invoke lambda
s3_bucket_arn='arn:aws-cn:s3:::'+s3_bucket
response = lambda_client.add_permission(
    FunctionName=lambda_arn,
    StatementId=str(uuid.uuid1()),
    Action='lambda:InvokeFunction',
    Principal='s3.amazonaws.com',
    SourceArn=s3_bucket_arn,
    SourceAccount=account_id,
)

for x in range(0, 5):
    try:
        print ("Waiting 1 min...")
        time.sleep(60)
        #  add s3 event notifications
        s3 = boto3.resource('s3')
        bucket_notification = s3.BucketNotification(s3_bucket)
        response = bucket_notification.put(
        NotificationConfiguration={
            'LambdaFunctionConfigurations': [
                {
                    'LambdaFunctionArn': lambda_arn,
                    'Events': ['s3:ObjectCreated:*'],
                    "Filter": {
                        "Key": {
                            "FilterRules": [
                                {
                                "Name": "prefix",
                                "Value": "dms-full-load-path/"
                                }
                            ]
                        }
                    }
                }
            ]
        }
        )
        print (response)
        break
    except Exception as e:
        print (e)
