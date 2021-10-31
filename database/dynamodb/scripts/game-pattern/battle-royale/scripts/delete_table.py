import boto3

session = boto3.Session(region_name='us-east-2')
dynamodb = session.client('dynamodb')

try:
    dynamodb.delete_table(TableName='battle-royale')
    print("Table deleted successfully.")
except Exception as e:
    print("Could not delete table. Please try again in a moment. Error:")
    print(e)
