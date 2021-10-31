aws dynamodb create-table --table-name tlog_replica \
--attribute-definitions AttributeName=requestid,AttributeType=N AttributeName=host,AttributeType=S \
--key-schema AttributeName=requestid,KeyType=HASH --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=5 \
--global-secondary-indexes  IndexName=host-requestid-gsi,KeySchema=["{AttributeName=host,KeyType=HASH},{AttributeName=requestid,KeyType=RANGE}"],Projection="{ProjectionType=INCLUDE,NonKeyAttributes=['bytessent']}",ProvisionedThroughput="{ReadCapacityUnits=10,WriteCapacityUnits=5}"

table tlog_replica
- Attribute: requestid
- Key Type: Hash
- Table RCU = 10
- Table WCU = 5

GSI host-requestid-gsi
- Attribute: host --
- Key Type: Hash
- Attribute: requestid
- Key Type: Range
- Projection Include: bytessent
- GSI RCU = 10
- GSI WCU = 5

{
    "TableDescription": {
        "TableArn": "arn:aws:dynamodb:us-west-2:653299296276:table/tlog_replica", 
        "AttributeDefinitions": [
            {
                "AttributeName": "host", 
                "AttributeType": "S"
            }, 
            {
                "AttributeName": "requestid", 
                "AttributeType": "N"
            }
        ], 
        "GlobalSecondaryIndexes": [
            {
                "IndexSizeBytes": 0, 
                "IndexName": "host-requestid-gsi", 
                "Projection": {
                    "ProjectionType": "INCLUDE", 
                    "NonKeyAttributes": [
                        "bytessent"
                    ]
                }, 
                "ProvisionedThroughput": {
                    "NumberOfDecreasesToday": 0, 
                    "WriteCapacityUnits": 5, 
                    "ReadCapacityUnits": 10
                }, 
                "IndexStatus": "CREATING", 
                "KeySchema": [
                    {
                        "KeyType": "HASH", 
                        "AttributeName": "host"
                    }, 
                    {
                        "KeyType": "RANGE", 
                        "AttributeName": "requestid"
                    }
                ], 
                "IndexArn": "arn:aws:dynamodb:us-west-2:653299296276:table/tlog_replica/index/host-requestid-gsi", 
                "ItemCount": 0
            }
        ], 
        "ProvisionedThroughput": {
            "NumberOfDecreasesToday": 0, 
            "WriteCapacityUnits": 5, 
            "ReadCapacityUnits": 10
        }, 
        "TableSizeBytes": 0, 
        "TableName": "tlog_replica", 
        "TableStatus": "CREATING", 
        "TableId": "9d90061d-de44-4813-b737-792379636313", 
        "KeySchema": [
            {
                "KeyType": "HASH", 
                "AttributeName": "requestid"
            }
        ], 
        "ItemCount": 0, 
        "CreationDateTime": 1550029491.356
    }
}

[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb wait table-exists --table-name tlog_replica
[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb describe-table --table-name tlog_replica | grep TableStatus
        "TableStatus": "ACTIVE", 
[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb describe-table --table-name tlog_replica | grep IndexStatus
                "IndexStatus": "ACTIVE", 


====Creaet IAM Role ====
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "lambda:InvokeFunction",
            "Resource": "arn:aws:lambda:**REGION:ACCOUNTID**:function:ddbreplica_lambda*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:DescribeStream",
                "dynamodb:GetRecords",
                "dynamodb:GetShardIterator",
                "dynamodb:ListStreams"
            ],
            "Resource": "arn:aws:dynamodb:**REGION:ACCOUNTID**:table/tlog/stream/_"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:DeleteItem",
                "dynamodb:PutItem"
            ],
            "Resource": "arn:aws:dynamodb:**REGION:ACCOUNTID**:table/tlog_replica"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs::*:*"
            ]
        }
    ]
}

=== create lambda function===
[ec2-user@ip-172-31-37-202 workshop]$ zip ddbreplica_lambda.zip ddbreplica_lambda.py
  adding: ddbreplica_lambda.py (deflated 57%)

[ec2-user@ip-172-31-37-202 workshop]$ aws iam get-role --role-name ddbreplica_role --query 'Role.Arn' --output text
arn:aws:iam::653299296276:role/ddbreplica_role

