import json
import time
import urllib
import urlparse
import boto3
import traceback
from boto3.dynamodb.types import TypeDeserializer

class StreamTypeDeserializer(TypeDeserializer):
    def _deserialize_n(self, value):
        return int(value)
    def _deserialize_b(self, value):
        return value  # Already in Base64

def get_table_name_from_arn(arn):
    return arn.split(':')[5].split('/')[1]

def _lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb', region_name='cn-northwest-1')
    dynamodb_table = dynamodb.Table('tlog_replica')

    ddb_deserializer = StreamTypeDeserializer()

    records = event['Records']

    for record in records:
        ddb = record['dynamodb']

        event_name = record['eventName'].upper()  # INSERT, MODIFY, REMOVE

        if (event_name == 'INSERT') or (event_name == 'MODIFY'):
            if 'NewImage' not in ddb:
                print ('Cannot process stream if it does not contain NewImage')
                continue
            doc_fields = ddb_deserializer.deserialize({'M': ddb['NewImage']})
            item = dynamodb_table.put_item(Item=doc_fields)

def lambda_handler(event, context):
    try:
        return _lambda_handler(event, context)
    except Exception:
        print (traceback.format_exc())
