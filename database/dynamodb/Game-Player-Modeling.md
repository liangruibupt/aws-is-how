# Modeling Game Player Data

DynamoDB is used by existing customers in GameTech particularly https://aws.amazon.com/dynamodb/gaming/

NoSQL databases are designed for speed and scale — not flexibility. DynamoDB provides consistent performance at any scale. When using DynamoDB, it is important to consider how you will access your data (your access patterns) before you model your data. 
- minimize the number of requests to DynamoDB for each access pattern: Ideally, each access pattern should require only a single request to DynamoDB
- Don’t fake a relational model
    - Avoid Normalization: DynamoDB does not allow for joins because they slow down as your table grows.
    - Avoid One entity type per table: DynamoDB often include different types of data in a single table.
    - Avoid Too many secondary indexes: Using the index overloading to use the flexibility in your attributes to reuse a single secondary index across multiple data types in your table

This lab used to learn about the access patterns in the gaming application, and learn about how to design a DynamoDB table to handle the access patterns by using secondary indexes and transactions.
- A single-table design that combines multiple entity types in one table.
- A composite primary key that allows for many-to-many relationships.
- A sparse global secondary index (GSI) to filter on one of the fields.
- DynamoDB transactions to handle complex write patterns across multiple entities.
- An inverted index (GSI) to allow reverse lookups on the many-to-many entity.


The scenario is online multiplayer game. During the game, you have to update a specific player’s record to indicate the amount of time the player has been playing, the number of kills they’ve recorded, or whether they won the game. Users want to see old games they’ve played, either to view the games’ winners or to watch a replay of each game’s action.

## Prepare
1. Launch the Cloud9 instance
2. load the code
```bash
cd ~/environment
mkdir ddb-game-player
cd ddb-game-player/
curl -sL https://s3.amazonaws.com/ddb-labs/battle-royale.tar | tar -xv

export AWS_DEFAULT_REGION=us-east-2

aws configure
AWS Access Key ID [None]: 
AWS Secret Access Key [None]: 
Default region name [None]: us-east-2
Default output format [None]: json
```

## The entity-relationship diagram
- User
- Game
- UserGameMapping
![erd](image/erd.png)

## Access Patterns
- User
    - Create user profile (Write)
    - Update user profile (Write)
    - Get user profile (Read)
- Game
    - Create game (Write)
    - Find open games (Read)
    - Find open games by map (Read)
    - View game (Read)
    - View users in game (Read)
    - Join game for a user (Write)
    - Start game (Write)
    - Update game for user (Write)
    - Update game (Write)
    - Find all past games for a user (Read)

## Design primary key best practices
- Start with the different entities in your table - be sure your primary key has a way to distinctly identify each entity and enable core actions on individual items
- Use prefixes to distinguish between entity types - PK for customer: `CUSTOMER#<CUSTOMERID>`, PK for employee: `EMPLOYEE#<EMPLOYEEID>`
- Focus on single-item actions first, and then add multiple-item actions if possible

A UserGameMapping is a record that indicates a user joined a game. There is a many-to-many relationship between User and Game. If your data model has multiple entities with relationships among them, you generally use a composite primary key with both partition key and sort key values. 

| Entity | Partition Key | Sort Key |
| -- | -- | -- |
| User | `USER#<USERNAME>` | `#METADATA#<USERNAME>` |
| Game | `GAME#<GAME_ID>` | `#METADATA#<GAME_ID>` | 
| UserGameMapping | `GAME#<GAME_ID>` | `USER#<USERNAME>` |

## The table design

Because different entities are stored in a single table `battle-royale`, you can’t use primary key attribute names such as `UserId`. The attribute means something different based on the type of entity being stored. For example, the primary key for a `user` might be its `USERNAME`, and the primary key for a `game` might be its `GAMEID`. 

```python
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
        ]
```

- Sample data: different entities `User`, `Game` and `UserGameMapping` are stored in a single table `battle-royale` 

