# AWS Lake Formation Workshop

## Introduction
Lake Formation uses the following services:
- AWS Glue to orchestrate jobs with triggers to transform data using the AWS Glue transforms.
- AWS Identity and Access Management (IAM) to secure data using Lake Formation permissions to grant and revoke access.
- The Data Catalog as the central metadata repository across several services.
- Amazon Athena to query data.
- Amazon SageMaker to analyze data.
- AWS Glue machine learning transforms to cleanse data.

Lake Formation calls AWS API operations to perform the following tasks:
- Register Amazon Simple Storage Service (Amazon S3) buckets and paths as your data lake.
- Ingest data into the data lake.
- Populate the Data Catalog with metadata to organize databases and tables and point to underlying data stores.
- Grant and revoke access to both metadata and data.
- Search and discover data sources.

## Step 1 Glue Basics
1. [Glue Data Catalog](https://lakeformation.workshop.aws/glue-basics/glue-data-catalog.html)
2. [Glue ETL](https://lakeformation.workshop.aws/glue-basics/glue-etl.html)

# Reference
[Workshop link](https://lakeformation.workshop.aws/introduction.html)

