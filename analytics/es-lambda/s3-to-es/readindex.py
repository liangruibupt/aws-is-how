import boto3
import re
import requests
from requests_aws4auth import AWS4Auth

region = 'cn-north-1'  # e.g. us-west-1
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key,
                   region, service, session_token=credentials.token)

host = ''  # the Amazon ES domain, including https://
index = 'lambda-s3-index'
type = '_search?pretty'
url = host + '/' + index + '/' + type

headers = {"Content-Type": "application/json"}

# Lambda execution starts here


def handler(event, context):
    response = requests.request(
        "GET", url, auth=awsauth, headers=headers)
    print(response)
