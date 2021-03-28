import json
import boto3
import random
import datetime

kinesis = boto3.client('firehose')


def getReferrer():
    data = {}
    now = datetime.datetime.now()
    str_now = now.isoformat()
    data['EVENT_TIME'] = str_now
    data['TICKER'] = random.choice(['AAPL', 'AMZN', 'MSFT', 'INTC', 'TBV'])
    price = random.random() * 100
    data['PRICE'] = round(price, 2)
    return data


count = 0
while True:
    data = json.dumps(getReferrer())
    count += 1
    print(data)
    kinesis.put_record(
        DeliveryStreamName="ExampleDeliveryStream",
        Record={
            'Data':data
            }
        )
    if(count>10000):
        break