```json
{"PK": "USER#lindsay56", "SK": "#METADATA#lindsay56", "address": "8896 Johnson Alley Suite 499\nPhillipsberg, AR 08144", "birthdate": "1920-04-17", "email": "sanchezlaura@yahoo.com", "name": "Daniel Price", "username": "lindsay56"}
{"PK": "USER#maryharris", "SK": "#METADATA#maryharris", "address": "8434 West Forge Apt. 395\nWest Brenda, HI 36952", "birthdate": "1926-03-09", "email": "charleswayne@gmail.com", "name": "Alyssa Robinson", "username": "maryharris"}

{"PK": "GAME#0ab37cf1-fc60-4d93-b72b-89335f759581", "SK": "#METADATA#0ab37cf1-fc60-4d93-b72b-89335f759581", "game_id": "0ab37cf1-fc60-4d93-b72b-89335f759581", "map": "Green Grasslands", "create_time": "2019-04-16T00:41:18", "people": 34, "open_timestamp": "2019-04-16T00:41:18", "creator": "jackparks"}
{"PK": "GAME#c9c3917e-30f3-4ba4-82c4-2e9a0e4d1cfd", "SK": "#METADATA#c9c3917e-30f3-4ba4-82c4-2e9a0e4d1cfd", "game_id": "c9c3917e-30f3-4ba4-82c4-2e9a0e4d1cfd", "map": "Dirty Desert", "create_time": "2019-04-13T14:25:57", "people": 50, "start_time": "2019-04-13T14:36:25", "creator": "gstanley"}

{"PK": "GAME#3d4285f0-e52b-401a-a59b-112b38c4a26b", "SK": "USER#pboyd", "username": "pboyd", "game_id": "3d4285f0-e52b-401a-a59b-112b38c4a26b"}
{"PK": "GAME#3d4285f0-e52b-401a-a59b-112b38c4a26b", "SK": "USER#victoriapatrick", "username": "victoriapatrick", "game_id": "3d4285f0-e52b-401a-a59b-112b38c4a26b"}
```

- Create table and load data
```bash
cd ddb-game-player/
python scripts/create_table.py

python scripts/bulk_load_table.py

aws dynamodb scan --table-name battle-royale --select COUNT --return-consumed-capacity TOTAL
```

## Test the access pattern - Retrieve Item collections
### Fetch game and players:  

This Query table `battle-royale` uses a `PK` of `GAME#<GameId>`. Then, it requests any entities where the `SK` is between `#METADATA#<GameId>` and `USER$`. This grabs the `Game` entity, whose sort key is `#METADATA#<GameId>`, and all `UserGameMapping` entities, whose keys start with `USER#`

```python
    resp = dynamodb.query(
        TableName='battle-royale',
        KeyConditionExpression="PK = :pk AND SK BETWEEN :metadata AND :users",
        ExpressionAttributeValues={
            ":pk": { "S": "GAME#{}".format(game_id) },
            ":metadata": { "S": "#METADATA#{}".format(game_id) },
            ":users": { "S": "USER$" },
        },
        ScanIndexForward=True
    )
```

```bash
python application/fetch_game_and_players.py
```

### Find open games
1. Design practice

    Find games with open spots so that users which games they can join. 

    The primary key for a global secondary index does not have to be unique for each item. DynamoDB then copies items into the index based on the attributes specified, and you can query it just like you do the table. 

    Consider the open game is small case, we will learn the sparse GSI. With secondary indexes, DynamoDB copies items from the original table only if they have the elements of the primary key in the secondary index. Items that don’t have the primary key elements are not copied, which is why these secondary indexes are called “sparse.”

2. Access Patern: 
- Find open games (Read)
- Find open games by map (Read)

    The `open_timestamp` attribute for the game, indicating the time the game was opened. When a game becomes full, the open_timestamp attribute is deleted. So we can use the `map` as partition key and `open_timestamp` as sort key for GSI. When the attribute is deleted, the filled game is removed from the GSI because it doesn’t have a value for the sort key attribute. This is what keeps the index sparse: It includes only open games that have the `open_timestamp` attribute.

    ```json
    {"PK": "GAME#0ab37cf1-fc60-4d93-b72b-89335f759581", "SK": "#METADATA#0ab37cf1-fc60-4d93-b72b-89335f759581", "game_id": "0ab37cf1-fc60-4d93-b72b-89335f759581", "map": "Green Grasslands", "create_time": "2019-04-16T00:41:18", "people": 34, "open_timestamp": "2019-04-16T00:41:18", "creator": "jackparks"}
    ```

3. GSI design

Whenever attributes are used in a primary key for a table or secondary index, they must be defined in AttributeDefinitions. Then, you Create a new GSI in the GlobalSecondaryIndexUpdates property. 

```python
    GlobalSecondaryIndexUpdates=[
            {
                "Create": {
                    "IndexName": "OpenGamesIndex",
                    "KeySchema": [
                        {
                            "AttributeName": "map",
                            "KeyType": "HASH"
                        },
                        {
                            "AttributeName": "open_timestamp",
                            "KeyType": "RANGE"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "ALL"
                    },
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 1,
                        "WriteCapacityUnits": 1
                    }
                }
            }
        ]
```

