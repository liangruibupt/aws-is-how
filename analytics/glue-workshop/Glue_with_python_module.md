# Building Python modules for Spark ETL workloads using AWS Glue

[How do I use external Python libraries in my AWS Glue 2.0 ETL job](https://aws.amazon.com/premiumsupport/knowledge-center/glue-version2-external-python-libraries/)

[Using Python Libraries with AWS Glue](https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-python-libraries.html) and note [Python Modules Already Provided in AWS Glue Version 2.0](https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-python-libraries.html#glue20-modules-provided)

## For glue Development Endpoint

### About --additional-python-modules
I want to use the [aws-data-wrangler](https://github.com/awslabs/aws-data-wrangler) to easy integration with Athena, Glue, Redshift, Timestream, OpenSearch, Neptune, QuickSight, Chime, CloudWatchLogs, DynamoDB, EMR, SecretManager, PostgreSQL, MySQL, SQLServer and S3 (Parquet, CSV, JSON and EXCEL)

Base on the [aws-data-wrangler document](https://aws-data-wrangler.readthedocs.io/en/2.16.1/install.html#aws-glue-pyspark-jobs), for my Glue PySpark job, I create a new Job parameters key/value:
- Key: --additional-python-modules
- Value: pyarrow==2,awswrangler

### Create a glue Development Endpoint
Guide to [Adding a Development Endpoint](https://docs.aws.amazon.com/glue/latest/dg/add-dev-endpoint.html)

```bash
aws glue create-dev-endpoint --endpoint-name endpoint1 --role-arn arn:aws-cn:iam::876820548815:role/DataLakeGlueRole --glue-version 1.0 --arguments '{"--additional-python-modules": "pyarrow==2,awswrangler", "GLUE_PYTHON_VERSION": "3"}' --region cn-north-1
```

### Use a SageMaker Notebook with Your Development Endpoint
FOllow the guide [Use a SageMaker Notebook with Your Development Endpoint](https://docs.aws.amazon.com/glue/latest/dg/dev-endpoint-tutorial-sage.html)

## Network consideration for building Python depenency modules 
- Glue job or dev endpoint with Public internet access 
- Glue job or dev endpoint without Public internet access
Please check below document:
[Building Python modules from a wheel for Spark ETL workloads using AWS Glue 2.0](https://noise.getoto.net/2020/11/18/building-python-modules-from-a-wheel-for-spark-etl-workloads-using-aws-glue-2-0/)


[Adding Jobs in AWS Glue](https://docs.aws.amazon.com/glue/latest/dg/add-job.html#create-job)