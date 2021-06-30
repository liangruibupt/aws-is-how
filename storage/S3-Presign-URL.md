# Generate a pre-signed URL for an Amazon S3 object. This allows anyone who receives the pre-signed URL to retrieve the S3 object with an HTTP GET request. 

# CLI
```bash
aws s3 presign s3://awsexamplebucket/test2.txt

aws s3 presign s3://awsexamplebucket/test2.txt --expires-in 604800
```