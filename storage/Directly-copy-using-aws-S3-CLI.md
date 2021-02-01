# Use the aws S3 CLI to sync S3 data between Global bucket and China region bucket

# Option 2: Directly copy using aws S3 CLI

```
aws s3 cp s3://frankfurt-demo-bucket/demo2ebc.zip - --region eu-central-1 | aws s3 cp - s3://ray-cross-region-sync-bjs/speed-test/demo2ebc.zip --profile china --region cn-north-1
```