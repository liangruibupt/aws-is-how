import boto3

from entities import Game

session = boto3.Session(region_name='us-east-2')
dynamodb = session.client('dynamodb')

MAP_NAME = "Green Grasslands"

def find_open_games_by_map(map_name):
    resp = dynamodb.query(
        TableName='battle-royale',
        IndexName="OpenGamesIndex",
        KeyConditionExpression="#map = :map",
        ExpressionAttributeNames={
            "#map": "map"
        },
        ExpressionAttributeValues={
            ":map": { "S": map_name },
        },
        ScanIndexForward=True
    )

    games = [Game(item) for item in resp['Items']]

    return games

games = find_open_games_by_map(MAP_NAME)
print("Open games for {}:".format(MAP_NAME))
for game in games:
    print(game)
