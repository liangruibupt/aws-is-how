# Create a lambda function with the below code
import json
import boto3
import urllib.parse
import logging
import ast
import os
import os.path
import dateutil.tz
import re
import sys
import traceback

from time import sleep
from datetime import datetime
from random import randint

#Function for logger


def load_log_config():
    # Basic config. Replace with your own logging config if required
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    return root


#Logger initiation
logger = load_log_config()


def lambda_handler(event, context):

    try:
        ##Getting the bucket and key information from the event details for further processing
        lambda_message = event['Records'][0]
        bucket = lambda_message['s3']['bucket']['name']
        key = lambda_message['s3']['object']['key']
        print(lambda_message)

        if not key.endswith('/'):
            p_full_path = key
            p_base_file_name = os.path.basename(p_full_path)

            #Capturing the current time in CST
            central = dateutil.tz.gettz('US/Central')
            now = datetime.now(tz=central)

            #Time stamp for the stepfunction name
            p_stp_fn_time = now.strftime("%Y%m%d%H%M%S%f")

            sfn = boto3.client('stepfunctions', region_name='us-east-2')

            logger.info('Calling Step Function')
            p_stp_fn_arn = 'arn:aws:states:us-east-2:xxxxxx:stateMachine:Parallel'
            response = sfn.start_execution(
                stateMachineArn=p_stp_fn_arn, name=p_base_file_name+'-'+p_stp_fn_time, input='{}')
            logger.info('Step Function Triggered')
        else:
            logger.info('Event was triggered by a folder')
            logger.info('bucket: '+bucket)
            logger.info('key: '+key)
    except Exception as e:
        print(e)
        track = traceback.format_exc()
        message = {
            'ErrorMessage': str(e),
            'StackTrace': track,
            'BaseFileName': p_base_file_name
        }
        logger.critical(subject)
        logger.critical(message)
    return
