import boto3

session = boto3.Session(region_name='us-east-2')
dynamodb = session.client('dynamodb')

try:
    dynamodb.create_table(
        TableName='battle-royale',
        AttributeDefinitions=[
            {
                "AttributeName": "PK",
                "AttributeType": "S"
            },
            {
                "AttributeName": "SK",
                "AttributeType": "S"
            }
        ],
        KeySchema=[
            {
                "AttributeName": "PK",
                "KeyType": "HASH"
            },
            {
                "AttributeName": "SK",
                "KeyType": "RANGE"
            }
        ],
        ProvisionedThroughput={
            "ReadCapacityUnits": 20,
            "WriteCapacityUnits": 20
        }
    )
    print("Table created successfully.")
except Exception as e:
    print("Could not create table. Error:")
    print(e)