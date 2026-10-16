import json
import boto3
import random
import datetime
import base64
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

dynamodb_client = boto3.client('dynamodb')

DDB_TABLE_NAME = 'kinesis-stock-table'


def lambda_handler(event, context):
    for record in event['Records']:
        # Kinesis data is base64 encoded so decode here
        payload = base64.b64decode(record["kinesis"]["data"])
        payload_json = json.loads(payload)
        logger.info("Decoded payload: {}".format(payload_json))

        try:
            response = dynamodb_client.put_item(
               TableName=DDB_TABLE_NAME,
               Item={
                   'recordId': {'N': str(payload_json["ID"])},
                   'eventId': {'S': record["eventID"]},
                   'price': {'N': str(payload_json["PRICE"])},
                   'ticker': {'S': payload_json["TICKER"]},
                   'event_time': {'N': str(payload_json["EVENT_TIME"])}
                }
            )

            logger.info("PutItem succeeded")
        except ClientError as e:
            logger.error(e)
