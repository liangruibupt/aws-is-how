# Loading Streaming Data into Amazon Elasticsearch Service


- [Loading Streaming Data into Amazon ES from Amazon S3](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-s3-lambda-es)
- [Loading Streaming Data into Amazon ES from Amazon Kinesis Data Streams](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-kinesis)
- [Loading Streaming Data into Amazon ES from Amazon DynamoDB](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-dynamodb-es)
- [Loading Streaming Data into Amazon ES from Amazon Kinesis Data Firehose](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-fh)
- [Loading Streaming Data into Amazon ES from Amazon CloudWatch](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-cloudwatch-es)
- [Loading Data into Amazon ES from AWS IoT](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-cloudwatch-iot)

## Indexing Data in Amazon Elasticsearch Service Using AWS Lambda
1. Create the IAM Role `lambda-es-role` with `AWSLambdaExecute`, `AmazonESFullAccess`, `AmazonKinesisFullAccess`, `AmazonKinesisFirehoseFullAccess`, ` AWSLambdaVPCAccessExecutionRole` permissions
2. Create S3 bucket: `ray-aes-lab`
3. Create Amazon ES Domain: `lambda-es-endpoint`
  - Enable fine-grained access control
  - Create a Master User
  - Access Policy
  ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "AWS": [
              "*"
            ]
          },
          "Action": [
            "es:*"
          ],
          "Resource": "arn:aws-cn:es:cn-north-1:account-id:domain/lambda-es-endpoint/*"
        }
      ]
    }
```

OR 

```json
{
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "AWS": [
              "arn:aws-cn:iam::account-id:role/lambda-es-role"
            ]
          },
          "Action": [
            "es:*"
          ],
          "Resource": "arn:aws-cn:es:cn-north-1:account-id:domain/lambda-es-endpoint/*"
        }
      ]
    }
```

3. Create the function
```bash
cd s3-to-es
update the region = "cn-north-1" and es = "https://es_domain" in the sample.py

pip install requests -t .
pip install requests_aws4auth -t .
zip -r lambda.zip *

aws lambda create-function --function-name s3-es-indexing \
--zip-file fileb://lambda.zip --handler sample.handler --runtime python3.6 \
--role arn:aws-cn:iam::account-id:role/lambda-es-role --timeout 60 \
--vpc-config SubnetIds=subnet-08a7b60787d9ed6e6,subnet-0dc2a22813309951d,SecurityGroupIds=sg-0f9473a84c043ed49 \
--region cn-north-1

aws lambda update-function-code --function-name s3-es-indexing \
--zip-file fileb://lambda.zip --region cn-north-1
```

4. Set the S3 trigger
In `s3-es-indexing` configuration:
 - Choose S3 as trigger type
 - Choose the bucket `ray-aes-lab`
 - For Event type, choose `PUT`
 - For Prefix, type `logs/`
 - For Suffix, type `.log`.`
 - Select Enable trigger.

5. Create a file named sample.log with below content
```bash
12.345.678.90 - [01/Sep/2020:13:25:36 -0700] "PUT /some-file0.jpg"
12.345.678.91 - [01/Sep/2020:13:26:14 -0700] "GET /some-file1.jpg"
12.345.678.92 - [01/Sep/2020:13:26:15 -0700] "GET /some-file2.jpg"
12.345.678.91 - [01/Sep/2020:13:26:16 -0700] "GET /some-file3.jpg"
12.345.678.93 - [01/Sep/2020:13:26:18 -0700] "GET /some-file4.jpg"
12.345.678.91 - [01/Sep/2020:13:26:21 -0700] "GET /some-file5.jpg"
```

```
aws s3 cp sample.log s3://ray-aes-lab/logs/ --region cn-north-1
```

6. Verify the index created in ES domain
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@your-ec2-instance-public-ip -N -L 9200:vpc-your-amazon-es-domain.region.es.amazonaws.com:443
Acccess: https://localhost:9200/_plugin/kibana/ in your web browser: username: TheMasterUser, password: your TheMasterUser password

