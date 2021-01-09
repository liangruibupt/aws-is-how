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

## Step 2 Lake Formation Basics
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
6. [Granting Permissions for different personas](https://lakeformation.workshop.aws/lakeformation-basics/datalake-permissions.html)
7. [Different personas querying the Data Lake with Athena to verify the Permissions ](https://lakeformation.workshop.aws/lakeformation-basics/querying-datalake.html)


## Step 3 Integration with Amazon EMR
Beginning with Amazon EMR 5.31.0, you can launch a cluster that integrates with AWS Lake Formation. Integrating Amazon EMR with AWS Lake Formation provides the following key benefits:
- Provides fine-grained, column-level access to databases and tables in the AWS Glue Data Catalog.
- Enables federated single sign-on to EMR Notebooks or Apache Zeppelin from your enterprise identity system that is compatible with Security Assertion Markup Language (SAML) 2.0.

The integration between Amazon EMR and AWS Lake Formation supports the following applications:
- Amazon EMR notebooks
- Apache Zeppelin
- Apache Spark through Amazon EMR notebooks

Integrate Amazon EMR and Lake Formation prerequisite:
- Using an existing SAML-based Identity Provider, such as Active Directory Federation Services (AD FS). 
- Use the AWS Glue Data Catalog as a metadata store.
- Use EMR Notebooks or Apache Zeppelin to access data managed by AWS Glue and Lake Formation.
- Define and manage permissions in Lake Formation to access databases, tables, and columns in AWS Glue Data Catalog.

1. [Configure Trust Relationship between your organization's Identity Provider (IdP) and AWS](https://lakeformation.workshop.aws/emr-integration/configure-trust.html)
- Auth0
- Okta
- ADFS
2. [Create Amazon EMR Cluster integrating with AWS Lake Formation](https://lakeformation.workshop.aws/emr-integration/emr-cluster.html)
3. [Grant data access and update the SAML Identity Provider Application Callback URL with EMR cluster Master Node DNS](https://lakeformation.workshop.aws/emr-integration/before-accessing-data.html)
- Allow Amazon EMR clusters to filter data managed by Lake Formation
- Grant Permissions
4. [Verify Access in Apace Spark via Apache Zeppelin Notebook or Amazon EMR Notebooks](https://lakeformation.workshop.aws/emr-integration/verify-access.html)
Before you access notebook url, follow up the guide [Set Up an SSH Tunnel to the Master Node Using Dynamic Port Forwarding](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-ssh-tunnel.html)

## Step 4 Handling Real-Time Data
1. [Create a Data Stream]
2. [Sample Stream creation by using Kinesis Data Generator]
    - [Kinesis Data Generator setup](https://lakeformation.workshop.aws/handling-realtime-data/kinesis-data-generator.html)
    - [Generate Streaming Data](https://lakeformation.workshop.aws/handling-realtime-data/create-data-stream.html)
3. [Create Stream Table to show real-time data that comes from the Firehose delivery stream](https://lakeformation.workshop.aws/handling-realtime-data/stream-table.html)
4. [Querying Real Time Data under permission control of Lake Formation](https://lakeformation.workshop.aws/handling-realtime-data/stream-table.html)

## Step 5 Incremental Blueprints
1. [Create Incremental Blueprints](https://lakeformation.workshop.aws/incremental-blueprints.html)
2. [Insert new data in MySQL](https://lakeformation.workshop.aws/incremental-blueprints.html)
  - Connect to `EC2-DB-Loader` EC2
  ```sql
  mysql -h tpc-database-dns -u tpcadmin -p tpc
  INSERT INTO tpc.customer (c_salutation,c_customer_sk,c_first_name,c_last_name) VALUES("Dr.",29999935,"Jill","Thomas");
  INSERT INTO tpc.customer (c_salutation,c_customer_sk,c_first_name,c_last_name) VALUES("Dr.",29999936,"Jill","Thomas");        
  ```
3. [Query the Incremental data from Athena](https://lakeformation.workshop.aws/incremental-blueprints.html)

## Step 6 Glue to Lake Formation Migration
How to migrate glue permissions to lake formation permissions

1. [Lab Preparation](https://lakeformation.workshop.aws/glue-to-lakeformation-migration/lab-preparation.html)
2. [Using Glue Permissions to control the data access](https://lakeformation.workshop.aws/glue-to-lakeformation-migration/using-glue-permissons.html)
- Glue use the IAM Policy and S3 permission policy to provide table level access control
3. [Migrate Permissions to Lake Formation](https://lakeformation.workshop.aws/glue-to-lakeformation-migration/migrate-permissions.html)
- Step 1: List Users' and Roles' Existing Permissions
```bash
aws iam list-policies-granting-service-access --arn arn:aws:iam::[AccountID]:user/glue-admin --service-namespaces glue
```
- Step 2: Set Up Equivalent Lake Formation Permissions

    Grant AWS Lake Formation permissions to match the AWS Glue permissions in policy GlueProdPolicy and GlueTestPolicy
- Step 3: Give Users IAM Permissions to Use Lake Formation
- Step 4: Switch Your Data Stores to the Lake Formation Permissions Model
- Step 5: Secure New Data Catalog Resources: clear check box `Use only IAM access control for new databases` and `Use only IAM access control for new tables in new databases`
- Step 6: Give Users a New IAM Policy for Future Data Lake Access by adding policy GlueFullReadAccess
- Step 7: Clean Up Existing IAM Policies by 
  - Remove GlueProdPolicy from glue-admin and GlueTestPolicy from glue-dev-user
  - Remove Bucket Policies permission for glue-admin and glue-dev-user

# Reference
[Workshop link](https://lakeformation.workshop.aws/introduction.html)

