import json
import os
import urllib
import boto3
import random
import string
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr
import decimal

CURRENT_REGION = os.environ["AWS_REGION"]
session = boto3.session.Session(region_name=CURRENT_REGION)
dynamodb_resource = boto3.resource('dynamodb')
dynamodb_client = session.client('dynamodb')
DDB_TABLE_NAME = 'Movies'

def create_ddb_table():
    try:
        response = dynamodb_client.describe_table(TableName=DDB_TABLE_NAME)
    except dynamodb_client.exceptions.ResourceNotFoundException:
        try:
            table = dynamodb_client.create_table(
                TableName=DDB_TABLE_NAME,
                KeySchema=[
                    {
                        'AttributeName': 'title',
                        'KeyType': 'HASH'  # Partition key
                    },
                    {
                        'AttributeName': 'year',
                        'KeyType': 'RANGE'  # Sort key
                    }
                ],
                AttributeDefinitions=[
                    {
                        'AttributeName': 'year',
                        'AttributeType': 'N'
                    },
                    {
                        'AttributeName': 'title',
                        'AttributeType': 'S'
                    },

                ],
                ProvisionedThroughput={
                    'ReadCapacityUnits': 5,
                    'WriteCapacityUnits': 5
                }
            )
            dynamodb_client.get_waiter('table_exists').wait(
                TableName=DDB_TABLE_NAME)
            print("Table status:", table)
            body = {
                "message": "Lambda successfully create dynamodb table!",
                "output": DDB_TABLE_NAME
            }
        except ClientError as e:
            print(e)
            return {
                'statusCode': 500,
                'body': 'create ddb table Movies failed: ' + e.response['Error']['Message']
            }
        pass


def put_ddb_item(event, context):
    letters = string.ascii_letters
    result_str = ''.join(random.choice(letters) for i in range(10))

    default_title = "The Big New Movie " + result_str
    default_year = 2015
    title = event.get('movie_title', default_title)
    year = event.get('year', default_year)

    create_ddb_table()
    try:
        response = dynamodb_client.put_item(
            TableName=DDB_TABLE_NAME,
            Item={
                'year': {'N': str(year)},
                'title': {'S': title},
                'info': {
                    'M': {
                        'plot': {'S': "Put new Movie Item."},
                        'rating': {'N': str(round(random.uniform(0, 10), 2))}
                    }
                }
            }
        )
        print("PutItem succeeded:")
        body = {
            "message": "Lambda successfully put dynamodb item!",
            "output": response
        }
        print(json.dumps(response, indent=4))
        return body
    except ClientError as e:
        print(e)
        return {
            'statusCode': 500,
            'body': 'ddb put_item failed: ' + e.response['Error']['Message']
        }


class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            return float(o)
        super(DecimalEncoder, self).default(o)


def get_ddb_item(event, context):
    default_title = "The Big New Movie "
    default_year = 2015
    title = event.get('movie_title', default_title)
    year = int(event.get('year', default_year))
    print('Input parameters: year={} and title={}'.format(title, year))

    try:
        table = dynamodb_resource.Table(DDB_TABLE_NAME)
        response = table.query(
            ProjectionExpression="#yr, title, info.plot, info.rating",
            ExpressionAttributeNames={"#yr": "year"},
            KeyConditionExpression=Key('year').eq(
                year) & Key('title').eq(title)
        )
        items = response['Items']
        body = {
            "message": "Lambda successfully get dynamodb item!",
            "output": items
        }
        print("GetItem succeeded:")
        print(json.dumps(body, indent=4, cls=DecimalEncoder))
    except ClientError as e:
        print(e)
        return {
            'statusCode': 500,
            'body': 'ddb get_item failed: ' + e.response['Error']['Message']
        }

    return {
        'statusCode': 200,
        'body': body
    }
