# Global Secondary Index

- Global Secondary Index Write Sharding: Query a sharded global secondary index to quickly read sorted data by status code and date.
- Global Secondary Index Key Overloading: Explore how to maintain the ability to query on many attributes when you have a multi-entity table.
- Sparse Global Secondary Indexes: Learn how to cut down the resources required for your searches on uncommon attributes.

## Global Secondary Index Write Sharding

Partition key values determine the logical partitions in which your data is stored. Therefore, it is important to choose a partition key value that uniformly distributes the workload across all partitions in the table or global secondary index. 

- query the items with response code 4xx, which are a very small percentage of the total data and do not have an even distribution by response code. 

You will create a write-sharded global secondary index on a table to randomize the writes across multiple logical partition key values. This increases the write and read throughput of the application. To apply this design pattern, you can create a random number from a fixed set (for example, 1 to 10), and use this number as the logical partition key for a global secondary index. If the application needs to query the log records by a specific response code on a specific date, you can create a composite sort key using a combination of the response code and the date.

1. Check existed GSI
```bash
aws dynamodb describe-table --table-name logfile_scan --query "Table.GlobalSecondaryIndexes"
```
```json 
        "IndexName": "GSI_1",
        "KeySchema": [
            {
                "AttributeName": "GSI_1_PK",
                "KeyType": "HASH"
            },
            {
                "AttributeName": "GSI_1_SK",
                "KeyType": "RANGE"
            }
        ]
```

2. Create the GSI
```bash
vim load_logfile_parallel.py
```
```python
    SHARDS = 10
                    newitem = {}
                    newitem['requestid'] = (thread_id * rows_of_thread) + (i * rows_of_file) + int(row[0])
                    newitem['host'] = row[1]
                    newitem['date'] =  row[2]
                    newitem['hourofday'] = int(row[3])
                    newitem['timezone'] = row[4]
                    newitem['method'] = row[5]
                    newitem['url'] = row[6]
                    newitem['responsecode'] = int(row[7])
                    newitem['bytessent'] = int(row[8])
                    newitem['useragent'] = row[9]

                    # Set primary keys
                    if tableName == "logfile_gsi_low":
                        newitem["GSI_1_PK"] = "host#{}".format(newitem['host'])
                    else:
                        newitem['GSI_1_PK'] = "shard#{}".format((newitem['requestid'] % SHARDS) + 1)
                        newitem['GSI_1_SK'] = row[7] + "#" + row[2] + "#" + row[3]

                    newitem['PK'] = "request#{}".format((thread_id * rows_of_thread) + (i * rows_of_file) + int(row[0]))
```

Here
- create a global secondary index using random values for the partition key
- the composite key `responsecode#date#hourofday` as the sort key

```python
SHARDS = 10
newitem['GSI_1_PK'] = "shard#{}".format((newitem['requestid'] % SHARDS) + 1)
newitem['GSI_1_SK'] = row[7] + "#" + row[2] + "#" + row[3]
```

3. Querying the GSI with shards
- Query with GSI
```python
    if date == "all":
        ke = Key('GSI_1_PK').eq("shard#{}".format(shardid)) & Key('GSI_1_SK').begins_with(responsecode)
    else:
        ke = Key('GSI_1_PK').eq("shard#{}".format(shardid)) & Key('GSI_1_SK').begins_with(responsecode+"#"+date)

    response = table.query(
        IndexName='GSI_1',
        KeyConditionExpression=ke
        )

## 
    SHARDS = 10

    begin_time = time.time()
    thread_list = []
    #
    for i in range(SHARDS):
        thread = threading.Thread(target=query_responsecode_shard, args=(args.table, i, args.responsecode, args.date))
        thread.start()
        thread_list.append(thread)
```

- via response code
```bash
python query_responsecode.py logfile_scan 404

Records with response code 404 in the shardid 0 = 0
Records with response code 404 in the shardid 1 = 1747
Records with response code 404 in the shardid 2 = 2496
Records with response code 404 in the shardid 3 = 1248
Records with response code 404 in the shardid 4 = 998
Records with response code 404 in the shardid 5 = 998
Records with response code 404 in the shardid 6 = 1748
Records with response code 404 in the shardid 7 = 1497
Records with response code 404 in the shardid 8 = 3245
Records with response code 404 in the shardid 9 = 2744
Number of records with responsecode 404 is 16721. Query time: 1.3614766597747803 seconds
```
- via response code and date: `404#2017-07-21`
```bash
python query_responsecode.py logfile_scan 404 --date 2017-07-21
Records with response code 404 in the shardid 0 = 0
Records with response code 404 in the shardid 1 = 749
Records with response code 404 in the shardid 2 = 749
Records with response code 404 in the shardid 3 = 249
Records with response code 404 in the shardid 4 = 500
Records with response code 404 in the shardid 5 = 0
Records with response code 404 in the shardid 6 = 249
Records with response code 404 in the shardid 7 = 998
Records with response code 404 in the shardid 8 = 997
Records with response code 404 in the shardid 9 = 996
Number of records with responsecode 404 is 5487. Query time: 1.1099436283111572 seconds
```

