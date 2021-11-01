# Amazon DynamoDB Streams and AWS Lambda

You can Replicate items from one DynamoDB table to another table by using DynamoDB Streams and Lambda functions.

DynamoDB Streams captures a time-ordered sequence of item-level modifications in any DynamoDB table and stores this information in a log for up to 24 hours. 

Use case:
- A global multi-player game has a multi-leader database topology, storing data in multiple AWS Regions. Each region stays in sync by consuming and replaying the changes that occur in the remote Regions. 
- DynamoDB Global Tables
- A new customer adds data to a DynamoDB table. This event invokes an AWS Lambda function to copy the data to a separate DynamoDB table for long term retention 

![ddb-streams](image/ddb-streams.jpg)

## Create replica in the same region
1. Create replication table
```bash
aws dynamodb create-table --table-name logfile_replica \
--attribute-definitions AttributeName=PK,AttributeType=S AttributeName=GSI_1_PK,AttributeType=S \
--key-schema AttributeName=PK,KeyType=HASH --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
--tags Key=workshop-design-patterns,Value=targeted-for-cleanup \
--global-secondary-indexes "IndexName=GSI_1,KeySchema=[{AttributeName=GSI_1_PK,KeyType=HASH}],\
Projection={ProjectionType=INCLUDE,NonKeyAttributes=['bytessent', 'requestid', 'host']},\
ProvisionedThroughput={ReadCapacityUnits=10,WriteCapacityUnits=5}"

aws dynamodb wait table-exists --table-name logfile_replica

aws dynamodb describe-table --table-name logfile_replica | grep TableStatus
aws dynamodb describe-table --table-name logfile_replica | grep IndexStatus
```

| Attribute Name (Type) | Special Attribute? | Attribute Use Case | Sample Attribute Value |
| -- | -- | -- | -- |
| PK (STRING) | Partition key | Holds the request id | request#104009 |
| GSI_1_PK (STRING) | GSI 1 partition key | Host | host#66.249.67.3 |

2. Create IAM DDBReplicationRole Role
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Action": [
                "dynamodb:DescribeStream",
                "dynamodb:GetRecords",
                "dynamodb:GetShardIterator",
                "dynamodb:ListStreams"
            ],
            "Resource": [
                "*"
            ],
            "Effect": "Allow"
        },
        {
            "Action": [
                "dynamodb:DeleteItem",
                "dynamodb:PutItem"
            ],
            "Resource": [
                "*"
            ],
            "Effect": "Allow"
        },
        {
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "*"
            ],
            "Effect": "Allow"
        }
    ]
}
```

3. Create lambda function
```bash
zip ddbreplica_lambda.zip ddbreplica_lambda.py lab_config.py

cat ~/workshop/ddb-replication-role-arn.txt

aws lambda create-function \
--function-name ddbreplica_lambda --zip-file fileb://ddbreplica_lambda.zip \
--handler ddbreplica_lambda.lambda_handler --timeout 60 --runtime python3.7 \
--description "Sample lambda function for dynamodb streams" \
--role $(cat ~/workshop/ddb-replication-role-arn.txt)
```

4. Enable dynamoDB stream - StreamViewType=NEW_IMAGE
```bash
aws dynamodb update-table --table-name 'logfile' --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE

YOUR_STREAM_ARN_HERE=`aws dynamodb describe-table --table-name 'logfile' --query 'Table.LatestStreamArn' --output text`
```

5. Map the source stream to the Lambda function 
```bash
aws lambda create-event-source-mapping \
--function-name ddbreplica_lambda --enabled --batch-size 100 --starting-position TRIM_HORIZON \
--event-source-arn $YOUR_STREAM_ARN_HERE
```


6. Load data into table and verify the replication to logfile_replica table
```bash
python load_logfile.py logfile ./data/logfile_stream.csv

row: 100 in 0.9216587543487549
row: 200 in 0.9173557758331299
...
RowCount: 2000, Total seconds: 16.663453102111816

# Verfiy the replication to logfile_replica table
aws dynamodb scan --table-name 'logfile_replica' --max-items 2 --output json

```

## Create stream replica cross regions
[DDB Stream CRR by Lambda](DDB-Stream-CRR-by-Lambda.md)