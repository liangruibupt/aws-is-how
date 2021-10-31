
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