```bash
python scripts/add_secondary_index.py
# Watch checks every 5 seconds by default
watch -n 5 "aws dynamodb describe-table --table-name battle-royale --query \"Table.GlobalSecondaryIndexes[].IndexStatus\""
```

3. Query the sparse GSI
- find open game by map
```python
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
```
```bash
python application/find_open_games_by_map.py
```

4. Scan the sparse GSI
- find open games
```python
resp = dynamodb.scan(
        TableName='battle-royale',
        IndexName="OpenGamesIndex",
    )
    games = [Game(item) for item in resp['Items']]
    return games
```
```bash
python application/find_open_games.py
```
- Scan via PartiQL on DynamoDB console
```sql
SELECT * FROM "battle-royale"."OpenGamesIndex"
```

## Write the data to DDB
1. Access patterns:
- Join game for a user (Write) on Users and Games entities
- Start game (Write) on Game entity

2. Write Appoarch:
- Default Write: Enventually consistant
- DynamoDB transaction: DynamoDB transactions make it easier to build applications that alter multiple items as part of a single operation. You can operate on up to 25 items as part of a single transaction request
    - Put: For inserting or overwriting an item.
    - Update: For updating an existing item.
    - Delete: For removing an item.
    - ConditionCheck: For asserting a condition on an existing item without altering the item.

3. Add users to a game
- Confirm that there are not already 50 players in the game (each game can have a maximum of 50 players). `Game` entity and `ConditionExpression`
- Confirm that the user is not already in the game. `UserGameMapping` entity and `ConditionExpression`
- Create a new UserGameMapping entity to add the user to the game. `UserGameMapping` entity and `Put`
- Increment the people attribute on the Game entity to track how many players are in the game. `Game` entity and `Update`
```python
        resp = dynamodb.transact_write_items(
            TransactItems=[
                {
                    "Put": {
                        "TableName": "battle-royale",
                        "Item": {
                            "PK": {"S": "GAME#{}".format(game_id) },
                            "SK": {"S": "USER#{}".format(username) },
                            "game_id": {"S": game_id },
                            "username": {"S": username }
                        },
                        "ConditionExpression": "attribute_not_exists(SK)",
                        "ReturnValuesOnConditionCheckFailure": "ALL_OLD"
                    },
                },
                {
                    "Update": {
                        "TableName": "battle-royale",
                        "Key": {
                            "PK": { "S": "GAME#{}".format(game_id) },
                            "SK": { "S": "#METADATA#{}".format(game_id) },
                        },
                        "UpdateExpression": "SET people = people + :p",
                        "ConditionExpression": "people <= :limit",
                        "ExpressionAttributeValues": {
                            ":p": { "N": "1" },
                            ":limit": { "N": "50" }
                        },
                        "ReturnValuesOnConditionCheckFailure": "ALL_OLD"
                    }
                }
            ]
        )
```

```bash
Admin:~/environment/ddb-game-player $ python application/join_game.py
Added vlopez to game c6f38a6a-d1c5-4bdf-8468-24692ccc4646
Admin:~/environment/ddb-game-player $ python application/join_game.py
Could not add user to game
```

4. Start a game

    As soon as a game has 50 users, the creator of the game can start the game to initiate gameplay. Handle the `Game` entity with `ConditionExpression` and update/add/delete the attributes of `Game` entity
    
    Check condition - `ConditionExpression`
- The game has 50 people signed up.
- The requesting user is the creator of the game.
- The game has not already started.
    
    Take action - update/add/delete the attributes of `Game` entity
    - Remove the open_timestamp attribute so that it does not appear as an open game in the sparse GSI created earlier.
    - Add a start_time attribute to indicate when the game started.

```python
        resp = dynamodb.update_item(
            TableName='battle-royale',
            Key={
                "PK": { "S": "GAME#{}".format(game_id) },
                "SK": { "S": "#METADATA#{}".format(game_id) }
            },
            UpdateExpression="REMOVE open_timestamp SET start_time = :time",
            ConditionExpression="people = :limit 
                AND creator = :requesting_user 
                AND attribute_not_exists(start_time)",
            ExpressionAttributeValues={
                ":time": { "S": start_time.isoformat() },
                ":limit": { "N": "50" },
                ":requesting_user": { "S": requesting_user }
            },
            ReturnValues="ALL_NEW"
        )
```

