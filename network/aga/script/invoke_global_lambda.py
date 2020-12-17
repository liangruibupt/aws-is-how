import json
import urllib
import boto3
from botocore.vendored import requests
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

def lambda_handler(event, context):
    alb = direct_alb()
    return {
        'statusCode': 200,
        'body': json.dumps('Call global lambda via alb: ' + alb)
    }


def direct_alb():
    globalLambda = requests.get(
        'http://lambda-demo-alb-1926028212.eu-west-1.elb.amazonaws.com/lambda/echo_hello').text.rstrip()
    print(globalLambda)
    return globalLambda
