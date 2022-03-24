# Why use the Glue Catalog v.s other external metastore for Hive

You can use the [Using the AWS Glue Data Catalog as the metastore for Hive](https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-hive-metastore-glue.html)

You can use the [Using an external MySQL database or Amazon Aurora as the metastore for Hive](https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-hive-metastore-glue.html)

## Why choice Glue Catalog?

### Fully managed

### Federation for sharing
•	Using Amazon EMR version 5.8.0 or later, you can configure Hive to use the AWS Glue Data Catalog as its metastore. We recommend this configuration when you require a persistent metastore or a metastore shared by different clusters, services, applications, or AWS accounts.
•	The AWS Glue Data Catalog provides a unified metadata repository across a variety of data sources and data formats, integrating with Amazon EMR as well as Amazon RDS, Amazon Redshift, Redshift Spectrum, Athena, and any application compatible with the Apache Hive metastore. 

### Price is other consideration
Storage: ¥6.866 per 100,000 objects in a month
Requests: ¥6.866 per million requests in a month

## Why not choice Glue Catalog?
Limits for glue catalog such as rename table, tempeory table, metastore constants limits, Hive constraints are not supported, more details please check  https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-hive-metastore-glue.html#emr-hive-glue-considerations-hive 

## FAQ
1.	Can I export all the table metastore from the Glue data catalog? In case that I need to switch to Native Hive metastore?
    To export data from glue catalog, you can 
    1. SDK/API: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/glue.html#Glue.Client 
    2. You can use the Hive Metastore-compatible client that connects to the AWS Glue Data Catalog.  https://github.com/awslabs/aws-glue-data-catalog-client-for-apache-hive-metastore 
    3. Reference the implementation as this github to build you self one, but change the detination to RDS. https://github.com/aws-samples/aws-glue-data-catalog-replication-utility

2. Can I directly access the underlying database of Glue data catalog using JDBC connectors?
Seems no, but you can use above appoarches

3. There are other integration such as glue catalog with apache atlas
https://dev.to/aws-builders/importing-metadata-from-the-aws-glue-data-catalog-into-apache-atlas-with-emr-4h8k 