4. Summary:
Use GSI write sharding when you need a scalable sorted index.
The sharded GSI example used a set range of keys from 0 to 9 inclusive, but in your own application you can choose any range. In your application, you can add more shards as the number of items indexed increase. In each shard, the data is sorted on disk by the sort key.

## Global Secondary Index Key Overloading

The global secondary index key overloading design pattern is enabled by designating and reusing an attribute name (column header) across different item types and storing a value in that attribute depending on the context of the item type. When you create a global secondary index on that attribute, you are indexing for multiple access patterns, each for a different item type—and have used only 1 global secondary index.

1. Table design

Consider employee table can contain items with 3 types of entities:
- `metadata` (for employee details), 
- `employee-title` (all the job titles that the employee has held), 
- `employee-location` (all the office buildings and locations where the employee has worked).

Access pattern for employee table:
- Query all employees of a state
- Query all employees with one specific current title
- Query all employees who had ever one specific title
- Query employees by name

The re-use of a given global secondary index for multiple entity types such as employees, employee locations, and employee titles lets us simplify our management of the DynamoDB table

Attribute and key schema:
- The attribute `PK` has the employee ID, which is prefixed by the `e#`
- The overloaded attribute `SK` has either current title, previous title, or the keyword root, which denotes the primary item for the employee that holds most of their important attributes. 
- The overloaded attribute GSI_1_PK has either the title, the state, the name or the keyword root of the employee. 

2. Create Table and load data
```bash
aws dynamodb create-table --table-name employees \
--attribute-definitions AttributeName=PK,AttributeType=S AttributeName=SK,AttributeType=S \
AttributeName=GSI_1_PK,AttributeType=S AttributeName=GSI_1_SK,AttributeType=S \
--key-schema AttributeName=PK,KeyType=HASH AttributeName=SK,KeyType=RANGE \
--provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100 \
--tags Key=workshop-design-patterns,Value=targeted-for-cleanup \
--global-secondary-indexes "IndexName=GSI_1,\
KeySchema=[{AttributeName=GSI_1_PK,KeyType=HASH},{AttributeName=GSI_1_SK,KeyType=RANGE}],\
Projection={ProjectionType=ALL},\
ProvisionedThroughput={ReadCapacityUnits=100,WriteCapacityUnits=100}"

aws dynamodb wait table-exists --table-name employees
```

3. load the data

When load the data, the python script create the 3 different entities which stored in the same `employee` table. And set the attributes values based on the entity type with different prefix.

| Attribute Name (Type) | Special Attribute? | Attribute Use Case | Sample Attribute Value |
| -- | -- | -- | -- |
| PK (STRING) | Partition Key | Employee ID | e#129 |
| SK (STRING) | Sort key | Derived value | root, state#MI, current_title#Support Specialist |
| GSI_1_PK (STRING) | GSI_1 partition key | Derived value | root, state#MI, previous_title#Software Archiect |
| GSI_1_SK (STRING) | GSI_1 sort key | Employee name | Christine Milsted |

