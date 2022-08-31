# aws-is-how
- [aws-is-how](#aws-is-how)
  - [常见故障排除及支持手册](#常见故障排除及支持手册)
  - [AWS Skill builder](#aws-skill-builder)
  - [AI/ML](#aiml)
    - [ML Study](#ml-study)
    - [SageMaker](#sagemaker)
    - [Jupyter Notebooks](#jupyter-notebooks)
    - [Compute vision](#compute-vision)
    - [NLP](#nlp)
    - [Translate, Text to speech, Speeck to Text](#translate-text-to-speech-speeck-to-text)
    - [Forecasting](#forecasting)
    - [Fraud Detection](#fraud-detection)
    - [Recommandation](#recommandation)
    - [Labeling](#labeling)
    - [Federated ML](#federated-ml)
    - [Prediction Maintenance](#prediction-maintenance)
    - [ML Hardware](#ml-hardware)
  - [Cost](#cost)
    - [Cost Explorer](#cost-explorer)
    - [Network cost](#network-cost)
    - [Tagging](#tagging)
    - [Sustainablity](#sustainablity)
  - [Computing](#computing)
    - [EC2](#ec2)
    - [Load Balancer](#load-balancer)
    - [System Manager](#system-manager)
    - [HPC](#hpc)
  - [Analytics](#analytics)
    - [High Level Data Engineering and Data Analytics](#high-level-data-engineering-and-data-analytics)
    - [Data integration service: Glue](#data-integration-service-glue)
    - [Analysis: EMR](#analysis-emr)
    - [Stream - Kinesis](#stream---kinesis)
    - [Stream - Kafka](#stream---kafka)
    - [Ad-hoc and Interactive query: Athena](#ad-hoc-and-interactive-query-athena)
    - [Data Warehouse: Redshfit](#data-warehouse-redshfit)
    - [Search and analytics: Elasticsearch Service](#search-and-analytics-elasticsearch-service)
    - [Governance](#governance)
    - [BI](#bi)
    - [EMR](#emr)
  - [IOT](#iot)
    - [IoT Core](#iot-core)
    - [IoT Timeseries](#iot-timeseries)
    - [OEE](#oee)
    - [IoT anaytics](#iot-anaytics)
    - [Edge](#edge)
    - [OTA](#ota)
    - [AIOT](#aiot)
  - [Security](#security)
    - [Encryption - KMS](#encryption---kms)
    - [Credential - Secret Manager](#credential---secret-manager)
    - [Certificate - Certificate Manager](#certificate---certificate-manager)
    - [Asset Management and Compliance](#asset-management-and-compliance)
    - [AuthN and AuthZ](#authn-and-authz)
    - [Sentitive Data](#sentitive-data)
    - [Threat detection - GuardDuty](#threat-detection---guardduty)
    - [WAF](#waf)
    - [Permission - IAM Policy, S3 Policy, RAM Policy](#permission---iam-policy-s3-policy-ram-policy)
    - [Multi accounts structure](#multi-accounts-structure)
    - [SIEM and SOC](#siem-and-soc)
  - [Network](#network)
    - [VPC](#vpc)
    - [Keep private - VPC Endpoint and PrivateLink](#keep-private---vpc-endpoint-and-privatelink)
    - [NAT and proxy](#nat-and-proxy)
    - [Load balancers](#load-balancers)
    - [Cross data center and cloud Leasing Line - Direct Connect and VPN](#cross-data-center-and-cloud-leasing-line---direct-connect-and-vpn)
    - [Cross board transfer](#cross-board-transfer)
    - [Cross accounts and Cross VPCs - TGW](#cross-accounts-and-cross-vpcs---tgw)
    - [Acceleration network](#acceleration-network)
    - [Edge](#edge-1)
    - [Network Secuirty](#network-secuirty)
  - [DNS](#dns)
    - [Route 53](#route-53)
  - [Serverless](#serverless)
    - [Serverless Workshop](#serverless-workshop)
    - [Function as Service - Lambda](#function-as-service---lambda)
    - [API Gateway](#api-gateway)
    - [Step function](#step-function)
    - [Build the serverless - SAM, Chalice, Serverless framwork, CDK](#build-the-serverless---sam-chalice-serverless-framwork-cdk)
    - [Serverless with AI/ML](#serverless-with-aiml)
  - [Migration](#migration)
    - [Journey to Adopt Cloud-Native Architecture](#journey-to-adopt-cloud-native-architecture)
    - [Active Directory](#active-directory)
    - [Database](#database)
    - [Data migration tool - DMS](#data-migration-tool---dms)
    - [Data migration tool - 3rd party tool](#data-migration-tool---3rd-party-tool)
    - [Cross Cloud Migration](#cross-cloud-migration)
    - [File migration](#file-migration)
  - [Storage](#storage)
    - [S3 cross region or cross cloud OSS](#s3-cross-region-or-cross-cloud-oss)
    - [S3](#s3)
    - [EBS](#ebs)
    - [Storage Gatewway](#storage-gatewway)
    - [EFS and FSx or other shared file system](#efs-and-fsx-or-other-shared-file-system)
  - [Database](#database-1)
    - [RDS](#rds)
      - [RDS usage](#rds-usage)
      - [RDS Cross region, cross account, data replication and backup](#rds-cross-region-cross-account-data-replication-and-backup)
      - [RDS upgrade](#rds-upgrade)
      - [RDS Security](#rds-security)
      - [RDS Performance](#rds-performance)
    - [Graph Database](#graph-database)
    - [ElastiCache](#elasticache)
    - [Key-Value and Document](#key-value-and-document)
      - [DynamoDB](#dynamodb)
      - [MongoDB and DocumentDB](#mongodb-and-documentdb)
    - [Time series](#time-series)
  - [Container](#container)
    - [EKS](#eks)
    - [ECS](#ecs)
    - [Fargate](#fargate)
    - [Istio, Envoy, App Mesh, Service discovery](#istio-envoy-app-mesh-service-discovery)
  - [DevOps](#devops)
    - [Management](#management)
    - [CI/CD](#cicd)
      - [Serverless CICD](#serverless-cicd)
      - [Container CICD](#container-cicd)
    - [Monitoring and Tracing](#monitoring-and-tracing)
    - [Logging](#logging)
    - [Change configuration](#change-configuration)
    - [Developer](#developer)
    - [Infra as Code](#infra-as-code)
  - [Integration](#integration)
    - [Quque, notification](#quque-notification)
    - [Call Center](#call-center)
    - [MQ](#mq)
    - [Email](#email)
  - [Media](#media)
    - [Video on Demand](#video-on-demand)
    - [Video Streaming](#video-streaming)
  - [Mobile](#mobile)
    - [Moible app development](#moible-app-development)
    - [GraphQL - AppSync](#graphql---appsync)
  - [Business continuity](#business-continuity)
    - [Backup](#backup)
    - [DR](#dr)
      - [RDS HA/DR](#rds-hadr)
  - [Game](#game)
    - [GameLift](#gamelift)
  - [SAP](#sap)
    - [HA/DR](#hadr)
  - [Office and business application](#office-and-business-application)
    - [Workspaces - VDI](#workspaces---vdi)

## [常见故障排除及支持手册](https://amazonaws-china.com/cn/premiumsupport/knowledge-center/?nc1=h_ls&from=timeline&isappinstalled=0)

## [AWS Skill builder](https://explore.skillbuilder.aws/learn/course/11458/play/42651/play-cloud-quest-cloud-practitioner)

## AI/ML

### ML Study
[ML入门的知识，以及ML项目中的一些经验总结分享](https://github.com/yuhuiaws/ML-study)

### SageMaker

- [SageMaker-Workshop](ai-ml/SageMaker/SageMaker-Workshop.md)

- [Install External Libraries and Kernels in SageMaker Notebook Instances](https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-add-external.html)

- [CloudFormation to launch SageMaker Notebook on Glue Dev Endpoint](https://github.com/aws-samples/aws-glue-samples/blob/master/utilities/sagemaker_notebook_automation/glue_sagemaker_notebook_cn.yaml)

- [Invoke SageMaker Notebook via Event](ai-ml/SageMaker/Invoke_SageMaker_Notebook_via_event.md)
  - [Lambda-Trigger-SageMaker-Notebook](ai-ml/SageMaker/Lambda-Trigger-SageMaker-Notebook.md)
  - [Scheduling Jupyter notebooks on SageMaker ephemeral instances](https://aws.amazon.com/blogs/machine-learning/scheduling-jupyter-notebooks-on-sagemaker-ephemeral-instances/)

- [SageMaker input mode: pipe mode and file mode](https://aws.amazon.com/blogs/machine-learning/using-pipe-input-mode-for-amazon-sagemaker-algorithms/)

- [Save costs by automatically shutting down idle resources within Amazon SageMaker Studio](https://aws.amazon.com/blogs/machine-learning/save-costs-by-automatically-shutting-down-idle-resources-within-amazon-sagemaker-studio/)

- [SageMaker Neo supported devices edge devices](https://docs.aws.amazon.com/zh_cn/sagemaker/latest/dg/neo-supported-devices-edge-devices.html)

### Jupyter Notebooks

- [A gallery of interesting Jupyter Notebooks](https://github.com/jupyter/jupyter/wiki/A-gallery-of-interesting-Jupyter-Notebooks)

- [Set up a Jupyter Notebook Server on deep learning AMI](https://docs.aws.amazon.com/dlami/latest/devguide/setup-jupyter.html)

### Compute vision

- [Use SageMaker for Automotive Image Classification](ai-ml/auto-image-classification/UseSageMaker4AutoImageClassification.md)

- [ML Bot Workshop](http://ml-bot.s3-website.cn-north-1.amazonaws.com.cn/)

- [IP Camera AI SaaS Solution](https://www.amazonaws.cn/en/solutions/ipc-ai-saas-solution/)

- [image classification using resnet](ai-ml/image-classification-resnet)

- [Open CV on Lambda](ai-ml/auto-image-classification/lambda_opencv.md)

- [Train and deploy OCR model on SageMaker](https://github.com/aws-samples/train-and-deploy-ocr-model-on-amazon-sagemaker)

### NLP

- [NLP and Text Classification by using blazing text](ai-ml/classification/toutiao-text-classfication-dataset-master)

- [Use AWS SageMaker BlazingText to process un-balance data for text multiple classification](https://amazonaws-china.com/cn/blogs/china/use-aws-sagemaker-blazingtext-to-multi-classify-unbalanced-text/) [The git repo](https://github.com/zhangbeibei/sagemaker-unbalanced-text-multiclassification)

- [AI Powered Chatbot](https://mp.weixin.qq.com/s/9ePNLY6bybgW2GZH_lBFGw)

- [Chinese-BERT](https://github.com/ymcui/Chinese-BERT-wwm)

### Translate, Text to speech, Speeck to Text
- [使用 Amazon Translate 自动翻译PPT](https://aws.amazon.com/cn/blogs/china/translating-presentation-files-with-amazon-translate/)

### Forecasting

- [Forecasting scalar (one-dimensional) time series data](ai-ml/prediction/README.md)

- [GluonTS for time series data](https://github.com/whn09/gluonts_sagemaker)

### Fraud Detection
- [SageMaker End-to-End Demo- Fraud Detection for Auto Claims](https://aws.amazon.com/blogs/machine-learning/architect-and-build-the-full-machine-learning-lifecycle-with-amazon-sagemaker/) and [github repo](https://github.com/aws/amazon-sagemaker-examples/tree/master/end_to_end)

### Recommandation
- [Amazon Personalize workshop](https://github.com/nwcd-samples/Personalize_workshop_CHN)

- [Amazon Personalize Get Start](https://github.com/aws-samples/amazon-personalize-samples/tree/master/getting_started)

### Labeling
- [使用 Amazon SageMaker Ground Truth 标记 3D 点云](https://aws.amazon.com/cn/blogs/china/new-label-3d-point-clouds-with-amazon-sagemaker-ground-truth/) and [guide](https://docs.amazonaws.cn/sagemaker/latest/dg/sms-point-cloud.html)

- [CV Labeling]
  - [cvat-on-aws-china](https://github.com/aws-samples/cvat-on-aws-china)
  - [CV Labeling: VOTT](https://github.com/microsoft/VoTT/releases)

### Federated ML
- [Amazon Redshift ML: Create, train, and deploy machine learning (ML) models using familiar SQL commands](https://aws.amazon.com/redshift/features/redshift-ml/)

### Prediction Maintenance
[Using AWS IoT and Amazon SageMaker to do IoT Devices Predictive Maintenance](iot/IOT-SageMaker-Predictive-Maintenance/README.md)

[IoT Time-series Forecasting for Predictive Maintenance](https://github.com/aws-samples/amazon-sagemaker-aws-greengrass-custom-timeseries-forecasting)

### ML Hardware 
- [Hands-on Deep Learning Inference with Amazon EC2 Inf1 Instance](https://catalog.us-east-1.prod.workshops.aws/workshops/bcd3db22-8501-4888-a078-45a70034f802/en-US)

## Cost
### Cost Explorer
- [Simple generate a report using the AWS Cost Explorer API](cost/cost-expoler-api.md)

- [Cost and Usage Report analysis](cost/analysis-cost-usage-report.md)

- [Price Calculator](https://calculator.aws/#/estimate)

- [Price List API](cost/price-list-api.md)

- [Get the spot instance price](EC2/How-to-Get-Spot-Price.md)


### Network cost
- [AWS China region network cost details](https://github.com/nwcdlabs/aws-region-info)

- [Networking calculator](https://netcalc.solution-architecture.aws.a2z.com/)

- [How to calculate data transfor cost on AWS](https://github.com/weiping-bj/Data-Transfer-Cost-on-AWS)

- [Understanding AWS Direct Connect multi-account pricing](https://aws.amazon.com/blogs/networking-and-content-delivery/understanding-aws-direct-connect-multi-account-pricing/)

- [Data transfer costs for common architectures](https://aws.amazon.com/cn/blogs/architecture/overview-of-data-transfer-costs-for-common-architectures/)

### Tagging
- [Tagging when instance and object created]
    - [Automatically Tag AWS EC2 Instances and Volumes](https://www.doit-intl.com/automatically-tag-aws-ec2-instances-and-volumes/) [Similar solution](https://medium.com/awsblogs/tag-ec2-instance-with-the-user-who-created-it-99ddedb223a8)
    - [S3 Object Tagging 以及怎么管理Tagging](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-tagging.html)
    - [用S3 Batch Operation 批量对已有对象打标签](https://aws.amazon.com/blogs/storage/adding-and-removing-object-tags-with-s3-batch-operations/)
    - [写程序基于我们的SDK去打Tag](https://docs.aws.amazon.com/AmazonS3/latest/userguide/tagging-managing.html)
    - [基于S3 upload Event 触发lambda去对新的对象打标签](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObjectTagging-property)

- [Tagging AWS resources](https://docs.aws.amazon.com/general/latest/gr/aws_tagging.html)

### Sustainablity
- [Customer Carbon Footprint Tool](https://aws.amazon.com/cn/blogs/china/new-customer-carbon-footprint-tool/)

## Computing
### EC2

- [Amazon Linux how to support chinese](EC2/Amazon-Linux-AMI-support-chinese.md)

- [How to connect to Windows EC2 via NICE DCV Client](EC2/Windows-NICE-DCV-Servers-on-Amazon-EC2.md)

- [How to connect to Linux EC2 via NICE DCV Client](EC2/Linux-NICE-DCV-Servers-on-Amazon-EC2.md)

- [How to build Graphics Workstation on Amazon EC2 G4 Instances](EC2/Windows-Graphics-Workstation-on-Amazon-EC2.md)

- [Deploying Unreal Engine Pixel Streaming Server on EC2](https://github.com/aws-samples/deploying-unreal-engine-pixel-streaming-server-on-ec2)

- [EC2 network performance](EC2/EC2_Networking_performance.md)

- [Python code attach EC2 EIP](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/ec2-example-elastic-ip-addresses.html)

- [What does :-1 mean in python](EC2/What-does-list-indexing-in-python.md)

- [How to get the IP address under my account](EC2/Get-all-IP.md)

- [How can I connect to my Amazon EC2 instance if I lost my SSH key pair after its initial launch](https://aws.amazon.com/premiumsupport/knowledge-center/user-data-replace-key-pair-ec2/)

- [Change EC2 Time-Zone](EC2/Change-TimeZone.md)

- [How can I set up a CloudWatch alarm to automatically recover my EC2 instance?](https://aws.amazon.com/premiumsupport/knowledge-center/automatic-recovery-ec2-cloudwatch/)

- [Graviton]
  - [Graviton 2 workshop](https://graviton2-workshop.workshop.aws/) (https://github.com/aws-samples/graviton2-workshop)
  - [AWS Workshop - Graviton2 China](http://graviton2-workshop.s3-website.cn-northwest-1.amazonaws.com.cn/1.basics.html)
  - [AWS Graviton2-based services](https://github.com/aws/aws-graviton-getting-started)
  - [3rd party](https://github.com/aws/aws-graviton-getting-started/blob/main/isv.md)
  - [container](https://github.com/aws/aws-graviton-getting-started/blob/main/containers.md)
 
  - [GRAVITON2 电商独立站](https://graviton2.awspsa.com/)

- [Move EC2 instance to other AZ](https://aws.amazon.com/cn/premiumsupport/knowledge-center/move-ec2-instance/)

- [Best practices for handling EC2 Spot Instance interruptions](https://aws.amazon.com/blogs/compute/best-practices-for-handling-ec2-spot-instance-interruptions/)

- [Upgrade-C4-CentOS-instance-to-C5-instance](EC2/Upgrade-C4-CentOS-instance-to-C5-instance.md)
  
- [How to share the EC2 AMI](EC2/How-to-share-ami.md)

- [Keep EC2 primary private IP for a 'new' instance](EC2/Keep_EC2_primary_private_IP.md)

- [Introduce the nitro-enclaves](EC2/nitro-enclaves.md)

- [Check if a reboot is required after installing Linux updates](ec2/Does_instance_need_restart_for_upgrade.md)
  
### Load Balancer
- [ALB and NLB Route Traffic to Peering VPC](EC2/ALB-NLB-Route-Traffic-to-Peering-VPC.md)

- [Domain and Host based routing for ALB](https://aws.amazon.com/blogs/aws/new-host-based-routing-support-for-aws-application-load-balancers/)

- [ALB Redirect Domain](EC2/ALB_Redirect_Domain.md)

- [Hostname-as-Target for Network Load Balancers](https://aws.amazon.com/blogs/networking-and-content-delivery/hostname-as-target-for-network-load-balancers/)

- [alb troubleshoot 502 errors](https://aws.amazon.com/premiumsupport/knowledge-center/elb-alb-troubleshoot-502-errors/)

- [Redirect HTTP requests to HTTPS using an Application Load Balancer](https://aws.amazon.com/premiumsupport/knowledge-center/elb-redirect-http-to-https-using-alb/)

### System Manager
- [Query for AWS Regions, Endpoints, and More Using AWS Systems Manager Parameter Store](https://aws.amazon.com/blogs/aws/new-query-for-aws-regions-endpoints-and-more-using-aws-systems-manager-parameter-store/)

```
aws ssm get-parameters-by-path --path /aws/service/global-infrastructure/regions --output json --profile us-east-1 --region us-east-1 | jq '.Parameters[].Name'

aws ssm get-parameters-by-path --path /aws/service/global-infrastructure/regions --output json --profile us-east-1 --region us-east-1 | jq '.Parameters[].Name' | wc -l
```

- [ssm-connection-lost-status](https://aws.amazon.com/premiumsupport/knowledge-center/ssm-connection-lost-status/)

- [Session-manager QuickStart](EC2/Session-manager.md)

- [Manage private EC2 instances without internet access](https://aws.amazon.com/premiumsupport/knowledge-center/ec2-systems-manager-vpc-endpoints/?nc1=h_ls)

### HPC
- [Running CFD on AWS Parrell cluster](https://cfd-on-pcluster.workshop.aws/)

- [AWS Batch Getting Start demo](analytics/batch-get-start)

- [Orchestrating high performance computing with AWS Step Functions and AWS Batch](https://aws.amazon.com/cn/blogs/compute/orchestrating-high-performance-computing-with-aws-step-functions-and-aws-batch/)

- [NICE DCV]
  - [NICE DCV Guide](https://docs.aws.amazon.com/dcv/latest/adminguide/what-is-dcv.html)
  - [NICE DCV Connection Gateway - enables users to access a fleet of NICE DCV servers through a single access point to a LAN or VPC](https://docs.aws.amazon.com/dcv/latest/gw-admin/what-is-gw.html)
  - [NICE DCV Session Manager - the Agents, a Broker and API that makes it easy to build front-end applications that programmatically create and manage the lifecycle of NICE DCV sessions across a fleet of NICE DCV servers](https://docs.aws.amazon.com/dcv/latest/sm-admin/what-is-sm.html)
  
## Analytics
### High Level Data Engineering and Data Analytics
- [AWS Data Engineering Day Workshop](https://aws-dataengineering-day.workshop.aws/100-introduction.html)

- [数据分析的技术源流](https://aws.amazon.com/cn/blogs/china/the-technical-origin-of-data-analysis/)

- [Analytics Reference Architecture](https://aws-samples.github.io/aws-analytics-reference-architecture/)

- [Data Science on AWS - Quick Start Workshop](https://github.com/data-science-on-aws/workshop)

- [Build a Lake House Architecture on AWS](https://aws.amazon.com/cn/blogs/big-data/build-a-lake-house-architecture-on-aws/)

- [Harness the power of your data with AWS Analytics with Lake House](https://aws.amazon.com/cn/blogs/big-data/harness-the-power-of-your-data-with-aws-analytics/)

- [Serverless Data Lake Workshop](https://serverless-data-lake-immersionday.workshop.aws/en/introduction.html)

- [Serverless Data Lake Framework WORKSHOP](https://sdlf.workshop.aws/en/)

- [BMW Cloud Data Hub: A reference implementation of the modern data architecture on AWS](https://aws.amazon.com/blogs/industries/bmw-cloud-data-hub-a-reference-implementation-of-the-modern-data-architecture-on-aws/)

- [Develop and deploy a customized workflow using Autonomous Driving Data Framework (ADDF) on AWS](https://aws.amazon.com/blogs/industries/develop-and-deploy-a-customized-workflow-using-autonomous-driving-data-framework-addf-on-aws/)

### Data integration service: Glue
- [Quick demo for Glue ETL + Athena + Superset BI](https://github.com/liangruibupt/covid_19_report_end2end_analytics)

- [Glue ETL for kinesis / Kafka and RDS MySQL](https://github.com/liangruibupt/glue-streaming-etl-demo)

- [Glue Crawler handle the CSV contains quote string](analytics/Glue-Quote-String-Crawler.md)

- [Update and Insert (upsert) Data from AWS Glue](https://towardsdatascience.com/update-and-insert-upsert-data-from-aws-glue-698ac582e562)

- [Glue Workshop](analytics/glue-workshop)
  - [Building Python modules for Spark ETL workloads using AWS Glue](analytics/glue-workshop/Glue_with_python_module.md)

- [Amazon Glue ETL 作业调度工具选型初探](https://aws.amazon.com/cn/blogs/china/preliminary-study-on-selection-of-aws-glue-scheduling-tool/)

- [Airflow and Glue workflow](https://github.com/yizhizoe/airflow_glue_poc)

- [如何提供对 AWS Glue 数据目录中资源的跨账户访问权限](https://aws.amazon.com/cn/premiumsupport/knowledge-center/glue-data-catalog-cross-account-access/?nc1=h_ls)

- [Introducing PII data identification and handling using AWS Glue DataBrew](https://aws.amazon.com/blogs/big-data/introducing-pii-data-identification-and-handling-using-aws-glue-databrew/)

- [Glue and Hudi](https://mp.weixin.qq.com/s/9z4rmokVJJpc14qosXLU8g)

### Analysis: EMR
- [AWS EMR Workshop](analytics/emr/101Workshop)

- [EMR Notebooks and SageMaker](https://emr-etl.workshop.aws/emr_notebooks_sagemaker.html)
Use EMR notebooks to prepare data for machine learning and call SageMaker from the notebook to train and deploy a machine learning model.

- [Orchestrate an Amazon EMR on Amazon EKS Spark job with AWS Step Functions](https://aws.amazon.com/cn/blogs/big-data/orchestrate-an-amazon-emr-on-amazon-eks-spark-job-with-aws-step-functions/)

- [How can I permanently install a Spark or Scala-based library on an Amazon EMR cluster](https://aws.amazon.com/premiumsupport/knowledge-center/emr-permanently-install-library/)

- [Streaming Amazon DynamoDB data into a centralized data lake](https://aws.amazon.com/id/blogs/big-data/streaming-amazon-dynamodb-data-into-a-centralized-data-lake/)

- [EMR on EKS Best Practice Guide](https://aws.github.io/aws-emr-containers-best-practices/)

- [EMR on EKS workshop](analytics/emr/emr-on-eks)

- [Resolve s3 503 slowdown throttling](https://aws.amazon.com/premiumsupport/knowledge-center/s3-resolve-503-slowdown-throttling/)

- [Tool to convert spark-submit to StartJobRun EMR on EKS API](analytics/emr/emr-on-eks/Convert-API-Tools.md)

- [Hadoop high availability features of HDFS NameNode and YARN ResourceManager in an Amazon EMR cluster](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-ha-applications.html)

- [Introducing Amazon EMR integration with Apache Ranger](https://aws.amazon.com/blogs/big-data/introducing-amazon-emr-integration-with-apache-ranger/)

- [Spark 小文件合并功能在 AWS S3 上的应用与实践](https://aws.amazon.com/cn/blogs/china/application-and-practice-of-spark-small-file-merging-function-on-aws-s3/)

- [Enable federated governance using Trino and Apache Ranger on Amazon EMR](https://aws.amazon.com/blogs/big-data/enable-federated-governance-using-trino-and-apache-ranger-on-amazon-emr/)

- [Amazon EMR实战心得浅谈](https://aws.amazon.com/cn/blogs/china/brief-introduction-to-emr-practical-experience/)

### Stream - Kinesis
- [How to do analysis and virtulization DynamoDB](analytics/How-to-do-Virtulization-DynamoDB.md)

- [AWS Kinesis Workshop](analytics/kinesis/101Workshop)

### Stream - Kafka
- [AWS Streaming Data Solution for Amazon MSK](https://aws.amazon.com/solutions/implementations/aws-streaming-data-solution-for-amazon-msk/)

- [Secure connectivity patterns to access Amazon MSK across AWS Regions](https://aws.amazon.com/blogs/big-data/secure-connectivity-patterns-to-access-amazon-msk-across-aws-regions/)

- [MSK Workshop](analytics/msk/101Workshop/README.md)

- [MSK Connect](https://aws.amazon.com/blogs/aws/introducing-amazon-msk-connect-stream-data-to-and-from-your-apache-kafka-clusters-using-managed-connectors/)
  - [Run Kafka Connect as Fargate Docker containers and deploy MirrorMaker configuration files](https://github.com/aws-samples/kafka-connect-mm2)
  - [MirrorMaker deployment](https://github.com/apache/kafka/blob/trunk/connect/mirror/README.md)

- [Kafka/MSK Cluster connection issue](https://aws.amazon.com/premiumsupport/knowledge-center/msk-cluster-connection-issues/)

- [Create a low-latency source-to-data lake pipeline using Amazon MSK Connect, Apache Flink, and Apache Hudi](https://aws.amazon.com/blogs/big-data/create-a-low-latency-source-to-data-lake-pipeline-using-amazon-msk-connect-apache-flink-and-apache-hudi/)


### Ad-hoc and Interactive query: Athena
- [Automate athena query by lambda and step function](analytics/athena-automate)
  - [Automate run Athena_name_query and prepared_statement](analytics/athena-automate/Athena_name_query_prepared_statement.md)

- [How to use the Athena to create the complex embeded table and query the table](analytics/athena-complex-table/Athena-complex-table-creation.md)

- [Split and search comma separated column in Athena](analytics/athena-complex-table/Split-search-comma-seprated-column.md)

- [Amazon Athena Workshop](analytics/athena-workshop/Athena-workshop.md)
  - [Athena_access_control](analytics/athena-workshop/Athena_access_control.md)

- [Athena Perfomrance]
  - [Top 10 Performance Tuning Tips for Amazon Athena](https://aws.amazon.com/cn/blogs/big-data/top-10-performance-tuning-tips-for-amazon-athena/)
  - [Using athena partition projection or glue partition indexes to improve athena query performance](https://aws.amazon.com/cn/blogs/china/amazon-athena-partition-projection-and-glue-partition-indexes-performance-comparison/)

- [Use CTAS statements with Amazon Athena to reduce cost and improve performance](https://aws.amazon.com/blogs/big-data/using-ctas-statements-with-amazon-athena-to-reduce-cost-and-improve-performance/)

- [Athena adds cost details to query execution plans](https://aws.amazon.com/about-aws/whats-new/2021/11/amazon-athena-cost-details-query-execution-plans/)

- [How to get results from Athena for the past 7 days](analytics/athena-workshop/How_to_query_past_7_days_result.md)

### Data Warehouse: Redshfit
- [Automate Redshift ETL](analytics/lambda-redshift)

- [Redshift ML](analytics/redshift-ml/Readme.md)

- [Create-Redshift-ReadOnly-User](analytics/redshift-ml/Create-ReadOnly-User.md)

- [Redshift performance]
  - [使用 Amazon Glue 来调度 Amazon Redshift 跑 TPC-DS Benchmark](https://aws.amazon.com/cn/blogs/china/use-amazon-glue-to-schedule-amazon-redshift-run-tpc-ds-benchmark/)
  - [Cloud DataWarehouse Benchmark](https://github.com/awslabs/amazon-redshift-utils/tree/master/src/CloudDataWarehouseBenchmark/Cloud-DWB-Derived-from-TPCDS)

- [CDC to Redshift]
    - [Migrating Transactional Data to a Delta Lake using AWS DMS](https://databricks.com/blog/2019/07/15/migrating-transactional-data-to-a-delta-lake-using-aws-dms.html)
    - [CDC from On-Premises SQL Server to Amazon Redshift](https://aws.amazon.com/cn/blogs/apn/change-data-capture-from-on-premises-sql-server-to-amazon-redshift-target/)

- [ClickHouse and S3]
    - [Integrating ClickHouse and S3 Compatible Storage](https://dzone.com/articles/clickhouse-s3-compatible-object-storage)
    - [ClickHouse S3 table function](https://clickhouse.com/docs/en/sql-reference/table-functions/s3/)

- [Scheduling SQL queries on your Amazon Redshift](https://aws.amazon.com/blogs/big-data/scheduling-sql-queries-on-your-amazon-redshift-data-warehouse/)

- [Streaming datawarehouse]
  - [Real-time analytics with Amazon Redshift streaming ingestion](https://aws.amazon.com/cn/blogs/big-data/real-time-analytics-with-amazon-redshift-streaming-ingestion/)
  - [Streaming ingestion official doc](https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-streaming-ingestion.html)

### Search and analytics: Elasticsearch Service
- [Loading Streaming Data into Amazon Elasticsearch Service](analytics/es-lambda)

- [Amazon Elasticsearch Service Workshop](https://www.aesworkshops.com/)

- [Elasticsearch Service Snapshot Lifecycle](analytics/elasticsearch-lifecycle)

- [SAML Authentication for Kibana](analytics/saml-kibana)

- [Search DynamoDB Data with Amazon Elasticsearch Service](https://search-ddb.aesworkshops.com/01-intro.html)

- [Log Hub workshop](https://log-hub.docs.solutions.gcr.aws.dev/workshop/introduction/)

- [使用Fluent Bit与Amazon OpenSearch Service构建日志系统](https://aws.amazon.com/cn/blogs/china/build-a-logging-system-with-fluent-bit-and-amazon-opensearch-service/)

- [Simple FAQ Bot](analytics/faq-bot/README.md)

- [OpenSearch cross cluster replication - DR or HA](https://aws.amazon.com/cn/blogs/china/no-subscription-fee-teach-you-how-to-use-cross-cluster-replication-in-amazon-opensearch-service/)
  
### Governance
- [Lake Formation Workshop](analytics/lakeformation/lakeformation-workshop.md)

- [Sending Data to an Amazon Kinesis Data Firehose Delivery Stream](analytics/kinesis/Write-Kinesis-using-Agent.md)

- [AWS Lake Formation Tag-based access control](https://aws.amazon.com/cn/blogs/big-data/easily-manage-your-data-lake-at-scale-using-tag-based-access-control-in-aws-lake-formation/)

- [Data Quality with Deequ]
    - [AWS Lab deequ](https://github.com/awslabs/deequ)
    - [Scala: Test data quality at scale with Deequ](https://aws.amazon.com/blogs/big-data/test-data-quality-at-scale-with-deequ/)
    - [Python: Testing data quality at scale with PyDeequ](https://aws.amazon.com/blogs/big-data/testing-data-quality-at-scale-with-pydeequ/)
    - [Monitor data quality in your data lake using PyDeequ and AWS Glue](https://aws.amazon.com/blogs/big-data/monitor-data-quality-in-your-data-lake-using-pydeequ-and-aws-glue/)
    - [Building a serverless data quality and analysis framework with Deequ and AWS Glue](https://aws.amazon.com/blogs/big-data/building-a-serverless-data-quality-and-analysis-framework-with-deequ-and-aws-glue/)

- [Data Quality with Great Expectations]
    - [Great Expectations Github](https://github.com/great-expectations/great_expectations)
    - [Great Expectations Home page](https://greatexpectations.io/expectations/)
    - [Expectations List](https://greatexpectations.io/expectations)
    - [Provide data reliability in Amazon Redshift at scale using Great Expectations library](https://aws.amazon.com/blogs/big-data/provide-data-reliability-in-amazon-redshift-at-scale-using-great-expectations-library/)
    - [Monitoring Data Quality in a Data Lake Using Great Expectations and Allure-Built Serverless](https://towardsdatascience.com/monitoring-data-quality-in-a-data-lake-using-great-expectations-and-allure-built-serverless-47fa1791af6a)

- [Data Lineage](analytics/governance/Data_Lineage.md)

### BI
- [Amazon QuickSight Workshop](https://learnquicksight.workshop.aws/en/)

- [Athena integrated with PowerBI Desktop and PowerBI Service](https://docs.aws.amazon.com/athena/latest/ug/connect-with-odbc-and-power-bi.html)

- [Integrate Power BI with Amazon Redshift for insights and analytics](https://aws.amazon.com/blogs/big-data/integrate-power-bi-with-amazon-redshift-for-insights-and-analytics/)
  
### EMR
- [Why use the Glue Catalog v.s other external metastore for Hive](analytics/glue-workshop/Glue-Catalog-FAQ.md)
- [Submit EMR Job remotely](analytics/emr/101Workshop/Submit_Job_remotely.md)
- [EMR_On_Graviton2](analytics/emr/101Workshop/EMR_On_Graviton2.md)
  
## IOT
### IoT Core
- [IoT-Workshop](iot/IoT-Workshop.md)

- [AWS IoT Events Quick Start](iot/IoT-Events)

- [Ingest data to IoT core and using lambda write date to RDS PostgreSQL](lambda/lambda-write-postgresql/lambda-write-postgreSQL.md)

### IoT Timeseries
- [IoT Time-series Forecasting for Predictive Maintenance](https://github.com/aws-samples/amazon-sagemaker-aws-greengrass-custom-timeseries-forecasting)

### OEE
- [AWS IoT SiteWise Workshop](https://iot-sitewise.workshop.aws/)

### IoT anaytics
- [AWS IoT Analytics Workshop](https://iot-analytics.workshop.aws/)

- [AWS IoT Analytics Performance](iot/IoT-Analytics/Ingest-IoT-Analytics-PerformanceTest.md)

- [Using AWS IoT and Amazon SageMaker to do IoT Devices Predictive Maintenance](iot/IOT-SageMaker-Predictive-Maintenance/README.md)

- [IoT Time-series Forecasting for Predictive Maintenance](https://github.com/aws-samples/amazon-sagemaker-aws-greengrass-custom-timeseries-forecasting)

### Edge
- [AWS IoT Greengrass V2 Workshop](iot/IoT-Greengrass/Iot-greengrass-v2-workshop.md)

### OTA
- [Building a Scalable Standardized Pipeline for Automotive OTA on AWS](https://aws.amazon.com/blogs/industries/building-a-scalable-standardized-pipeline-for-automotive-ota-on-aws/)

### AIOT
- [制造业端到端(AIOT)动手训练营](https://www.mfgee.ml/)

## Security

- [AWS Security Hands on Lab - URL need whitelist](http://security.bwcx.me/)
- [AWS Security Hands on Lab2](https://seclab.cloudguru.run/1.introduction/)
- [Public Access Consideration](security/Public_Access_Consideration.md)
- [Curated list of links, references, books videos, tutorials, Exploit, CTFs, Hacking Practices etc. which are related to AWS Security](https://github.com/jassics/awesome-aws-security)
- [An AWS Pentesting tool that lets you use one-liner commands to backdoor an AWS account's resources](https://endgame.readthedocs.io/en/latest/)

### Encryption - KMS
- [Share-CMK-across-multiple-AWS-accounts](security/kms/Share-CMK-across-multiple-AWS-accounts.md)
- [Using-SM-Key-Algorithm-in-China](security/kms/Using-SM-Key-Algorithm-in-China.md)

### Credential - Secret Manager
- [Secret Manager quick start demo](security/secret-mgr/README.md)

- [Cross-Accounts-Secrets](security/secret-mgr/Cross-Accounts-Secrets.md)
- 
### Certificate - Certificate Manager
- [Upload-SSL-Certificate](security/acm/Upload-SSL-Certificate.md)

- [Create certificate using openssl](security/acm/create-certificate-openssl.md)

- [Free SSL certificate](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/SSL-on-amazon-linux-2.html#letsencrypt)

- [Validate the ACM certificate]
  - [Switch acm certificate validation](https://aws.amazon.com/cn/premiumsupport/knowledge-center/switch-acm-certificate/)
  - [Troubleshooting acm certificate email validation](https://aws.amazon.com/premiumsupport/knowledge-center/acm-email-validation-custom/?nc1=h_ls)

### Asset Management and Compliance
- [How to use the RDK for AWS Config Automation](security/aws-config/GetStartConfigRDS.md)

### AuthN and AuthZ
- [Connect to Your Existing AD Infrastructure](security/Connect-to-Existing-AD-Infrastructure.md)

- [Cognito User Pool alternative solution - Authing demo](https://github.com/aws-samples/aws-authing-demo)
  
- [Summary the Single-Sign-On cases](security/sso/SSO-OnePage.md)
    - [Enabling Federation to AWS console using Windows Active Directory, ADFS, and SAML 2.0](security/sso/Using-ADFS-SSO.md)
    - [Using IAM federation and Switch role to implement the Single Sign On multiple AWS Accounts](https://amazonaws-china.com/cn/blogs/china/enable-single-sign-on-sso-and-aws-multi-account-management-for-enterprise-users-with-aws-federation-authentication/)
    - [Okta-OpenID-AWS-in-the-Browser](security/sso/Okta-OpenID-AWS-in-the-Browser.md)
    - [Enabling custom identity broker access to the AWS console](security/sso/Customer_Idp_Broker_access_aws_console.md)
    - [Grant my Active Directory users access to the API or AWS CLI with AD FS](https://aws.amazon.com/premiumsupport/knowledge-center/adfs-grant-ad-access-api-cli/)
    - [Using-temporary-credentials-with-AWS-resources](security/Using-temporary-credentials-with-AWS-resources.md)
    - [Okta - AWS China multi-account console integration](security/sso/Okta-multiple-accounts-integration.md)
    - [Keycloak on aws](https://github.com/aws-samples/keycloak-on-aws)

### Sentitive Data
- [How to bootstrap sensitive data in EC2 User Data](security/How-to-bootstrap-sensitive-data-in-EC2-userdata.md)

### Threat detection - GuardDuty
- [GuardDuty Simulator](security/guard-duty/README.md)

### WAF
- [aws-deployment-with-fortiweb-waf](https://www.amazonaws.cn/en/solutions/waf-using-fortiweb/?nc2=h_ql_sol_for) [Source Code](https://github.com/aws-samples/aws-deployment-with-fortiweb-waf)

- [AWS WAF-Workshop](security/waf/WAF-Workshop.md)

- [WAF-Simulation-With-DVWA](security/waf/WAF-Simulation-With-DVWA.md)

- [使用 Amazon WAF 进行 Captcha人机验证](https://aws.amazon.com/cn/blogs/china/use-amazon-waf-for-captcha-man-machine-verification/)

### Permission - IAM Policy, S3 Policy, RAM Policy
- [Policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)

- [How can I use permissions boundaries to limit the scope of IAM users and roles and prevent privilege escalation?](https://aws.amazon.com/premiumsupport/knowledge-center/iam-permission-boundaries/?nc1=h_ls)

- [Enforce MFA authentication for IAM users](https://aws.amazon.com/premiumsupport/knowledge-center/mfa-iam-user-aws-cli/)

- [How can I use IAM roles to restrict API calls from specific IP addresses](https://aws.amazon.com/premiumsupport/knowledge-center/iam-restrict-calls-ip-addresses/)

### Multi accounts structure
- [Accessing and administering the member accounts in your organization](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_access.html)

- [Share a subnet with other account](https://aws.amazon.com/premiumsupport/knowledge-center/vpc-share-subnet-with-another-account/)

### SIEM and SOC
- [Security Hub quick start](security/security-hub/securityhub_customer_findings.md)
- [Customer security findings for security hub](security/security-hub/securityhub_customer_findings.md)

## Network
### VPC
- [How to solve private ip exhaustion with private nat solution](https://aws.amazon.com/cn/blogs/networking-and-content-delivery/how-to-solve-private-ip-exhaustion-with-private-nat-solution/)

- [How do I modify the IPv4 CIDR block of my Amazon VPC](https://aws.amazon.com/premiumsupport/knowledge-center/vpc-ip-address-range/)
  - [How can I modify the CIDR block on my VPC to accommodate more hosts](https://aws.amazon.com/premiumsupport/knowledge-center/vpc-modify-cidr-more-hosts/)

### Keep private - VPC Endpoint and PrivateLink
- [How to verify EC2 access S3 via VPC S3 Endpoint?](vpc/Access-S3-via-VPC-endpoint.md)

- [Why can’t I connect to an S3 bucket using a gateway VPC endpoint?](https://amazonaws-china.com/premiumsupport/knowledge-center/connect-s3-vpc-endpoint/)

- [The customer have a private subnet without NAT and want to use ssm vpc endpoint to connected to SSM service](vpc/SSM-VPC-Endpoint-In-China-Region.md)

- [Using VPC PrivateLink to do cross VPC traffic](EC2/ALB-NLB-Route-Traffic-to-Peering-VPC.md)

### NAT and proxy
- [How I can setup transparent proxy - squid](network/squid/Squid-proxy.md)

- [Nginx S3 Reverse Proxy](network/Nginx/Nginx-S3-Reverse-Proxy.md)

### Load balancers 
- [NLB-TLS-Termination + Access log](network/nlb/NLB-TLS-Termination.md)

- [Current limits of AWS network load balancers](https://ably.com/blog/limits-aws-network-load-balancers)

### Cross data center and cloud Leasing Line - Direct Connect and VPN
- [Direct Connect Cheat sheet](network/direct-connect/)

- [Direct Connect Monitoring](network/direct-connect/DX-Monitoring.md)
  - [DX_Ping_check](network/direct-connect/DX_Ping_check.md)

- [Amazon Direct Connect inter-region routing for public access resources](https://www.amazonaws.cn/en/new/2021/amazon-direct-connect-inter-region-routing-amazon-web-services-china-regions/)

- [Connect alibaba cloud to aws via vpn](https://www.alibabacloud.com/blog/connect-alibaba-cloud-to-aws-via-vpn-gateway_593915)

- [How to achieve active-active/active-passive Direct Connect connection](network/direct-connect/How-to-do-DX-Loadbalance.md)

### Cross board transfer
- [Cross region EC2 to EC2 transfering speed testing](network/Cross-region-EC2-connection-benchmark.md)

### Cross accounts and Cross VPCs - TGW
- [TGW cross account sharing and inter-connection testing](network/tgw-workshop)

- [VPC-Cross-Account-Connection](vpc/VPC-Cross-Account-Connection.md)

### Acceleration network
- [Using Amazon Global Accelerator to improve cross board request improvement](network/aga/README.md)

- [Amazon CloudFront Extensions](https://awslabs.github.io/aws-cloudfront-extensions/)

- [Enable the HTTPS access for CloudFront](network/edge/CloudFront_HTTPS_Access.md)

- [Optimizing performance for users in China with Amazon Route 53 and Amazon CloudFront](https://aws.amazon.com/blogs/networking-and-content-delivery/optimizing-performance-for-users-in-china-with-amazon-route-53-and-amazon-cloudfront/)

- [CloudFront support HTTP/3](https://aws.amazon.com/blogs/aws/new-http-3-support-for-amazon-cloudfront/)

### Edge
- [Protecting workloads on AWS from the Instance to the Edge](https://protecting-workloads.awssecworkshops.com/workshop/)

### Network Secuirty
- [GWLB Example](network/GWLB/GWLB_Example.md)

- [Transit Gateway Connect 集成FortiGate安全服务](network/tgw-workshop/TGW-Connect.md)

- [How to check the Internet Traffic with VPC Flow?](vpc/VPC-Flowlogs-Analysis.md)

- [Traffic Mirror]
  - [Using VPC Traffic Mirroring to monitor and secure your VPC](https://aws.amazon.com/cn/blogs/networking-and-content-delivery/using-vpc-traffic-mirroring-to-monitor-and-secure-your-aws-infrastructure/)
  - [借助 VPC Traffic Mirroring 构建网络入侵检测系统](https://aws.amazon.com/cn/blogs/china/using-vpc-traffic-mirroring-to-construct-network-intrusion-detection-system-update/)

## DNS
### Route 53
- [Route53 in China region](R53/README.md)

- [How do I troubleshoot Route53 geolocation routing issues](https://aws.amazon.com/premiumsupport/knowledge-center/troubleshoot-route53-geolocation/)

- [Route53 Routing Policy](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)

- [Route53 Resolver](R53/R53-Resolver.md)

- [Route53 cross-account-dns](R53/cross-account-dns.md)

## Serverless
### Serverless Workshop
- [AWS Serverless Day](https://serverlessday.cbuilder.tech/index.html)

- [Serverless Patterns Collection](https://serverlessland.com/patterns)

- [Serverless coffee workshop](https://workshop.serverlesscoffee.com/0-introduction.html)

### Function as Service - Lambda
- Lambda integration
  - [Using AWS Lambda with Amazon Kinesis](lambda/kinesis-lambda)
  - [How to put the S3 event to Kafka using lambda](analytics/msk/kafka-s3-event-processor.py)
  - [Demo how to send the Lambda logs to S3 and ElasticSearch by using Kiensis Firehose](https://github.com/jw1i/logs-api-firehose-layer.git)
  - [Run the serverless wordpress with AWS Lambda and AWS EFS](https://github.com/aws-samples/cdk-serverless-wordpress)
  - [AWS 告警通知到微信](https://mp.weixin.qq.com/s/HGT6u83ChKGT0B0OtGjnfg)
  - [Lambda write PostgreSQL](lambda/lambda-write-postgreSQL.md)
  - Lambda sent email
    - [Using Amazon SES](lambda/scripts/lambda_ses.py)
    - [Using SendCloud](lambda/scripts/lambda_ses_sendcloud.py)
    - [利用 Lambda 调用 smtp](https://gist.github.com/rambabusaravanan/dfa2b80369c89ce7517855f4094367e6)
  - [使用 Lambda 函数URL + CloudFront 实现S3镜像回源](https://mp.weixin.qq.com/s/mzRuFciCJXOfQpN-WV9IyA)


- Lambda usage
  - [Schedule-Invoke-Lambda](lambda/Schedule-Invoke-Lambda.md)
  - [AWS Lambda Custom Runtime for PHP](lambda/lambda4php/README.md)
  - [How to clean up the elastic network interface created by Lambda in VPC mode](https://aws.amazon.com/premiumsupport/knowledge-center/lambda-eni-find-delete/?nc1=h_ls)
  - [How to get the lambda public IP address](lambda/lambda-access-internet.py)
  - [How to retrieve the System Manager Parameter Store from lambda](lambda/lambda-ssm-variables.py)
  - [Understanding the Different Ways to Invoke Lambda Functions](https://aws.amazon.com/blogs/architecture/understanding-the-different-ways-to-invoke-lambda-functions/)
  - [Run web applications on AWS Lambda without changing code](https://github.com/aws-samples/aws-lambda-adapter)

- Lambda cost
  - [使用 Graviton 2优化Serverless车联网架构](https://aws.amazon.com/cn/blogs/china/optimizing-the-architecture-of-serverless-internet-of-vehicles-with-graviton-2/)
  - [Optimizing your AWS Lambda costs – Part 1](https://aws.amazon.com/blogs/compute/optimizing-your-aws-lambda-costs-part-1/)
  - [Optimizing your AWS Lambda costs – Part 2](https://aws.amazon.com/cn/blogs/compute/optimizing-your-aws-lambda-costs-part-2/)

- Lambda performance
  - [Understanding AWS Lambda scaling and throughput](https://aws.amazon.com/cn/blogs/compute/understanding-aws-lambda-scaling-and-throughput/)
  - [Lambda provisioned capacity autoscaling的实践](https://github.com/awslabs/aws-lambda-web-adapter/blob/main/examples/springboot/template.yaml)

### API Gateway
- [Build Private API with API Gateway and integrate with VPC resource via API Gateway private integration](devops/apigw/APIGW-PrivateAPI-PrivateIntegration.md)

- [API Gateway for API design patterns](https://aws.amazon.com/cn/blogs/compute/architecting-multiple-microservices-behind-a-single-domain-with-amazon-api-gateway/)

- [Understanding VPC links in Amazon API Gateway private integrations](https://aws.amazon.com/blogs/compute/understanding-vpc-links-in-amazon-api-gateway-private-integrations/)

### Step function
- [Configure Step Functions state machine as a target of Event](integration/EventBridge/Event-Trigger-StepFunction.md)

### Build the serverless - SAM, Chalice, Serverless framwork, CDK
- [hello-cdk](https://github.com/liangruibupt/hello-cdk)

- [Build and deploy a serverless application with the SAM CLI in China reigon](https://github.com/liangruibupt/hell-world-sam)

- [SAM templates and lightweight web frameworks](https://53ningen.com/sam-web-fw/)

- [AWS Serverless Workshop](https://github.com/aws-samples/aws-serverless-workshop-greater-china-region)

- [Chalice - A framework for writing serverless applications](https://aws.github.io/chalice/)

### Serverless with AI/ML
- [Create the pandas layer for lambda ](lambda/create-pandas-layer-4-lambda.md)

- [AWS Lambda – Container Image Support](lambda/Lambda-container-image-support.md)

- [Lambda invoke AWS Rekgonition](lambda/scripts/call-rekgonition.py)

- [Lambda OpenCV](https://github.com/awslabs/lambda-opencv)


## Migration

### Journey to Adopt Cloud-Native Architecture
- [#1 – Preparing your Applications for Hypergrowth](https://aws.amazon.com/blogs/architecture/journey-to-adopt-cloud-native-architecture-series-1-preparing-your-applications-for-hypergrowth/)
- [#2 – Maximizing System Throughput](https://aws.amazon.com/blogs/architecture/journey-to-adopt-cloud-native-architecture-series-2-maximizing-system-throughput/)
- [#3 – Improved Resilience and Standardized Observability](https://aws.amazon.com/blogs/architecture/journey-to-adopt-cloud-native-architecture-series-3-improved-resilience-and-standardized-observability/)
- [#4 – Governing Security at Scale and IAM Baselining](https://aws.amazon.com/blogs/architecture/journey-to-adopt-cloud-native-architecture-series-4-governing-security-at-scale-and-iam-baselining/)
- [#5 – Enhancing Threat Detection, Data Protection, and Incident Response](https://aws.amazon.com/blogs/architecture/journey-to-adopt-cloud-native-architecture-series-5-enhancing-threat-detection-data-protection-and-incident-response/)


### Active Directory
- [How to migrate your on-premises domain to AWS Managed AD?](security/Migrate_on-premises_domain_to_AWS_Managed_AD.md)

### Database
- [How to migrate MySQL to Amazon Aurora by Physical backup](database/rds/mysql/MySQL_Migrate_Aurora.md)

- [aws-database-migration-samples](https://github.com/aws-samples/aws-database-migration-samples)

- [Migrating SQL Server to Amazon RDS using native backup and restore](database/rds/sqlserver/Migrating-SQL-Server-to-Amazon-RDS-using-native-backup-and-restore.md)

- [Microsoft SQL Server to Amazon S3](https://dms-immersionday.workshop.aws/en/sqlserver-s3.html)

- [Best practices for migrating PostgreSQL databases to Amazon RDS and Amazon Aurora](https://aws.amazon.com/blogs/database/best-practices-for-migrating-postgresql-databases-to-amazon-rds-and-amazon-aurora/)

- [Flink CDC Database Data](https://segmentfault.com/a/1190000041009658/en)

- [Migrating data to Amazon Aurora with PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Migrating.html)

### Data migration tool - DMS
- [DMS Workshop](https://dms-immersionday.workshop.aws/en/intro.html)
- [AWS Database Migration Workshop scenario based](https://catalog.us-east-1.prod.workshops.aws/workshops/77bdff4f-2d9e-4d68-99ba-248ea95b3aca/en-US/)

### Data migration tool - 3rd party tool
- [Migration-Data-From-AliCloud](migration/DataMigration/Migration-Data-From-AliCloud.md)
- [XData])migration/DataMigration/XData.md

### Cross Cloud Migration
[Migrate from AliCoud workshop](http://gotoaws.cloudguru.run/)

### File migration
- [Getting Start Transfer Family](migration/TransferFamily/GettingStartTransferFamily.md)

- [Transfer Family to access EFS](https://aws.amazon.com/blogs/aws/new-aws-transfer-family-support-for-amazon-elastic-file-system/)

- [SFTP on AWS](network/SFTPOnAWS.md)

## Storage

### S3 cross region or cross cloud OSS
- [How to sync S3 bucket data between global region and China region](storage/S3/Sync-Global-S3bucket-2-China.md)

- [Cross region S3 file download and upload](storage/S3/crr-s3-download-upload.py)

- [S3 trasnfer tool](https://github.com/aws-samples/amazon-s3-resumable-upload)

- [s3-benchmark-testing](https://github.com/liangruibupt/s3-benchmark-testing)

- [Cross cloud OSS sync to S3](storage/S3/aws-data-replication-hub.md)

- [RClone Quickstart](storage/S3/RClone-Quick-Start.md)

- [Synchronize S3 bucket contents with Amazon S3 Batch Replication](https://aws.amazon.com/blogs/aws/new-replicate-existing-objects-with-amazon-s3-batch-replication/)

### S3
- [S3 Web Explorer](storage/S3/s3explorer)

- [S3-Presign-URL](storage/S3/S3-Presign-URL.md)

- [Uploading to Amazon S3 directly from a web or mobile application](https://aws.amazon.com/cn/blogs/compute/uploading-to-amazon-s3-directly-from-a-web-or-mobile-application/)

- [S3 disale TLS1.1 access or enforce TLS1.2 for in-transit encryption](storage/S3/S3-Disable-TLS1.1-Access.md)

- [使用 VPC Endpoint 从 VPC 或 IDC 内访问 S3](https://aws.amazon.com/cn/blogs/china/use-vpc-endpoint-access-from-vpc-or-idc-s3/)

- [Adding and removing object tags with S3 Batch Operations](https://aws.amazon.com/blogs/storage/adding-and-removing-object-tags-with-s3-batch-operations/)

- [S3 inventory usage](storage/S3/s3-inventory.md)

- [How Trend Micro uses Amazon S3 Object Lambda to help keep sensitive data secure](https://aws.amazon.com/cn/blogs/storage/how-trend-micro-uses-amazon-s3-object-lambda-to-help-keep-sensitive-data-secure/)

- [Using S3 Intelligent-Tiering](storage/S3/S3_Intelligent-Tiering.md)

- [How to Check S3 object integrity](storage/S3/check-integrity-of-s3-object.md)

### EBS
- [How do I create a snapshot of an EBS RAID array](https://aws.amazon.com/premiumsupport/knowledge-center/snapshot-ebs-raid-array/)

- [EBS benchmark testing](https://github.com/liangruibupt/ebs-benchmark-testing)

### Storage Gatewway
- [storage-gateway-demo and performance testing](https://github.com/liangruibupt/storage-gateway-demo)
- [How can I troubleshoot an S3AccessDenied error from my file gateway](https://aws.amazon.com/premiumsupport/knowledge-center/file-gateway-troubleshoot-s3accessdenied/)
- [How can I set up a private network connection between a file gateway and Amazon S3](https://aws.amazon.com/premiumsupport/knowledge-center/storage-gateway-file-gateway-private-s3/)
- [Resolve an internal error when activating my Storage Gateway](https://aws.amazon.com/premiumsupport/knowledge-center/storage-gateway-resolve-internal-error/)

### EFS and FSx or other shared file system
- [EFS Workshop for GCR](https://github.com/liangruibupt/amazon-efs-workshop)

- [Amazon FSx for Lustre or Amazon FSx for Windows File Server Workshop](storage/FSx/README.md)

- [Amazon FSx for Windows File Server file share on an Amazon EC2 Linux instance](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/using-file-shares.html) You can mount an Amazon FSx for Windows File Server file share on an Amazon EC2 Linux instance that is either joined to your Active Directory or not joined.

- [goofys on AWS](https://github.com/kahing/goofys)

- [EFS Web Browser for list files and directory](https://aws.amazon.com/cn/blogs/china/building-a-serviceless-efs-file-browser/)

- [Global Region Simple File Manager for Amazon EFS](https://aws.amazon.com/solutions/implementations/simple-file-manager-for-amazon-efs/)

- [基于AWS DataSync 迁移 NetApp NAS上云](https://aws.amazon.com/cn/blogs/china/migrating-netapp-nas-to-cloud-based-on-aws-datasync/)


## Database
### RDS
#### RDS usage
- [Amazon Aurora MySQL Database Quick Start Reference Deployment](https://aws-quickstart.github.io/quickstart-amazon-aurora-mysql/)
  
- [RDS common questions](database/rds/RDS_common_questions.md)

- [Use Proxysql for RDS for MySQL or Aurora databases connection pool and Read/Write Split](database/rds/proxysql/serverless-proxysql.md)
  
- [Proxy for PostgreSQL](database/rds/proxysql/proxy-for-postgeSQL.md)

- [AWS Bookstore Demo App - Purpose-built databases enable you to create scalable, high-performing, and functional backend infrastructures to power your applications](https://github.com/aws-samples/aws-bookstore-demo-app)

- [如何使用 Amazon RDS for PostgreSQL 启用查询日志记录 query logging？](https://aws.amazon.com/cn/premiumsupport/knowledge-center/rds-postgresql-query-logging/)

- [RDS mysql max connections](https://aws.amazon.com/premiumsupport/knowledge-center/rds-mysql-max-connections/)

- [rds-postgresql ERROR: <module/extension> must be loaded via shared_preload_libraries](https://aws.amazon.com/premiumsupport/knowledge-center/rds-postgresql-resolve-preload-error/)

- [MySQL 手工分库分表]
  - [Amazon Aurora的读写能力扩展之ShardingSphere-Proxy篇](https://aws.amazon.com/cn/blogs/china/make-further-progress-shardingsphere-proxy-chapter-of-amazon-auroras-reading-and-writing-ability-expansion/)
  - [拓展 Aurora的读写能力之Gaea篇](https://aws.amazon.com/cn/blogs/china/make-further-progress-gaea-chapter-on-expanding-auroras-reading-and-writing-ability/)

#### RDS Cross region, cross account, data replication and backup
- [MySQL Cross Region Replica](database/rds/mysql/Cross-region-replica.md)

- [通过 Debezium and MSK Connect 一站式解决所有数据库 CDC 问题](https://aws.amazon.com/cn/blogs/china/introducing-amazon-msk-connect-stream-data-to-and-from-your-apache-kafka-clusters-using-managed-connectors/)

- [Cross vpc access RDS MySQL via VPC endpoint](database/rds/mysql/cross-vpc-access-mysql-via-endpoint.md)

- [DB Snapshot cross region copy and backup cross region replication](database/rds/Cross-region-copy-and-replication.md)

- [QuickStart RDS PostgreSQL and backup](database/rds/PostgreSQL/QuickStart_PostgreSQL.md)

- [How-to-achive-postgreSQL-Table](database/rds/PostgreSQL/How-to-achive-postgreSQL-Table.md)

#### RDS upgrade
- [Achieving minimum downtime for major version upgrades in Amazon RDS PostgreSQL](database/rds/PostgreSQL/Achieving-minimum-downtime-for-major-version-RDS-PostgeSQL-upgrades.md)

- [How to Migrate from Amazon RDS Aurora or MySQL to Amazon Aurora Serverless](https://medium.com/@souri29/how-to-migrate-from-amazon-rds-aurora-or-mysql-to-amazon-aurora-serverless-55f9a4a74078)

#### RDS Security
- [Managing postgresql users and roles](https://aws.amazon.com/blogs/database/managing-postgresql-users-and-roles/)

- [best-practices-for-working-with-amazon-aurora-serverless](https://aws.amazon.com/blogs/database/best-practices-for-working-with-amazon-aurora-serverless/)

- [Securing sensitive data in Amazon RDS](https://aws.amazon.com/blogs/database/applying-best-practices-for-securing-sensitive-data-in-amazon-rds/)

- [MySQL validate_password plugin](database/rds/mysql/mysql_password_validation.md)

- [Encrypt the Unencrypted RDS](database/rds/PostgreSQL/unencrypted_db_to_encrypted.md)

- [Disable_RDS_encryption](database/rds/Disable_RDS_encryption.md)
  
#### RDS Performance
- [Amazon Aurora Performance Assessment](https://d1.awsstatic.com/product-marketing/Aurora/RDS_Aurora_Performance_Assessment_Benchmarking_v1-2.pdf)
  
- [Automate benchmark tests for Amazon Aurora PostgreSQL](https://aws.amazon.com/blogs/database/automate-benchmark-tests-for-amazon-aurora-postgresql/)

- [benchmarking-read-write-speed-on-amazon-aurora-classic-rds-and-local-disk](https://medium.datadriveninvestor.com/benchmarking-read-write-speed-on-amazon-aurora-classic-rds-and-local-disk-29500d9210da)
  

### Graph Database
- [Neo4j-On-AWS](database/neo4j/Neo4j-On-AWS.md)

- [How to use the Neptune to Build Your First Graph Application](database/Neptune/workshop101)

### ElastiCache
- [Building a fast session store for your online applications with Amazon ElastiCache for Redis](database/redis/session_store)

- [Database Caching Strategies Using Redis](database/redis/Database_Caching_Strategies_Using_Redis.md)

- [使用Redisson连接Amazon ElastiCache for redis 集群](https://aws.amazon.com/cn/blogs/china/connecting-amazon-elasticache-for-redis-cluster-using-redisson/?nc1=h_ls)

- [ElastiCache for Redis 慢日志可视化平台](https://aws.amazon.com/cn/blogs/china/build-elasticache-for-redis-slow-log-visualization-platform/)

- [RedisInsight 官方可视化工具](https://mp.weixin.qq.com/s/DSRCdzFpzNoBSbp2pvm1SA)

### Key-Value and Document
#### DynamoDB
- [如何将我的 DynamoDB 表从一个 AWS 账户迁移到另一个账户](https://aws.amazon.com/cn/premiumsupport/knowledge-center/dynamodb-cross-account-migration/)

- [DynamoDB labs](database/dynamodb/dynamodb-lab.md)

- [中国区与 Global 区域 DynamoDB 表双向同步](https://aws.amazon.com/cn/blogs/china/one-bridge-fly-north-south-china-and-global-area-dynamodb-table-two-way-synchronization1/)

- [aws-dynamodb-cross-region-replication](https://github.com/aws-samples/aws-dynamodb-cross-region-replication)

- [Securing sensitive data in Amazon DynamoDB](https://aws.amazon.com/blogs/database/applying-best-practices-for-securing-sensitive-data-in-amazon-dynamodb/)

- [DynamoDB_Pagenation](database/dynamodb/DynamoDB_Pagenation.md)

- [DynamoDB table initial migration from global to China](https://github.com/yizhizoe/dynamodb-init-migration)

#### MongoDB and DocumentDB
- [Get-Start-DocumentDB](database/documentdb/Get-Start-DocumentDB.md)

- [DocumentDB performance benchmark](https://www.mongodb.com/atlas-vs-amazon-documentdb/performance)

- [利用ChangeStream实现Amazon DocumentDB表级别容灾复制](https://mp.weixin.qq.com/s/B7UjLi7vAa8f8yzaAq71CQ)

### Time series
- [Amazon TimeStream Performance Testing](database/timestream/TimeStream-Performance-Testing.md)

## Container
### EKS
- [eks-workshop-greater-china](https://github.com/aws-samples/eks-workshop-greater-china)

- [EKS-Workshop-China](https://github.com/liangruibupt/EKS-Workshop-China)
  - [EKS in Beijing 3 AZ](container/EKS_in_Beijing_3AZ.md)

- [Advanced EKS workshop](https://github.com/pahud/amazon-eks-workshop)

- [Windows pod in EKS](container/EKS_in_Beijing_3AZ.md)

- [Install SSM Agent on Amazon EKS worker nodes by using Kubernetes DaemonSet](container/Install-SSM-Agent-on-EKS-Worker-Node.md)

- [How can I check, scale, delete, or drain my worker nodes on EKS](https://aws.amazon.com/premiumsupport/knowledge-center/eks-worker-node-actions/)

- [EKS Best Practices Guides](https://aws.github.io/aws-eks-best-practices/)

- [关于Amazon EKS基于Gitlab的CICD实践](https://aws.amazon.com/cn/blogs/china/about-amazon-eks-gitlab-based-cicd-practice-one-gitlab-deployment-and-configuration/)

- [关于Amazon EKS中Service和Ingress深入分析和研究](https://aws.amazon.com/cn/blogs/china/in-depth-analysis-and-research-on-service-and-ingress-in-amazon-eks/)

- [一文看懂 Amazon EKS 中的网络规划](https://aws.amazon.com/cn/blogs/china/understand-the-network-planning-in-amazon-eks-in-one-article/)

- [How do I use multiple CIDR ranges with Amazon EKS]
    - [Check your VPC setting](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html#vpc-resize)
    - [Add the additioal CIDR](https://aws.amazon.com/premiumsupport/knowledge-center/eks-multiple-cidr-ranges/)

- [Cluster networking for Amazon EKS worker nodes](https://aws.amazon.com/cn/blogs/containers/de-mystifying-cluster-networking-for-amazon-eks-worker-nodes/)

- [EKS Managed Group]
  - [Overview](https://aws.amazon.com/blogs/containers/eks-managed-node-groups/)
  - [Quotas](https://docs.aws.amazon.com/eks/latest/userguide/service-quotas.html)
  - [Official doc](https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html)
  - [Cluster autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/autoscaling.html#cluster-autoscaler)
  Managed node groups are managed using Amazon EC2 Auto Scaling groups, and are compatible with the Cluster Autoscaler. You can deploy the Cluster Autoscaler to your Amazon EKS cluster and configure it to modify your Amazon EC2 Auto Scaling groups.
  - [Vertical Pod Autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/vertical-pod-autoscaler.html)
  - [Horizontal Pod Autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/horizontal-pod-autoscaler.html)

- [DataDog for EKS control plane monitoring](https://docs.datadoghq.com/agent/kubernetes/control_plane/?tab=helm#EKS)

- [Exclusive Node from EKS ELB](container/Exclusive_Node_from_ELB.md)

- [ Securing Kubernetes with Private CA](container/EKS-Certification.md)

### ECS
- [ECS workshop for china region](https://github.com/liangruibupt/aws-ecs-workshop-gcr)

- [ECS quick start demo workshop](https://ecs-cats-dogs.workshop.aws/en/)

- [ECR Sync up from global from China and ECS Service Discovery](container/ECR-Sync-and-ECS-Service-Discovery.md)

- [How can I create an Application Load Balancer and then register Amazon ECS tasks automatically](container/ECS-Dynamic-Port-Mapping.md)

- [How can I a ECS service serve traffic from multiple port?](container/ECS-Dynamic-Port-Mapping.md)

- [How to launch tomcat server on ECS](container/tomcat)

- [Amazon ECS firelens]
    - [firelens examples](https://github.com/aws-samples/amazon-ecs-firelens-examples)
    - [firelens demo](container/ECS-FireLens.md)

### Fargate
- [Recursive Scaling Fargate with Amazon SQS](https://aws.amazon.com/blogs/architecture/design-pattern-for-highly-parallel-compute-recursive-scaling-with-amazon-sqs/)

- [aws-fargate-fast-autoscaler](aws-samples/aws-fargate-fast-autoscaler)

- [EKS on Fargate QuickStart](container/EKSonFargate-QuickStart.md)

### Istio, Envoy, App Mesh, Service discovery
- [AWS App Mesh Workshop](https://www.appmeshworkshop.com/introduction/what_is_appmesh/)

- [AWS App Mesh ingress and route enhancements](https://aws.amazon.com/blogs/containers/app-mesh-ingress-route-enhancements/)

- [Running microservices in Amazon EKS with AWS App Mesh and Kong](https://aws.amazon.com/blogs/containers/running-microservices-in-amazon-eks-with-aws-app-mesh-and-kong/)

- [EKS and CloudMap]
    - [Introducing AWS Cloud Map MCS Controller for K8s](https://aws.amazon.com/blogs/opensource/introducing-the-aws-cloud-map-multicluster-service-controller-for-k8s-for-kubernetes-multicluster-service-discovery/)
    - [Cross Amazon EKS cluster App Mesh using AWS Cloud Map](https://aws.amazon.com/cn/blogs/containers/cross-amazon-eks-cluster-app-mesh-using-aws-cloud-map/)
    - [Cloud Map for serverless applications](https://aws.amazon.com/blogs/opensource/aws-cloud-map-service-discovery-serverless-applications/)

## DevOps
### Management
- [AWS Management Tool stack workshop](https://workshop.aws-management.tools/)

- [How to make the Trust Advisor Check automatically](devops/trust-advisor)

[AWS Well-Architected]
  - [AWS Well-Architected labs](https://wellarchitectedlabs.com/)
  - [AWS Well-Architected Labs in Chinese](http://wa.bwcx.me/)


[Organizing Your AWS Environment Using Multiple Accounts]
  - [Organizing Your AWS Environment Using Multiple Accounts Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/organizing-your-aws-environment/organizing-your-aws-environment.html)
  - [Landing Zone example](https://github.com/clouddrove/cloudformation-aws-landing-zone)


- [AWS Services Autoscaling](devops/cloudwatch/AWS-Service-Autoscaling.md)

### CI/CD
- [CodeCommit](devops/codecommit/getstart-codecommit.md) and - [CodeCommit setup](devops/codecommit/codecommit-setup.md)

- [Codebuild Get Start](devops/codebuild/codebuild-get-start.md)

- [CodePiple Workshop](devops/codepipeline/README.md)

#### Serverless CICD
- [Serverless CI/CD based on Jenkins](https://github.com/aws-samples/aws-serverless-workshop-greater-china-region/tree/master/Lab8B-CICD-Jenkins)

- [Lambda CICD with Jenkins and CodeBuild and CodeDeploy](https://github.com/aws-samples/aws-serverless-workshop-greater-china-region/tree/master/Lab8B-CICD-Jenkins)

- [AWS Serverless CI/CD hands on lab](devops/serverless-cicd/README.md)

#### Container CICD
- [在 AWS 中国区 EKS 上以 GitOps 方式构建 CI/CD 流水线](https://aws.amazon.com/cn/blogs/china/build-ci-cd-pipeline-in-gitops-on-aws-china-eks/)

### Monitoring and Tracing
- [X-Ray in AWS China region](https://github.com/liangruibupt/aws-xray-workshop-gcr)

- [AWS DevOps Management Observability workshop](devops/managed-platform)

- [Accessing the AWS Health API](devops/personal-health-dashboard/Accessing-the-AWS-Health-API.md)

- [一键部署在钉钉群里自动创建 AWS Support Case 无服务器解决方案](https://www.amazonaws.cn/en/solutions/ipc-ai-saas-solution/)
  - [Event Bridge rule to capture EC2 status change & AWS health event in different AWS region](https://github.com/Chris-wa-He/AWS-crossRegion-eventBridge)


- [SMS notification for AWS health event](https://github.com/aws/aws-health-tools/tree/master/sms-notifier)

- [Add alarms-in-batches for ec2 on cloudwatch](https://aws.amazon.com/cn/blogs/china/add-alarms-in-batches-for-ec2-on-cloudwatch/)
  - [Use tags to create and maintain Amazon CloudWatch alarms for Amazon EC2 instances](https://aws.amazon.com/blogs/mt/use-tags-to-create-and-maintain-amazon-cloudwatch-alarms-for-amazon-ec2-instances-part-1/)
  - [Automatically create a set of CloudWatch alarms with tagging](https://github.com/aws-samples/amazon-cloudwatch-auto-alarms)
  - [监控告警一点通：在CloudWatch上为 EC2批量添加告警](https://aws.amazon.com/cn/blogs/china/add-alarms-in-batches-for-ec2-on-cloudwatch/)
  - [企业微信、钉钉接收 Amazon CloudWatch 告警](https://aws.amazon.com/cn/blogs/china/enterprise-wechat-and-dingtalk-receiving-amazon-cloudwatch-alarms/)
    - [一键部署企业微信，钉钉，飞书，Slack 告警](https://github.com/Chris-wa-He/AWS-Lambda-notifier)

- [Monitor using Prometheus and Grafana](https://www.eksworkshop.com/intermediate/240_monitoring/) Here is how to deploy Grafana on EKS

- [Datadog integration with AWS China](https://docs.datadoghq.com/integrations/amazon_web_services/?tab=accesskeysgovcloudorchinaonly)
- [Grafana and CloudWatch integration]
  - [Grafana AWS CloudWatch data source](https://grafana.com/docs/grafana/latest/datasources/aws-cloudwatch/)
  - [Grafana cloudwatch plugin](https://grafana.com/grafana/plugins/cloudwatch/)

[Quota Monitor on AWS](https://aws.amazon.com/solutions/implementations/quota-monitor/)

### Logging
- [How to send CloudWatch logs to S3](devops/cloudwatch/How-to-send-logs-to-S3.md)

- [Central Logging on AWS](analytics/central-logging)

- [How to stream logs from CloudWatch logs to Splunk](devops/cloudwatch/CloudWatch-logs-to-splunk.md)

- [Log Hub]
  - [Log Hub for EKS](https://aws.amazon.com/cn/blogs/china/use-the-log-hub-solution-to-collect-logs-in-an-amazon-eks-cluster-environment/)
  - [Log Hub for WAF](https://aws.amazon.com/cn/blogs/china/aws-waf-deployment-guide-4-using-the-log-hub-automatic-deployment-solution-for-waf-security-operations/)

### Change configuration 
- [AWS AppConfig Workshop](devops/appconfig)

- [AWS Config for resource housekeeping and cost optimization](https://aws.amazon.com/blogs/mt/aws-config-best-practices/)

- [Community Config Rules](https://github.com/awslabs/aws-config-rules)
  - [AWS Config related blogs](https://aws.amazon.com/blogs/security/tag/aws-config/)

- [Create a Lambda Function for a Cross-Account Config Rule](security/aws-config/Cross-Account-Lambda-Config-Rule.md)

- [How-to-get-public-resources](security/aws-config/How-to-get-public-resources.md)
  
### Developer
- [CSV tools](https://github.com/secretGeek/AwesomeCSV)

- [Python GUI lib](https://mp.weixin.qq.com/s/sqXCSgrMMcXCA1lxbAucsA)

### Infra as Code

- [How to migrate global cloudformation to China reigon?](xaas/Global-Cloudformation-Migrate-to-China.md)

- [Terraform_Demo](devops/terraform/Terraform_Demo.md)

- [CloudFormation Stack Set](devops/cloudformation/Stackset.md)

- [AWS Cloud Control API QuickStart](xaas/CloudControlAPI.md)

## Integration
### Quque, notification
- [How to build Amazon SNS HTTP Subscription?](integration/SNS/SNS-HTTP-Subscription.md)

- [SQS quick start demo for Standard Queue and JMS](integration/SQS)

- [Sent message to SQS queue using Lambda](integration/SQS/lambda-sqs-sentmsg.js)

### Call Center
- [Use the Amazon Connect to call out the mobile phone](integration/Connect/Using-Amazon-Connect-call-mobile-phone.md)

- [Automotive Call Center Services Solution Using Amazon Connect](https://aws.amazon.com/blogs/industries/automotive-call-center-services-solution-using-amazon-connect-by-wirelesscar/)

### MQ
- [AmazonMQ-Workshop](integration/MQ/AmazonMQ-Workshop.md)
  - [Automate RabbitMQ configuration in Amazon MQ](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/automate-rabbitmq-configuration-in-amazon-mq.html)
  - consumer_timeout Amazon RabbitMQ 不支持修改
  - [Jenkins 与 RabbitMQ集成]
      - [Jenkins 与 RabbitMQ集成 一](https://www.jianshu.com/p/c8582ea94783)
      - [Jenkins 与 RabbitMQ集成 二](https://www.jianshu.com/p/3fb98aaf9af2)
      - [Jenkins plugin to connect RabbitMQ then consume messages in queue](https://github.com/jenkinsci/rabbitmq-consumer-plugin)
      - [RabbitMQ Jenkins build trigger](https://plugins.jenkins.io/rabbitmq-build-trigger)

### Email
- [Amazon Simple Email Service SES Usaga](integration/SES/SES-Usage.md)

## Media
### Video on Demand
- [Video on Demand on AWS](media/mediaconvert)

### Video Streaming
- [无服务器直播解决方案](https://www.amazonaws.cn/solutions/serverless-video-streaming/)

- [Open source web conferencing solution - Jitsi](https://aws.amazon.com/cn/blogs/opensource/getting-started-with-jitsi-an-open-source-web-conferencing-solution/)

## Mobile
### Moible app development
- [Tutorial: Intro to React – React](https://reactjs.org/tutorial/tutorial.html)

### GraphQL - AppSync
- [AppSync-Workshop](database/appsync/AppSync-Workshop.md)

## Business continuity
### Backup
- [Backup FAQ](dr_ha/backup/Backup_FAQ.md)

### DR
[Understand resiliency patterns and trade-offs to architect efficiently in the cloud](https://aws.amazon.com/cn/blogs/architecture/understand-resiliency-patterns-and-trade-offs-to-architect-efficiently-in-the-cloud/)

#### RDS HA/DR
- [Amazon RDS Under the Hood: Multi-AZ](database/rds/mysql/Amazon-RDS-Multi-AZ-Under-the-Hood.md)

- - [使用 Amazon RDS for Oracle 配合 Oracle Active Data Guard 建立托管的灾难恢复与只读副本](https://aws.amazon.com/cn/blogs/china/managed-disaster-recovery-and-managed-reader-farm-with-amazon-rds/)

- [RDS MySQL Automated frequency backup](https://aws.amazon.com/premiumsupport/knowledge-center/rds-mysql-automated-backups/)
  

## Game
### GameLift
- [unreal engine game server]
  - [Add Amazon GameLift to an unreal engine game server project - Amazon GameLift](https://docs.aws.amazon.com/gamelift/latest/developerguide/integration-engines-setup-unreal.html)
  - [Host Unreal Engine UE Game on GameLift](https://aws.amazon.com/blogs/gametech/amazon-gamelift-integration-with-unreal-engine-new-youtube-video-series-launch/)


## SAP
### HA/DR
- [SAP云上自适应跨可用区高可用方案](https://aws.amazon.com/cn/blogs/china/adaptive-high-availability-solution-across-availability-zones-on-sap-cloud/)
- [基于CloudEndure的新一代云上一键灾备解决方案与最佳实践](https://aws.amazon.com/cn/blogs/china/one-click-cloud-preparedness-solutions-and-best-practices-based-on-cloudendure/)

## Office and business application
### Workspaces - VDI
- [How to Enable Multi-Factor Authentication for AWS Services by Using AWS Microsoft AD and On-Premises Credentials](https://aws.amazon.com/blogs/security/how-to-enable-multi-factor-authentication-for-amazon-workspaces-and-amazon-quicksight-by-using-microsoft-ad-and-on-premises-credentials/)
