import boto3

from entities import Game

session = boto3.Session(region_name='us-east-2')
dynamodb = session.client('dynamodb')

def find_open_games():
    resp = dynamodb.scan(
        TableName='battle-royale',
        IndexName="OpenGamesIndex",
    )

    games = [Game(item) for item in resp['Items']]

    return games

games = find_open_games()
print("Open games:")
for game in games:
    print(game)
