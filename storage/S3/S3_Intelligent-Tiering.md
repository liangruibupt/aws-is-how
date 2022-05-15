# Using S3 Intelligent-Tiering

[S3 Intelligent-Tiering Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-intelligent-tiering.html)

## Moving data to S3 Intelligent-Tiering
1. directly PUT data into S3 Intelligent-Tiering by specifying INTELLIGENT_TIERING in the x-amz-storage-class header
2. configure S3 Lifecycle policies to transition existed objects from `S3 Standard` or `S3 Standard-Infrequent Access` --> `S3 Intelligent-Tiering`. 

## Enabling S3 Intelligent-Tiering Archive Access and Deep Archive Access tiers
[Enabling S3 Intelligent-Tiering Archive Access and Deep Archive Access tiers Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-intelligent-tiering.html#enable-auto-archiving-int-tiering)
