import json
import urllib
import boto3
import requests
from aws_xray_sdk.core import xray_recorder
from aws_xray_sdk.core import patch_all

patch_all(double_patch=True)

def lambda_handler(event, context):
    alb = direct_alb()
    aga = aga_alb()
    return {
        'statusCode': 200,
        'body': json.dumps('Call global lambda via alb: ' + alb + " , via AGA: " + aga)
    }


def direct_alb():
    globalLambda = requests.get(
        'http://lambda-demo-alb-1926028212.eu-west-1.elb.amazonaws.com/lambda/echo_hello').text.rstrip()
    print('direct_alb', globalLambda)
    return globalLambda


def aga_alb():
    globalLambda = requests.get(
        'http://a317bf562e4b9ef93.awsglobalaccelerator.com/lambda/echo_hello').text.rstrip()
    print('aga_alb', globalLambda)
    return globalLambda

