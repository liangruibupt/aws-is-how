# create source table in BJS
aws dynamodb create-table --table-name tlog \
--attribute-definitions AttributeName=requestid,AttributeType=N AttributeName=host,AttributeType=S \
--key-schema AttributeName=requestid,KeyType=HASH \
--provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100 \
--global-secondary-indexes  IndexName=host-requestid-gsi,\
KeySchema=["{AttributeName=host,KeyType=HASH},{AttributeName=requestid,KeyType=RANGE}"],\
Projection="{ProjectionType=INCLUDE,NonKeyAttributes=['bytessent']}",\
ProvisionedThroughput="{ReadCapacityUnits=100,WriteCapacityUnits=100}" --region cn-north-1

[ec2-user@ip-10-0-1-91 workshop]$ aws dynamodb wait table-exists --table-name tlog --region cn-north-1
[ec2-user@ip-10-0-1-91 workshop]$ aws dynamodb describe-table --table-name tlog --region cn-north-1| grep TableStatus
        "TableStatus": "ACTIVE", 
[ec2-user@ip-10-0-1-91 workshop]$ aws dynamodb describe-table --table-name tlog --region cn-north-1| grep IndexStatus
                "IndexStatus": "ACTIVE",


# load the sample data
python load_tlog.py tlog ./data/logfile_medium1.csv


# create replica table in ZHY
aws dynamodb create-table --table-name tlog_replica \
--attribute-definitions AttributeName=requestid,AttributeType=N AttributeName=host,AttributeType=S \
--key-schema AttributeName=requestid,KeyType=HASH --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=100 \
--global-secondary-indexes  IndexName=host-requestid-gsi,KeySchema=["{AttributeName=host,KeyType=HASH},{AttributeName=requestid,KeyType=RANGE}"],Projection="{ProjectionType=INCLUDE,NonKeyAttributes=['bytessent']}",ProvisionedThroughput="{ReadCapacityUnits=100,WriteCapacityUnits=100}" --region cn-northwest-1

[ec2-user@ip-10-0-1-91 workshop]$ aws dynamodb wait table-exists --table-name tlog_replica --region cn-northwest-1
[ec2-user@ip-10-0-1-91 workshop]$ aws dynamodb describe-table --table-name tlog_replica --region cn-northwest-1| grep TableStatus
        "TableStatus": "ACTIVE", 
[ec2-user@ip-10-0-1-91 workshop]$ aws dynamodb describe-table --table-name tlog_replica --region cn-northwest-1| grep IndexStatus
                "IndexStatus": "ACTIVE",

# setup the IAM role required to execute the Lambda function
aws iam create-role --role-name ray_ddbreplica_role --path "/service-role/" \
--assume-role-policy-document file://iam-trust-relationship.json --region cn-north-1


# Associate the policy with the role
aws iam put-role-policy --role-name ray_ddbreplica_role \
--policy-name ddbreplica_policy --policy-document file://iam-role-policy.json --region cn-north-1


# Create the lambda function
[ec2-user@ip-10-0-1-91 workshop]$ aws iam get-role --role-name ray_ddbreplica_role --query 'Role.Arn' --output text --region cn-north-1
arn:aws-cn:iam::876820548815:role/service-role/ray_ddbreplica_role

[ec2-user@ip-10-0-1-91 workshop]$ zip ddbreplica_lambda.zip ddbreplica_lambda.py
  adding: ddbreplica_lambda.py (deflated 56%)

aws lambda create-function --region cn-north-1 \
--function-name ddbreplica_lambda --zip-file fileb://ddbreplica_lambda.zip \
--role arn:aws-cn:iam::876820548815:role/service-role/ray_ddbreplica_role \
--handler ddbreplica_lambda.lambda_handler --timeout 60 --runtime python2.7 \
--description "Sample lambda function for dynamodb streams"

# enable the DDB stream of source table
aws dynamodb update-table --table-name 'tlog' --region cn-north-1 \
--stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES

[ec2-user@ip-10-0-1-91 workshop]$ aws dynamodb describe-table --table-name 'tlog' --region cn-north-1 --query 'Table.LatestStreamArn' --output text
arn:aws-cn:dynamodb:cn-north-1:876820548815:table/tlog/stream/2019-02-13T05:45:58.026


# Map the DynamoDB stream with the Lambda function
aws lambda create-event-source-mapping \
--event-source-arn arn:aws-cn:dynamodb:cn-north-1:876820548815:table/tlog/stream/2019-02-13T05:45:58.026 \
--function-name ddbreplica_lambda --enabled --batch-size 100 --starting-position TRIM_HORIZON --region cn-north-1


# load data and verify the replica table
[ec2-user@ip-10-0-1-91 workshop]$ python load_tlog.py tlog ./data/logfile_stream.csv
RowCount: 2000, Total seconds: 20.4914338589

[ec2-user@ip-10-0-1-91 workshop]$ aws dynamodb scan --table-name 'tlog' --max-items 2 --output text --region cn-north-1
4000    4000
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

[ec2-user@ip-10-0-1-91 workshop]$ aws dynamodb scan --table-name 'tlog_replica' --max-items 2 --output text --region cn-northwest-1
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