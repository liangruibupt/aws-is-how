import boto3
import requests
from requests_aws4auth import AWS4Auth

region = 'cn-north-1'  # e.g. us-east-1
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key,
                   region, service, session_token=credentials.token)

host = ''  # the Amazon ES domain, with https://
index = 'lambda-index'
type = 'lambda-type'
url = host + '/' + index + '/' + type + '/'

headers = {"Content-Type": "application/json"}


def handler(event, context):
    count = 0
    for record in event['Records']:
        # Get the primary key for use as the Elasticsearch ID
        id = record['dynamodb']['Keys']['recordId']['S']

        if record['eventName'] == 'REMOVE':
            r = requests.delete(url + id, auth=awsauth)
        else:
            document = record['dynamodb']['NewImage']
            print(document)
            r = requests.put(url + id, auth=awsauth,
                             json=document, headers=headers)
        count += 1
    myip = requests.get('http://checkip.amazonaws.com').text.rstrip()
    return_msg = str(count) + " records processed on {}".format(myip)
    return return_msg
