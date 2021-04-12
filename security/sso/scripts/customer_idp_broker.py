import urllib
import json
import sys
import requests  # 'pip install requests'
import boto3  # AWS SDK for Python (Boto3) 'pip install boto3'

# Step 1: Authenticate user in your own identity system.

# Step 2: Using the access keys for an IAM user in your AWS account,
# call "AssumeRole" to get temporary access keys for the federated user

# Note: Calls to AWS STS AssumeRole must be signed using the access key ID
# and secret access key of an IAM user or using existing temporary credentials.
# The credentials can be in EC2 instance metadata, in environment variables,
# or in a configuration file, and will be discovered automatically by the
# client('sts') function. For more information, see the Python SDK docs:
# http://boto3.readthedocs.io/en/latest/reference/services/sts.html
# http://boto3.readthedocs.io/en/latest/reference/services/sts.html#STS.Client.assume_role

# Use the service role with STS permission
sts_connection = boto3.client('sts')

# Step 2.1 Sessin Revoke

# Step 2.2 Assume Role
assumed_role_object = sts_connection.assume_role(
    RoleArn="arn:aws-cn:iam::ACCOUNT-ID-WITHOUT-HYPHENS:role/SSO-ROLE-NAME",
    RoleSessionName="AssumeRoleSession",
)

# Step 3: Format resulting temporary credentials into JSON
url_credentials = {}
url_credentials['sessionId'] = assumed_role_object.get(
    'Credentials').get('AccessKeyId')
url_credentials['sessionKey'] = assumed_role_object.get(
    'Credentials').get('SecretAccessKey')
url_credentials['sessionToken'] = assumed_role_object.get(
    'Credentials').get('SessionToken')
json_string_with_temp_credentials = json.dumps(url_credentials)

# Step 4. Make request to AWS federation endpoint to get sign-in token. Construct the parameter string with
# the sign-in action request, a 12-hour session duration, and the JSON document with temporary credentials
# as parameters.
request_parameters = "?Action=getSigninToken"
request_parameters += "&SessionDuration=43200"
if sys.version_info[0] < 3:
    def quote_plus_function(s):
        return urllib.quote_plus(s)
else:
    def quote_plus_function(s):
        return urllib.parse.quote_plus(s)
request_parameters += "&Session=" + \
    quote_plus_function(json_string_with_temp_credentials)
request_url = "https://signin.amazonaws.cn/federation" + request_parameters
r = requests.get(request_url)
# Returns a JSON document with a single element named SigninToken.
signin_token = json.loads(r.text)

# Step 5: Create URL where users can use the sign-in token to sign in to
# the console. This URL must be used within 15 minutes after the
# sign-in token was issued.
request_parameters = "?Action=login"
request_parameters += "&Issuer=Example.org"
request_parameters += "&Destination=" + \
    quote_plus_function("https://console.amazonaws.cn/")
request_parameters += "&SigninToken=" + signin_token["SigninToken"]
request_url = "https://signin.amazonaws.cn/federation" + request_parameters

# Send final URL to stdout
print(request_url)
