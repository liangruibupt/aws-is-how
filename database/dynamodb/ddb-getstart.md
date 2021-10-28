# DynamoDB quick start

## Create the DynamoDB Tables
```bash
aws dynamodb create-table \
    --table-name ProductCatalog \
    --attribute-definitions AttributeName=Id,AttributeType=N \
    --key-schema AttributeName=Id,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5

aws dynamodb create-table \
    --table-name Forum \
    --attribute-definitions AttributeName=Name,AttributeType=S \
    --key-schema AttributeName=Name,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5

aws dynamodb create-table \
    --table-name Thread \
    --attribute-definitions AttributeName=ForumName,AttributeType=S AttributeName=Subject,AttributeType=S \
    --key-schema AttributeName=ForumName,KeyType=HASH AttributeName=Subject,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5

aws dynamodb create-table \
    --table-name Reply \
    --attribute-definitions AttributeName=Id,AttributeType=S AttributeName=ReplyDateTime,AttributeType=S \
    --key-schema AttributeName=Id,KeyType=HASH AttributeName=ReplyDateTime,KeyType=RANGE \
    --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5

aws dynamodb wait table-exists --table-name ProductCatalog && \
aws dynamodb wait table-exists --table-name Reply && \
aws dynamodb wait table-exists --table-name Forum && \
aws dynamodb wait table-exists --table-name Thread

```

## Load Sample Data
```bash
wget https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/samples/sampledata.zip

unzip sampledata.zip

aws dynamodb batch-write-item --request-items file://ProductCatalog.json

aws dynamodb batch-write-item --request-items file://Forum.json

aws dynamodb batch-write-item --request-items file://Thread.json

aws dynamodb batch-write-item --request-items file://Reply.json
```

## Explore DynamoDB with the CLI
1. Read Sample Data

By default a read from DynamoDB will use eventual consistency because eventually consistent reads in DynamoDB are half the price of a strongly consistent read.  

The Key Condition Expression will define the number of RCUs that are consumed by our Query.

- Scan
```bash
aws dynamodb scan --table-name ProductCatalog
```
- Query
```bash
aws dynamodb get-item \
    --table-name ProductCatalog \
    --key '{"Id":{"N":"101"}}'
```
- Query with --consistent-read and --projection-expression
```bash
aws dynamodb get-item \
    --table-name ProductCatalog \
    --key '{"Id":{"N":"101"}}' \
    --consistent-read \
    --projection-expression "ProductCategory, Price, Title" \
    --return-consumed-capacity TOTAL
```
- Query with --projection-expression and without --consistent-read
```bash
aws dynamodb get-item \
    --table-name ProductCatalog \
    --key '{"Id":{"N":"101"}}' \
    --projection-expression "ProductCategory, Price, Title" \
    --return-consumed-capacity TOTAL
```

2. Reading Item Collections using Query

Item Collections are groups of Items that share a Partition Key. By definition, Item Collections can only exist in tables that have both a Partition Key and a Sort Key. 

Customer can optionally specify a Filter Expression for our Query. This is the part of the WHERE clause that acts on the non-Key attributes. Filter Expressions act to remove some items from the Result Set returned by the Query, but they do not affect the consumed capacity of the Query. 

- Key Condition only with Partition Key
```bash
aws dynamodb query \
    --table-name Reply \
    --key-condition-expression 'Id = :Id' \
    --expression-attribute-values '{":Id" : {"S": "Amazon DynamoDB#DynamoDB Thread 1"} }' \
    --return-consumed-capacity TOTAL
```
- Key Condition only with Partition Key and Sort key
```bash
aws dynamodb query \
    --table-name Reply \
    --key-condition-expression 'Id = :Id and ReplyDateTime > :ts' \
    --expression-attribute-values '{ ":Id" : {"S": "Amazon DynamoDB#DynamoDB Thread 1"}, ":ts" : {"S": "2015-09-21"} }' \
    --return-consumed-capacity TOTAL
```
- Filter Condition
```bash
aws dynamodb query \
    --table-name Reply \
    --key-condition-expression 'Id = :Id' \
    --filter-expression 'PostedBy = :user' \
    --expression-attribute-values '{":Id" : {"S": "Amazon DynamoDB#DynamoDB Thread 1"}, ":user" : {"S": "User B"} }' \
    --return-consumed-capacity TOTAL

# Key Condition Expression matched 2 items (ScannedCount) and the Filter Expression reduced the result set size down to 1 item (Count).
    "Count": 1,
    "ScannedCount": 2,
```
- return only the first reply to a thread :  `max-items` and `scan-index-forward`
```bash
aws dynamodb query \
    --table-name Reply \
    --key-condition-expression 'Id = :Id' \
    --expression-attribute-values '{":Id" : {"S": "Amazon DynamoDB#DynamoDB Thread 1"} }' \
    --max-items 1 \
    --scan-index-forward  \
    --return-consumed-capacity TOTAL
```
- return only the most recent reply for a thread : descending order of the sort key `no-scan-index-forward`
```bash
aws dynamodb query \
    --table-name Reply \
    --key-condition-expression 'Id = :Id' \
    --expression-attribute-values '{":Id" : {"S": "Amazon DynamoDB#DynamoDB Thread 1"} }' \
    --max-items 1 \
    --no-scan-index-forward  \
    --return-consumed-capacity TOTAL
```