```python
        myreader = csv.reader(csvfile, delimiter=',')
        for row in myreader:
            count += 1
            newEmployee = {}
            #primary keys
            newEmployee['PK'] = "e#{}".format(row[0])
            newEmployee['SK']  = 'root'
            newEmployee['GSI_1_PK'] = 'root'
            newEmployee['GSI_1_SK']  = row[1]
            newEmployee['GSI_3_PK'] = "state#{}".format(row[5])
            newEmployee['GSI_3_SK'] = "{}#{}".format(row[4], row[3])

            newEmployee['employeeid'] = int(row[0])
            newEmployee['name'] = row[1]
            newEmployee['title'] = row[2]
            newEmployee['dept'] = row[3]
            newEmployee['city'] = row[4]
            newEmployee['state'] = row[5]
            newEmployee['city_dept'] = newEmployee['GSI_3_SK']
            newEmployee['dob'] = row[6]
            newEmployee['hire_date'] = row[7]
            newEmployee['previous_title'] = row[8]
            newEmployee['previous_title_end'] = row[9]
            newEmployee['lock']  = '0'
            if len(row) == 11:
                newEmployee['is_manager'] = row[10]
                newEmployee['GSI_2_PK'] = str(newEmployee['is_manager'])
                newEmployee['GSI_2_SK'] = "root"


            item = dynamodb_table.put_item(Item=newEmployee)

            newCurrentTitle = {}
            newCurrentTitle['employeeid'] = newEmployee['employeeid']
            newCurrentTitle['name'] = newEmployee['name']
            newCurrentTitle['hire_date'] = newEmployee['hire_date']
            newCurrentTitle['PK'] = newEmployee['PK']
            newCurrentTitle['SK'] = 'current_title#' + newEmployee['title']
            newCurrentTitle['GSI_1_PK'] = newCurrentTitle['SK']
            newCurrentTitle['GSI_1_SK'] = newCurrentTitle['name']
            item = dynamodb_table.put_item(Item=newCurrentTitle)

            newPreviousTitle = {}
            newPreviousTitle['employeeid'] = newEmployee['employeeid']
            newPreviousTitle['name'] = newEmployee['name']
            newPreviousTitle['hire_date'] = newEmployee['hire_date']
            newPreviousTitle['PK'] = newEmployee['PK']
            newPreviousTitle['SK'] = 'previous_title#' + newEmployee['previous_title']
            newPreviousTitle['GSI_1_PK'] = newPreviousTitle['SK']
            newPreviousTitle['GSI_1_SK'] = newPreviousTitle['name']
            item = dynamodb_table.put_item(Item=newPreviousTitle)

            newLocation = {}
            newLocation['employeeid'] = newEmployee['employeeid']
            newLocation['name'] = newEmployee['name']
            newLocation['hire_date'] = newEmployee['hire_date']
            newLocation['city_dept'] = newEmployee['city_dept']
            newLocation['PK'] = newEmployee['PK']
            newLocation['SK'] = 'state#' + newEmployee['state']
            newLocation['GSI_1_PK'] = newLocation['SK']
            newLocation['GSI_1_SK'] = newLocation['name']

            item = dynamodb_table.put_item(Item=newLocation)
```
```bash
python load_employees.py employees ./data/employees.csv
```

- Review the employees table in the DynamoDB
```sql
SELECT PK, SK, GSI_1_PK, GSI_1_SK FROM "employees"
SELECT PK, SK, GSI_1_PK, GSI_1_SK FROM "employees"."GSI_1"
```
![overload-gsi](image/overload-gsi.png)

4. Query the data using the global secondary index with overloaded attributes
```python
def query_gsi(tableName,attribute,value,):
    dynamodb = boto3.resource(**boto_args)
    table = dynamodb.Table(tableName)

    if attribute == 'name':
        ke = Key('GSI_1_PK').eq('root') & Key('GSI_1_SK').eq(value)
    else:
        ke = Key('GSI_1_PK').eq(attribute + "#" + value)

    response = table.query(
        IndexName='GSI_1',
        KeyConditionExpression=ke
        )

    print('List of employees with %s in the attribute %s:' % (value,attribute))
    for i in response['Items']:
        print('\tEmployee name: %s - hire date: %s' % (i['name'],i['hire_date']))

    return response['Count']

query_gsi(tableName,attribute,value)
```

```bash
python query_employees.py employees state 'WA'
List of employees with WA in the attribute state:
        Employee name: Alice Beilby - hire date: 2014-12-03
        Employee name: Alla Absalom - hire date: 2015-06-25
....
Total of employees: 46. Execution time: 0.1370227336883545 seconds

python query_employees.py employees current_title 'Software Engineer'
List of employees with Software Engineer in the attribute current_title:
        Employee name: Alice Beilby - hire date: 2014-12-03
        Employee name: Anetta Byrne - hire date: 2017-04-09
....
Total of employees: 18. Execution time: 0.1332569122314453 seconds

python query_employees.py employees previous_title 'IT Support Manager'
List of employees with IT Support Manager in the attribute previous_title:
        Employee name: Bert Arangy - hire date: 2015-10-23
        Employee name: Dennis Muckleston - hire date: 2015-11-24
....
Total of employees: 15. Execution time: 0.14421916007995605 seconds

python query_employees.py employees name 'Anetta Byrne'
List of employees with Anetta Byrne in the attribute name:
        Employee name: Anetta Byrne - hire date: 2017-04-09
Total of employees: 1. Execution time: 0.12787413597106934 seconds
```

## Sparse Global Secondary Indexes

You can use a sparse global secondary index to locate table items that have an uncommon attribute. Only populate to the GSI when meet some condition (uncommon attribute means the value is rarely appear, such as normal web server 4xx / 5xx error). 

You take advantage of the fact that table items that do not contain global secondary index attribute(s) are not indexed at all. Such a query for table items with an uncommon attribute can be efficient because the number of items in the index is significantly lower than the number of items in the table. In addition, the fewer table attributes you project into the index, the fewer write and read capacity units you consume from the index.

