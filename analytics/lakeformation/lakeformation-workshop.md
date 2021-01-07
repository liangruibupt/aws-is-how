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

## Lake Formation Basics
- Lake Formation and AWS Glue share the same Data Catalog.
- Lake Formation blueprint creates Glue jobs to ingest data to data lake.
- Lake Formation blueprint uses Glue crawlers to discover source schemas.
- The workflows generated when you use a Lake Formation blueprint are AWS Glue workflows. You can view and manage these workflows in both the Lake Formation console and the AWS Glue console.
- Machine learning transforms are provided with Lake Formation and are built on AWS Glue API operations. You create and manage machine learning transforms on the AWS Glue console.

1. [Set Data Lake Lake Formation Administrator](https://lakeformation.workshop.aws/lakeformation-basics/datalake-administrator.html)
2. [Change Default Catalog Settings: enable fine-grained access control with Lake Formation permissions](https://lakeformation.workshop.aws/lakeformation-basics/default-catalog-settings.html)
3. [Databases](https://lakeformation.workshop.aws/lakeformation-basics/databases.html)
4. [Register an Amazon S3 bucket as your data lake storage](https://lakeformation.workshop.aws/lakeformation-basics/datalake-locations.html)
5. [Blueprints: Database blueprints and Log file blueprints](https://lakeformation.workshop.aws/lakeformation-basics/blueprints.html)
Granting Permissions
Querying the Data Lake

# Reference
[Workshop link](https://lakeformation.workshop.aws/introduction.html)