3. Working with Table Scans

The Scan API is similar to the Query API except that it scans the whole table and not just query a single Item Collection. There is no Key Condition Expression for a Scan. However, you can specify a Filter Expression which will reduce the size of the result set (even though it will not reduce the amount of capacity consumed).

- find all the replies in the Reply that were posted by User A
```bash
aws dynamodb scan \
    --table-name Reply \
    --filter-expression 'PostedBy = :user' \
    --expression-attribute-values '{":user" : {"S": "User A"} }' \
    --return-consumed-capacity TOTAL

"Count": 3,
"ScannedCount": 4,
```

- Pagenation with `NextToken`

If the scan hits the 1MB limit on the server side, or there may be more items left than --max-items parameter specified, the scan response will include a NextToken which we can then issue to a subsequent scan call to pick up where we left off.

```bash
aws dynamodb scan \
    --table-name Reply \
    --filter-expression 'PostedBy = :user' \
    --expression-attribute-values '{ ":user" : {"S": "User A"} }' \
    --max-items 2 \
    --return-consumed-capacity TOTAL

    "Count": 3,
    "ScannedCount": 4,
    "ConsumedCapacity": {
        "TableName": "Reply",
        "CapacityUnits": 0.5
    },
    "NextToken": "eyJFeGNsdXNpdmVTdGFydEtleSI6IG51bGwsICJib3RvX3RydW5jYXRlX2Ftb3VudCI6IDJ9"

aws dynamodb scan \
    --table-name Reply \
    --filter-expression 'PostedBy = :user' \
    --expression-attribute-values '{ ":user" : {"S": "User A"} }' \
    --max-items 2 \
    --starting-token eyJFeGNsdXNpdmVTdGFydEtleSI6IG51bGwsICJib3RvX3RydW5jYXRlX2Ftb3VudCI6IDJ9 \
    --return-consumed-capacity TOTAL

    "Count": 0,
    "ScannedCount": 0,
    "ConsumedCapacity": {
        "TableName": "Reply",
        "CapacityUnits": 0.5
    }

```

- return only the Forums that have more than 1 thread and more than 50 views.
```bash
aws dynamodb scan \
    --table-name Forum \
    --filter-expression 'Threads >= :threads AND Views >= :views' \
    --expression-attribute-values '{ ":threads" : {"N": "1"}, ":views" : {"N": "50"} }' \
    --return-consumed-capacity TOTAL

aws dynamodb scan \
    --table-name Forum \
    --filter-expression 'Threads >= :threads AND #Views >= :views' \
    --expression-attribute-values '{ ":threads" : {"N": "1"}, ":views" : {"N": "50"} }' \
    --expression-attribute-names '{"#Views" : "Views"}' \
    --return-consumed-capacity TOTAL
```

4. Inserting/Updating Data
- Insert data
```bash
aws dynamodb put-item \
    --table-name Reply \
    --item '{
        "Id" : {"S": "Amazon DynamoDB#DynamoDB Thread 2"},
        "ReplyDateTime" : {"S": "2021-04-27T17:47:30Z"},
        "Message" : {"S": "DynamoDB Thread 2 Reply 3 text"},
        "PostedBy" : {"S": "User C"}
    }' \
    --return-consumed-capacity TOTAL

    {
        "ConsumedCapacity": {
            "TableName": "Reply",
            "CapacityUnits": 1.0
        }
    }
```
- Updating Data

This API requires you to specify the full Primary Key and can selectively modify specific attributes without changing others. API call also allows you to specify a ConditionExpression, meaning the Update request will only execute if the ConditionExpression is satisfied. 

```bash
aws dynamodb update-item \
    --table-name Forum \
    --key '{ "Name" : {"S": "Amazon DynamoDB"} }' \
    --update-expression "SET Messages = :newMessages" \
    --condition-expression "Messages = :oldMessages" \
    --expression-attribute-values '{
        ":oldMessages" : {"N": "4"},
        ":newMessages" : {"N": "5"}
    }' \
    --return-consumed-capacity TOTAL

    {
        "ConsumedCapacity": {
            "TableName": "Forum",
            "CapacityUnits": 1.0
        }
    }
```
- Update the ProductCatalog item where Id=201 to add new colors “Blue” and “Yellow” to the list of colors for that bike type. Then use the API to remove those “Blue” and “Yellow” list entries
```bash
aws dynamodb update-item \
    --table-name ProductCatalog \
    --key '{ "Id" : {"N": "201"} }' \
    --update-expression "SET #Color = list_append(#Color, :values)" \
    --expression-attribute-names '{"#Color": "Color"}' \
    --expression-attribute-values '{
        ":values" : {"L": [{"S" : "Blue"}, {"S" : "Yellow"}]}
    }' \
    --return-consumed-capacity TOTAL

{
    "ConsumedCapacity": {
        "TableName": "ProductCatalog",
        "CapacityUnits": 1.0
    }
}

aws dynamodb update-item \
    --table-name ProductCatalog \
    --key '{ "Id" : {"N": "201"} }' \
    --update-expression "REMOVE #Color[2], #Color[3]" \
    --expression-attribute-names '{"#Color": "Color"}' \
    --return-consumed-capacity TOTAL
```