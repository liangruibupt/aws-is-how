import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
import os
import json
import base64
from botocore.vendored import requests
import sys

#Set up the SES email needs
SENDER = "48080251@qq.com" #replace with your emails
RECIPIENT = "liangrui.bupt@gmail.com" #replace with your emails

url="https://api.sendcloud.net/apiv2/mail/send"

# The subject line for the email.
SUBJECT = "来自SendCloud的一封邮件！ SendCloud Test (API for Python)"
# The email body for recipients with non-HTML email clients.
BODY_TEXT = ("SendCloud Test (API for Python)\r\n"
"This email was sent with SendCloud using the "
"API for Python."
)
# The HTML body of the email.
BODY_HTML = """<html>
<head></head>
<body>
    <h1>Amazon SES Test (SDK for Python)</h1>
    <p>你太棒了！你已成功的从SendCloud发送了一封测试邮件
    <a href='https://www.sendcloud.net/'>sendcloud</a>
    </p>
</body>
</html>
"""

sendcloud_secret_name = "/sendcloud/cn/credential"

runtime_region = os.environ['AWS_REGION']

session = boto3.session.Session()
secretsmanager_client = session.client(
    service_name='secretsmanager',
    region_name = runtime_region
)

def get_secret():

    # In this sample we only handle the specific exceptions for the 'GetSecretValue' API.
    # See https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    # We rethrow the exception by default.
    secret = 'NONE'
    try:
        describe_secret_response = secretsmanager_client.describe_secret(
            SecretId=sendcloud_secret_name
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
    try:
        credential_value = get_secret()
        credential_json = json.loads(credential_value)
    
        print('credential_value: {}'.format(credential_json))
        sendcloud_apiUser=credential_json['SENDCLOUD_API_USERID'],
        apiUser_apiKey=credential_json['SENDCLOUD_API_KEY'],

        params = {"apiUser": sendcloud_apiUser, \
            "apiKey" : apiUser_apiKey,\
            "from" : SENDER, \
            "fromName" : "SendCloud测试邮件", \
            "to" : RECIPIENT, \
            "subject" : SUBJECT, \
            "html": BODY_HTML, \
            "respEmailId": "true"
          }
        r = requests.post(url, files={}, data=params)
        return_msg = r.json()
        return {
            'statusCode': return_msg['statusCode'],
            'body': "Lambda sendcloud sent email " + return_msg['message']
        }
    except Exception as e:
        print(str(e))
        return_msg = json.dumps('Lambda sendcloud sent email failed!')
        return {
            'statusCode': 500,
            'body': return_msg
        }
