## Cross region replica

Here we use the Beijing and Ningxia as example, but you can use it from China region to global region  or  vise verse. 
For Beijing and Ningxia replication, you can leverage the Global Table of DynamoDB

## Create source table in Beijing
```bash
aws dynamodb create-table --table-name tlog \
--attribute-definitions AttributeName=requestid,AttributeType=N AttributeName=host,AttributeType=S \
--key-schema AttributeName=requestid,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100 \
--global-secondary-indexes  IndexName=host-requestid-gsi,\
KeySchema=["{AttributeName=host,KeyType=HASH},{AttributeName=requestid,KeyType=RANGE}"],\
Projection="{ProjectionType=INCLUDE,NonKeyAttributes=['bytessent']}",\
ProvisionedThroughput="{ReadCapacityUnits=100,WriteCapacityUnits=100}" --region cn-north-1

aws dynamodb wait table-exists --table-name tlog --region cn-north-1
aws dynamodb describe-table --table-name tlog --region cn-north-1| grep TableStatus
        "TableStatus": "ACTIVE", 
aws dynamodb describe-table --table-name tlog --region cn-north-1| grep IndexStatus
                "IndexStatus": "ACTIVE",
```

## Load the sample data
```
python load_tlog.py tlog ./data/logfile_medium1.csv
```


## Create replica table in Ningxia
```bash
aws dynamodb create-table --table-name tlog_replica \
--attribute-definitions AttributeName=requestid,AttributeType=N AttributeName=host,AttributeType=S \
--key-schema AttributeName=requestid,KeyType=HASH --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100 \
--global-secondary-indexes  IndexName=host-requestid-gsi,KeySchema=["{AttributeName=host,KeyType=HASH},{AttributeName=requestid,KeyType=RANGE}"],Projection="{ProjectionType=INCLUDE,NonKeyAttributes=['bytessent']}",ProvisionedThroughput="{ReadCapacityUnits=100,WriteCapacityUnits=100}" --region cn-northwest-1

aws dynamodb wait table-exists --table-name tlog_replica --region cn-northwest-1
aws dynamodb describe-table --table-name tlog_replica --region cn-northwest-1| grep TableStatus
        "TableStatus": "ACTIVE", 
aws dynamodb describe-table --table-name tlog_replica --region cn-northwest-1| grep IndexStatus
                "IndexStatus": "ACTIVE",
```

## Setup the replication
1. setup the IAM role required to execute the Lambda function
```bash
aws iam create-role --role-name ray_ddbreplica_role --path "/service-role/" \
--assume-role-policy-document file://iam-trust-relationship.json --region cn-north-1


# Associate the policy with the role
aws iam put-role-policy --role-name ray_ddbreplica_role \
--policy-name ddbreplica_policy --policy-document file://iam-role-policy.json --region cn-north-1
```

2. Create the lambda function
```bash
aws iam get-role --role-name ray_ddbreplica_role --query 'Role.Arn' --output text --region cn-north-1
arn:aws-cn:iam::876820548815:role/service-role/ray_ddbreplica_role

zip ddbreplica_lambda.zip ddbreplica_lambda.py
  adding: ddbreplica_lambda.py (deflated 56%)

aws lambda create-function --region cn-north-1 \
--function-name ddbreplica_lambda --zip-file fileb://ddbreplica_lambda.zip \
--role arn:aws-cn:iam::876820548815:role/service-role/ray_ddbreplica_role \
--handler ddbreplica_lambda.lambda_handler --timeout 60 --runtime python2.7 \
--description "Sample lambda function for dynamodb streams"
```

3. enable the DDB stream of source table
```bash
aws dynamodb update-table --table-name 'tlog' --region cn-north-1 \
--stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES

aws dynamodb describe-table --table-name 'tlog' --region cn-north-1 --query 'Table.LatestStreamArn' --output text
arn:aws-cn:dynamodb:cn-north-1:876820548815:table/tlog/stream/2019-02-13T05:45:58.026
```

4. Map the DynamoDB stream with the Lambda function
```bash
aws lambda create-event-source-mapping \
--event-source-arn arn:aws-cn:dynamodb:cn-north-1:876820548815:table/tlog/stream/2019-02-13T05:45:58.026 \
--function-name ddbreplica_lambda --enabled --batch-size 100 --starting-position TRIM_HORIZON --region cn-north-1
```

5. Load data and verify the replica table
```bash
python load_tlog.py tlog ./data/logfile_stream.csv
RowCount: 2000, Total seconds: 20.4914338589

aws dynamodb scan --table-name 'tlog' --max-items 2 --output json --region cn-north-1

aws dynamodb scan --table-name 'tlog_replica' --max-items 2 --output json --region cn-northwest-1

```