```bash
Admin:~/environment/ddb-game-player $ python application/start_game.py
Started game: Game<c6f38a6a-d1c5-4bdf-8468-24692ccc4646 -- Urban Underground>
Admin:~/environment/ddb-game-player $ python application/start_game.py
Could not start game
```

5. View past games - find all past games for a user via `inverted index`

There is a many-to-many relationship between the `Game` entity and the associated `User` entities, and the relationship is represented by a `UserGameMapping` entity

With the primary key setup, you can find all the `User` entities in a `Game`. You can enable querying all `Game` entities for a `User` by using an `inverted index`. In DynamoDB, an `inverted index` is a global secondary index (GSI) that is the `inverse of your primary key`. The sort key becomes your partition key and vice versa. This pattern flips your table and allows you to query on the other side of your many-to-many relationships.

Sample data

```json
{"PK": "USER#lindsay56", "SK": "#METADATA#lindsay56", "address": "8896 Johnson Alley Suite 499\nPhillipsberg, AR 08144", "birthdate": "1920-04-17", "email": "sanchezlaura@yahoo.com", "name": "Daniel Price", "username": "lindsay56"}
{"PK": "USER#maryharris", "SK": "#METADATA#maryharris", "address": "8434 West Forge Apt. 395\nWest Brenda, HI 36952", "birthdate": "1926-03-09", "email": "charleswayne@gmail.com", "name": "Alyssa Robinson", "username": "maryharris"}

{"PK": "GAME#0ab37cf1-fc60-4d93-b72b-89335f759581", "SK": "#METADATA#0ab37cf1-fc60-4d93-b72b-89335f759581", "game_id": "0ab37cf1-fc60-4d93-b72b-89335f759581", "map": "Green Grasslands", "create_time": "2019-04-16T00:41:18", "people": 34, "open_timestamp": "2019-04-16T00:41:18", "creator": "jackparks"}
{"PK": "GAME#c9c3917e-30f3-4ba4-82c4-2e9a0e4d1cfd", "SK": "#METADATA#c9c3917e-30f3-4ba4-82c4-2e9a0e4d1cfd", "game_id": "c9c3917e-30f3-4ba4-82c4-2e9a0e4d1cfd", "map": "Dirty Desert", "create_time": "2019-04-13T14:25:57", "people": 50, "start_time": "2019-04-13T14:36:25", "creator": "gstanley"}

{"PK": "GAME#3d4285f0-e52b-401a-a59b-112b38c4a26b", "SK": "USER#pboyd", "username": "pboyd", "game_id": "3d4285f0-e52b-401a-a59b-112b38c4a26b"}
{"PK": "GAME#3d4285f0-e52b-401a-a59b-112b38c4a26b", "SK": "USER#victoriapatrick", "username": "victoriapatrick", "game_id": "3d4285f0-e52b-401a-a59b-112b38c4a26b"}
```

- Add an inverted index
```python
    dynamodb.update_table(
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
        GlobalSecondaryIndexUpdates=[
            {
                "Create": {
                    "IndexName": "InvertedIndex",
                    "KeySchema": [
                        {
                            "AttributeName": "SK",
                            "KeyType": "HASH"
                        },
                        {
                            "AttributeName": "PK",
                            "KeyType": "RANGE"
                        }
                    ],
                    "Projection": {
                        "ProjectionType": "ALL"
                    },
                    "ProvisionedThroughput": {
                        "ReadCapacityUnits": 20,
                        "WriteCapacityUnits": 20
                    }
                }
            }
        ]
```

```bash
python scripts/add_inverted_index.py

aws dynamodb describe-table --table-name battle-royale --query "Table.GlobalSecondaryIndexes[].IndexStatus"
```

- Retrieve games for a user
```python
    resp = dynamodb.query(
            TableName='battle-royale',
            IndexName='InvertedIndex',
            KeyConditionExpression="SK = :sk",
            ExpressionAttributeValues={
                ":sk": { "S": "USER#{}".format(username) }
            },
            ScanIndexForward=True
        )
```

```bash
Admin:~/environment/ddb-game-player $ python application/find_games_for_user.py
Games played by carrpatrick:
UserGameMapping<25cec5bf-e498-483e-9a00-a5f93b9ea7c7 -- carrpatrick -- SILVER>
UserGameMapping<c9c3917e-30f3-4ba4-82c4-2e9a0e4d1cfd -- carrpatrick>
```

### Clean up
1. Delete the CloudFormation Stack
2. Delete the DynamoDB table