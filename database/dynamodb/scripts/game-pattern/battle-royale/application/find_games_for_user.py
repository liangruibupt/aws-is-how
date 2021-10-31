import boto3

from entities import UserGameMapping

dynamodb = boto3.client('dynamodb')

USERNAME = "carrpatrick"


def find_games_for_user(username):
    try:
        resp = dynamodb.query(
            TableName='battle-royale',
            IndexName='InvertedIndex',
            KeyConditionExpression="SK = :sk",
            ExpressionAttributeValues={
                ":sk": { "S": "USER#{}".format(username) }
            },
            ScanIndexForward=True
        )
    except Exception as e:
        print('Index is still backfilling. Please try again in a moment.')
        return None

    return [UserGameMapping(item) for item in resp['Items']]

games = find_games_for_user(USERNAME)

if games:
    print("Games played by {}:".format(USERNAME))
    for game in games:
        print(game)
