# Sync the public dataset s3 bucket to your bucket

# Use the aws-data-replication-hub (Recommanded)

https://github.com/awslabs/aws-data-replication-hub

# Directly copy using aws S3 CLI

```
aws s3 cp s3://frankfurt-demo-bucket/demo2ebc.zip - --region eu-central-1 | aws s3 cp - s3://ray-cross-region-sync-bjs/speed-test/demo2ebc.zip --profile china --region cn-north-1
```

# Use the [amazon-s3-resumable-upload toolkit](https://github.com/aws-samples/amazon-s3-resumable-upload)

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

# Case 4 Cluster version
Use the [Amazon S3 MultiThread Resume Migration Cluster Solution](https://github.com/aws-samples/amazon-s3-resumable-upload/blob/master/cluster/README-English.md)

1. Create System Manager Parameter Store

- Name: s3_migration_credentials
- Type: SecureString
- Content: 
```json
{
  "aws_access_key_id": "your_aws_access_key_id",
  "aws_secret_access_key": "your_aws_secret_access_key",
  "region": "cn-northwest-1"
}
```

2. Configure AWS CDK  app.py setting about source / desination S3 bucket and prefix

```json
[{
    "src_bucket": "ray-cross-region-sync-oregon",
    "src_prefix": "broad-references",
    "des_bucket": "ray-cross-region-sync-zhy",
    "des_prefix": "broad-references"
    }, {
    "src_bucket": "your_global_bucket_2",
    "src_prefix": "your_prefix",
    "des_bucket": "your_china_bucket_2",
    "des_prefix": "prefix_2"
    }]
```

3. Configure the alarm notification email address in cdk_ec2stack.py

```python
# Setup your alarm email
alarm_email = "you-email@amazon.com"
```

4. Modify s3_migration_cluster_config.ini Des_bucket_default, JobType，Concurrent Threads.
```bash
cluster/cdk-cluster/code/s3_migration_cluster_config.ini
Des_bucket_default =  NewS3BucketMigrateObjects
Des_prefix_default = your_prefix/
```

3. deploy CDK

```bash
cd amazon-s3-resumable-upload/cluster/cdk-cluster
source ~/python3/env/bin/activate
pip3 install -r requirements.txt
export AWS_DEFAULT_REGION=us-west-2
npm install -g aws-cdk
cdk synth
cdk deploy s3-migration-cluster* --profile ${AWS_GLOBAL_PROFILE} --outputs-file "stack-outputs.json"
```

4. Testing

- cdk deploy the resource for you, locate the S3 bucket `NewS3BucketMigrateObjects` in global region for upload new objects
- upload the files 
```bash
aws s3 cp amazon-corretto-8-x64-linux-jdk.rpm s3://s3-migration-cluster-reso-s3migratebucket676429fa-lt3gfz9nbfn7/crr-ningxia/
```
- check the des_bucket
```bash
aws s3 ls s3://ray-cross-region-sync-zhy --region cn-northwest-1 --profile china
```
- check the cloudwatch dashboard `s3migrate*` created by CDK
- check the `s3-migration-cluster-ec2-applog*` CloudWatch log group

5. Cleanup
```bash
cdk destroy s3-migration-cluster*
```