Alternately, you can send requests
curl --user TheMasterUser:secrete https://localhost:9200/lambda-s3-index/_search?pretty

Or send request from ec2 in the same VPC of your ES domain
curl --user TheMasterUser:secrete $es_domain/lambda-s3-index/_search?pretty
```

Sample resposne
```json
{
  "took" : 5,
  "timed_out" : false,
  "_shards" : {
    "total" : 5,
    "successful" : 5,
    "skipped" : 0,
    "failed" : 0
  },
  "hits" : {
    "total" : {
      "value" : 6,
      "relation" : "eq"
    },
    "max_score" : 1.0,
    "hits" : [
      {
        "_index" : "lambda-s3-index",
        "_type" : "lambda-type",
        "_id" : "1q5hSHQB-eYtAfKokiN4",
        "_score" : 1.0,
        "_source" : {
          "ip" : "12.345.678.91",
          "timestamp" : "01/Sep/2020:13:26:14 -0700",
          "message" : "GET /some-file1.jpg"
        }
      },
      {
        "_index" : "lambda-s3-index",
        "_type" : "lambda-type",
        "_id" : "1a5hSHQB-eYtAfKokSPD",
        "_score" : 1.0,
        "_source" : {
          "ip" : "12.345.678.90",
          "timestamp" : "01/Sep/2020:13:25:36 -0700",
          "message" : "PUT /some-file0.jpg"
        }
      },
      {
        "_index" : "lambda-s3-index",
        "_type" : "lambda-type",
        "_id" : "165hSHQB-eYtAfKokyMX",
        "_score" : 1.0,
        "_source" : {
          "ip" : "12.345.678.92",
          "timestamp" : "01/Sep/2020:13:26:15 -0700",
          "message" : "GET /some-file2.jpg"
        }
      },
      {
        "_index" : "lambda-s3-index",
        "_type" : "lambda-type",
        "_id" : "2K5hSHQB-eYtAfKokyPM",
        "_score" : 1.0,
        "_source" : {
          "ip" : "12.345.678.91",
          "timestamp" : "01/Sep/2020:13:26:16 -0700",
          "message" : "GET /some-file3.jpg"
        }
      },
      {
        "_index" : "lambda-s3-index",
        "_type" : "lambda-type",
        "_id" : "2a5hSHQB-eYtAfKolCOA",
        "_score" : 1.0,
        "_source" : {
          "ip" : "12.345.678.93",
          "timestamp" : "01/Sep/2020:13:26:18 -0700",
          "message" : "GET /some-file4.jpg"
        }
      },
      {
        "_index" : "lambda-s3-index",
        "_type" : "lambda-type",
        "_id" : "2q5hSHQB-eYtAfKolSNl",
        "_score" : 1.0,
        "_source" : {
          "ip" : "12.345.678.91",
          "timestamp" : "01/Sep/2020:13:26:21 -0700",
          "message" : "GET /some-file5.jpg"
        }
      }
    ]
  }
}
```

7. Check the cloudwatch logs of lambda

![s3-to-es-cloudwatch](media/s3-to-es-cloudwatch.png)

## Cleanup
```bash
aws lambda delete-function --function-name s3-es-indexing --region cn-north-1
delete the S3 bucket
aws es delete-elasticsearch-domain --domain-name lambda-es-endpoint --region cn-north-1
```

## Reference
[How do I give internet access to my Lambda function in a VPC](https://aws.amazon.com/premiumsupport/knowledge-center/internet-access-lambda-function/)

[VPC Support for Amazon Elasticsearch Service Domains](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-vpc.html#kibana-test)

[I get a "User: anonymous is not authorized" error when I try to access my Elasticsearch cluster](https://aws.amazon.com/premiumsupport/knowledge-center/anonymous-not-authorized-elasticsearch/)