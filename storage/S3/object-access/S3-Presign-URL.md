# Generate a pre-signed URL for an Amazon S3 object. This allows anyone who receives the pre-signed URL to retrieve the S3 object with an HTTP GET request. 

## S3 CP
```bash
aws s3 cp file.zip s3://your-bucket-name/your-prefix/ --region cn-north-1 --profile china_ruiliang
```

## CLI
```bash
aws s3 presign s3://awsexamplebucket/test2.txt --expires-in 86400 --region cn-north-1 --profile china_ruiliang

aws s3 presign s3://awsexamplebucket/test2.txt --expires-in 604800

aws s3 presign 's3://awsexamplebucket/亚马逊云科技test.pptx' --expires-in 28800

aws s3 presign 's3://awsexamplebucket/There is space.pptx' --expires-in 86400

aws s3 presign s3://your-bucket-name/your-object-key --region your-region --expires-in 86400 --method PUT

curl -X PUT -T "local-file-to-upload.txt" "presigned-url-from-previous-step"
```

## Reference
[s3 presign cli ](https://docs.aws.amazon.com/cli/latest/reference/s3/presign.html)