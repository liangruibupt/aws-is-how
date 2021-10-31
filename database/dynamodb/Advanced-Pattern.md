# Advanced Design Patterns

- DynamoDB Capacity Units and Partitioning: Learn about provisioned capacity.
- Sequential and Parallel Table Scans: Learn the difference between sequential and parallel scans.
- Global Secondary Index Write Sharding: Query a sharded global secondary index to quickly read sorted data by status code and date.
- Global Secondary Index Key Overloading: Explore how to maintain the ability to query on many attributes when you have a multi-entity table.
- Sparse Global Secondary Indexes: Learn how to cut down the resources required for your searches on uncommon attributes.
- Composite Keys: Learn how to combine two attributes into one to take advantage of the DynamoDB sort key.
- Adjacency Lists: Learn how to store multiple entity types in one DynamoDB table.
- DynamoDB Streams and AWS Lambda: Learn how to process DynamoDB items with AWS Lambda for endless triggers.

1. Launch the Lab environment with [CloudFormation](scripts/lab.yaml) and Using System Manager to login the EC2

2. [DynamoDB Capacity Units and Partitioning](Capacity_Partition.md)


- Create Table and load data
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

python load_employees.py employees ./data/employees.csv
```
- query data from GSI
```python
if attribute == 'name':
    ke = Key('GSI_1_PK').eq('root') & Key('GSI_1_SK').eq(value)
else:
    ke = Key('GSI_1_PK').eq(attribute + "#" + value)

response = table.query(
    IndexName='GSI_1',
    KeyConditionExpression=ke
    )
```
```bash
python query_employees.py employees state 'WA'

python query_employees.py employees state 'TX'
```