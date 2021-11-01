# Capacity Units and Partitioning

## Create Table - logfile
1. Create table
- Attribute: PK and GSI_1_PK
- Key schema: PK (partition key)
- Global secondary index (GSI): GSI_1 with attribute GSI_1_PK as Hash key - Allows for querying by host IP address.

```bash
cd ~/workshop

aws dynamodb create-table --table-name logfile \
--attribute-definitions AttributeName=PK,AttributeType=S AttributeName=GSI_1_PK,AttributeType=S \
--key-schema AttributeName=PK,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
--tags Key=workshop-design-patterns,Value=targeted-for-cleanup \
--global-secondary-indexes "IndexName=GSI_1,\
KeySchema=[{AttributeName=GSI_1_PK,KeyType=HASH}],\
Projection={ProjectionType=INCLUDE,NonKeyAttributes=['bytessent']},\
ProvisionedThroughput={ReadCapacityUnits=5,WriteCapacityUnits=5}"

aws dynamodb wait table-exists --table-name logfile

aws dynamodb describe-table --table-name logfile --query "Table.TableStatus"

```

## Load data
1. Load small file
```bash
python load_logfile.py logfile ./data/logfile_small1.csv
```

2. Load large file, it will cause the `WriteThrottleEvents` on CloudWatch moinitor
```bash
python load_logfile.py logfile ./data/logfile_medium1.csv
```

- Why there are throttling events on the table but not on the global secondary index? 

The reason is a base table receives the writes immediately and consumes write capacity doing so, whereas a global secondary index’s capacity is consumed asynchronously some time after the initial write to the base table succeeds. In order for this system to work inside the DynamoDB service, there is a buffer between a given base DynamoDB table and a global secondary index (GSI). A base table will quickly surface a throttle if capacity is exhausted, whereas only an imbalance over an extended period of time on a GSI will cause the buffer to fill, thereby generating a throttle. In short, a GSI is more forgiving in the case of an imbalanced access pattern.

3. Increase the capacity of the table
```bash
aws dynamodb update-table --table-name logfile \
--provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100

time aws dynamodb wait table-exists --table-name logfile
```

4. Load the large file again, there is no `WriteThrottleEvents` on CloudWatch moinitor
```bash
python load_logfile.py logfile ./data/logfile_medium2.csv
```

## Global secondary index capacity
1. Create a new table with a low-capacity global secondary index (only 1 write capacity unit (WCU) and 1 read capacity unit (RCU) )
- Attribute: PK and GSI_1_PK
- Key schema: PK (partition key)
- Global secondary index (GSI): GSI_1 with attribute GSI_1_PK as Hash key - Allows for querying by host IP address.


```bash
aws dynamodb create-table --table-name logfile_gsi_low \
--attribute-definitions AttributeName=PK,AttributeType=S AttributeName=GSI_1_PK,AttributeType=S \
--key-schema AttributeName=PK,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=1000,WriteCapacityUnits=1000 \
--tags Key=workshop-design-patterns,Value=targeted-for-cleanup \
--global-secondary-indexes "IndexName=GSI_1,\
KeySchema=[{AttributeName=GSI_1_PK,KeyType=HASH}],\
Projection={ProjectionType=INCLUDE,NonKeyAttributes=['bytessent']},\
ProvisionedThroughput={ReadCapacityUnits=1,WriteCapacityUnits=1}"

aws dynamodb wait table-exists --table-name logfile_gsi_low

```

2. load data
```bash
cd ~/workshop
python load_logfile_parallel.py logfile_gsi_low

aws dynamodb scan --table-name logfile_gsi_low --index-name GSI_1 --select "COUNT"
```

After a few minutes, the execution of this script will be throttled and a `ProvisionedThroughputExceededException` reported. This indicates you should increase the provisioned capacity of the DynamoDB table, or enable DynamoDB auto scaling. Only the GSI has ‘Throttled write events’

```bash
botocore.errorfactory.ProvisionedThroughputExceededException: An error occurred (ProvisionedThroughputExceededException) when calling the BatchWriteItem operation (reached max retries: 9): The level of configured provisioned throughput for one or more global secondary indexes of the table was exceeded. Consider increasing your provisioning level for the under-provisioned global secondary indexes with the UpdateTable API
```

When a DynamoDB global secondary index’s write throttles are sufficient enough to create throttled requests, the behavior is called GSI back pressure. When GSI back pressure occurs, all writes to the DynamoDB table are rejected until space in the buffer between the DynamoDB base table and GSI opens up. Regardless of whether a new row is destined for a GSI, writes for a time will be rejected on the base table until space is available - DynamoDB does not have time to determine if a row to be written will be in the GSI or not. This is a troubling situation, but it’s an unavoidable constraint from DynamoDB because the service cannot create a buffer of unlimited size between your base table and GSI; there must be a limit to the number of items waiting to be copied from the base table into a GSI.