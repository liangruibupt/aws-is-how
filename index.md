# aws-is-how

## [常见故障排除及支持手册](https://amazonaws-china.com/cn/premiumsupport/knowledge-center/?nc1=h_ls&from=timeline&isappinstalled=0)

## AI/ML

[SageMaker-Workshop](ai-ml/SageMaker/SageMaker-Workshop.md)

[A gallery of interesting Jupyter Notebooks](https://github.com/jupyter/jupyter/wiki/A-gallery-of-interesting-Jupyter-Notebooks)

[Use SageMaker for Automotive Image Classification](ai-ml/auto-image-classification/UseSageMaker4AutoImageClassification.md)

[NLP and Text Classification by using blazing text](ai-ml/classification/toutiao-text-classfication-dataset-master)

[Use AWS SageMaker BlazingText to process un-balance data for text multiple classification](https://amazonaws-china.com/cn/blogs/china/use-aws-sagemaker-blazingtext-to-multi-classify-unbalanced-text/) [The git repo](https://github.com/zhangbeibei/sagemaker-unbalanced-text-multiclassification)

[Set up a Jupyter Notebook Server on deep learning AMI](https://docs.aws.amazon.com/dlami/latest/devguide/setup-jupyter.html)

[Forecasting scalar (one-dimensional) time series data](ai-ml/prediction/README.md)

[Install External Libraries and Kernels in Notebook Instances](https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-add-external.html)

## Cost
[AWS China region network cost details](https://github.com/nwcdlabs/aws-region-info)

[Simple generate a report using the AWS Cost Explorer API](cost/cost-expoler-api.md)

[Cost and Usage Report analysis](cost/analysis-cost-usage-report.md)

## Computing

[Amazon Linux how to support chinese](EC2/Amazon-Linux-AMI-support-chinese.md)

[How to connect to Windows EC2 via NICE DCV Client](EC2/Windows-NICE-DCV-Servers-on-Amazon-EC2.md)

[How to connect to Linux EC2 via NICE DCV Client](EC2/Linux-NICE-DCV-Servers-on-Amazon-EC2.md)

[How to build Graphics Workstation on Amazon EC2 G4 Instances](EC2/Windows-Graphics-Workstation-on-Amazon-EC2.md)

[Deploying Unreal Engine Pixel Streaming Server on EC2](https://github.com/aws-samples/deploying-unreal-engine-pixel-streaming-server-on-ec2)

[ALB and NLB Route Traffic to Peering VPC](EC2/ALB-NLB-Route-Traffic-to-Peering-VPC.md)

[Query for AWS Regions, Endpoints, and More Using AWS Systems Manager Parameter Store](https://aws.amazon.com/blogs/aws/new-query-for-aws-regions-endpoints-and-more-using-aws-systems-manager-parameter-store/)

```
aws ssm get-parameters-by-path --path /aws/service/global-infrastructure/regions --output json --profile us-east-1 --region us-east-1 | jq '.Parameters[].Name'

aws ssm get-parameters-by-path --path /aws/service/global-infrastructure/regions --output json --profile us-east-1 --region us-east-1 | jq '.Parameters[].Name' | wc -l
```

[Python code attach EC2 EIP](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/ec2-example-elastic-ip-addresses.html)

[What does :-1 mean in python](EC2/What-does-list-indexing-in-python.md)

## Analytics

[Quick demo for Glue ETL + Athena + Superset BI](https://github.com/liangruibupt/covid_19_report_end2end_analytics)

[How-to-do-Virtulization-DynamoDB](analytics/How-to-do-Virtulization-DynamoDB.md)

[Glue ETL for kinesis / Kafka and RDS MySQL](https://github.com/liangruibupt/glue-streaming-etl-demo)

[Automate athena query by lambda and step function](analytics/athena-automate)

[Automate Redshift ETL](analytics/lambda-redshift)

[AWS Batch Getting Start demo](analytics/batch-get-start)

[AWS EMR Workshop](analytics/emr/101Workshop)

[AWS Kinesis Workshop](analytics/kinesis/101Workshop)

[Loading Streaming Data into Amazon Elasticsearch Service](analytics/es-lambda)

[Amazon Elasticsearch Service Workshop](https://www.aesworkshops.com/)

[Elasticsearch Service Snapshot Lifecycle](analytics/elasticsearch-lifecycle)

[Glue Crawler handle the CSV contains quote string](analytics/Glue-Quote-String-Crawler.md)

[SAML Authentication for Kibana](analytics/saml-kibana)

[How to use the Athena to create the complex embeded table and query the table](analytics/athena-complex-table/Athena-complex-table-creation.md)

[Split and search comma separated column in Athena](analytics/athena-complex-table/Split-search-comma-seprated-column.md)

[AWS Data Engineering Day Workshop](https://aws-dataengineering-day.workshop.aws/100-introduction.html)

[Amazon Athena Workshop](analytics/athena-workshop/Athena-workshop.md)

[Serverless Data Lake Workshop](https://serverless-data-lake-immersionday.workshop.aws/en/introduction.html)

[Lake Formation Workshop](analytics/lakeformation/lakeformation-workshop.md)

[EMR Notebooks and SageMaker](https://emr-etl.workshop.aws/emr_notebooks_sagemaker.html)
Use EMR notebooks to prepare data for machine learning and call SageMaker from the notebook to train and deploy a machine learning model.

[Sending Data to an Amazon Kinesis Data Firehose Delivery Stream](analytics/kinesis/Write-Kinesis-using-Agent.md)

## IOT
[IoT-Workshop](iot/IoT-Workshop.md)

## Security

[Share-CMK-across-multiple-AWS-accounts](security/kms/Share-CMK-across-multiple-AWS-accounts.md)

[Secret Manager quick start demo](security/secret-mgr/README.md)

[Upload-SSL-Certificate](security/Upload-SSL-Certificate.md)

[How to use the RDK for AWS Config Automation](security/aws-config/GetStartConfigRDS.md)

[Connect to Your Existing AD Infrastructure](security/Connect-to-Existing-AD-Infrastructure.md)

[How to bootstrap sensitive data in EC2 User Data](security/How-to-bootstrap-sensitive-data-in-EC2-userdata.md)

[Enabling Federation to AWS console using Windows Active Directory, ADFS, and SAML 2.0](security/sso/Using-ADFS-SSO.md)

[GuardDuty Simulator](security/guard-duty/README.md)

[Create certificate using openssl](security/acm/create-certificate-openssl.md)

[Grant my Active Directory users access to the API or AWS CLI with AD FS](https://aws.amazon.com/premiumsupport/knowledge-center/adfs-grant-ad-access-api-cli/)

[Okta-OpenID-AWS-in-the-Browser](security/sso/Okta-OpenID-AWS-in-the-Browser.md)

[Enabling custom identity broker access to the AWS console](security/sso/Customer_Idp_Broker_access_aws_console.md)

## Network

[How to verify EC2 access S3 via VPC S3 Endpoint?](vpc/Access-S3-via-VPC-endpoint.md)

[Why can’t I connect to an S3 bucket using a gateway VPC endpoint?](https://amazonaws-china.com/premiumsupport/knowledge-center/connect-s3-vpc-endpoint/)

[The customer have a private subnet without NAT and want to use ssm vpc endpoint to connected to SSM service](vpc/SSM-VPC-Endpoint-In-China-Region.md)

[How I can setup transparent proxy - squid](network/squid/Squid-proxy.md)

[SFTP on AWS](network/SFTPOnAWS.md)

[NLB-TLS-Termination + Access log](network/nlb/NLB-TLS-Termination.md)

[Direct Connect Cheat sheet](network/direct-connect/)

[Direct Connect Monitoring](network/direct-connect/DX-Monitoring.md)

[Cross region EC2 to EC2 transfering speed testing](network/Cross-region-EC2-connection-benchmark.md)

[TGW cross account sharing and inter-connection testing](network/tgw-workshop)

[Using Amazon Global Accelerator to improve cross board request improvement](network/aga/README.md)

[AWS WAF-Workshop](security/waf/WAF-Workshop.md)

## DNS

[R53 in China region](R53/README.md)

## Serverless

[AWS Serverless Day](https://serverlessday.cbuilder.tech/index.html)

[Schedule-Invoke-Lambda](lambda/Schedule-Invoke-Lambda.md)

[hello-cdk](https://github.com/liangruibupt/hello-cdk)

[Build and deploy a serverless application with the SAM CLI in China reigon](https://github.com/liangruibupt/hell-world-sam)

[SAM templates and lightweight web frameworks](https://53ningen.com/sam-web-fw/)

[Using AWS Lambda with Amazon Kinesis](lambda/kinesis-lambda)

[AWS Lambda Custom Runtime for PHP](lambda/lambda4php/README.md)

[How to clean up the elastic network interface created by Lambda in VPC mode](https://aws.amazon.com/premiumsupport/knowledge-center/lambda-eni-find-delete/?nc1=h_ls)

[How to get the lambda public IP address](lambda/lambda-access-internet.py)

[How to retrieve the System Manager Parameter Store](lambda/lambda-ssm-variables.py)

[How to put the S3 event to Kafka using lambda](analytics/msk/kafka-s3-event-processor.py)

[AWS Serverless Workshop](https://github.com/aws-samples/aws-serverless-workshops)

[Serverless CI/CD based on Jenkins](https://github.com/aws-samples/aws-serverless-workshop-greater-china-region/tree/master/Lab8B-CICD-Jenkins)

[Demo how to send the Lambda logs to S3 and ElasticSearch by using Kiensis Firehose](https://github.com/jw1i/logs-api-firehose-layer.git)

[Chalice - A framework for writing serverless applications](https://aws.github.io/chalice/)


## Migration

[How to migrate your on-premises domain to AWS Managed AD?](security/Migrate_on-premises_domain_to_AWS_Managed_AD.md)

[How to migrate MySQL to Amazon Aurora by Physical backup](database/rds/mysql/MySQL_Migrate_Aurora.md)

[aws-database-migration-samples](https://github.com/aws-samples/aws-database-migration-samples)

## Storage

[How to sync S3 bucket data between global region and China region](storage/Sync-Global-S3bucket-2-China.md)

[Cross region S3 file download and upload](storage/crr-s3-download-upload.py)

[S3 trasnfer tool](https://github.com/aws-samples/amazon-s3-resumable-upload)

[s3-benchmark-testing](https://github.com/liangruibupt/s3-benchmark-testing)

[How do I create a snapshot of an EBS RAID array](https://aws.amazon.com/premiumsupport/knowledge-center/snapshot-ebs-raid-array/)

[EBS benchmark testing](https://github.com/liangruibupt/ebs-benchmark-testing)

[storage-gateway-demo and performance testing](https://github.com/liangruibupt/storage-gateway-demo)

[EFS Workshop for GCR](https://github.com/liangruibupt/amazon-efs-workshop)

[Amazon FSx for Lustre or Amazon FSx for Windows File Server Workshop](storage/FSx/README.md)

[S3 Web Explorer](storage/s3explorer)

[Amazon FSx for Windows File Server file share on an Amazon EC2 Linux instance](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/using-file-shares.html) You can mount an Amazon FSx for Windows File Server file share on an Amazon EC2 Linux instance that is either joined to your Active Directory or not joined. 

## Database

[Use Proxysql for RDS for MySQL or Aurora databases connection pool and Read/Write Split](database/rds/proxysql/serverless-proxysql.md)

[Neo4j-On-AWS](database/neo4j/Neo4j-On-AWS.md)

[Building a fast session store for your online applications with Amazon ElastiCache for Redis](database/redis/session_store)

[AWS Bookstore Demo App - Purpose-built databases enable you to create scalable, high-performing, and functional backend infrastructures to power your applications](https://github.com/aws-samples/aws-bookstore-demo-app)

[How to use the Neptune to Build Your First Graph Application](database/Neptune/workshop101)

[Get-Start-DocumentDB](database/documentdb/Get-Start-DocumentDB.md)

## Container

[eks-workshop-greater-china](https://github.com/aws-samples/eks-workshop-greater-china)

[EKS-Workshop-China](https://github.com/liangruibupt/EKS-Workshop-China)

[Advanced EKS workshop](https://github.com/pahud/amazon-eks-workshop)

[ECS workshop for china region](https://github.com/liangruibupt/aws-ecs-workshop-gcr)

[ECR Sync up from global from China and ECS Service Discovery](container/ECR-Sync-and-ECS-Service-Discovery.md)

[How can I create an Application Load Balancer and then register Amazon ECS tasks automatically](container/ECS-Dynamic-Port-Mapping.md)

[How can I a ECS service serve traffic from multiple port?](container/ECS-Dynamic-Port-Mapping.md)

[How to launch tomcat server on ECS](container/tomcat)

[Windows pod in EKS](container/Windows-pod-EKS.md)

## DevOps

[CodeCommit](devops/codecommit/getstart-codecommit.md) and [CodeCommit setup](devops/codecommit/codecommit-setup.md)

[Codebuild Get Start](devops/codebuild/codebuild-get-start.md)

[CodePiple Workshop](devops/codepipeline)

[X-Ray in AWS China region](https://github.com/liangruibupt/aws-xray-workshop-gcr)

[Build Private API with API Gateway and integrate with VPC resource via API Gateway private integration](devops/apigw/APIGW-PrivateAPI-PrivateIntegration.md)

[How to send CloudWatch logs to S3](devops/cloudwatch/How-to-send-logs-to-S3.md)

[Central Logging on AWS](analytics/central-logging)

[AWS DevOps Management Observability workshop](devops/managed-platform)

[AWS AppConfig Workshop](devops/appconfig)

[AWS Management Tool stack workshop](https://workshop.aws-management.tools/)

[How to make the Trust Advisor Check automatically](devops/trust-advisor)

[AWS Serverless CI/CD hands on lab](devops/serverless-cicd/README.md)

[Accessing the AWS Health API](devops/personal-health-dashboard/Accessing-the-AWS-Health-API.md)

[CSV tools](https://github.com/secretGeek/AwesomeCSV)

## Infra as Code

[How to migrate global cloudformation to China reigon?](xaas/Global-Cloudformation-Migrate-to-China.md)

## Integration

[How to build Amazon SNS HTTP Subscription?](integration/SNS/SNS-HTTP-Subscription.md)

[SQS quick start demo for Standard Queue and JMS](integration/SQS)

[Sent message to SQS queue using Lambda](integration/SQS/lambda-sqs-sentmsg.js)

[Use the Amazon Connect to call out the mobile phone](integration/Connect/Using-Amazon-Connect-call-mobile-phone.md)

## Media

[Video on Demand on AWS](media/mediaconvert)