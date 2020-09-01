# Loading Streaming Data into Amazon Elasticsearch Service


- [Loading Streaming Data into Amazon ES from Amazon S3](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-s3-lambda-es)
- [Loading Streaming Data into Amazon ES from Amazon Kinesis Data Streams](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-kinesis)
- [Loading Streaming Data into Amazon ES from Amazon DynamoDB](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-dynamodb-es)
- [Loading Streaming Data into Amazon ES from Amazon Kinesis Data Firehose](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-fh)
- [Loading Streaming Data into Amazon ES from Amazon CloudWatch](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-cloudwatch-es)
- [Loading Data into Amazon ES from AWS IoT](https://docs.aws.amazon.com/elasticsearch-service/latest/developerguide/es-aws-integrations.html#es-aws-integrations-cloudwatch-iot)

## Indexing Data in Amazon Elasticsearch Service Using AWS Lambda
1. Create the IAM Role `lambda-es-role` with `AWSLambdaExecute`, `AmazonESFullAccess`, `AmazonKinesisFullAccess`, `AmazonKinesisFirehoseFullAccess` permissions
2. Create S3 bucket: `ray-aes-lab`
3. Create Amazon ES Domain: `lambda-es-endpoint`
  - Enable fine-grained access control
  - Set IAM ARN as master user: ARN of `lambda-es-role`
  - Access Policy
  ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {
            "AWS": [
              "arn:aws-cn:iam::876820548815:role/lambda-es-role"
            ]
          },
          "Action": [
            "es:*"
          ],
          "Resource": "arn:aws-cn:es:cn-north-1:876820548815:domain/lambda-es-endpoint/*"
        }
      ]
    }
  ```
3. Create the function