1. Create the Sparse Global Secondary Indexes

Add a new GSI that uses the `is_manager` attribute as the partition key, which is stored under the attribute named `GSI_2_PK`. `Employee job titles` are stored under `GSI_2_SK`.

- Index definition `gsi_manager.json`
```json
"Create": {
      "IndexName": "GSI_2",
      "KeySchema": [
        {
          "AttributeName": "GSI_2_PK",
          "KeyType": "HASH"
        },
        {
          "AttributeName": "GSI_2_SK",
          "KeyType": "RANGE"
        }
      ],
      "Projection": {
        "ProjectionType": "ALL"
      },
      "ProvisionedThroughput": {
        "ReadCapacityUnits": 10,
        "WriteCapacityUnits": 10
      }
    }
  }
```
- Add 2 new attibutes `GSI_2_PK` and `GSI_2_SK`
```bash
aws dynamodb update-table --table-name employees \
--attribute-definitions AttributeName=GSI_2_PK,AttributeType=S AttributeName=GSI_2_SK,AttributeType=S \
--global-secondary-index-updates file://gsi_manager.json

aws dynamodb describe-table --table-name employees --query "Table.GlobalSecondaryIndexes[].IndexStatus"
```

2. Populate the index 
```python
            if len(row) == 11:
                newEmployee['is_manager'] = row[10]
                newEmployee['GSI_2_PK'] = str(newEmployee['is_manager'])
                newEmployee['GSI_2_SK'] = "root"
```
```bash
python load_employees.py employees ./data/employees.csv
```

3. Scan the employees table to find managers without using the sparse GSI
- query code
```python
def scan_table(tableName,pageSize):
    dynamodb = boto3.resource(**boto_args)
    table = dynamodb.Table(tableName)

    page = 1
    count = 0
    managers_count = 0

    fe = "is_manager = :f"
    eav = {":f": "1"}
    response = table.scan(
        FilterExpression=fe,
        ExpressionAttributeValues=eav,
        Limit=pageSize
        )
    count = count + response['ScannedCount']
    managers_count = managers_count + response['Count']

    while 'LastEvaluatedKey' in response:
        page += 1
        response = table.scan(
            FilterExpression=fe,
            ExpressionAttributeValues=eav,
            Limit=pageSize,
            ExclusiveStartKey=response['LastEvaluatedKey'])
        count = count + response['ScannedCount']
        managers_count = managers_count + response['Count']

    return count, managers_count

count, managers_count = scan_table(tableName,int(pagesize))
```
- execution
```bash
python scan_for_managers.py employees 100
Managers count: 84. # of records scanned: 4000. Execution time: 0.4079911708831787 seconds

# Changing the page size to a larger number such as 1000. The execution time will decrease because there are fewer round trips to DynamoDB. A Scan API call can return up to 1MB of data at a time.
python scan_for_managers.py employees 1000
Managers count: 84. # of records scanned: 4000. Execution time: 0.22079229354858398 seconds
```

4. Scan the employees table to find managers with using the sparse GSI
- query code
```python
def scan_table(tableName,pageSize):
    dynamodb = boto3.resource(**boto_args)
    table = dynamodb.Table(tableName)

    page = 1
    count = 0
    managers_count = 0

    response = table.scan(
        Limit=pageSize,
        IndexName='GSI_2'
        )

    count = count + response['ScannedCount']
    managers_count = managers_count + response['Count']

    while 'LastEvaluatedKey' in response:
        page += 1
        response = table.scan(
            Limit=pageSize,
            IndexName='GSI_2',
            ExclusiveStartKey=response['LastEvaluatedKey'])
        count = count + response['ScannedCount']
        managers_count = managers_count + response['Count']

    return count, managers_count


count, managers_count = scan_table(tableName,int(pagesize))
```
- execution

Only the contain newEmployee['is_manager'] attribute items will be indexed into GSI_2 - Sparse GSI. So no need `FilterExpression` when scan the GSI_2 - Sparse GSI. The scanned count and execution time using the sparse index is less data and more efficient on query time. `Further more, in this case changing the page size to a larger number such as 1000 will not impact the performance. A Scan API call can return up to 1MB of data at a time.`

```bash
python scan_for_managers_gsi.py employees 100
Number of managers: 84. # of records scanned: 84. Execution time: 0.14310407638549805 seconds

python scan_for_managers_gsi.py employees 1000
Number of managers: 84. # of records scanned: 84. Execution time: 0.14537501335144043 seconds

```

## Reference
[Choosing the Right DynamoDB Partition Key](https://aws.amazon.com/blogs/database/choosing-the-right-dynamodb-partition-key/)