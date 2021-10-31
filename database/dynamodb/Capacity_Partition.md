1. Create Table
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
```

2. Load data
```bash
python load_logfile.py logfile ./data/logfile_small1.csv
```

3. Load large file, it will cause the `WriteThrottleEvents` on CloudWatch moinitor
```bash
python load_logfile.py logfile ./data/logfile_medium1.csv
```

Why there are throttling events on the table but not on the global secondary index? 

The reason is a base table receives the writes immediately and consumes write capacity doing so, whereas a global secondary index’s capacity is consumed asynchronously some time after the initial write to the base table succeeds. In order for this system to work inside the DynamoDB service, there is a buffer between a given base DynamoDB table and a global secondary index (GSI). A base table will quickly surface a throttle if capacity is exhausted, whereas only an imbalance over an extended period of time on a GSI will cause the buffer to fill, thereby generating a throttle. In short, a GSI is more forgiving in the case of an imbalanced access pattern.

4. Increase the capacity of the table
```bash
aws dynamodb update-table --table-name logfile \
--provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100

time aws dynamodb wait table-exists --table-name logfile
```

5. Load the large file again, there is no `WriteThrottleEvents` on CloudWatch moinitor
```bash
python load_logfile.py logfile ./data/logfile_medium2.csv
```

6. Create a new table with a low-capacity global secondary index (only 1 write capacity unit (WCU) and 1 read capacity unit (RCU) )
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
```

```bash
aws dynamodb create-table --table-name logfile_scan \
--attribute-definitions AttributeName=PK,AttributeType=S AttributeName=GSI_1_PK,AttributeType=S AttributeName=GSI_1_SK,AttributeType=S \
--key-schema AttributeName=PK,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=5000,WriteCapacityUnits=5000 \
--tags Key=workshop-design-patterns,Value=targeted-for-cleanup \
--global-secondary-indexes "IndexName=GSI_1,\
KeySchema=[{AttributeName=GSI_1_PK,KeyType=HASH},{AttributeName=GSI_1_SK,KeyType=RANGE}],\
Projection={ProjectionType=KEYS_ONLY},\
ProvisionedThroughput={ReadCapacityUnits=3000,WriteCapacityUnits=5000}"

aws dynamodb wait table-exists --table-name logfile_scan
```
```bash
nohup python load_logfile_parallel.py logfile_scan &

pgrep -l python
```