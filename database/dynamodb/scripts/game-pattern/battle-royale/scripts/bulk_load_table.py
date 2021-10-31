import json

import boto3

session = boto3.Session(region_name='us-east-2')
dynamodb = session.resource('dynamodb')
table = dynamodb.Table('battle-royale')

items = []

with open('scripts/items.json', 'r') as f:
    for row in f:
        items.append(json.loads(row))

with table.batch_writer() as batch:
    for item in items:
        batch.put_item(Item=item)
