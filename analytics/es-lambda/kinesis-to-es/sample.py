import base64
import boto3
import json
import requests
from requests_aws4auth import AWS4Auth

region = 'cn-north-1'  # e.g. us-west-1
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key,
                   region, service, session_token=credentials.token)

# the Amazon ES domain, including https://
host = ''
index = 'lambda-kine-index'
type = 'lambda-kine-type'
url = host + '/' + index + '/' + type + '/'

headers = {"Content-Type": "application/json"}


def handler(event, context):
    count = 0
    for record in event['Records']:
        id = record['eventID']
        timestamp = record['kinesis']['approximateArrivalTimestamp']

        # Kinesis data is base64-encoded, so decode here
        message = base64.b64decode(record['kinesis']['data']).decode('utf-8')

        # Create the JSON document
        document = {"id": id, "timestamp": timestamp, "message": message}
        print(document)
        # Index the document
        r = requests.put(url + id, auth=awsauth,
                         json=document, headers=headers)
        count += 1
    return 'Processed ' + str(count) + ' items.'
