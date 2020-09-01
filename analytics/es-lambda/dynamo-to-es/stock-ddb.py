import json
import boto3
import random
import datetime
from botocore.exceptions import ClientError

dynamodb_client = boto3.client('dynamodb', region_name='cn-north-1')

DDB_TABLE_NAME = 'lambda-es'

def getStock(count):
    now = datetime.datetime.now()
    str_now = now.timestamp()
    ticker = random.choice(['AAPL', 'AMZN', 'MSFT', 'INTC', 'TBV'])
    price = random.random() * 100
    price_num = round(price, 2)
    data = {
        'recordId': {'S': str(count)},
        'price': {'N': str(price_num)},
        'ticker': {'S': str(ticker)},
        'event_time': {'N': str(str_now)}
    }
    return data


count = 0
while True:
    try:
        item = getStock(count)
        response = dynamodb_client.put_item(
            TableName =DDB_TABLE_NAME,
            Item = item
        )
        print(item)
        count += 1
    except ClientError as e:
        print(e)