aws lambda create-function \
--function-name ddbreplica_lambda --zip-file fileb://ddbreplica_lambda.zip \
--handler ddbreplica_lambda.lambda_handler --timeout 60 --runtime python2.7 \
--description "Sample lambda function for dynamodb streams" \
--role arn:aws:iam::653299296276:role/ddbreplica_role

{
    "TracingConfig": {
        "Mode": "PassThrough"
    }, 
    "CodeSha256": "kLsdSWrkU//rcElFKSGhaCFEVmTlieyE24hdx4JTjnA=", 
    "FunctionName": "ddbreplica_lambda", 
    "CodeSize": 728, 
    "RevisionId": "62fa0b32-8351-4a82-8fe6-289932246490", 
    "MemorySize": 128, 
    "FunctionArn": "arn:aws:lambda:us-west-2:653299296276:function:ddbreplica_lambda", 
    "Version": "$LATEST", 
    "Role": "arn:aws:iam::653299296276:role/ddbreplica_role", 
    "Timeout": 60, 
    "LastModified": "2019-02-13T03:49:56.214+0000", 
    "Handler": "ddbreplica_lambda.lambda_handler", 
    "Runtime": "python2.7", 
    "Description": "Sample lambda function for dynamodb streams"
}

=== enable stream ===
aws dynamodb update-table --table-name 'tlog' --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE

[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb update-table --table-name 'tlog' --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE
{
    "TableDescription": {
        "TableArn": "arn:aws:dynamodb:us-west-2:653299296276:table/tlog", 
        "AttributeDefinitions": [
            {
                "AttributeName": "host", 
                "AttributeType": "S"
            }, 
            {
                "AttributeName": "requestid", 
                "AttributeType": "N"
            }
        ], 
        "GlobalSecondaryIndexes": [
            {
                "IndexSizeBytes": 0, 
                "IndexName": "host-requestid-gsi", 
                "Projection": {
                    "ProjectionType": "INCLUDE", 
                    "NonKeyAttributes": [
                        "bytessent"
                    ]
                }, 
                "ProvisionedThroughput": {
                    "NumberOfDecreasesToday": 0, 
                    "WriteCapacityUnits": 500, 
                    "LastIncreaseDateTime": 1550024908.282, 
                    "ReadCapacityUnits": 500
                }, 
                "IndexStatus": "ACTIVE", 
                "KeySchema": [
                    {
                        "KeyType": "HASH", 
                        "AttributeName": "host"
                    }, 
                    {
                        "KeyType": "RANGE", 
                        "AttributeName": "requestid"
                    }
                ], 
                "IndexArn": "arn:aws:dynamodb:us-west-2:653299296276:table/tlog/index/host-requestid-gsi", 
                "ItemCount": 0
            }
        ], 
        "ProvisionedThroughput": {
            "NumberOfDecreasesToday": 0, 
            "WriteCapacityUnits": 100, 
            "LastIncreaseDateTime": 1550024147.53, 
            "ReadCapacityUnits": 100
        }, 
        "TableSizeBytes": 0, 
        "TableName": "tlog", 
        "TableStatus": "UPDATING", 
        "StreamSpecification": {
            "StreamViewType": "NEW_IMAGE", 
            "StreamEnabled": true
        }, 
        "TableId": "ae36efd4-cf2b-4aa3-9556-b35a3884d00a", 
        "LatestStreamLabel": "2019-02-13T03:51:02.492", 
        "KeySchema": [
            {
                "KeyType": "HASH", 
                "AttributeName": "requestid"
            }
        ], 
        "ItemCount": 0, 
        "CreationDateTime": 1550023660.187, 
        "LatestStreamArn": "arn:aws:dynamodb:us-west-2:653299296276:table/tlog/stream/2019-02-13T03:51:02.492"
    }
}

[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb describe-table --table-name 'tlog' --query 'Table.LatestStreamArn' --output text
arn:aws:dynamodb:us-west-2:653299296276:table/tlog/stream/2019-02-13T03:51:02.492


aws lambda create-event-source-mapping \
--function-name ddbreplica_lambda --enabled --batch-size 100 --starting-position TRIM_HORIZON \
--event-source-arn arn:aws:dynamodb:us-west-2:653299296276:table/tlog/stream/2019-02-13T03:51:02.492

{
    "UUID": "2523ff2b-f6f5-4b3c-8961-d4f4b0fb67fd", 
    "StateTransitionReason": "User action", 
    "LastModified": 1550029975.316, 
    "BatchSize": 100, 
    "EventSourceArn": "arn:aws:dynamodb:us-west-2:653299296276:table/tlog/stream/2019-02-13T03:51:02.492", 
    "FunctionArn": "arn:aws:lambda:us-west-2:653299296276:function:ddbreplica_lambda", 
    "State": "Creating", 
    "LastProcessingResult": "No records processed"
}


===load data and verify the replica table===
[ec2-user@ip-172-31-37-202 workshop]$ python load_tlog.py tlog ./data/logfile_stream.csv
row: 100 in 0.761062145233
row: 200 in 0.724285840988
row: 300 in 0.72788310051
row: 400 in 0.762091875076
row: 500 in 0.718279123306
row: 600 in 0.733007192612
row: 700 in 0.743673086166
row: 800 in 0.707297086716
row: 900 in 0.705587863922
row: 1000 in 0.709118127823
row: 1100 in 0.751717090607
row: 1200 in 0.71635890007
row: 1300 in 0.743628025055
row: 1400 in 0.717756032944
row: 1500 in 0.729398012161
row: 1600 in 0.7039539814
row: 1700 in 0.733154773712
row: 1800 in 0.709334850311
row: 1900 in 0.758376121521
row: 2000 in 0.705149888992
RowCount: 2000, Total seconds: 14.6485161781

[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb scan --table-name 'tlog' --max-items 2 --output text
4113    4113
BYTESSENT   2969
DATE    2009-07-21
HOST    64.233.172.17
HOUROFDAY   8
METHOD  GET
REQUESTID   4666
RESPONSECODE    200
TIMEZONE    GMT-0700
URL /gwidgets/alexa.xml
USERAGENT   Mozilla/5.0 (compatible) Feedfetcher-Google; (+http://www.google.com/feedfetcher.html)
BYTESSENT   8072
DATE    2017-07-20
HOST    66.249.67.3
HOUROFDAY   20
METHOD  GET
REQUESTID   251
RESPONSECODE    200
TIMEZONE    GMT-0700
URL /gallery/main.php?g2_itemId=15672&g2_fromNavId=x0a7cf816
USERAGENT   Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)
NEXTTOKEN   eyJFeGNsdXNpdmVTdGFydEtleSI6IG51bGwsICJib3RvX3RydW5jYXRlX2Ftb3VudCI6IDJ9

[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb scan --table-name 'tlog_replica' --max-items 2 --output text
1599    1599
BYTESSENT   2969
DATE    2009-07-21
HOST    64.233.172.17
HOUROFDAY   8
METHOD  GET
REQUESTID   4666
RESPONSECODE    200
TIMEZONE    GMT-0700
URL /gwidgets/alexa.xml
USERAGENT   Mozilla/5.0 (compatible) Feedfetcher-Google; (+http://www.google.com/feedfetcher.html)
BYTESSENT   3164
DATE    2009-07-21
HOST    74.125.74.193
HOUROFDAY   8
METHOD  GET
REQUESTID   4847
RESPONSECODE    200
TIMEZONE    GMT-0700
URL /gadgets/adpowers/AlexaRank/g.xml
USERAGENT   Mozilla/5.0 (compatible) Feedfetcher-Google; (+http://www.google.com/feedfetcher.html)
NEXTTOKEN   eyJFeGNsdXNpdmVTdGFydEtleSI6IG51bGwsICJib3RvX3RydW5jYXRlX2Ftb3VudCI6IDJ9

[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb scan --table-name 'tlog_replica' --max-items 2 --output text
2000    2000
BYTESSENT   2969
DATE    2009-07-21
HOST    64.233.172.17
HOUROFDAY   8
METHOD  GET
REQUESTID   4666
RESPONSECODE    200
TIMEZONE    GMT-0700
URL /gwidgets/alexa.xml
USERAGENT   Mozilla/5.0 (compatible) Feedfetcher-Google; (+http://www.google.com/feedfetcher.html)
BYTESSENT   3164
DATE    2009-07-21
HOST    74.125.74.193
HOUROFDAY   8
METHOD  GET
REQUESTID   4847
RESPONSECODE    200
TIMEZONE    GMT-0700
URL /gadgets/adpowers/AlexaRank/g.xml
USERAGENT   Mozilla/5.0 (compatible) Feedfetcher-Google; (+http://www.google.com/feedfetcher.html)
NEXTTOKEN   eyJFeGNsdXNpdmVTdGFydEtleSI6IG51bGwsICJib3RvX3RydW5jYXRlX2Ftb3VudCI6IDJ9