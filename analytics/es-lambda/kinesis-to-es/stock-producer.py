import json
import boto3
import random
import datetime

kinesis = boto3.client('kinesis', region_name='cn-north-1')


def getStock(count):
    data = {}
    now = datetime.datetime.now()
    str_now = now.timestamp()
    data['EVENT_TIME'] = str_now
    data['TICKER'] = random.choice(['AAPL', 'AMZN', 'MSFT', 'INTC', 'TBV'])
    price = random.random() * 100
    data['PRICE'] = round(price, 2)
    data['ID'] = count
    return data


count = 0
while True:
    stock = getStock(count)
    data = json.dumps(getStock(count))
    count += 1
    print(data)
    kinesis.put_record(
        StreamName="lambda-stream",
        Data=data,
        PartitionKey=stock['TICKER'])
