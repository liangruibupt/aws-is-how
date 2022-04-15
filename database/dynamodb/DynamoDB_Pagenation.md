# DynamoDB pagination
- [DynamoDB pagination](#dynamodb-pagination)
  - [Scan and Query](#scan-and-query)
  - [Paginating Table Query Results](#paginating-table-query-results)
  - [How to get item count from DynamoDB query result?](#how-to-get-item-count-from-dynamodb-query-result)
    - [If you only want to the `Returns the number of matching items, rather than the matching items themselves.`](#if-you-only-want-to-the-returns-the-number-of-matching-items-rather-than-the-matching-items-themselves)
    - [If want to know the items and the number of items](#if-want-to-know-the-items-and-the-number-of-items)
  - [Nodejs Query paginattion Example](#nodejs-query-paginattion-example)
  - [Pyhton query paginattion example](#pyhton-query-paginattion-example)
  - [Python scan paginattion example](#python-scan-paginattion-example)
  
## Scan and Query
If you use the Scan and implement the paginattion the result by code, it reads up the whole table, for large table (huge number of records), this operation will exhauste the RCU.

I would suggest use the Query with LastEvaluatedKey

## Paginating Table Query Results
[Paginating Table Query Results Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html)

A single Query only returns a result set that fits within the 1 MB size limit. To determine whether there are more results, and to retrieve them one page at a time, applications should do the following:

1. Examine the low-level Query result:
    - If the result contains a LastEvaluatedKey element and it's non-null, proceed to step 2.
    - If there is not a LastEvaluatedKey in the result, there are no more items to be retrieved.
2. Construct a new Query request, with the same parameters as the previous one. However, this time, take the LastEvaluatedKey value from step 1 and use it as the ExclusiveStartKey parameter in the new Query request.
3. Run the new Query request.
4. Go to step 1.

The LastEvaluatedKey from a Query response should be used as the ExclusiveStartKey for the next Query request. If there is not a LastEvaluatedKey element in a Query response, then you have retrieved the final page of results. If LastEvaluatedKey is not empty, it does not necessarily mean that there is more data in the result set. The only way to know when you have reached the end of the result set is when LastEvaluatedKey is empty.

## How to get item count from DynamoDB query result?
You can use the `Count` and `ScannedCount`: The number of items in the response.

### If you only want to the `Returns the number of matching items, rather than the matching items themselves.`
You can use the `select "COUNT"` parameter in your request. The `Select` control the attributes to be returned in the result. You can retrieve all item attributes, specific item attributes, the count of matching items, or in the case of an index, some or all of the attributes projected into the index. More details please check [DDB-Query-request-Select)](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#DDB-Query-request-Select)

```bash
aws dynamodb scan \
    --table-name <tableName> \
    --filter-expression "#v = :num" \
    --expression-attribute-names '{"#v": "fieldName"}' \
    --expression-attribute-values '{":num": {"N": "123"}}' \
    --select "COUNT"
```

```java
AmazonDynamoDBClientBuilder.standard().withRegion(region).withCredentials(credentialsProvider).build()                .query(new QueryRequest(freeKeysTableName).withSelect(Select.COUNT)).getCount()
```

### If want to know the items and the number of items
- If you used a QueryFilter in the request, then Count is the number of items returned after the filter was applied, and ScannedCount is the number of matching items before the filter was applied.

- If you did not use a filter in the request, then Count and ScannedCount are the same.

More details please check [DDB-Query-response-Count](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html#DDB-Query-response-Count)

```java
final String week = "whatever";
final Integer myPoint = 1337;
Condition weekCondition = new Condition()
        .withComparisonOperator(ComparisonOperator.EQ)
        .withAttributeValueList(new AttributeValue().withS(week));
Condition myPointCondition = new Condition()
        .withComparisonOperator(ComparisonOperator.GE)
        .withAttributeValueList(new AttributeValue().withN(myPoint.toString()))

Map<String, Condition> keyConditions = new HashMap<>();
keyConditions.put("week", weekCondition);
keyConditions.put("point", myPointCondition);

QueryRequest request = new QueryRequest("game_table");
request.setIndexName("week-point-index");
request.setSelect(Select.COUNT);
request.setKeyConditions(keyConditions);

QueryResult result = dynamoDBClient.query(request);
Integer count = result.getCount();

```

## Nodejs Query paginattion Example
```javascript
const getAllItems = async () => {
  let result, accumulated, ExclusiveStartKey;

  do {
    result = await DynamoDB.query({
      TableName: argv.table,
      ExclusiveStartKey,
      Limit: 100,
      KeyConditionExpression: 'id = :hashKey and createdAt > :rangeKey'
      ExpressionAttributeValues: {
        ':hashKey': '123',
        ':rangeKey': 20150101
      },
    }).promise();

    ExclusiveStartKey = result.LastEvaluatedKey;
    accumulated = [...accumulated, ...result.Items];
  } while (result.Items.length || result.LastEvaluatedKey);

  return accumulated;
};

getAll()
  .then(console.log)
  .catch(console.error);
```

## Pyhton query paginattion example
```python
    def run(date: int, start_epoch: int, end_epoch: int):
            dynamodb = boto3.resource('dynamodb',
                                      region_name='REGION',
                                      config=Config(proxies={'https': 'PROXYIP'}))
        
            table = dynamodb.Table('XYZ')
        
            response = table.query(
                KeyConditionExpression=Key('date').eq(date) & Key('uid').between(start_epoch, end_epoch)
            )
        
            for i in response[u'Items']:
                print(json.dumps(i, cls=DecimalEncoder))
        
            while 'LastEvaluatedKey' in response:
                response = table.query(
                    KeyConditionExpression=Key('date').eq(date) & Key('uid').between(start_epoch, end_epoch),
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
        
                for i in response['Items']:
                    print(json.dumps(i, cls=DecimalEncoder))
```

## Python scan paginattion example
```python
    def scan_movies(self, year_range):
        """
        Scans for movies that were released in a range of years.
        Uses a projection expression to return a subset of data for each movie.
        :param year_range: The range of years to retrieve.
        :return: The list of movies released in the specified years.
        """
        movies = []
        scan_kwargs = {
            'FilterExpression': Key('year').between(year_range['first'], year_range['second']),
            'ProjectionExpression': "#yr, title, info.rating",
            'ExpressionAttributeNames': {"#yr": "year"}}
        try:
            done = False
            start_key = None
            while not done:
                if start_key:
                    scan_kwargs['ExclusiveStartKey'] = start_key
                response = self.table.scan(**scan_kwargs)
                movies.extend(response.get('Items', []))
                start_key = response.get('LastEvaluatedKey', None)
                done = start_key is None
        except ClientError as err:
            logger.error(
                "Couldn't scan for movies. Here's why: %s: %s",
                err.response['Error']['Code'], err.response['Error']['Message'])
            raise
```