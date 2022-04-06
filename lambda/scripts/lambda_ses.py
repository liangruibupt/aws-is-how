import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
import os
import json
import base64

#Set up the SES email needs
SENDER = "ruiliang@amazon.com" #replace with your emails
RECIPIENT = "48080251@qq.com" #replace with your emails

# Specify a configuration set.
CONFIGURATION_SET = "default-config-set"
# The subject line for the email.
SUBJECT = "Global Amazon SES Test (SDK for Python)"
# The email body for recipients with non-HTML email clients.
BODY_TEXT = ("Amazon SES Test (Python)\r\n"
"This email was sent with Amazon SES using the "
"AWS SDK for Python (Boto)."
)
# The HTML body of the email.
BODY_HTML = """<html>
<head></head>
<body>
    <h1>Amazon SES Test (SDK for Python)</h1>
    <p>This email was sent with
    <a href='https://aws.amazon.com/ses/'>Amazon SES</a> using the
    <a href='https://aws.amazon.com/sdk-for-python/'>
    AWS SDK for Python (Boto)</a>.</p>
</body>
</html>
"""
# The character encoding for the email.
CHARSET = "UTF-8"

global_region_name = os.getenv('AWS_GLOBALREGION', "ap-northeast-1")
global_secret_name = "/ses/tokyo/credential"

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
    try:
        credential_value = get_secret()
        credential_json = json.loads(credential_value)
    
        print('credential_value: {}'.format(credential_json))
        ses_client_glb = boto3.client(
            'ses',
            aws_access_key_id=credential_json['AWS_ACCESS_KEY_ID_GLB'],
            aws_secret_access_key=credential_json['AWS_SECRET_ACCESS_KEY_GLB'],
            region_name=global_region_name,
            config=Config(connect_timeout=5, read_timeout=10, retries=dict(max_attempts=5))
        )
        
    except ClientError as e:
        return_msg = json.dumps('Lambda get the global SES client failed!')
        return {
            'statusCode': 500,
            'body': return_msg
        }
    
    # Try to send the email.
    try:
        #Provide the contents of the email.
        response = ses_client_glb.send_email(
            Destination={
                'ToAddresses': [
                    RECIPIENT,
                ],
            },
            Message={
                'Body': {
                    'Html': {
                        'Charset': CHARSET,
                        'Data': BODY_HTML,
                    },
                    'Text': {
                        'Charset': CHARSET,
                        'Data': BODY_TEXT,
                    },
                },
                'Subject': {
                    'Charset': CHARSET,
                    'Data': SUBJECT,
                },
            },
            Source=SENDER,
            # If you are not using a configuration set, comment or delete the
            # following line
            ConfigurationSetName=CONFIGURATION_SET,
        )
    # Display an error if something goes wrong.	
    except ClientError as e:
        print(e.response['Error']['Message'])
    else:
        print("Email sent! Message ID: " + response['MessageId']),

    return_msg = json.dumps('Lambda invoke global SES successfully!')
    return {
        'statusCode': 200,
        'body': return_msg
    }
