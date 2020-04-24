# Sync the public dataset s3 bucket to your bucket
Use the [amazon-s3-resumable-upload toolkit](https://github.com/aws-samples/amazon-s3-resumable-upload)

## Case 1: sync the file in the bucket created by [amazon-s3-resumable-upload toolkit](https://github.com/aws-samples/amazon-s3-resumable-upload)

```bash
git clone git@github.com:aws-samples/amazon-s3-resumable-upload.git

# Deploy sync lambda worker
cd amazon-s3-resumable-upload/serverless/cdk-serverless
pip install -r requirements.txt
export AWS_DEFAULT_REGION=us-east-1
cdk deploy --profile ${AWS_GLOBAL_PROFILE} --outputs-file "stack-outputs.json"

# Edit AWS CDK app.py - aws_access_key_id, aws_secret_access_key should be edit Lambda environment variables after deployment
Des_bucket_default = 'covid-19-raw-data-zhy'
Des_prefix_default = 'enigma-jhu'
StorageClass = 'STANDARD'
aws_access_key_id = 'xxxxxxxxx'
aws_secret_access_key = 'xxxxxxxxxxxxxxx'
aws_access_key_region = 'cn-northwest-1'
alarm_email = "alarm_your_email@email.com"
```

## Case 2: Use the existed source S3 bucket and allow configure source S3 bucket to sent notification to the SQS Queue
1. Deploy `lambda sync worker` as the Case 1 
2. Follow up the guide [add-notification-config-to-bucket](https://docs.aws.amazon.com/AmazonS3/latest/dev/ways-to-add-notification-config-to-bucket.html) to configure the S3 event

```bash
aws cloudformation describe-stacks --stack-name s3-migration-serverless --query "Stacks[0].Outputs"
```
Configure the existed S3 bucket of stack output send notification to `SQSJobQueue` of stack output


## Case 3: For existed source s3 bucket which is not under our control but only have read access
Deploy jobsender to scan source and destination bucket and create the job to SQS

```bash
git clone git@github.com:aws-samples/amazon-s3-resumable-upload.git
cd amazon-s3-resumable-upload/serverless/enhanced-lambda-jobsender
pip install -r requirements.txt

export AWS_DEFAULT_REGION=us-east-1

## System Manager Parameter Store create new parameter：Name: s3_migration_credentials, Tier: Standard, Type: SecureString
{
  "aws_access_key_id": "your_aws_access_key_id",
  "aws_secret_access_key": "your_aws_secret_access_key",
  "region": "cn-northwest-1"
}

## Edit AWS CDK app.py 你需要传输的源S3桶/目标S3桶信息，示例如下：
# Define bucket parameter before deploy CDK
bucket_para = [{
    "src_bucket": "covid19-lake",  # The bucket in US
    "src_prefix": "enigma-jhu",
    "des_bucket": "covid-19-raw-data-zhy", # The bucket in China
    "des_prefix": ""
}, {
    "src_bucket": "covid19-lake",  # The bucket in US
    "src_prefix": "enigma-jhu-timeseries",
    "des_bucket": "covid-19-raw-data-zhy",  # The bucket in China
    "des_prefix": ""
}]

StorageClass = 'STANDARD'
alarm_email = "alarm_your_email@email.com"

cdk deploy --profile ${AWS_GLOBAL_PROFILE} --outputs-file "stack-outputs.json"
```