# aws-is-how
- [aws-is-how](#aws-is-how)
  - [常见故障排除及支持手册](#常见故障排除及支持手册)
  - [AWS Skill builder](#aws-skill-builder)
  - [freeCodeCamp](#freecodecamp)
  - [Architecture Design](#architecture-design)
  - [AI/ML](#aiml)
    - [ML Study](#ml-study)
    - [SageMaker](#sagemaker)
    - [Jupyter Notebooks](#jupyter-notebooks)
    - [Compute vision](#compute-vision)
    - [LLM and GenAI](#llm-and-genai)
    - [Labeling](#labeling)
    - [Federated ML](#federated-ml)
    - [ML Hardware](#ml-hardware)
    - [Robotics](#robotics)
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
    - [Data On EKS](#data-on-eks)
    - [Stream - Flink and Spark Streaming](#stream---flink-and-spark-streaming)
    - [Stream - Kinesis](#stream---kinesis)
    - [Stream - Kafka](#stream---kafka)
    - [Ad-hoc and Interactive query: Athena](#ad-hoc-and-interactive-query-athena)
    - [Data Warehouse: Redshfit](#data-warehouse-redshfit)
    - [Search and analytics: Elasticsearch Service](#search-and-analytics-elasticsearch-service)
    - [Governance](#governance)
    - [BI](#bi)
    - [Delta Lake](#delta-lake)
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
    - [Vulnerability Assessment - Inspector and Alternative](#vulnerability-assessment---inspector-and-alternative)
  - [Network](#network)
    - [Test Performance/Latency](#test-performancelatency)
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
    - [HTTPDNS](#httpdns)
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
    - [VMware migration](#vmware-migration)
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
      - [EKS networking](#eks-networking)
      - [EKS practice](#eks-practice)
      - [DevOps on EKS](#devops-on-eks)
    - [ECS](#ecs)
    - [Fargate](#fargate)
    - [Istio, Envoy, App Mesh, Service discovery](#istio-envoy-app-mesh-service-discovery)
    - [ECR](#ecr)
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
    - [Resilience](#resilience)
  - [Game](#game)
    - [GameLift](#gamelift)
  - [SAP](#sap)
    - [HA/DR](#hadr)
  - [Office and business application](#office-and-business-application)
    - [Workspaces - VDI](#workspaces---vdi)
  - [Metaverse](#metaverse)
  - [Automotive](#automotive)
  - [HealthCare and Life Science](#healthcare-and-life-science)

## [常见故障排除及支持手册](https://amazonaws-china.com/cn/premiumsupport/knowledge-center/?nc1=h_ls&from=timeline&isappinstalled=0)

## [AWS Skill builder](https://explore.skillbuilder.aws/learn/course/11458/play/42651/play-cloud-quest-cloud-practitioner)

## [freeCodeCamp](https://github.com/freeCodeCamp/freeCodeCamp)

## Architecture Design
- [Building hexagonal architectures on AWS](https://docs.aws.amazon.com/prescriptive-guidance/latest/hexagonal-architectures/welcome.html)
- [Service Screener is a tool that runs automated checks on AWS environments and provides recommendations based on AWS and community best practices](https://github.com/aws-samples/service-screener-v2)
  
## AI/ML

### ML Study
[ML入门的知识，以及ML项目中的一些经验总结分享](https://github.com/yuhuiaws/ML-study)

### SageMaker

- [SageMaker-Workshop](ai-ml/SageMaker/SageMaker-Workshop.md)
- [SageMaker Learning Series](ai-ml/SageMaker/SageMaker-Learning.md)
- [SageMaker Notebook]
  - [Install External Libraries and Kernels in SageMaker Notebook Instances](https://docs.aws.amazon.com/sagemaker/latest/dg/nbi-add-external.html)
  - [CloudFormation to launch SageMaker Notebook on Glue Dev Endpoint](https://github.com/aws-samples/aws-glue-samples/blob/master/utilities/sagemaker_notebook_automation/glue_sagemaker_notebook_cn.yaml)
  - [Invoke SageMaker Notebook via Event](ai-ml/SageMaker/Invoke_SageMaker_Notebook_via_event.md)
    - [Lambda-Trigger-SageMaker-Notebook](ai-ml/SageMaker/Lambda-Trigger-SageMaker-Notebook.md)
    - [Scheduling Jupyter notebooks on SageMaker ephemeral instances](https://aws.amazon.com/blogs/machine-learning/scheduling-jupyter-notebooks-on-sagemaker-ephemeral-instances/)
- [SageMaker training job]
  - [SageMaker input mode: pipe mode and file mode](https://aws.amazon.com/blogs/machine-learning/using-pipe-input-mode-for-amazon-sagemaker-algorithms/)
  - [Save costs by automatically shutting down idle resources within Amazon SageMaker Studio](https://aws.amazon.com/blogs/machine-learning/save-costs-by-automatically-shutting-down-idle-resources-within-amazon-sagemaker-studio/)
  - [SageMaker Neo supported devices edge devices](https://docs.aws.amazon.com/zh_cn/sagemaker/latest/dg/neo-supported-devices-edge-devices.html)
  - [Amazon SageMaker HyperPod introduces Amazon EKS support](https://aws.amazon.com/blogs/aws/amazon-sagemaker-hyperpod-introduces-amazon-eks-support/)
  - [Amazon EKS support in Amazon SageMaker HyperPod](https://aws.amazon.com/blogs/machine-learning/introducing-amazon-eks-support-in-amazon-sagemaker-hyperpod/)

### Jupyter Notebooks
- [A gallery of interesting Jupyter Notebooks](https://github.com/jupyter/jupyter/wiki/A-gallery-of-interesting-Jupyter-Notebooks)
- [Set up a Jupyter Notebook Server on deep learning AMI](https://docs.aws.amazon.com/dlami/latest/devguide/setup-jupyter.html)


### Compute vision
- [Use SageMaker for Automotive Image Classification](ai-ml/auto-image-classification/UseSageMaker4AutoImageClassification.md)
- [ML Bot Workshop](http://ml-bot.s3-website.cn-north-1.amazonaws.com.cn/)
- [IP Camera AI SaaS Solution](https://www.amazonaws.cn/en/solutions/ipc-ai-saas-solution/)
- [image classification using resnet](ai-ml/image-classification-resnet)
- [Open CV on Lambda](ai-ml/auto-image-classification/lambda_opencv.md)
- [OCR]
  - [Train and deploy OCR model on SageMaker](https://github.com/aws-samples/train-and-deploy-ocr-model-on-amazon-sagemaker)
  - [Scale YOLOv5 inference with Amazon SageMaker endpoints and AWS Lambda](https://aws.amazon.com/blogs/machine-learning/scale-yolov5-inference-with-amazon-sagemaker-endpoints-and-aws-lambda/)
  - [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
    - [PaddleOCR on SageMaker](https://aws.amazon.com/cn/blogs/machine-learning/onboard-paddleocr-with-amazon-sagemaker-projects-for-mlops-to-perform-optical-character-recognition-on-identity-documents/)
    - [PaddleOCR的轻量级车牌识别](https://github.com/PaddlePaddle/PaddleOCR/blob/release/2.7/applications/%E8%BD%BB%E9%87%8F%E7%BA%A7%E8%BD%A6%E7%89%8C%E8%AF%86%E5%88%AB.md)
- [新希望-构建云上智慧牧场](https://aws.amazon.com/cn/blogs/china/smart-ranch-with-aws/)


### LLM and GenAI
- [GenAI Overview]
  - [一文读懂AIGC](https://mp.weixin.qq.com/s/gLj4sfn5dOuZL1pwCKWqzg)
    - 跨模态深度学习模型CLIP（Contrastive Language-Image Pre-Training）
    - “对抗生成网络”GAN（Generative Adverserial Network）
    - Diffusion模型
  - [Token, Embeding, Self-Attention, Transformer, Vector, Encoding output 101](https://baoyu.io/pages/ft/generative-ai)
  - [ChatGPT Overview](https://mp.weixin.qq.com/s/gLj4sfn5dOuZL1pwCKWqzg)
  - [AIGC workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/1ac668b1-dbd3-4b45-bf0a-5bc36138fcf1/zh-CN/1-introduction)
  - [三类场景赋能行业创新](https://mp.weixin.qq.com/s/iOsMwS_nysHn6O3F0_Vnbg)
  - [A guide to making your AI vision a reality](https://aws.amazon.com/cn/blogs/enterprise-strategy/a-guide-to-making-your-ai-vision-a-reality/)
  - [understand The tokenize](https://huggingface.co/spaces/Xenova/the-tokenizer-playground)
  - [图解AI三大核心技术：RAG、大模型、智能体](https://mp.weixin.qq.com/s/pe2Rn6O_1KyqfFbCtMpqiw)

- [Promote-Engineering]
  - [FlagEmbedding - retrieval, classification, clustering, or semantic search. And it also can be used in vector databases for LLMs](https://huggingface.co/BAAI/bge-large-zh)
  - [Prompt engineering techniques and best practices with Claude3](https://aws.amazon.com/blogs/machine-learning/prompt-engineering-techniques-and-best-practices-learn-by-doing-with-anthropics-claude-3-on-amazon-bedrock/)
  - [Implementing advanced prompt engineering with Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/implementing-advanced-prompt-engineering-with-amazon-bedrock/)
  - [Evaluating prompts at scale with Prompt Management and Prompt Flows for Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/evaluating-prompts-at-scale-with-prompt-management-and-prompt-flows-for-amazon-bedrock/)
  - [Enhance performance of generative language models with self-consistency prompting](https://aws.amazon.com/blogs/machine-learning/enhance-performance-of-generative-language-models-with-self-consistency-prompting-on-amazon-bedrock/)
   
- [Image Generation]
  - [Stable Diffusion]
    - [stable-diffusion-webui self hosted on g4dn.xlarge with Ubuntu 22.04 LTS](https://github.com/AUTOMATIC1111/stable-diffusion-webui)
      - Remember run `sudo apt-get update` before `sudo apt install wget git python3 python3-venv`. 
      - Run `ssh -L 7862:localhost:7862 ubuntu@xxxx.xxx.xx.xxx` or `bash stable-diffusion-webui/webui.sh --share`
      - [Install Nvida Cuda](https://docs.nvidia.com/cuda/cuda-installation-guide-linux/)
      - [create-your-own-stable-diffusion-ui-on-aws](https://towardsdatascience.com/create-your-own-stable-diffusion-ui-on-aws-in-minutes-35480dfcde6a)
    - [sagemaker-stablediffusion-quick-kit](https://github.com/aws-samples/sagemaker-stablediffusion-quick-kit)
    - [Stabule Diffusion on EKS](https://aws.amazon.com/cn/blogs/china/stable-diffusion-image-generation-solution-based-on-amazon-eks/)
    - [Stable Diffusion Quick Kit 动手实践 – 基础篇](https://aws.amazon.com/cn/blogs/china/stable-diffusion-quick-kit-hands-on-practice-basics/)
    - [Stable Diffusion Extention hosting on AWS](https://awslabs.github.io/stable-diffusion-aws-extension/zh/architecture-overview/architecture-details/)
    - [SageMaker Notebook 机器学习服务轻松托管 Stable Diffusion WebUI](https://aws.amazon.com/cn/blogs/china/quickly-build-a-hosted-stable-diffusion-ai-drawing-visualization-environment-based-on-sagemaker-notebook/)
    - [Stable Diffusion on Amazon SageMaker Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/d9ca179a-3a36-4822-9f80-0b3ffcc26f37/en-US)
    - [inpaint-images-with-stable-diffusion-using-amazon-sagemaker-jumpstart](https://aws.amazon.com/blogs/machine-learning/inpaint-images-with-stable-diffusion-using-amazon-sagemaker-jumpstart/)
    - [基于 Amazon EKS 的 Stable Diffusion ComfyUI 部署方案](https://aws.amazon.com/cn/blogs/china/stable-diffusion-comfyui-deployment-solution-based-on-amazon-eks/)
  - [open_artifacts_for_bedrock](https://github.com/aws-samples/open_artifacts_for_bedrock)
  - [SageMaker LMI+Streaming 构建 端到端GenAI Text2Image应用](https://catalog.us-east-1.prod.workshops.aws/workshops/4aec1efd-5181-46be-b7b1-2ee9292dae80/zh-CN)
  - [Luma Ray2]
    - [Luma Ray2的ComfyUI node集成](https://github.com/aws-samples/comfyui-llm-node-for-amazon-bedrock)

- [Scenario based]
  - [Chatbot]
    - [Bedrock 赋能猛兽派对内部飞书创新智能问答](https://aws.amazon.com/cn/blogs/china/amazon-bedrock-empowers-sourcetech-internal-feishu-innovative-intelligent-qa/)
    - [使用 Amazon SageMaker + Amazon Bedrock 构建全语音智能问答助手](https://aws.amazon.com/cn/blogs/china/building-a-fully-voice-enabled-intelligent-question-answering-assistant-using-amazon-sagemaker-and-amazon-bedrock/)
    - [AI Powered Chatbot](https://mp.weixin.qq.com/s/9ePNLY6bybgW2GZH_lBFGw)
    - [Building a serverless document chat with AWS Lambda and Amazon Bedrock](https://aws.amazon.com/cn/blogs/compute/building-a-serverless-document-chat-with-aws-lambda-and-amazon-bedrock/)
  - [Image generation]
    - [基于 Amazon SageMaker 使用 Grounded-SAM 加速电商广告素材生成](https://aws.amazon.com/cn/blogs/china/accelerated-e-commerce-ad-material-generation-using-grounded-sam-based-on-amazon-sagemaker-part-one/)
    - [Nova AI生成图片 Prompt](https://mp.weixin.qq.com/s/avxar5vm0ShNj_7bjoacgQ)
  - [Digital human and Role play]
    - [AIGC 助力电商虚拟试穿新体验](https://aws.amazon.com/cn/blogs/china/e-commerce-virtual-try-on-new-experience-based-on-aigc/)
    - [Towards General Purpose Virtual Try-on](https://github.com/xiezhy6/GP-VTON)
    - [How to improve user engagement with real-time AR effects using BytePlus Effects and Amazon IVS](https://aws.amazon.com/cn/blogs/media/how-to-improve-user-engagement-with-real-time-ar-effects-using-byteplus-effects-and-amazon-ivs/)
    - [硅基数字人HeyGem.ai模型](https://github.com/GuijiAI/HeyGem.ai)
  - [Industry video handling]
    - [IPC GenAI 应用场景与方案概述](https://aws.amazon.com/cn/blogs/china/overview-of-ipc-genai-application-scenarios-and-solutions/)
  - [OCR]
    - [使用 Bedrock Agent 实现发票查询知识库和开发票](https://catalog.us-east-1.prod.workshops.aws/workshops/180cd73a-ccaf-4ade-9e5d-cf964c637638/zh-CN/0-0-introduction)
    - [Amazon Nova 助力功夫源：提升金融数据分析效率，推动量化投资普惠化](https://aws.amazon.com/cn/blogs/china/amazon-nova-helps-kungfu-trader-unlock-intelligent-quantitative-analysis/)
    - [Bedrock 大语言模型加速 OCR 场景精准提取](https://aws.amazon.com/cn/blogs/china/amazon-bedrock-large-language-model-accelerates-accurate-extraction-of-ocr-scenes/)
    - [Large Language and Vision Assistant](https://llava-vl.github.io/)
  - [VOC]
    - [使用 Amazon Bedrock，Claude3 和 CrewAI 构建应用商城用户评论分析工具](https://aws.amazon.com/cn/blogs/china/build-an-app-store-user-review-analysis-tool-using-amazon-bedrock-claude3-and-crewai/)
    - [如何基于 Amazon Bedrock 构建电商评论分析（VOC）系统](https://aws.amazon.com/cn/blogs/china/how-to-build-an-e-commerce-review-analysis-voc-system-based-on-amazon-bedrock/)
  - [Content moderation]
    - [基于亚马逊云科技 AI 服务打造多模态智能化内容审核](https://aws.amazon.com/cn/blogs/china/multi-modal-intelligent-content-review-based-on-aws-ai-services/)
    - [使用Amazon Nova Lite实现多快好省的智能视频审核](https://aws.amazon.com/cn/blogs/china/using-amazon-nova-lite-to-implement-efficient-and-cost-effective-video-moderation/)
  - [Translate]
    - [基于 AWS 服务实现具备专词映射能力的大语言模型翻译](https://aws.amazon.com/cn/blogs/china/implementing-llm-translation-with-word-mapping-capabilities-based-on-aws-services/)
    - [使用 Amazon Translate 自动翻译PPT](https://aws.amazon.com/cn/blogs/china/translating-presentation-files-with-amazon-translate/)
    - [pptx-translator - Python script that translates pptx files using Amazon Translate service.](https://github.com/aws-samples/pptx-translator)
  - [Traditional NLP]
    - [NLP and Text Classification by using blazing text](ai-ml/classification/toutiao-text-classfication-dataset-master)
    - [Use AWS SageMaker BlazingText to process un-balance data for text multiple classification](https://amazonaws-china.com/cn/blogs/china/use-aws-sagemaker-blazingtext-to-multi-classify-unbalanced-text/) [The git repo](https://github.com/zhangbeibei/sagemaker-unbalanced-text-multiclassification)
    - [Chinese-BERT](https://github.com/ymcui/Chinese-BERT-wwm)
  - [Forecasting]
    - [Forecasting scalar (one-dimensional) time series data](ai-ml/prediction/README.md)
    - [GluonTS for time series data](https://github.com/whn09/gluonts_sagemaker)
  - [Fraud Detection]
    - [SageMaker End-to-End Demo- Fraud Detection for Auto Claims](https://aws.amazon.com/blogs/machine-learning/architect-and-build-the-full-machine-learning-lifecycle-with-amazon-sagemaker/) and [github repo](https://github.com/aws/amazon-sagemaker-examples/tree/master/end_to_end)
  - [Recommandation]
    - [Amazon Personalize workshop](https://github.com/nwcd-samples/Personalize_workshop_CHN)
    - [Amazon Personalize Get Start](https://github.com/aws-samples/amazon-personalize-samples/tree/master/getting_started)
  - [Prediction Maintenance]
    - [Using AWS IoT and Amazon SageMaker to do IoT Devices Predictive Maintenance](iot/IOT-SageMaker-Predictive-Maintenance/README.md)
    - [IoT Time-series Forecasting for Predictive Maintenance](https://github.com/aws-samples/amazon-sagemaker-aws-greengrass-custom-timeseries-forecasting)
  - [Contact Center]
    - [华宝新能 拓展 GenAI 在客户服务领域的新场景](https://aws.amazon.com/cn/blogs/china/new-use-cases-for-generative-ai-in-customer-service/)
- [Vector database]
  - [RDS for PostgreSQL now supports pgvector for simplified ML model integration](https://aws.amazon.com/cn/about-aws/whats-new/2023/05/amazon-rds-postgresql-pgvector-ml-model-integration/)
  
- [LLM]
  - [Claude]
    - [Amazon Bedrock Claude3 Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/17879811-bd5c-4530-8b85-f0042472f2a1/en-US)
    - [Claude Artifacts workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/17879811-bd5c-4530-8b85-f0042472f2a1/zh-CN/corefeatures/frequently/artifact)
    - [Fine-tune Anthropic’s Claude 3 Haiku in Amazon Bedrock to boost model accuracy and quality](https://aws.amazon.com/blogs/machine-learning/fine-tune-anthropics-claude-3-haiku-in-amazon-bedrock-to-boost-model-accuracy-and-quality/)
  - [Llama]
    - [Use Llama 3.1 405B for synthetic data generation and distillation to fine-tune smaller models](https://aws.amazon.com/cn/blogs/machine-learning/use-llama-3-1-405b-to-generate-synthetic-data-for-fine-tuning-tasks/)
  - [Nova]
    - [Amazon Nova Multimodal understanding workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/012d9c20-25dc-4065-bdb6-50e935e8bd9f/en-US/030-hands-on-labs)
    - [用 Amazon Bedrock 与 Nova 大模型构建客户之声解决方案](https://github.com/aws-samples/voice-of-customer-classification-for-retail-with-amazon-foundation-models)
    - [Amazon Nova Canvas and Amazon Nova Reel Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/66a0984a-ad2b-481f-a1cf-e7896ea9595b/en-US)
    - [Nova Sonic Speech-to-Speech Model Samples](https://github.com/aws-samples/amazon-nova-samples/tree/main/speech-to-speech)
    - [nova-sonic Web Demo](https://nova-sonic.teague.live/login)
    - [Amazon Nova Sonic (speech-to-speech) Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/5238419f-1337-4e0f-8cd7-02239486c40d/en-US)
  - [Deepseek]
    - [Deepseek on AWS deployment](https://aws.amazon.com/cn/blogs/aws/deepseek-r1-models-now-available-on-aws/)
    - [deploy-deepseek-r1-distilled-llama-models-with-amazon-bedrock-custom-model-import](https://aws.amazon.com/blogs/machine-learning/deploy-deepseek-r1-distilled-llama-models-with-amazon-bedrock-custom-model-import/)
    - [轻松部署DeepSeek-R1 671B动态量化模型](https://github.com/aws-samples/llm_deploy_gcr/blob/main/sagemaker/DeepSeek-R1-671b_dynamic-quants/deploy_and_test.ipynb)
    - [Graviton4 Run Deepseek](https://community.aws/content/2rhRJI6cxBa1Ib5f3TjsfPadpXs/deploying-deepseek-r1-distill-llama-70b-for-batch-inference-on-aws-graviton4)
    - [Build agentic AI solutions with DeepSeek-R1, CrewAI, and Amazon SageMaker AI](https://aws.amazon.com/cn/blogs/machine-learning/build-agentic-ai-solutions-with-deepseek-r1-crewai-and-amazon-sagemaker-ai/)
    - [使用亚马逊云科技自研芯片 Inferentia2 部署 DeepSeek R1 Distillation 模型（一）](https://aws.amazon.com/cn/blogs/china/deploying-the-deepseek-r1-distillation-model-using-amazon-inferentia2/)
    - [使用亚马逊云科技自研芯片 Inferentia2 部署 DeepSeek R1 Distillation 模型（二）](https://aws.amazon.com/cn/blogs/china/deploying-the-deepseek-r1-distillation-model-using-amazon-inferentia2-part-two/)
    - [本地 671B DeepSeek-Coder-V3/R1: 仅使用 14GB 显存和 382GB 内存运行其 Q4_K_M 版本](https://github.com/kvcache-ai/ktransformers/blob/main/doc/zh/DeepseekR1_V3_tutorial_zh.md)
    - [Hosting DeepSeek-R1 on Amazon EKS](https://github.com/aws-samples/deepseek-using-vllm-on-eks)
  - [China otherLLM]
    - [Baichuan on Sagemaker](ai-ml/chatgpt/baichuan/baichuan-7b-cn.ipynb)
    - [ChatGLM on SageMaker](ai-ml/chatgpt/chatglm/sagemaker-inference-chatglm.ipynb)
    - [ChatYuan on SageMaker](ai-ml/chatgpt/chatyuan/chatyuan_sagemaker_byos.ipynb)
  - [ColossalAI for LLM quick training](https://github.com/hpcaitech/ColossalAI)
  - [vllm and ollma]
    - [vllm_quickstart](ai-ml/chatgpt/vllm_ollama/vllm_quickstart.md)
    - [lightweight tool designed to simplify models deployment](https://github.com/aws-samples/easy-model-deployer)
  
- [Bedrock practice]  
  - [Patterns for Building Generative AI Applications on Amazon Bedrock](https://community.aws/posts/build-generative-ai-applications-with-amazon-bedrock)
  - [使用 Amazon SageMaker 和 Bedrock 构建营销场景端到端应用](https://aws.amazon.com/cn/blogs/china/build-end-to-end-applications-for-marketing-scenarios-using-amazon-sagemaker-and-bedrock/)
  - [使用 Amazon Bedrock 和 Amazon SageMaker，开启全新的生成式 AI ](https://dev.amazoncloud.cn/column/article/65dc1501e3b3f2107638534d)
  - [构建端到端生成式 AI 应用](https://catalog.us-east-1.prod.workshops.aws/workshops/4aec1efd-5181-46be-b7b1-2ee9292dae80/zh-CN)
  - [Amazon Bedrock Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/a4bdb007-5600-4368-81c5-ff5b4154f518/en-US)
  - [Amazon Bedrock Development Workshop - GCR](https://catalog.us-east-1.prod.workshops.aws/workshops/5501fb48-e04b-476d-89b0-43a7ecaf1595/en-US)
  - [open_artifacts_for_bedrock](https://github.com/aws-samples/open_artifacts_for_bedrock)
  - [streaming response from Amazon Bedrock with FastAPI on AWS Lambda](https://github.com/awslabs/aws-lambda-web-adapter/blob/main/examples/fastapi-response-streaming/README.md)
  - [为生成式 AI 产品打造持续的卓越用户体验——跨区域高可用弹性解决方案](https://aws.amazon.com/cn/blogs/china/creating-a-consistently-great-user-experience-for-generative-ai-products/)
  - [Why Claude 4 API Hits Rate Limits: Token Burndown Explained](https://community.aws/content/2xVZmCM5E7XXw0yqTEGgXYxRowk/bedrock-claude-4-burndown-rates)
  - [Use AWS PrivateLink to set up private access to Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/use-aws-privatelink-to-set-up-private-access-to-amazon-bedrock/)
  - [基于 Amazon SageMaker 和 LLaMA-Factory 打造一站式无代码模型微调部署平台 Model Hub](https://aws.amazon.com/cn/blogs/china/a-one-stop-code-free-model-fine-tuning-deployment-platform-based-on-sagemaker-and-llama-factory/)
  - [Bedrock 多模型接入 – Bedrock Connector 部署与使用指南](https://aws.amazon.com/cn/blogs/china/bedrock-multi-model-access-bedrock-connector-deployment-and-usage-guide/)
    - [Bedrock Connector github repo](https://github.com/aws-samples/sample-connector-for-bedrock?tab=readme-ov-file)
    - [Customize Bedrock endpoint with VPC Interface Endpoint for L4 layer proxy](https://github.com/AutoJunjie/customize-bedrock-endpoint)
  - [Prompt Caching]
    - [Getting started with Bedrock prompt_caching](https://github.com/aws-samples/amazon-bedrock-samples/blob/main/introduction-to-bedrock/prompt-caching/getting_started_with_prompt_caching.ipynb))
    - [Prompt caching on amazon bedrock](https://aws.amazon.com/blogs/machine-learning/effectively-use-prompt-caching-on-amazon-bedrock/)

- [RLHF]
  - [Align Meta Llama 3 to human preferences with DPO](https://aws.amazon.com/blogs/machine-learning/align-meta-llama-3-to-human-preferences-with-dpo-amazon-sagemaker-studio-and-amazon-sagemaker-ground-truth/)
  - [Thinking-Claude make Claude as GPTo1](https://github.com/richards199999/Thinking-Claude/tree/main)

- [RAG - retrieval-augmented generation]
  - [Smart Search 基于智能搜索的大语言模型增强方案](https://catalog.us-east-1.prod.workshops.aws/workshops/486e5ddd-b414-4e7f-9bfd-3884a89353e3/zh-CN)
  - [Smart Search V2 基于智能搜索的大语言模型增强方案2](https://catalog.us-east-1.prod.workshops.aws/workshops/3973557a-0853-41f6-9678-00ae171ba1f6/zh-CN/03cdkinstall/30preinstall)
  - [基于智能搜索和大模型打造企业下一代知识库](https://aws.amazon.com/cn/blogs/china/intelligent-search-based-enhancement-solutions-for-llm-part-two/)
  - [基于智能搜索和大模型打造企业下一代知识库 之 制造/金融/教育/医疗行业实战场景](https://aws.amazon.com/cn/blogs/china/intelligent-search-based-enhancement-solutions-for-llm-part-four/)
  - [基于 RDS 和 Confluence 数据源构建端到端的RAG](https://aws.amazon.com/cn/blogs/china/build-an-end-to-end-rag-application-based-on-rds-and-confluence-data-sources/)
  - [基于大语言模型和推荐系统构建电商智能导购机器人](https://aws.amazon.com/cn/blogs/china/build-an-e-commerce-intelligent-shopping-guide-robot-based-on-large-language-model-and-recommendation-system/)
  - [基于大语言模型知识问答应用落地实践 – 知识召回调优](https://aws.amazon.com/cn/blogs/china/practice-of-knowledge-question-answering-application-based-on-llm-knowledge-base-construction-part-4/)
  - [基于LLM 和 Amazon Opensearch 或 Amazon Kendra 打造企业私有知识库](https://aws.amazon.com/cn/blogs/china/intelligent-search-based-enhancement-solutions-for-llm-part-one/)
  - [基于Amazon Open Search+大语言模型的智能问答系统](https://catalog.us-east-1.prod.workshops.aws/workshops/158a2497-7cbe-4ba4-8bee-2307cb01c08a)
  - [GenAI Data Foundation Workshop - Healthcare RAG chatbot](https://catalog.us-east-1.prod.workshops.aws/workshops/973a358a-1e5c-44ed-8589-4e480f597c77/en-US)
  - [RAGChecker for RAG health check](https://github.com/amazon-science/RAGChecker)
  - [New APIs in Amazon Bedrock to enhance RAG applications](https://aws.amazon.com/blogs/aws/new-apis-in-amazon-bedrock-to-enhance-rag-applications-now-available/)
  - [RAG 挑战赛冠军方案解析：从数据解析到多路由器检索的工程实践](https://mp.weixin.qq.com/s/VPidqY02ngsrnXhpOol3_A)
  - [Build a RAG based question answer solution using Amazon Bedrock Knowledge Base, vector engine for Amazon OpenSearch Service Serverless and LangChain](https://github.com/aws-samples/bedrock-kb-rag-workshop/blob/main/blog_post.md)
  - [Create an agentic RAG application with LlamaIndex, and Mistral in Amazon Bedrock](https://aws.amazon.com/blogs/machine-learning/create-an-agentic-rag-application-for-advanced-knowledge-discovery-with-llamaindex-and-mistral-in-amazon-bedrock/)
  
- [Deep Research]
  - [deep-research-system-card](https://cdn.openai.com/deep-research-system-card.pdf)
  
- [Text2SQL]
  - [DB-GPT与百川社区强强联手，无缝支持百川模型推理与Text2SQL微调](https://mp.weixin.qq.com/s/fL9zpWMVqxfTG3uvh7V6Gg)
  - [text2sql_gen_demo notebook](https://github.com/qingyuan18/llm-samples/blob/main/codegen/text2sql/text2sql_gen_demo.ipynb)
  - [Generative BI using RAG on AWS](https://github.com/aws-samples/generative-bi-using-rag)
  
- [Multi-model]
  - [莉莉丝项目组在 GenAI 的技术实践](https://aws.amazon.com/cn/blogs/china/lilith-farlight84-technical-practice-on-genai/)  
  - [莉莉丝项目组在大模型多模态上的实践](https://aws.amazon.com/cn/blogs/china/lilith-farlight84-practice-on-large-model-multi-modality/)
  - [Video]
    - [Video summarization](https://aws.amazon.com/blogs/media/video-summarization-with-aws-artificial-intelligence-ai-and-machine-learning-ml-services/)
    - [Intelligent video and audio Q&A with multilingual support using LLMs on Amazon SageMaker](https://aws.amazon.com/blogs/machine-learning/intelligent-video-and-audio-qa-with-multilingual-support-using-llms-on-amazon-sagemaker/)
    - [Nova Reel Prompt Optimizer](https://github.com/xiehust/reel_optimizer/tree/main)
    - [利用 Amazon Bedrock Data Automation（BDA）对视频数据进行自动化处理与检索](https://aws.amazon.com/cn/blogs/china/automating-video-data-processing-and-retrieval-using-amazon-bedrock-data-automation/)
  - [Audio]
    - [构建文生音场景定制化人声解决方案](https://aws.amazon.com/cn/blogs/china/build-a-customized-human-voice-solution-for-text-generation-audio-scenes/)
    - [构建实时音视频交互解决方案-TEN-Agent and Nova](https://mp.weixin.qq.com/s/u0AHpNuForY_9UjjjJiwiA)
    - [基于Amazon Bedrock 构建端到端实时语音助手](https://catalog.us-east-1.prod.workshops.aws/workshops/5a9a9de1-6dd7-43b1-ba60-fc3792d99c40/zh-CN) and [Amazon Bedrock的实时语音解决方案](https://aws.amazon.com/cn/blogs/china/building-an-end-to-end-real-time-voice-assistant-on-amazon-bedrock/)
    - [new-alexa-generative-AI](https://www.aboutamazon.com/news/devices/new-alexa-generative-artificial-intelligence)  
  - [Content Moderation]
    - [nova-lite for video-moderation](https://aws.amazon.com/cn/blogs/china/using-amazon-nova-lite-to-implement-efficient-and-cost-effective-video-moderation/)

- [Software Develop Lifecycle]
  - [Amazon Q Developer]
    - [Amazon Q & CodeWhisperer for VS Code](https://community.aws/content/2bkRYdezub3elzHazdWWtEXqSf9/aws-toolkit-for-visual-studio-code---amazon-q-amazon-codewhisperer-and-more?lang=en)
    - [Q Developer Workshop](https://catalog.workshops.aws/q-developer/zh-CN/00-introduction)
    - [Agentic AI 帮你做应用 —— 从0到1打造自己的智能番茄钟](https://dev.amazoncloud.cn/experience/cloudlab?id=67f49364f0df324eb192e428&visitfrom=1P_aiday_0427&sc_medium=owned&sc_campaign=cloudlab&sc_channel=1P_aiday_0427)
    - [Agentic AI 帮你做应用 —— BotGroup 吵架机器人](https://catalog.us-east-1.prod.workshops.aws/workshops/dfc5ba98-7750-4e1f-ac1e-43391d3c3f97/zh-CN)
    - [Amazon Q CLI + MCP 创建 AWS 架构图](https://mp.weixin.qq.com/s/EPqJfffYRxWa2OqCb766uQ)
    - [Prompt Driven Development Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/2a43bf02-09e5-4cb0-9b86-dd61fd285808/zh-CN)
  - [Claude Code]
    - [Claude3 code assistant](https://github.com/aws-samples/bedrock-claude-codecoach)
    - [Claude Code on Amazon Bedrock: Quick Setup Guide](https://community.aws/content/2tXkZKrZzlrlu0KfH8gST5Dkppq/claude-code-on-amazon-bedrock-quick-setup-guide?lang=en)
  - [GenDev for RE]
    - [AI 云运维入门](https://catalog.us-east-1.prod.workshops.aws/workshops/449f939b-3480-44eb-a864-6abe94d03b82/zh-CN)
    - [The open source AIOps and Alert platform](https://www.keephq.dev/)
    - [BMW genai-assistant agent for Infra optimization](https://aws.amazon.com/cn/blogs/industries/bmw-group-develops-a-genai-assistant-to-accelerate-infrastructure-optimization-on-aws/)
  - [SDE Agent and Dev Agent]
    - [MultiAgent - ChatDev on Claude 3 一句话实现一个软件需求](https://mp.weixin.qq.com/s/2abckTrOJ0yHap9KaRmC0g?poc_token=HP1aaGajxZFbzHee6Im6R_NVDMmJEKGHLB-rcEa7)
    - [SWE-agent turns LMs (e.g. GPT-4) into software engineering agents](https://github.com/princeton-nlp/SWE-agent)

- [Agent and workflow]
  - [AWS Multi-Agent-Orchestrator - Agent Squard - Flexible and powerful framework for managing multiple AI](https://github.com/awslabs/multi-agent-orchestrator)
    - [Design multi-agent orchestration with reasoning](https://aws.amazon.com/cn/blogs/machine-learning/design-multi-agent-orchestration-with-reasoning-using-amazon-bedrock-and-open-source-frameworks/)
  - [LangChain and LangGraph]
    - [LangChain for LLM Application Development](https://www.deeplearning.ai/short-courses/langchain-for-llm-application-development/?continueFlag=40c2724537472cbb3553ce1582e0db80)
  - [Dify - an open-source large language model (LLM) application development platform](https://docs.dify.ai/v/zh-hans)
    - [使用 Dify 集成 Bedrock Claude3 开启生成式 AI 之旅](https://aws.amazon.com/cn/blogs/china/get-started-with-generative-ai-by-integrating-bedrock-claude3-with-dify/)
    - [Claude for BRClient and Dify: Prompt, RAG, and Agent](https://studio.us-east-1.prod.workshops.aws/workshops/public/6204b3c5-2adb-45fc-8d55-b7db668f274e)
    - [BRConnector Lab](https://catalog.us-east-1.prod.workshops.aws/workshops/6c6208fc-2412-489d-9df5-49432ea76993/zh-CN)
    - [Rapidly Build GenAI Apps with Dify](https://catalog.us-east-1.prod.workshops.aws/workshops/2c19fcb1-1f1c-4f52-b759-0ca4d2ae2522/zh-CN/introduction)
    - [基于 Amazon EKS 部署高可用 Dify](https://aws.amazon.com/cn/blogs/china/deploying-high-availability-dify-based-on-amazon-eks/)
    - [Dify deployment on serverless](https://github.com/aws-samples/sample-serverless-dify-stack)
    - [硅基流动+DeepSeek+Dify全栈开发实战](https://catalog.us-east-1.prod.workshops.aws/workshops/87e070e2-5621-4c94-9285-529514ec4454/en-US)
  - [Other Agent tools]
    - [Chatbot Portal with Agent](https://github.com/aws-samples/Intelli-Agent)
    - [swift-chat mobile app for GenAI](https://github.com/aws-samples/swift-chat)
  - [Computer use and brower use]
    - [Compute use demo](https://github.com/noteflow-ai/demo/blob/main/Computer-Use-Demo.md)
  - [Amazon Bedrock Agents]
    - [Amazon Bedrock Agent Samples](https://github.com/awslabs/amazon-bedrock-agent-samples)
    - [Amazon Bedrock Agent 动手练习工作坊](https://github.com/xina0311/amazon-bedrock-agent-workshop-for-gcr)
    - [Amazon Bedrock Agents Workshop](https://catalog.workshops.aws/agents-for-amazon-bedrock/en-US)
  - [MCP](https://github.com/modelcontextprotocol/servers)
    - [MCP Servers Explained: What They Are, How They Work, and Why Cline is Revolutionizing AI Tools](https://cline.bot/blog/mcp-servers-explained-what-they-are-how-they-work-and-why-cline-is-revolutionizing-ai-tools)
    - [Anthropic 发布了 Streamable HTTP](https://mp.weixin.qq.com/s/9y-VBbP31I8wXur5vEN4Ug)
      - [使用 Amazon Lambda 快速部署 Streamable HTTP Github MCP Server](https://aws.amazon.com/cn/blogs/china/deploy-streamable-http-github-mcp-server-using-amazon-lambda/  l)
    - [MCP Server hosting]
      - [GCR MCP on Serverless](https://github.com/aws-samples/sample-serverless-mcp-server)
      - [GCR Sample MCP Servers](https://github.com/aws-samples/aws-mcp-servers-samples)
      - [AWS MCP Server List](https://github.com/awslabs/mcp/)
      - [Introducing AWS Serverless MCP Server blog](https://aws.amazon.com/cn/blogs/compute/introducing-aws-serverless-mcp-server-ai-powered-development-for-modern-applications/)
      - [Playwright MCP Server on Fargate](https://www.notion.so/Playwright-MCP-Server-AWS-Fargate-EKS-1de408b04809808c8604f56fef3cf565?pvs=4)
      - [Automating AI-assisted container deployments with the Amazon ECS MCP Server](https://aws.amazon.com/cn/blogs/containers/automating-ai-assisted-container-deployments-with-amazon-ecs-mcp-server/)
      - [Accelerating application development with the Amazon EKS MCP server](https://aws.amazon.com/blogs/containers/accelerating-application-development-with-the-amazon-eks-model-context-protocol-server/)
    - [MCP Demo]
      - [MCP on Amazon Bedrock](ai-ml/chatgpt/claude/mcp/demo_mcp_on_amazon_bedrock.md)
      - [sample-agentic-ai-web](https://github.com/aws-samples/sample-agentic-ai-web)
      - [基于MCP构建端到端的AI-Agent应用工作坊](https://catalog.us-east-1.prod.workshops.aws/workshops/d674f40f-d636-4654-9322-04dafc7cc63e/zh-CN/0-introduction)
      - [基于MCP构建端到端的AI-Agent应用工作坊 - Bendrock Agents and Strands Agents](https://catalog.us-east-1.prod.workshops.aws/workshops/d674f40f-d636-4654-9322-04dafc7cc63e/zh-CN)
        - [A sample MCP server for understanding cloud spend](https://github.com/aws-samples/sample-cloud-spend-mcp-server)
    - [Use Case]
      - [从零构建 MCP 架构下的 Agentic RAG 系统](https://mp.weixin.qq.com/s/11jlAQkL008Tuq_vEyjjTg)
  - [E2B]
    - [e2b-dev Github](https://github.com/e2b-dev/E2B)
    - [E2B on AWS](https://github.com/aws-samples/sample-e2b-on-aws)
  - [Agent to Agent - A2A]
    - [A2A protocol](https://a2aprotocol.ai/)
  - [Strands Agents](https://strandsagents.com/0.1.x/)
      - [Open Protocols for Agent Interoperability Part 1: Inter-Agent Communication on MCP](https://aws.amazon.com/cn/blogs/opensource/open-protocols-for-agent-interoperability-part-1-inter-agent-communication-on-mcp/)
      - [Learning-Strands-Agents](https://github.com/davidshtian/Learning-Strands-Agents)
      - [Introducing Strands Agents, an Open Source AI Agents SDK](https://aws.amazon.com/tw/blogs/opensource/introducing-strands-agents-an-open-source-ai-agents-sdk/)
      - [亚马逊云科技中国区构建 Agentic AI 应用实践指南](https://aws.amazon.com/cn/blogs/china/practical-guide-to-building-agentic-ai-applications-for-aws-china-region/)
      - [Strands Agent Example](https://github.com/aws-samples/sample_agentic_ai_strands)

### Labeling
- [使用 Amazon SageMaker Ground Truth 标记 3D 点云](https://aws.amazon.com/cn/blogs/china/new-label-3d-point-clouds-with-amazon-sagemaker-ground-truth/) and [guide](https://docs.amazonaws.cn/sagemaker/latest/dg/sms-point-cloud.html)
- [CV Labeling]
  - [cvat-on-aws-china](https://github.com/aws-samples/cvat-on-aws-china)
  - [CV Labeling: VOTT](https://github.com/microsoft/VoTT/releases)

### Federated ML
- [Amazon Redshift ML: Create, train, and deploy machine learning (ML) models using familiar SQL commands](https://aws.amazon.com/redshift/features/redshift-ml/)

### ML Hardware 
- [Hands-on Deep Learning Inference with Amazon EC2 Inf1 Instance](https://catalog.us-east-1.prod.workshops.aws/workshops/bcd3db22-8501-4888-a078-45a70034f802/en-US)
- [NVIDIA Dynamo is a high-throughput low-latency inference framework](https://github.com/ai-dynamo/dynamo)

### Robotics
- [Genesis-Embodied-AI](https://github.com/Genesis-Embodied-AI/Genesis)
- [NVIDIA Isaac Lab on AWS](https://catalog.us-east-1.prod.workshops.aws/workshops/075ce3fe-6888-4ea9-986e-5bdd1b767ef7/en-US)

## Cost
### Cost Explorer
- [Simple generate a report using the AWS Cost Explorer API](cost/cost-expoler-api.md)

- [Cost and Usage Report analysis](cost/analysis-cost-usage-report.md)

- [Price Calculator](https://calculator.aws/#/estimate)

- [Price List API](cost/price-list-api.md)

- [Get the spot instance price](EC2/How-to-Get-Spot-Price.md)

- [Cloud Intelligence Dashboards](https://www.wellarchitectedlabs.com/cost/200_labs/200_cloud_intelligence/)
(https://github.com/aws-samples/aws-cudos-framework-deployment)
- [Cloud Intelligence Dashboards in China](https://aws.amazon.com/cn/blogs/china/visualizing-cloud-resource-costs-and-usage-based-on-grafana/)
- 
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
- [Linux Daily usage]
  - [How to connect to Linux EC2 via NICE DCV Client](EC2/Linux-NICE-DCV-Servers-on-Amazon-EC2.md)
    - [install GUI (graphical desktop) on Amazon EC2 instances running Ubuntu Linux](https://repost.aws/articles/ARJtZxRiOURwWI2qSWjl4AaQ/how-do-i-install-gui-graphical-desktop-on-amazon-ec2-instances-running-ubuntu-linux)
  - [Amazon Linux how to support chinese](EC2/Amazon-Linux-AMI-support-chinese.md)
  - [Upgrade-C4-CentOS-instance-to-C5-instance](EC2/Upgrade-C4-CentOS-instance-to-C5-instance.md)


- [Performance]
  - [4 vCPU 实例达成 100 万 JSON API 请求/秒的优化实践](https://aws.amazon.com/cn/blogs/china/optimization-practice-of-achieving-1-million-json-api-requests-second-with-4-vcpu-instances/)
  

- [Windows Daily usage]
  - [How to connect to Windows EC2 via NICE DCV Client](EC2/Windows-NICE-DCV-Servers-on-Amazon-EC2.md)
  - [Amazon EC2 針對 Windows Server 2012/R2 EOL](https://aws.amazon.com/tw/events/taiwan/techblogs/Amazon-EC2-end-of-support-guidelines-for-Windows-server/)


- [GPU Daily usage]
  - [How to build Graphics Workstation on Amazon EC2 G4 Instances](EC2/Windows-Graphics-Workstation-on-Amazon-EC2.md)
  - [Deploying Unreal Engine Pixel Streaming Server on EC2](https://github.com/aws-samples/deploying-unreal-engine-pixel-streaming-server-on-ec2)

- [Network of EC2]
  - [Python code attach EC2 EIP](https://boto3.amazonaws.com/v1/documentation/api/latest/guide/ec2-example-elastic-ip-addresses.html)
  - [EC2 network performance](EC2/EC2_Networking_performance.md)
  - [How to get the IP address under my account](EC2/Get-all-IP.md)
  - [How can I connect to my Amazon EC2 instance if I lost my SSH key pair after its initial launch](https://aws.amazon.com/premiumsupport/knowledge-center/user-data-replace-key-pair-ec2/)
  - [Keep EC2 primary private IP for a 'new' instance](EC2/Keep_EC2_primary_private_IP.md)

- [Graviton]
  - [Graviton 2 workshop](https://graviton2-workshop.workshop.aws/) (https://github.com/aws-samples/graviton2-workshop)
  - [AWS Workshop - Graviton2 China](http://graviton2-workshop.s3-website.cn-northwest-1.amazonaws.com.cn/1.basics.html)
  - [porting-advisor-for-graviton](https://github.com/aws/porting-advisor-for-graviton)
    - [sample blog](https://aws.amazon.com/cn/blogs/compute/using-porting-advisor-for-graviton/)
  - [AWS Graviton2-based services](https://github.com/aws/aws-graviton-getting-started)
  - [3rd party](https://github.com/aws/aws-graviton-getting-started/blob/main/isv.md)
  - [container](https://github.com/aws/aws-graviton-getting-started/blob/main/containers.md)
  - [GRAVITON2 电商独立站](https://graviton2.awspsa.com/)
  - [Porting Advisor for Graviton](https://github.com/aws/porting-advisor-for-graviton)

- [Operation]
  - [What does :-1 mean in python](EC2/What-does-list-indexing-in-python.md)
  - [Change EC2 Time-Zone](EC2/Change-TimeZone.md)
  - [How can I set up a CloudWatch alarm to automatically recover my EC2 instance?](https://aws.amazon.com/premiumsupport/knowledge-center/automatic-recovery-ec2-cloudwatch/)
  - [Move EC2 instance to other AZ](https://aws.amazon.com/cn/premiumsupport/knowledge-center/move-ec2-instance/)
  - [Best practices for handling EC2 Spot Instance interruptions](https://aws.amazon.com/blogs/compute/best-practices-for-handling-ec2-spot-instance-interruptions/)
  - [How to share the EC2 AMI](EC2/How-to-share-ami.md)
  - [Copy AMI from global to China](https://github.com/zhiyanliu/aws-cp-ww-ami-to-cn)
  - [How to handle EC2 detected degradation](https://aws.amazon.com/premiumsupport/knowledge-center/ec2-linux-degraded-hardware/)
  - [Check if a reboot is required after installing Linux updates](ec2/Does_instance_need_restart_for_upgrade.md)

- [Nitro]
  -[在 AWS Nitro Enclaves 中运行传统 Web 应用迁移实践](https://aws.amazon.com/cn/blogs/china/running-traditional-web-application-migration-practices-in-aws-nitro-enclaves/)
  - [Introduce the nitro-enclaves](EC2/nitro-enclaves.md)
  
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

- SOCA
  - [SOCA 帮助半导体企业快速启动 EDA 云上部署](https://aws.amazon.com/cn/blogs/china/scaling-eda-workloads-using-scale-out-computing-on-aws/)
  - [Research and Engineering Studio on AWS](https://aws.amazon.com/blogs/hpc/new-research-and-engineering-studio-on-aws/)
## Analytics
### High Level Data Engineering and Data Analytics
- [AWS Data Engineering Day Workshop](https://aws-dataengineering-day.workshop.aws/100-introduction.html)
  - [Chinese version](https://catalog.us-east-1.prod.workshops.aws/workshops/976050cc-0606-4b23-b49f-ca7b8ac4b153/zh-CN/100-introduction)

- [数据分析的技术源流](https://aws.amazon.com/cn/blogs/china/the-technical-origin-of-data-analysis/)

- [Analytics Reference Architecture](https://aws-samples.github.io/aws-analytics-reference-architecture/)

- [Data Science on AWS - Quick Start Workshop](https://github.com/data-science-on-aws/workshop)

- [Build a Lake House Architecture on AWS](https://aws.amazon.com/cn/blogs/big-data/build-a-lake-house-architecture-on-aws/)

- [Harness the power of your data with AWS Analytics with Lake House](https://aws.amazon.com/cn/blogs/big-data/harness-the-power-of-your-data-with-aws-analytics/)

- [Serverless Data Lake Workshop](https://serverless-data-lake-immersionday.workshop.aws/en/introduction.html)

- [Serverless Data Lake Framework WORKSHOP](https://sdlf.workshop.aws/en/)

- [敦煌网集团大数据上云实践](https://aws.amazon.com/cn/blogs/china/dhgate-group-big-data-cloud-practice/)

- [解密Data Fabric的核心技术 – 数据虚拟化 - Data Virtualization](https://aws.amazon.com/cn/blogs/china/demystifying-the-core-technology-of-data-weaving-data-virtualization/)
  - [Data Fabric and Data Mesh 区别](https://zhuanlan.zhihu.com/p/608431096)
- [Volkswagen streamlined access to data across multiple data lakes using Amazon DataZone](https://aws.amazon.com/blogs/big-data/how-volkswagen-streamlined-access-to-data-across-multiple-data-lakes-using-amazon-datazone-part-1/)
  
### Data integration service: Glue
- [ETL]
  - [Quick demo for Glue ETL + Athena + Superset BI](https://github.com/liangruibupt/covid_19_report_end2end_analytics)
  - [Glue ETL for kinesis / Kafka and RDS MySQL](https://github.com/liangruibupt/glue-streaming-etl-demo)
  - [Update and Insert (upsert) Data from AWS Glue](https://towardsdatascience.com/update-and-insert-upsert-data-from-aws-glue-698ac582e562)
  - [Introducing PII data identification and handling using AWS Glue DataBrew](https://aws.amazon.com/blogs/big-data/introducing-pii-data-identification-and-handling-using-aws-glue-databrew/)
  - [Best practices to scale Apache Spark jobs and partition data with AWS Glue](https://aws.amazon.com/blogs/big-data/best-practices-to-scale-apache-spark-jobs-and-partition-data-with-aws-glue/)
  
- [Glue Crawler]
  - [Glue Crawler handle the CSV contains quote string](analytics/Glue-Quote-String-Crawler.md)

- [Glue Workshop](analytics/glue-workshop)
  - [Building Python modules for Spark ETL workloads using AWS Glue](analytics/glue-workshop/Glue_with_python_module.md)

- [Workflow]
  - [Amazon Glue ETL 作业调度工具选型初探](https://aws.amazon.com/cn/blogs/china/preliminary-study-on-selection-of-aws-glue-scheduling-tool/)
  - [Airflow and Glue workflow](https://github.com/yizhizoe/airflow_glue_poc)
  - [Deploy an AWS Glue job with an AWS CodePipeline CI/CD pipeline](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/deploy-an-aws-glue-job-with-an-aws-codepipeline-ci-cd-pipeline.htmlhttps://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/deploy-an-aws-glue-job-with-an-aws-codepipeline-ci-cd-pipeline.html)
  - [How to unit test and deploy AWS Glue jobs using AWS CodePipeline](https://aws.amazon.com/blogs/devops/how-to-unit-test-and-deploy-aws-glue-jobs-using-aws-codepipeline/)

- [Catalogs]
  - [如何提供对 AWS Glue 数据目录中资源的跨账户访问权限](https://aws.amazon.com/cn/premiumsupport/knowledge-center/glue-data-catalog-cross-account-access/?nc1=h_ls)
  - [Replication utility for AWS Glue Data Catalog](https://github.com/aws-samples/aws-glue-data-catalog-replication-utility)
  - [Open Source Data Catalog](https://datahubproject.io) (https://github.com/bluishglc/serverless-datalake-example)

- [Delta Lake]
  - [Glue and Hudi](https://mp.weixin.qq.com/s/9z4rmokVJJpc14qosXLU8g)

### Analysis: EMR
- [AWS EMR Workshop](analytics/emr/101Workshop)
- [aws-emr-best-practices](https://aws.github.io/aws-emr-best-practices/)

- [Develop Code]
  - [EMR Notebooks and SageMaker](https://emr-etl.workshop.aws/emr_notebooks_sagemaker.html)
  Use EMR notebooks to prepare data for machine learning and call SageMaker from the notebook to train and deploy a machine learning model.
  - [Submit EMR Job remotely](analytics/emr/101Workshop/Submit_Job_remotely.md)
  - [如何优雅地提交一个 Amazon EMR Serverless 作业？](https://aws.amazon.com/cn/blogs/china/best-practice-how-to-gracefully-submit-an-amazon-emr-serverless-job/)
  - [如何在 Amazon EMR Serverless 上执行纯 SQL 文件？](https://aws.amazon.com/cn/blogs/china/how-to-execute-plain-sql-files-on-amazon-emr-serverless-solution/)
  
- [Workflow]

- [Install and Delopyment]
  - [How can I permanently install a Spark or Scala-based library on an Amazon EMR cluster](https://aws.amazon.com/premiumsupport/knowledge-center/emr-permanently-install-library/)
  - [EMR_On_Graviton2](analytics/emr/101Workshop/EMR_On_Graviton2.md)
  - [Why use the Glue Catalog v.s other external metastore for Hive](analytics/glue-workshop/Glue-Catalog-FAQ.md) 

- [Performance and HA]
  - [Resolve s3 503 slowdown throttling](https://aws.amazon.com/premiumsupport/knowledge-center/s3-resolve-503-slowdown-throttling/)
  - [Hadoop high availability features of HDFS NameNode and YARN ResourceManager in an Amazon EMR cluster](https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-ha-applications.html)
  - [Spark 小文件合并功能在 AWS S3 上的应用与实践](https://aws.amazon.com/cn/blogs/china/application-and-practice-of-spark-small-file-merging-function-on-aws-s3/)
  - [Amazon EMR实战心得浅谈](https://aws.amazon.com/cn/blogs/china/brief-introduction-to-emr-practical-experience/)
  
- [Security]
  - [Introducing Amazon EMR integration with Apache Ranger](https://aws.amazon.com/blogs/big-data/introducing-amazon-emr-integration-with-apache-ranger/)
  - [Enable federated governance using Trino and Apache Ranger on Amazon EMR](https://aws.amazon.com/blogs/big-data/enable-federated-governance-using-trino-and-apache-ranger-on-amazon-emr/)

### Data On EKS
  - [EMR on EKS Best Practice Guide](https://aws.github.io/aws-emr-containers-best-practices/)
  - [EMR on EKS workshop](analytics/emr/emr-on-eks)
  - [Mobileye: Spark on EKS migration](https://aws.amazon.com/cn/blogs/containers/mobileye-revolutionizing-hd-map-creation-for-autonomous-vehicles-with-spark-on-amazon-eks/)
  - [Tool to convert spark-submit to StartJobRun EMR on EKS API](analytics/emr/emr-on-eks/Convert-API-Tools.md)
  - [Orchestrate an Amazon EMR on Amazon EKS Spark job with AWS Step Functions](https://aws.amazon.com/cn/blogs/big-data/orchestrate-an-amazon-emr-on-amazon-eks-spark-job-with-aws-step-functions/)
  - [data-on-eks](https://awslabs.github.io/data-on-eks/)
  - [EMR on EKS 与 Apache Kyuubi 的数据驱动之旅](https://aws.amazon.com/cn/blogs/china/a-data-driven-journey-with-emr-on-eks-and-apache-kyuubi/)
  - [Spark on EKS workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/9ae0382f-c40a-44d4-a604-e1b378866323/en-US)

### Stream - Flink and Spark Streaming
- [Flink on EMR]
  - [可持续性最佳架构实践—基于Spot的Flink作业集群部署与优化](https://aws.amazon.com/cn/blogs/china/flink-on-eks-reuse-recycle/)
  - [Amazon EMR on EKS with Apache Flink: A scalable, reliable, and efficient data processing platform](https://aws.amazon.com/blogs/big-data/introducing-amazon-emr-on-eks-with-apache-flink-a-scalable-reliable-and-efficient-data-processing-platform/)
- [基于 Hudi + Flink多流拼接（大宽表）最佳实践](https://mp.weixin.qq.com/s/Kn-amxHSsyl7gPEdZpkpUw)
- [ClickStream workshop](https://catalog.workshops.aws/clickstream/en-US)
- [Clickstream Analytics on AWS](https://docs.aws.amazon.com/solutions/latest/clickstream-analytics-on-aws/solution-overview.html)
- [多库多表场景下使用Amazon EMR CDC实时入湖](https://aws.amazon.com/cn/blogs/china/best-practice-of-using-amazon-emr-cdc-to-enter-the-lake-in-real-time-in-a-multi-database-multi-table-scenario/)


### Stream - Kinesis
- [How to do analysis and virtulization DynamoDB](analytics/How-to-do-Virtulization-DynamoDB.md)
- [AWS Kinesis Workshop](analytics/kinesis/101Workshop)
- [Sending Data to an Amazon Kinesis Data Firehose Delivery Stream](analytics/kinesis/Write-Kinesis-using-Agent.md)
- [lambda as a consumer for kinesis](https://aws.amazon.com/blogs/compute/using-aws-lambda-as-a-consumer-for-amazon-kinesis)
  
### Stream - Kafka
- [MSK Workshop](analytics/msk/101Workshop/README.md)
- [AWS Streaming Data Solution for Amazon MSK](https://aws.amazon.com/solutions/implementations/aws-streaming-data-solution-for-amazon-msk/)
- [Kafka UI](https://github.com/provectus/kafka-ui)
  
- [Connection]
  - [Secure connectivity patterns to access Amazon MSK across AWS Regions](https://aws.amazon.com/blogs/big-data/secure-connectivity-patterns-to-access-amazon-msk-across-aws-regions/)
  - [exposing kafka public](https://dvirgiln.github.io/exposing-kafka-throw-different-aws-vpcs/)
  - [Connect to Amazon MSK Serverless from your on-premises network](https://aws.amazon.com/blogs/big-data/connect-to-amazon-msk-serverless-from-your-on-premises-network/)
  - [Kafka/MSK Cluster connection issue](https://aws.amazon.com/premiumsupport/knowledge-center/msk-cluster-connection-issues/)
  - [MSK now offers multi-VPC private connectivity and cross-account access](https://aws.amazon.com/blogs/big-data/connect-kafka-client-applications-securely-to-your-amazon-msk-cluster-from-different-vpcs-and-aws-accounts/)

- [MSK Connect](https://aws.amazon.com/blogs/aws/introducing-amazon-msk-connect-stream-data-to-and-from-your-apache-kafka-clusters-using-managed-connectors/)
  - [Run Kafka Connect as Fargate Docker containers and deploy MirrorMaker configuration files](https://github.com/aws-samples/kafka-connect-mm2)
  - [MirrorMaker deployment](https://github.com/apache/kafka/blob/trunk/connect/mirror/README.md)
  - [Create a low-latency source-to-data lake pipeline using Amazon MSK Connect, Apache Flink, and Apache Hudi](https://aws.amazon.com/blogs/big-data/create-a-low-latency-source-to-data-lake-pipeline-using-amazon-msk-connect-apache-flink-and-apache-hudi/)

- [Reliability]
  - [MSK 可靠性最佳实践 msk-reliability-best-practice](https://aws.amazon.com/cn/blogs/china/msk-reliability-best-practice/)

- [Performance & Cost]
  - [The tiered storage for Amazon MSK](https://aws.amazon.com/cn/blogs/big-data/retain-more-for-less-with-tiered-storage-for-amazon-msk/)
  - [Safely remove Kafka brokers from Amazon MSK provisioned clusters](https://aws.amazon.com/blogs/big-data/safely-remove-kafka-brokers-from-amazon-msk-provisioned-clusters/)
  
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
- [Usage]
  - [Cross-Account Data Sharing for Amazon Redshift](https://aws.amazon.com/blogs/aws/cross-account-data-sharing-for-amazon-redshift/)
  - [redshift one page](https://github.com/aws/awesome-redshift)
  - [Automate Redshift ETL](analytics/lambda-redshift)
  - [Redshift ML](analytics/redshift-ml/Readme.md)
  - [Create-Redshift-ReadOnly-User](analytics/redshift-ml/Create-ReadOnly-User.md)
  - [Glue Studio supports Redshift Serverless](https://aws.amazon.com/about-aws/whats-new/2023/07/aws-glue-studio-amazon-redshift-serverless/)
  - [Redshift auto mounting Glue Catalog](https://aws.amazon.com/about-aws/whats-new/2023/07/amazon-redshift-automatic-mounting-aws-glue-data-catalog/)
  - [Iceberg table support on Redshift](https://aws.amazon.com/about-aws/whats-new/2023/07/amazon-redshift-querying-apache-iceberg-tables/)
  - [Zero-ETL 在支付业务离线数据上的实践](https://aws.amazon.com/cn/blogs/china/zero-etl-practice-on-offline-payment-business-data/)
  
- [Redshift performance]
  - [使用 Amazon Glue 来调度 Amazon Redshift 跑 TPC-DS Benchmark](https://aws.amazon.com/cn/blogs/china/use-amazon-glue-to-schedule-amazon-redshift-run-tpc-ds-benchmark/)
  - [Cloud DataWarehouse Benchmark](https://github.com/awslabs/amazon-redshift-utils/tree/master/src/CloudDataWarehouseBenchmark/Cloud-DWB-Derived-from-TPCDS)
  - [Redshift 高并发分析查询最佳实践与解决方案](https://aws.amazon.com/cn/blogs/china/best-practices-and-solutions-for-high-concurrency-analytical-queries-in-the-serverless-architecture/)

- [CDC to Redshift]
    - [CDC from On-Premises SQL Server to Amazon Redshift](https://aws.amazon.com/cn/blogs/apn/change-data-capture-from-on-premises-sql-server-to-amazon-redshift-target/)

- [ClickHouse and S3]
    - [Integrating ClickHouse and S3 Compatible Storage](https://dzone.com/articles/clickhouse-s3-compatible-object-storage)
    - [ClickHouse S3 table function](https://clickhouse.com/docs/en/sql-reference/table-functions/s3/)
    - [ClickHouse Cloud & Amazon S3 Express One Zone: Making a blazing fast analytical database even faster](https://aws.amazon.com/cn/blogs/storage/clickhouse-cloud-amazon-s3-express-one-zone-making-a-blazing-fast-analytical-database-even-faster/)
    - [字节跳动 ByteHouse 云原生之路 – 计算存储分离与性能优化](https://aws.amazon.com/cn/blogs/china/bytehouse-road-to-cloud-native-separation-of-computing-and-storage-and-performance-optimization/)

- [Scheduling SQL queries on your Amazon Redshift](https://aws.amazon.com/blogs/big-data/scheduling-sql-queries-on-your-amazon-redshift-data-warehouse/)

- [Streaming datawarehouse]
  - [Real-time analytics with Amazon Redshift streaming ingestion](https://aws.amazon.com/cn/blogs/big-data/real-time-analytics-with-amazon-redshift-streaming-ingestion/)
  - [Streaming ingestion official doc](https://docs.aws.amazon.com/redshift/latest/dg/materialized-view-streaming-ingestion.html)

### Search and analytics: Elasticsearch Service
- [Loading Streaming Data into Amazon Elasticsearch Service](analytics/es-lambda)

- [Amazon Elasticsearch Service Workshop](https://www.aesworkshops.com/)

- [Elasticsearch Service Snapshot Lifecycle](analytics/elasticsearch-lifecycle)
- [Automating Index State Management for Amazon OpenSearch Service](https://aws.amazon.com/blogs/big-data/automating-index-state-management-for-amazon-opensearch-service/)

- [SAML Authentication for Kibana](analytics/saml-kibana)

- [Search DynamoDB Data with Amazon Elasticsearch Service](https://search-ddb.aesworkshops.com/01-intro.html)

- [Log Hub workshop](https://log-hub.docs.solutions.gcr.aws.dev/workshop/introduction/)

- [使用Fluent Bit与Amazon OpenSearch Service构建日志系统](https://aws.amazon.com/cn/blogs/china/build-a-logging-system-with-fluent-bit-and-amazon-opensearch-service/)

- [Simple FAQ Bot](analytics/faq-bot/README.md)

- [OpenSearch cross cluster replication - DR or HA](https://aws.amazon.com/cn/blogs/china/no-subscription-fee-teach-you-how-to-use-cross-cluster-replication-in-amazon-opensearch-service/)
  
### Governance
- [Lake Formation]
  - [Lake Formation Workshop](analytics/lakeformation/lakeformation-workshop.md)
  - [AWS Lake Formation Tag-based access control](https://aws.amazon.com/cn/blogs/big-data/easily-manage-your-data-lake-at-scale-using-tag-based-access-control-in-aws-lake-formation/)
  - [Athena Support Lake Formation fine-grained-access-control](https://aws.amazon.com/cn/about-aws/whats-new/2022/11/amazon-athena-support-lake-formation-fine-grained-access-control/)

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
  - [Configure ADFS Identity Federation with Amazon QuickSight](https://aws.amazon.com/blogs/business-intelligence/configure-adfs-identity-federation-with-amazon-quicksight/)
  - [Enabling Amazon QuickSight federation with Azure AD](https://aws.amazon.com/blogs/big-data/enabling-amazon-quicksight-federation-with-azure-ad/)
  - [Manage users and group memberships on Amazon QuickSight using SCIM events generated in IAM Identity Center with Azure AD](https://aws.amazon.com/blogs/business-intelligence/manage-users-and-group-memberships-on-amazon-quicksight-using-scim-events-generated-in-iam-identity-center-with-azure-ad/)
  - [AWS Managed Microsoft AD to authenticate users in QuickSight](https://repost.aws/knowledge-center/quicksight-authenticate-active-directory)
  - [QuickSight deployment models for cross-account and cross-Region access to Redshift and RDS](https://aws.amazon.com/cn/blogs/big-data/amazon-quicksight-deployment-models-for-cross-account-and-cross-region-access-to-amazon-redshift-and-amazon-rds/)

- [Athena integrated with PowerBI Desktop and PowerBI Service](https://docs.aws.amazon.com/athena/latest/ug/connect-with-odbc-and-power-bi.html)

- [Integrate Power BI with Amazon Redshift for insights and analytics](https://aws.amazon.com/blogs/big-data/integrate-power-bi-with-amazon-redshift-for-insights-and-analytics/)

### Delta Lake
-[DataBricks]
  - [Migrating Transactional Data to a Delta Lake using AWS DMS](https://databricks.com/blog/2019/07/15/migrating-transactional-data-to-a-delta-lake-using-aws-dms.html)
  
- [Hudi]
  - [How EMR Hudi works](https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-hudi-how-it-works.html)

- [Iceberg]
  - [自建iceberg上的数据迁移至S3 tables里的工具](https://github.com/aws-samples/apache-iceberg-tables-migration-tool/ )
  
## IOT
### IoT Core
- [IoT-Workshop](iot/IoT-Workshop.md)

- [AWS IoT Events Quick Start](iot/IoT-Events)

- [Ingest data to IoT core and using lambda write date to RDS PostgreSQL](lambda/lambda-write-postgresql/lambda-write-postgreSQL.md)

- [IoT DR solution](https://aws.amazon.com/solutions/implementations/disaster-recovery-for-aws-iot/)

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
- [Top 2022 AWS data protection service and cryptography tool](https://aws.amazon.com/blogs/security/top-2022-aws-data-protection-service-and-cryptography-tool-launches/)
- [BMW automation compliance-at-scale](https://aws.amazon.com/blogs/mt/how-bmw-group-uses-automation-to-achieve-end-to-end-compliance-at-scale-on-aws/)
- [Automated Security Response on AWS](https://aws.amazon.com/solutions/implementations/automated-security-response-on-aws/)

### Encryption - KMS
- [Share-CMK-across-multiple-AWS-accounts](security/kms/Share-CMK-across-multiple-AWS-accounts.md)
- [Using-SM-Key-Algorithm-in-China](security/kms/Using-SM-Key-Algorithm-in-China.md)
- [Demystifying KMS keys operations, bring your own key (BYOK), custom key store, and ciphertext portability](https://aws.amazon.com/blogs/security/demystifying-kms-keys-operations-bring-your-own-key-byok-custom-key-store-and-ciphertext-portability/)
- [bring your own key to AWS KMS](https://aws.amazon.com/blogs/security/how-to-byok-bring-your-own-key-to-aws-kms-for-less-than-15-00-a-year-using-aws-cloudhsm/)
- [Multi-Region keys in AWS KMS](https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html)

### Credential - Secret Manager
- [Secret Manager quick start demo](security/secret-mgr/README.md)

- [Cross-Accounts-Secrets](security/secret-mgr/Cross-Accounts-Secrets.md)
- 
### Certificate - Certificate Manager
- [Upload-SSL-Certificate](security/acm/Upload-SSL-Certificate.md)

- [Create certificate using openssl](security/acm/create-certificate-openssl.md)

- [Free SSL certificate](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/SSL-on-amazon-linux-2.html#letsencrypt)

- [3rd party PCA](https://docs.cloudera.com/cdp-private-cloud-base/7.1.6/security-encrypting-data-in-transit/topics/cm-security-use-case-1.html)
- [How to build a CA hierarchy across multiple AWS accounts and Regions for global organization](https://aws.amazon.com/blogs/security/how-to-build-a-ca-hierarchy-across-multiple-aws-accounts-and-regions-for-global-organization/)

- [Validate the ACM certificate]
  - [Switch acm certificate validation](https://aws.amazon.com/cn/premiumsupport/knowledge-center/switch-acm-certificate/)
  - [Troubleshooting acm certificate email validation](https://aws.amazon.com/premiumsupport/knowledge-center/acm-email-validation-custom/?nc1=h_ls)

### Asset Management and Compliance
- [How to use the RDK for AWS Config Automation](security/aws-config/GetStartConfigRDS.md)
- [select * from cloud](https://steampipe.io/)

### AuthN and AuthZ
- [Connect to Your Existing AD Infrastructure](security/Connect-to-Existing-AD-Infrastructure.md)

- [Cognito User Pool alternative solution - Authing demo](https://github.com/aws-samples/aws-authing-demo)
- [Cognito with WeChat integration](https://aws.amazon.com/cn/blogs/china/amazon-cognito-wechat-deployment-1/)
- [integrate Amazon SES with an Amazon Cognito user pool](https://repost.aws/knowledge-center/cognito-user-pool-ses-integration)
  
- [Summary the Single-Sign-On cases](security/sso/SSO-OnePage.md)
    - [Enabling Federation to AWS console using Windows Active Directory, ADFS, and SAML 2.0](security/sso/Using-ADFS-SSO.md)
    - [Using IAM federation and Switch role to implement the Single Sign On multiple AWS Accounts](https://amazonaws-china.com/cn/blogs/china/enable-single-sign-on-sso-and-aws-multi-account-management-for-enterprise-users-with-aws-federation-authentication/)
    - [Okta-OpenID-AWS-in-the-Browser](security/sso/Okta-OpenID-AWS-in-the-Browser.md)
    - [Enabling custom identity broker access to the AWS console](security/sso/Customer_Idp_Broker_access_aws_console.md)
    - [Grant my Active Directory users access to the API or AWS CLI with AD FS](https://aws.amazon.com/premiumsupport/knowledge-center/adfs-grant-ad-access-api-cli/)
    - [Using-temporary-credentials-with-AWS-resources](security/Using-temporary-credentials-with-AWS-resources.md)
    - [Okta - AWS China multi-account console integration](security/sso/Okta-multiple-accounts-integration.md)
    - [Keycloak on aws](https://github.com/aws-samples/keycloak-on-aws)
    - [Keycloak with Okta OpenID Connect Provider](https://ultimatesecurity.pro/post/okta-oidc/)
    - [Managing temporary elevated access just-in-time access to your AWS environment](https://aws.amazon.com/cn/blogs/security/managing-temporary-elevated-access-to-your-aws-environment/)
    - [Using global region SSO service to federate China region console](https://aws.amazon.com/cn/blogs/china/use-amazon-cloud-technology-single-sign-on-service-for-amazon-cloud-technology-china/)

- [Automatically rotate IAM user access keys at scale](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/automatically-rotate-iam-user-access-keys-at-scale-with-aws-organizations-and-aws-secrets-manager.html)
  
- [利用IAM Roles Anywhere 授权云外设备访问AWS资源](https://aws.amazon.com/cn/blogs/china/use-amazon-cloud-technology-iam-roles-anywhere-to-authorize-off-cloud-devices-to-access-aws-resources/)
  
### Sentitive Data
- [How to bootstrap sensitive data in EC2 User Data](security/How-to-bootstrap-sensitive-data-in-EC2-userdata.md)

### Threat detection - GuardDuty
- [GuardDuty Simulator](security/guard-duty/README.md)

### WAF
- [aws-deployment-with-fortiweb-waf](https://www.amazonaws.cn/en/solutions/waf-using-fortiweb/?nc2=h_ql_sol_for) [Source Code](https://github.com/aws-samples/aws-deployment-with-fortiweb-waf)

- [AWS WAF-Workshop](security/waf/WAF-Workshop.md)
- [WAF-Simulation-With-DVWA](security/waf/WAF-Simulation-With-DVWA.md)
- [使用 Amazon WAF 进行 Captcha人机验证](https://aws.amazon.com/cn/blogs/china/use-amazon-waf-for-captcha-man-machine-verification/)
- [WAF的托管规则说明](security/waf/WAF的托管规则说明.md)
- [中国区抗DDoS方案](https://www.nwcdcloud.cn/articledetail.aspx?id=63)
- [Strengthen Your Web Application Defenses with AWS WAF](https://catalog.us-east-1.prod.workshops.aws/workshops/81e94a4b-b47f-4acc-a284-914c4514d50f/zh-CN)

### Permission - IAM Policy, S3 Policy, RAM Policy
- [Policy evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)

- [How can I use permissions boundaries to limit the scope of IAM users and roles and prevent privilege escalation?](https://aws.amazon.com/premiumsupport/knowledge-center/iam-permission-boundaries/?nc1=h_ls)

- [Enforce MFA authentication for IAM users](https://aws.amazon.com/premiumsupport/knowledge-center/mfa-iam-user-aws-cli/)

- [How can I use IAM roles to restrict API calls from specific IP addresses](https://aws.amazon.com/premiumsupport/knowledge-center/iam-restrict-calls-ip-addresses/)

### Multi accounts structure
- [Accessing and administering the member accounts in your organization](https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_accounts_access.html)
- [Moving an memeber accounts to another organization-Part1](https://aws.amazon.com/cn/blogs/mt/aws-organizations-moving-an-organization-member-account-to-another-organization-part-1/)
- [Moving an memeber accounts to another organization-Part2](https://aws.amazon.com/cn/blogs/mt/aws-organizations-moving-an-organization-member-account-to-another-organization-part-2/)
- [Moving an memeber accounts to another organization-Part13](https://aws.amazon.com/cn/blogs/mt/aws-organizations-moving-an-organization-member-account-to-another-organization-part-3/)

- [Share a subnet with other account](https://aws.amazon.com/premiumsupport/knowledge-center/vpc-share-subnet-with-another-account/)

### SIEM and SOC
- [Security Hub quick start](security/security-hub/securityhub_customer_findings.md)
- [Customer security findings for security hub](security/security-hub/securityhub_customer_findings.md)

### Vulnerability Assessment - Inspector and Alternative
- [Inspector alternantive in China region - tenable nessus](https://zh-cn.tenable.com/products/nessus)

## Network
- [Growing AWS internet peering with 400 GbE](https://aws.amazon.com/blogs/networking-and-content-delivery/growing-aws-internet-peering-with-400-gbe/)
### Test Performance/Latency
- [测region之间延迟](https://www.cloudping.co/grid)
- [测当前环境到各region的延迟](https://www.cloudping.info/)
- [测全球主要城市到指定ip的延迟](https://tools.ipip.net/traceroute.php)
  
### VPC
- [How to solve private ip exhaustion with private nat solution](https://aws.amazon.com/cn/blogs/networking-and-content-delivery/how-to-solve-private-ip-exhaustion-with-private-nat-solution/)
- [How do I troubleshoot network performance issues between EC2 and on-premises host over the internet gateway](https://aws.amazon.com/premiumsupport/knowledge-center/network-issue-vpc-onprem-ig/)
- [How do I modify the IPv4 CIDR block of my Amazon VPC](https://aws.amazon.com/premiumsupport/knowledge-center/vpc-ip-address-range/)
  - [How can I modify the CIDR block on my VPC to accommodate more hosts](https://aws.amazon.com/premiumsupport/knowledge-center/vpc-modify-cidr-more-hosts/)

### Keep private - VPC Endpoint and PrivateLink
- [How to verify EC2 access S3 via VPC S3 Endpoint?](vpc/Access-S3-via-VPC-endpoint.md)

- [Why can’t I connect to an S3 bucket using a gateway VPC endpoint?](https://amazonaws-china.com/premiumsupport/knowledge-center/connect-s3-vpc-endpoint/)

- [The customer have a private subnet without NAT and want to use ssm vpc endpoint to connected to SSM service](vpc/SSM-VPC-Endpoint-In-China-Region.md)

- [Using VPC PrivateLink to do cross VPC traffic](EC2/ALB-NLB-Route-Traffic-to-Peering-VPC.md)

- [Cross region VPC endpoint access](https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/centralized-access-to-vpc-private-endpoints.html#cross-region-endpoint-access)
- [How do I configure cross-Region Amazon VPC interface endpoints to access AWS PrivateLink resources?](https://repost.aws/knowledge-center/vpc-endpoints-cross-region-aws-services)

### NAT and proxy
- [How I can setup transparent proxy - squid](network/squid/Squid-proxy.md)

- [Nginx S3 Reverse Proxy](network/Nginx/Nginx-S3-Reverse-Proxy.md)

### Load balancers 
- [NLB-TLS-Termination + Access log](network/nlb/NLB-TLS-Termination.md)

- [Current limits of AWS network load balancers](https://ably.com/blog/limits-aws-network-load-balancers)

### Cross data center and cloud Leasing Line - Direct Connect and VPN
- [Direct Connect Monitoring](network/direct-connect/DX-Monitoring.md)
  - [DX_Ping_check](network/direct-connect/DX_Ping_check.md)
  - [How can I get notifications for Direct Connect scheduled maintenance or events?](https://repost.aws/knowledge-center/get-direct-connect-notifications)

- [DX-Resillency](network/direct-connect/DX-Resillency.md)
  - [How to achieve active-active/active-passive Direct Connect connection](network/direct-connect/How-to-do-DX-Loadbalance.md)
  
- [Amazon Direct Connect inter-region routing for public access resources](https://www.amazonaws.cn/en/new/2021/amazon-direct-connect-inter-region-routing-amazon-web-services-china-regions/)

- [Connect alibaba cloud to aws via vpn](https://www.alibabacloud.com/blog/connect-alibaba-cloud-to-aws-via-vpn-gateway_593915)

- [AWS Direct Connect SiteLink: send data from one Direct Connect location to another, bypassing AWS Regions](https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-aws-direct-connect-sitelink/)

- [AWS Site-to-Site VPN Private IP VPNs](https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-aws-site-to-site-vpn-private-ip-vpns/)

- [Direct Connect and AWS Local Zones interoperability patterns](https://aws.amazon.com/blogs/networking-and-content-delivery/aws-direct-connect-and-aws-local-zones-interoperability-patterns/)

### Cross board transfer
- [Cross region EC2 to EC2 transfering speed testing](network/Cross-region-EC2-connection-benchmark.md)
- [cross-border-data-synchronization with data transfer hub](https://aws.amazon.com/cn/blogs/china/best-practices-for-cross-border-data-synchronization-in-dth/)

### Cross accounts and Cross VPCs - TGW
- [TGW cross account sharing and inter-connection testing](network/tgw-workshop)

- [VPC-Cross-Account-Connection](vpc/VPC-Cross-Account-Connection.md)

- [Building a Solution for China Cross-Border VPC Connection](https://aws.amazon.com/cn/blogs/apn/building-a-solution-for-china-cross-border-vpc-connection/)

### Acceleration network
- [Using Amazon Global Accelerator to improve cross board request improvement](network/aga/README.md)
- [Measuring AWS Global Accelerator performance and analyzing results](https://aws.amazon.com/blogs/networking-and-content-delivery/measuring-aws-global-accelerator-performance-and-analyzing-results/)

- [Amazon CloudFront Extensions](https://awslabs.github.io/aws-cloudfront-extensions/)

- [Enable the HTTPS access for CloudFront](network/edge/CloudFront_HTTPS_Access.md)
  - [create-ssl-with-cloudfront - China CloudFront SSL Plugin](https://www.amazonaws.cn/en/getting-started/tutorials/create-ssl-with-cloudfront/)
  - [External Server Authorization with Lambda@Edge](https://aws.amazon.com/blogs/networking-and-content-delivery/external-server-authorization-with-lambdaedge/)

- [Optimizing performance for users in China with Amazon Route 53 and Amazon CloudFront](https://aws.amazon.com/blogs/networking-and-content-delivery/optimizing-performance-for-users-in-china-with-amazon-route-53-and-amazon-cloudfront/)

- [使用 Amazon CloudFront + Amazon S3 + AWS Lambda@Edge 动态调用业务接口生成图片](https://aws.amazon.com/cn/blogs/china/use-amazon-cloudfront-amazon-s3-aws-lambda-edge-to-dynamically-call-business-interfaces-to-generate-images/)

- [Using CloudFront Origin Shield to protect your origin in a multi-CDN deployment](https://aws.amazon.com/cn/blogs/networking-and-content-delivery/using-cloudfront-origin-shield-to-protect-your-origin-in-a-multi-cdn-deployment/)
  
### Edge
- [Protecting workloads on AWS from the Instance to the Edge](https://protecting-workloads.awssecworkshops.com/workshop/)

- [CloudFront support HTTP/3](https://aws.amazon.com/blogs/aws/new-http-3-support-for-amazon-cloudfront/)
  
### Network Secuirty
- [GWLB Example](network/GWLB/GWLB_Example.md)

- [Transit Gateway Connect 集成FortiGate安全服务](network/tgw-workshop/TGW-Connect.md)

- [How to check the Internet Traffic with VPC Flow?](vpc/VPC-Flowlogs-Analysis.md)

- [Traffic Mirror]
  - [Using VPC Traffic Mirroring to monitor and secure your VPC](https://aws.amazon.com/cn/blogs/networking-and-content-delivery/using-vpc-traffic-mirroring-to-monitor-and-secure-your-aws-infrastructure/)
  - [借助 VPC Traffic Mirroring 构建网络入侵检测系统](https://aws.amazon.com/cn/blogs/china/using-vpc-traffic-mirroring-to-construct-network-intrusion-detection-system-update/)
  - [VPC traffic mirror 集成FortiGate安全分析](https://aws.amazon.com/cn/blogs/china/aws-traffic-mirroring-service-integration-fortigate-security-analysis/)
  - [使用 GWLB 和 FortiGate 作为流量镜像的替代方案](https://aws.amazon.com/cn/blogs/china/using-gwlb-and-fortigate-as-an-alternative-to-traffic-mirroring/)

## DNS
### Route 53
- [Route53 in China region](R53/README.md)

- [How do I troubleshoot Route53 geolocation routing issues](https://aws.amazon.com/premiumsupport/knowledge-center/troubleshoot-route53-geolocation/)

- [Route53 Routing Policy](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy.html)

- [Route53 Resolver](R53/R53-Resolver.md)

- [Route53 cross-account-dns](R53/cross-account-dns.md)

### HTTPDNS
[DNS hijacked using http dns bypass](https://zhuanlan.zhihu.com/p/380524458?utm_medium=social&utm_oi=713845518471532544&utm_psn=1604820811101130752&utm_source=wechat_session)

## Serverless
### Serverless Workshop
- [AWS Serverless Day](https://serverlessday.cbuilder.tech/index.html)

- [Serverless Patterns Collection](https://serverlessland.com/patterns)
- [Serverless code repo Collection](https://serverlessland.com/repos)

- [Serverless coffee workshop](https://workshop.serverlesscoffee.com/0-introduction.html)

- [AWS Serverless SaaS Workshop](https://catalog.us-east-1.prod.workshops.aws/workshops/b0c6ad36-0a4b-45d8-856b-8a64f0ac76bb/en-US)

- [Lambda 10 Years](https://www.allthingsdistributed.com/2024/11/aws-lambda-turns-10-a-rare-look-at-the-doc-that-started-it.html)

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
  - [Disney use the open source and serverless](https://aws.amazon.com/cn/blogs/opensource/improving-developer-productivity-at-disney-with-serverless-and-open-source/)
  - [Liftshift web app to serverless - part1](https://aws.amazon.com/blogs/compute/lifting-and-shifting-a-web-application-to-aws-serverless-part-1/)
  - [Liftshift web app to serverless - part2](https://aws.amazon.com/blogs/compute/lifting-and-shifting-a-web-application-to-aws-serverless-part-2/)
  - [lambda extensions](https://github.com/aws-samples/aws-lambda-extensions)

- Lambda cost
  - [使用 Graviton 2优化Serverless车联网架构](https://aws.amazon.com/cn/blogs/china/optimizing-the-architecture-of-serverless-internet-of-vehicles-with-graviton-2/)
  - [Optimizing your AWS Lambda costs – Part 1](https://aws.amazon.com/blogs/compute/optimizing-your-aws-lambda-costs-part-1/)
  - [Optimizing your AWS Lambda costs – Part 2](https://aws.amazon.com/cn/blogs/compute/optimizing-your-aws-lambda-costs-part-2/)

- Lambda performance
  - [Understanding AWS Lambda scaling and throughput](https://aws.amazon.com/cn/blogs/compute/understanding-aws-lambda-scaling-and-throughput/)
  - [Lambda provisioned capacity autoscaling的实践](https://github.com/awslabs/aws-lambda-web-adapter/blob/main/examples/springboot/template.yaml)
  - [Simplifying serverless best practices with Lambda Powertools](https://aws.amazon.com/cn/blogs/opensource/simplifying-serverless-best-practices-with-lambda-powertools/)

- [lambda Web adapter](https://github.com/awslabs/aws-lambda-web-adapter)
  - [Using response streaming with AWS Lambda Web Adapter to optimize performance](https://aws.amazon.com/blogs/compute/using-response-streaming-with-aws-lambda-web-adapter-to-optimize-performance/)
  
### API Gateway
- [Build Private API with API Gateway and integrate with VPC resource via API Gateway private integration](devops/apigw/APIGW-PrivateAPI-PrivateIntegration.md)

- [API Gateway for API design patterns](https://aws.amazon.com/cn/blogs/compute/architecting-multiple-microservices-behind-a-single-domain-with-amazon-api-gateway/)

- [Understanding VPC links in Amazon API Gateway private integrations](https://aws.amazon.com/blogs/compute/understanding-vpc-links-in-amazon-api-gateway-private-integrations/)

- [API Gateway private customer domain](https://github.com/aws-samples/serverless-samples/blob/main/apigw-private-custom-domain-name/README.md)

- [API Gateway Security Workshop](https://catalog.workshops.aws/apigw-security/en-US)

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
- [aws-database-migration-samples](https://github.com/aws-samples/aws-database-migration-samples)
  
- [How to migrate MySQL to Amazon Aurora by Physical backup](database/rds/mysql/MySQL_Migrate_Aurora.md)
  - [Bytebase 为 Amazon Aurora MySQL 设置数据库变更管理](https://mp.weixin.qq.com/s/6InIjVCojuVdQc5j4OyBJg)

- [Migrating SQL Server to Amazon RDS using native backup and restore](database/rds/sqlserver/Migrating-SQL-Server-to-Amazon-RDS-using-native-backup-and-restore.md)
  - [Microsoft SQL Server to Amazon S3](https://dms-immersionday.workshop.aws/en/sqlserver-s3.html)
  - [适用于Babelfish为目标的SQL Server数据迁移方法](https://aws.amazon.com/cn/blogs/china/all-colors-are-always-spring-sql-server-data-migration-method-for-babelfish/)
  - [Deploy multi-Region Amazon RDS for SQL Server using cross-Region read replicas with a disaster recovery](https://aws.amazon.com/blogs/database/deploy-multi-region-amazon-rds-for-sql-server-using-cross-region-read-replicas-with-a-disaster-recovery-blueprint-part-1/)

- [Best practices for migrating PostgreSQL databases to Amazon RDS and Amazon Aurora](https://aws.amazon.com/blogs/database/best-practices-for-migrating-postgresql-databases-to-amazon-rds-and-amazon-aurora/)
  - [Migrating data to Amazon Aurora with PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Migrating.html)
  - [rds-for-postgresql v.s aurora-postgresql](https://aws.amazon.com/blogs/database/is-amazon-rds-for-postgresql-or-amazon-aurora-postgresql-a-better-choice-for-me/)
  
- [Aurora launches instances in at least 3 AZ even if less are specified](https://github.com/hashicorp/terraform-provider-aws/issues/1111#)

### Data migration tool - DMS
- [DMS Workshop](https://dms-immersionday.workshop.aws/en/intro.html)
- [AWS Database Migration Workshop scenario based](https://catalog.us-east-1.prod.workshops.aws/workshops/77bdff4f-2d9e-4d68-99ba-248ea95b3aca/en-US/)

### Data migration tool - 3rd party tool
- [Migration-Data-From-AliCloud](migration/DataMigration/Migration-Data-From-AliCloud.md)
- [XData])migration/DataMigration/XData.md
- [Flink CDC Database Data](https://segmentfault.com/a/1190000041009658/en)
- [使用 RisingWave 实现 MSK，Kinesis，RDS MySQL 实时数据同步](https://aws.amazon.com/cn/blogs/china/real-time-data-synchronization-of-msk-kinesis-rds-and-mysql-using-risingwave/)

### Cross Cloud Migration
- [Migrate from AliCoud workshop](http://gotoaws.cloudguru.run/)
- [Assess secure Windows Servers for TCO analysis using Migration Evaluator](https://aws.amazon.com/blogs/mt/assess-secure-windows-servers-for-tco-analysis-using-migration-evaluator/)
- [Resource Discovery for Azure](https://github.com/awslabs/resource-discovery-for-azure)

### File migration
- [Getting Start Transfer Family](migration/TransferFamily/GettingStartTransferFamily.md)

- [Transfer Family to access EFS](https://aws.amazon.com/blogs/aws/new-aws-transfer-family-support-for-amazon-elastic-file-system/)

- [SFTP on AWS](network/SFTPOnAWS.md)
- [What type of endpoint is appropriate for my Transfer Family server](https://repost.aws/knowledge-center/aws-sftp-endpoint-type)

### VMware migration
[Accelerating Migration Evaluator discovery for VMware environment](https://aws.amazon.com/cn/blogs/migration-and-modernization/accelerating-migration-evaluator-discovery-for-vmware-environment/)

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
- [S3 Web Explorer](storage/S3/s3explorer/README.md)

- [S3-Presign-URL](storage/S3/S3-Presign-URL.md)
  - [Embeded the image in html with S3-Presign-URL](storage/S3/scripts/s3_image_display.html)

- [Uploading to Amazon S3 directly from a web or mobile application](https://aws.amazon.com/cn/blogs/compute/uploading-to-amazon-s3-directly-from-a-web-or-mobile-application/)

- [S3 disale TLS1.1 access or enforce TLS1.2 for in-transit encryption](storage/S3/S3-Disable-TLS1.1-Access.md)

- [使用 VPC Endpoint 从 VPC 或 IDC 内访问 S3](https://aws.amazon.com/cn/blogs/china/use-vpc-endpoint-access-from-vpc-or-idc-s3/)
- [Hosting Internal HTTPS Static Websites with ALB, S3, and PrivateLink](https://aws.amazon.com/blogs/networking-and-content-delivery/hosting-internal-https-static-websites-with-alb-s3-and-privatelink/)

- [Adding and removing object tags with S3 Batch Operations](https://aws.amazon.com/blogs/storage/adding-and-removing-object-tags-with-s3-batch-operations/)

- [S3 inventory usage](storage/S3/s3-inventory.md)

- [How Trend Micro uses Amazon S3 Object Lambda to help keep sensitive data secure](https://aws.amazon.com/cn/blogs/storage/how-trend-micro-uses-amazon-s3-object-lambda-to-help-keep-sensitive-data-secure/)

- [Using S3 Intelligent-Tiering](storage/S3/S3_Intelligent-Tiering.md)

- [How to Check S3 object integrity](storage/S3/check-integrity-of-s3-object.md)

- [通过 STS Session Tags 来对 AWS 资源进行更灵活的权限控制 - 但是需要一个认证机制去确保userid可信的](https://aws.amazon.com/cn/blogs/china/use-sts-session-tags-to-perform-more-flexible-permission-control-on-aws-resources/)

- [将Amazon EC2到Amazon S3的数据传输推向100Gbps线速](https://aws.amazon.com/cn/blogs/china/pushing-the-data-transfer-from-amazon-ec2-to-amazon-s3-to-100gbps-line-speed/)
- [如何在短时间里遍历 Amazon S3 亿级对象桶（原理篇）](https://aws.amazon.com/cn/blogs/china/how-to-traverse-amazon-s3-billion-object-buckets-in-a-short-time-principle/)
- [Hosting Internal HTTPS Static Websites with ALB, S3, and PrivateLink](https://aws.amazon.com/cn/blogs/networking-and-content-delivery/hosting-internal-https-static-websites-with-alb-s3-and-privatelink/)
- [2024 reInvent S3 udpate](https://www.youtube.com/watch?v=pbsIVmWqr2M)
- [S3 support the dedicated local zone](https://aws.amazon.com/about-aws/whats-new/2024/12/amazon-s3-storage-classes-dedicated-local-zones/)
- [S3 Protection](storage/S3/S3_protection.md)
  
### EBS
- [How do I create a snapshot of an EBS RAID array](https://aws.amazon.com/premiumsupport/knowledge-center/snapshot-ebs-raid-array/)

- [EBS benchmark testing](https://github.com/liangruibupt/ebs-benchmark-testing)

### Storage Gatewway
- [storage-gateway-demo and performance testing](https://github.com/liangruibupt/storage-gateway-demo)
- [How can I troubleshoot an S3AccessDenied error from my file gateway](https://aws.amazon.com/premiumsupport/knowledge-center/file-gateway-troubleshoot-s3accessdenied/)
- [How can I set up a private network connection between a file gateway and Amazon S3](https://aws.amazon.com/premiumsupport/knowledge-center/storage-gateway-file-gateway-private-s3/)
- [Resolve an internal error when activating my Storage Gateway](https://aws.amazon.com/premiumsupport/knowledge-center/storage-gateway-resolve-internal-error/)
- [手工激活在IDC内网的Storage Gateway](https://blog.bitipcman.com/activate-storage-gateway-without-public-http-network/)

### EFS and FSx or other shared file system
- [EFS Workshop for GCR](https://github.com/liangruibupt/amazon-efs-workshop)

- [Amazon FSx for Lustre or Amazon FSx for Windows File Server Workshop](storage/FSx/README.md)

- [Amazon FSx for Windows File Server file share on an Amazon EC2 Linux instance](https://docs.aws.amazon.com/fsx/latest/WindowsGuide/using-file-shares.html) You can mount an Amazon FSx for Windows File Server file share on an Amazon EC2 Linux instance that is either joined to your Active Directory or not joined.

- [goofys on AWS](https://github.com/kahing/goofys)

- [EFS Web Browser for list files and directory](https://aws.amazon.com/cn/blogs/china/building-a-serviceless-efs-file-browser/)

- [Global Region Simple File Manager for Amazon EFS](https://aws.amazon.com/solutions/implementations/simple-file-manager-for-amazon-efs/)

- [基于AWS DataSync 迁移 NetApp NAS上云](https://aws.amazon.com/cn/blogs/china/migrating-netapp-nas-to-cloud-based-on-aws-datasync/)

- [Deploying IPFS Cluster using AWS Fargate and Amazon EFS One Zone](https://aws.amazon.com/cn/blogs/containers/deploying-ipfs-cluster-using-aws-fargate-and-amazon-efs-one-zone/)

- [FSX Security Scan](https://aws.amazon.com/blogs/storage/securing-your-amazon-fsx-for-ontap-windows-share-smb-against-viruses/)
  
## Database
### RDS
#### RDS usage
- [Amazon Aurora MySQL Database Quick Start Reference Deployment](https://aws-quickstart.github.io/quickstart-amazon-aurora-mysql/)
  
- [RDS common questions](database/rds/RDS_common_questions.md)

- [Use Proxysql for RDS for MySQL or Aurora databases connection pool and Read/Write Split](database/rds/proxysql/serverless-proxysql.md)
  
- [Proxy for PostgreSQL](database/rds/proxysql/proxy-for-postgeSQL.md)

- [AWS Bookstore Demo App - Purpose-built databases enable you to create scalable, high-performing, and functional backend infrastructures to power your applications](https://github.com/aws-samples/aws-bookstore-demo-app)

- [PostgreSQL Logging]
  - [如何使用 Amazon RDS for PostgreSQL 启用查询日志记录 query logging？](https://aws.amazon.com/cn/premiumsupport/knowledge-center/rds-postgresql-query-logging/)
  - [Working with RDS and Aurora PostgreSQL logs: Part 1](https://aws.amazon.com/blogs/database/working-with-rds-and-aurora-postgresql-logs-part-1/)
  - [Working with RDS and Aurora PostgreSQL logs: Part 2](https://aws.amazon.com/blogs/database/working-with-rds-and-aurora-postgresql-logs-part-2/)

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

- [Amazon Aurora 故障恢复之降低DNS切换对应用影响篇](https://aws.amazon.com/cn/blogs/china/be-vigilant-in-times-of-peace-amazon-aurora-fault-recovery-reduces-the-impact-of-dns-switching-on-applications/)
- [Amazon Aurora 故障恢复不同JDBC Driver下的时延分析](https://aws.amazon.com/cn/blogs/china/be-vigilant-in-times-of-safety-amazon-aurora-fault-recovery-delay-analysis-under-different-jdbc-drivers/)

#### RDS upgrade
- [Achieving minimum downtime for major version upgrades in Amazon RDS PostgreSQL](database/rds/PostgreSQL/Achieving-minimum-downtime-for-major-version-RDS-PostgeSQL-upgrades.md)

- [How to Migrate from Amazon RDS Aurora or MySQL to Amazon Aurora Serverless](https://medium.com/@souri29/how-to-migrate-from-amazon-rds-aurora-or-mysql-to-amazon-aurora-serverless-55f9a4a74078)

- [Aurora MySQL 5.6 upgrade blog](https://aws.amazon.com/blogs/database/upgrade-amazon-aurora-mysql-compatible-edition-version-1-with-mysql-5-6-compatibility/)
- [Minimum downtime Aurora MySQL5.6 upgrade using clone](https://aws.amazon.com/blogs/database/performing-major-version-upgrades-for-amazon-aurora-mysql-with-minimum-downtime/)
- [Moving to Graviton2 for Amazon RDS and Amazon Aurora databases](https://aws.amazon.com/blogs/database/key-considerations-in-moving-to-graviton2-for-amazon-rds-and-amazon-aurora-databases/)
- [Amazon RDS 多可用区集群结合 Amazon RDS Proxy 实现小版本升级秒级切换 ](https://aws.amazon.com/cn/blogs/china/amazon-rds-multi-az-clusters-combined-with-amazon-rds-proxy-enable-minor-version-upgrades-in-seconds/)
#### RDS Security
- [Managing postgresql users and roles](https://aws.amazon.com/blogs/database/managing-postgresql-users-and-roles/)

- [best-practices-for-working-with-amazon-aurora-serverless](https://aws.amazon.com/blogs/database/best-practices-for-working-with-amazon-aurora-serverless/)

- [Securing sensitive data in Amazon RDS](https://aws.amazon.com/blogs/database/applying-best-practices-for-securing-sensitive-data-in-amazon-rds/)

- [MySQL validate_password plugin](database/rds/mysql/mysql_password_validation.md)

- [Encrypt the Unencrypted RDS](database/rds/PostgreSQL/unencrypted_db_to_encrypted.md)

- [Disable_RDS_encryption](database/rds/Disable_RDS_encryption.md)

- [RDS MySQL and Aurora MySQL Audit logs](https://aws.amazon.com/cn/blogs/database/configuring-an-audit-log-to-capture-database-activities-for-amazon-rds-for-mysql-and-amazon-aurora-with-mysql-compatibility/)

- [Connect to an Amazon RDS or Amazon Aurora instance using a federated user with AWS IAM Identity Center and IAM database authentication](https://aws.amazon.com/blogs/database/connect-to-an-amazon-rds-or-amazon-aurora-instance-using-a-federated-user-with-aws-iam-identity-center-and-iam-database-authentication/)

- [RDS PostgreSQL and Aurora PostgreSQL Audit](https://aws.amazon.com/premiumsupport/knowledge-center/rds-postgresql-pgaudit/) 
  - [pgaudit extention](https://docs.amazonaws.cn/en_us/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Extensions.html#Appendix.PostgreSQL.CommonDBATasks.pgaudit)
  
#### RDS Performance
- [Amazon Aurora Performance Assessment](https://d1.awsstatic.com/product-marketing/Aurora/RDS_Aurora_Performance_Assessment_Benchmarking_v1-2.pdf)
  - [Managing performance and scaling for Amazon Aurora MySQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Performance.html)
  - [Managing performance and scaling for Amazon Aurora PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.Managing.html)
  - ["Too Many Connections" error when connecting to my Amazon Aurora MySQL instance](https://aws.amazon.com/premiumsupport/knowledge-center/aurora-mysql-max-connection-errors/)
  
- [Automate benchmark tests for Amazon Aurora PostgreSQL](https://aws.amazon.com/blogs/database/automate-benchmark-tests-for-amazon-aurora-postgresql/)

- [benchmarking-read-write-speed-on-amazon-aurora-classic-rds-and-local-disk](https://medium.datadriveninvestor.com/benchmarking-read-write-speed-on-amazon-aurora-classic-rds-and-local-disk-29500d9210da)

-[Amazon Aurora 压力测试](https://aws.amazon.com/cn/blogs/china/aurora-test/)

- [Aurora MySQL enhanced binlog to reduces the performance overhead of enabling binlog down to 13%](https://aws.amazon.com/blogs/database/introducing-amazon-aurora-mysql-enhanced-binary-log-binlog/)

### Graph Database
- [Neo4j-On-AWS](database/neo4j/Neo4j-On-AWS.md)

- [How to use the Neptune to Build Your First Graph Application](database/Neptune/workshop101)

- [利用Neptune图数据库构建工厂知识图谱实践](https://aws.amazon.com/cn/blogs/china/the-practice-of-using-neptune-graph-database-to-construct-plant-knowledge-map/)
- [Diagram-as-code using generative AI to build a data model for Amazon Neptune](https://aws.amazon.com/blogs/database/diagram-as-code-using-generative-ai-to-build-a-data-model-for-amazon-neptune/)

### ElastiCache
- [Building a fast session store for your online applications with Amazon ElastiCache for Redis](database/redis/session_store)

- [Database Caching Strategies Using Redis](database/redis/Database_Caching_Strategies_Using_Redis.md)

- [使用Redisson连接Amazon ElastiCache for redis 集群](https://aws.amazon.com/cn/blogs/china/connecting-amazon-elasticache-for-redis-cluster-using-redisson/?nc1=h_ls)

- [ElastiCache for Redis 慢日志可视化平台](https://aws.amazon.com/cn/blogs/china/build-elasticache-for-redis-slow-log-visualization-platform/)

- [RedisInsight 官方可视化工具](https://mp.weixin.qq.com/s/DSRCdzFpzNoBSbp2pvm1SA)

- [Amazon ElastiCache for Redis 分层存储](https://mp.weixin.qq.com/s/k4yYb5DtVNIB3DY4iwaZkg)

### Key-Value and Document
#### DynamoDB
- [DynamoDB labs](database/dynamodb/dynamodb-lab.md)
  
- [Migration and Replication]
  - [如何将我的 DynamoDB 表从一个 AWS 账户迁移到另一个账户](https://aws.amazon.com/cn/premiumsupport/knowledge-center/dynamodb-cross-account-migration/)
  - [Streaming Amazon DynamoDB data into a centralized data lake](https://aws.amazon.com/id/blogs/big-data/streaming-amazon-dynamodb-data-into-a-centralized-data-lake/)
  - [中国区与 Global 区域 DynamoDB 表双向同步](https://aws.amazon.com/cn/blogs/china/one-bridge-fly-north-south-china-and-global-area-dynamodb-table-two-way-synchronization1/)
  - [aws-dynamodb-cross-region-replication](https://github.com/aws-samples/aws-dynamodb-cross-region-replication)
  - [DynamoDB table initial migration from global to China](https://github.com/yizhizoe/dynamodb-init-migration)
  - [使用 Lambda 订阅Amazon DynamoDB 变更数据，并传输到Amazon OpenSearch，实现全文检索](https://aws.amazon.com/cn/blogs/china/use-lambda-to-subscribe-to-amazon-dynamodb-change-data-and-transmit-it-to-amazon-opensearch/)
  - [Understanding Amazon DynamoDB latency](https://aws.amazon.com/cn/blogs/database/understanding-amazon-dynamodb-latency/)
  - [大规模 DynamoDB 表数据跨账号迁移指南](https://aws.amazon.com/cn/blogs/china/large-scale-dynamodb-table-data-cross-account-migration-guide/)

- [Security]
  - [Securing sensitive data in Amazon DynamoDB](https://aws.amazon.com/blogs/database/applying-best-practices-for-securing-sensitive-data-in-amazon-dynamodb/)

- [Performance]
  - [DynamoDB_Pagenation](database/dynamodb/DynamoDB_Pagenation.md)
  - [Understanding Amazon DynamoDB latency](https://aws.amazon.com/cn/blogs/database/understanding-amazon-dynamodb-latency/)

#### MongoDB and DocumentDB
- [Get-Start-DocumentDB](database/documentdb/Get-Start-DocumentDB.md)
  - [Program-with-DocumentDB](database/documentdb/Program-with-DocumentDB.md)

- [DocumentDB performance benchmark](https://www.mongodb.com/atlas-vs-amazon-documentdb/performance)

- [利用ChangeStream实现Amazon DocumentDB表级别容灾复制](https://mp.weixin.qq.com/s/B7UjLi7vAa8f8yzaAq71CQ)

- [Amazon DocumentDB（兼容 MongoDB）增加了对跨区域快照复制的支持](https://aws.amazon.com/cn/about-aws/whats-new/2020/07/amazon-documentdb-support-cross-region-snapshot-copy/)

- [带您玩转云原生文档数据库DocumentDB的地理空间](https://aws.amazon.com/cn/blogs/china/take-you-hand-in-hand-to-play-the-geographic-space-of-the-cloud-native-document-database-documentdb/)

- [Run full text search queries on Amazon DocumentDB](https://aws.amazon.com/blogs/database/run-full-text-search-queries-on-amazon-documentdb-data-with-amazon-elasticsearch-service/)

- [AWS 云上 MongoDB/DocumentDB 数据定期归档](https://aws.amazon.com/cn/blogs/china/regular-archiving-of-mongodb-documentdb-data-on-aws/)

### Time series
- [Amazon TimeStream Performance Testing](database/timestream/TimeStream-Performance-Testing.md)

## Container
### EKS
[Serverless or Kubernetes on AWS](https://aws.amazon.com/architecture/serverless/serverless-or-kubernetes/)
#### EKS networking
- [关于Amazon EKS中Service和Ingress深入分析和研究](https://aws.amazon.com/cn/blogs/china/in-depth-analysis-and-research-on-service-and-ingress-in-amazon-eks/)
- [Exposing Kubernetes Applications via service and ingress resource](https://aws.amazon.com/blogs/containers/exposing-kubernetes-applications-part-3-nginx-ingress-controller/)
- [How do I expose the Kubernetes services running on my Amazon EKS cluster](https://repost.aws/knowledge-center/eks-kubernetes-services-cluster)
- [Network load balancing on Amazon EKS instance and ip type](https://docs.aws.amazon.com/eks/latest/userguide/network-load-balancing.html)

- [一文看懂 Amazon EKS 中的网络规划](https://aws.amazon.com/cn/blogs/china/understand-the-network-planning-in-amazon-eks-in-one-article/)
  
- [How do I use multiple CIDR ranges with Amazon EKS]
    - [Check your VPC setting](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Subnets.html#vpc-resize)
    - [Add the additioal CIDR](https://aws.amazon.com/premiumsupport/knowledge-center/eks-multiple-cidr-ranges/)
    - [Amazon EKS now supports additional VPC CIDR blocks](https://aws.amazon.com/about-aws/whats-new/2018/10/amazon-eks-now-supports-additional-vpc-cidr-blocks/)
    - [EKS custom-networking optimizaiton](https://aws.github.io/aws-eks-best-practices/networking/ip-optimization-strategies/custom-networking.gif)
    - [EKS custom-networking](https://aws.github.io/aws-eks-best-practices/networking/custom-networking/)

- [Cluster networking for Amazon EKS worker nodes](https://aws.amazon.com/cn/blogs/containers/de-mystifying-cluster-networking-for-amazon-eks-worker-nodes/)

- [mutual TLS authentication for EKS Application](https://docs.aws.amazon.com/prescriptive-guidance/latest/patterns/configure-mutual-tls-authentication-for-applications-running-on-amazon-eks.html)

#### EKS practice
- [eks-workshop-greater-china](https://github.com/aws-samples/eks-workshop-greater-china)

- [EKS-Workshop-China](https://github.com/liangruibupt/EKS-Workshop-China)
  - [EKS in Beijing 3 AZ](container/EKS_in_Beijing_3AZ.md)

- [Advanced EKS workshop](https://github.com/pahud/amazon-eks-workshop)
  - [EKS Multi-Tatent](https://aws.amazon.com/cn/blogs/china/computing-resources-of-eks-multi-tenant-management/)
  - [GenAI on EKS using NVIDIA GPU workshop](https://catalog.workshops.aws/genai-on-eks/en-US)

- [EKS Best Practices Guides](https://aws.github.io/aws-eks-best-practices/)

- [Windows pod in EKS](container/Windows-pod-EKS.md)

- [Cell-Based Architecture for Amazon EKS](https://aws.amazon.com/solutions/guidance/cell-based-architecture-for-amazon-eks/)

- [EKS Managed Group]
  - [Overview](https://aws.amazon.com/blogs/containers/eks-managed-node-groups/)
  - [Quotas](https://docs.aws.amazon.com/eks/latest/userguide/service-quotas.html)
  - [Official doc](https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html)
  - [Cluster autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/autoscaling.html#cluster-autoscaler)
  Managed node groups are managed using Amazon EC2 Auto Scaling groups, and are compatible with the Cluster Autoscaler. You can deploy the Cluster Autoscaler to your Amazon EKS cluster and configure it to modify your Amazon EC2 Auto Scaling groups.
  - [Vertical Pod Autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/vertical-pod-autoscaler.html)
  - [Horizontal Pod Autoscaler](https://docs.aws.amazon.com/eks/latest/userguide/horizontal-pod-autoscaler.html)

#### DevOps on EKS
- [Install SSM Agent on Amazon EKS worker nodes by using Kubernetes DaemonSet](container/Install-SSM-Agent-on-EKS-Worker-Node.md)

- [How can I check, scale, delete, or drain my worker nodes on EKS](https://aws.amazon.com/premiumsupport/knowledge-center/eks-worker-node-actions/)
- [关于Amazon EKS基于Gitlab的CICD实践](https://aws.amazon.com/cn/blogs/china/about-amazon-eks-gitlab-based-cicd-practice-one-gitlab-deployment-and-configuration/)
- [DataDog for EKS control plane monitoring](https://docs.datadoghq.com/agent/kubernetes/control_plane/?tab=helm#EKS)
- [Exclusive Node from EKS ELB](container/Exclusive_Node_from_ELB.md)
- [Securing Kubernetes with Private CA](container/EKS-Certification.md)
- [Public container images mirror to China ECR solution](https://github.com/aws-samples/amazon-ecr-replication-for-pub-container-images)
- [Global to China 跨国企业 Kubernetes 应用跨境复制和部署方案](https://aws.amazon.com/cn/blogs/china/global-to-china-multinational-enterprise-kubernetes-application-cross-border-replication-and-deployment-solution/)
- [Application first delivery on Kubernetes with Open Application Model](https://aws.amazon.com/blogs/containers/application-first-delivery-on-kubernetes-with-open-application-model/)
- [Kubernetes Resource Model Operations on EKS](https://catalog.us-east-1.prod.workshops.aws/workshops/ccd3517b-74aa-4939-b161-40a889c3a5ec/en-US)

- ### EKS Performance
- [Karpenter]
  - [Karpenter 实践：一种多 EKS 集群下的 Spot 实例中断事件处理总线设计](https://aws.amazon.com/cn/blogs/china/karpenter-practice-multi-eks-cluster-spot-instance-interrupts-event-processing-bus/)
  - [Karpenter 实践：使用 Spot 实例进行成本优化](https://aws.amazon.com/cn/blogs/china/kubernetes-node-elastic-scaling-open-source-component-karpenter-practice-cost-optimization-using-spot-instance/)
  - [Karpenter 实践：部署GPU推理应用](https://aws.amazon.com/cn/blogs/china/kubernetes-node-elastic-scaling-open-source-component-karpenter-practice-deploying-gpu-inference-applications/)
  - [EKS with KEDA HPA & Karpenter cluster autoscaler](https://github.com/aws-samples/amazon-eks-scaling-with-keda-and-karpenter)
 - [Reduce container startup time on Amazon EKS with Bottlerocket data volume](https://aws.amazon.com/cn/blogs/containers/reduce-container-startup-time-on-amazon-eks-with-bottlerocket-data-volume/)
### ECS
- [ECS workshop for china region](https://github.com/liangruibupt/aws-ecs-workshop-gcr)

- [ECS quick start demo workshop](https://ecs-cats-dogs.workshop.aws/en/)

- [ECR Sync up from global from China and ECS Service Discovery](container/ECR-Sync-and-ECS-Service-Discovery.md)

- [How can I create an Application Load Balancer and then register Amazon ECS tasks automatically](container/ECS-Dynamic-Port-Mapping.md)

- [How can I a ECS service serve traffic from multiple port?](container/ECS-Dynamic-Port-Mapping.md)

- [How to launch tomcat server on ECS](container/tomcat)

- [graceful-shutdowns-with-ecs](https://aws.amazon.com/blogs/containers/graceful-shutdowns-with-ecs/)

- [Amazon ECS firelens]
    - [firelens examples](https://github.com/aws-samples/amazon-ecs-firelens-examples)
    - [firelens demo](container/ECS-FireLens.md)

- [amazon-ecr-cross-region-replication](https://github.com/aws-samples/amazon-ecr-cross-region-replication)
  
### Fargate
- [Recursive Scaling Fargate with Amazon SQS](https://aws.amazon.com/blogs/architecture/design-pattern-for-highly-parallel-compute-recursive-scaling-with-amazon-sqs/)

- [aws-fargate-fast-autoscaler](aws-samples/aws-fargate-fast-autoscaler)

- [EKS on Fargate QuickStart](container/EKSonFargate-QuickStart.md)

- [Run Selenium tests at scale using AWS Fargate](https://aws.amazon.com/cn/blogs/opensource/run-selenium-tests-at-scale-using-aws-fargate/)

### Istio, Envoy, App Mesh, Service discovery
- [AWS App Mesh Workshop](https://www.appmeshworkshop.com/introduction/what_is_appmesh/)

- [AWS App Mesh ingress and route enhancements](https://aws.amazon.com/blogs/containers/app-mesh-ingress-route-enhancements/)

- [Running microservices in Amazon EKS with AWS App Mesh and Kong](https://aws.amazon.com/blogs/containers/running-microservices-in-amazon-eks-with-aws-app-mesh-and-kong/)

- [EKS and CloudMap]
    - [Introducing AWS Cloud Map MCS Controller for K8s](https://aws.amazon.com/blogs/opensource/introducing-the-aws-cloud-map-multicluster-service-controller-for-k8s-for-kubernetes-multicluster-service-discovery/)
    - [Cross Amazon EKS cluster App Mesh using AWS Cloud Map](https://aws.amazon.com/cn/blogs/containers/cross-amazon-eks-cluster-app-mesh-using-aws-cloud-map/)
    - [Cloud Map for serverless applications](https://aws.amazon.com/blogs/opensource/aws-cloud-map-service-discovery-serverless-applications/)

### ECR
- [ecr-cross-region-replication](https://github.com/aws-samples/amazon-ecr-cross-region-replication)

- [ECR Sync up from global from China and ECS Service Discovery](container/ECR-Sync-and-ECS-Service-Discovery.md)
- 
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
  - [Landing Zone plus - Cloud Foundations](https://aws.amazon.com/cn/blogs/china/fast-build-a-secure-compliant-and-well-architected-multi-account-organization-in-cloud-environment/)
  - [ Deploy a multi-account cloud foundation to support highly-regulated workloads and complex compliance requirements](https://github.com/awslabs/landing-zone-accelerator-on-aws)
  - [Cloud Foundation Whitepaper](https://docs.aws.amazon.com/whitepapers/latest/establishing-your-cloud-foundation-on-aws/capabilities.html)


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
    - [一键部署Telegram 告警](https://github.com/Chris-wa-He/AWS-Lambda-notifier/tree/Telegram-notifier)

- [Monitor using Prometheus and Grafana](https://www.eksworkshop.com/intermediate/240_monitoring/) Here is how to deploy Grafana on EKS
- [Set up cross-region metrics collection for Amazon Managed Service for Prometheus workspaces](https://aws.amazon.com/blogs/opensource/set-up-cross-region-metrics-collection-for-amazon-managed-service-for-prometheus-workspaces/)
- [Create cross-account, custom Amazon Managed Grafana dashboards for Amazon Redshift](https://aws.amazon.com/blogs/big-data/create-cross-account-custom-amazon-managed-grafana-dashboards-for-amazon-redshift/)

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

- [Collecting AWS networking information in large multi-account environments](https://aws.amazon.com/blogs/networking-and-content-delivery/collecting-aws-networking-information-in-large-multi-account-environments/)
- [Find Public IPs of Resources – Use AWS Config for Vulnerability Assessment](https://aws.amazon.com/blogs/architecture/find-public-ips-of-resources-use-aws-config-for-vulnerability-assessment/)
- [service-screener - evaluate their AWS service configurations](https://github.com/aws-samples/service-screener-v2)
  
### Developer
- [CSV tools](https://github.com/secretGeek/AwesomeCSV)

- [Python GUI lib](https://mp.weixin.qq.com/s/sqXCSgrMMcXCA1lxbAucsA)

### Infra as Code

- [How to migrate global cloudformation to China reigon?](xaas/Global-Cloudformation-Migrate-to-China.md)

- [Terraform_Demo](devops/terraform/Terraform_Demo.md)

- [CloudFormation Stack Set](devops/cloudformation/Stackset.md)

- [AWS Cloud Control API QuickStart](xaas/CloudControlAPI.md)

- [Terraform Init 加速方案配置](https://help.aliyun.com/zh/terraform/terraform-init-acceleration-solution-configuration)

## Integration
### Quque, notification
- [How to build Amazon SNS HTTP Subscription?](integration/SNS/SNS-HTTP-Subscription.md)
- [SNS Basic Example](integration/SNS/SNS_basic_usage.md)

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

- [Unreal Engine 像素流送在g4dn上实现容器化部署实践](https://aws.amazon.com/cn/blogs/china/practice-of-container-deployment-of-unreal-engine-pixel-streaming-on-g4dn-i/)

## Mobile
### Moible app development
- [Tutorial: Intro to React – React](https://reactjs.org/tutorial/tutorial.html)
- [在中国区 AWS 上使用 Amplify 开发离线应用的使用心得](https://aws.amazon.com/cn/blogs/china/experience-in-using-amplify-developing-offline-applications-on-aws-in-china/)

### GraphQL - AppSync
- [AppSync-Workshop](database/appsync/AppSync-Workshop.md)

## Business continuity
### Backup
- [Backup FAQ](dr_ha/backup/Backup_FAQ.md)

### DR
- [Understand resiliency patterns and trade-offs to architect efficiently in the cloud](https://aws.amazon.com/cn/blogs/architecture/understand-resiliency-patterns-and-trade-offs-to-architect-efficiently-in-the-cloud/)
- [AWS Fault Isolation Boundaries](https://docs.aws.amazon.com/whitepapers/latest/aws-fault-isolation-boundaries/aws-service-types.html)

- [Building a disaster recovery site on AWS for workloads on Google Cloud]
  - [Part 1](https://aws.amazon.com/blogs/storage/building-a-disaster-recovery-site-on-aws-for-workloads-on-google-cloud-part-1/)
  - [Part 2](https://aws.amazon.com/blogs/storage/building-a-disaster-recovery-site-on-aws-for-workloads-on-google-cloud-part-2/)

- [resiliency-analyser](https://github.com/aws-samples/resiliency-analyser)
- [ec2-reachability](http://ec2-reachability.amazonaws.com/)

- [Reducing the Scope of Impact with Cell-Based Architecture](https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html)
- [依托亚马逊云科技构建韧性应用](https://aws.amazon.com/cn/blogs/china/build-resilient-applications-with-aws/)

#### RDS HA/DR
- [Amazon RDS Under the Hood: Multi-AZ](database/rds/mysql/Amazon-RDS-Multi-AZ-Under-the-Hood.md)

- - [使用 Amazon RDS for Oracle 配合 Oracle Active Data Guard 建立托管的灾难恢复与只读副本](https://aws.amazon.com/cn/blogs/china/managed-disaster-recovery-and-managed-reader-farm-with-amazon-rds/)

- [RDS MySQL Automated frequency backup](https://aws.amazon.com/premiumsupport/knowledge-center/rds-mysql-automated-backups/)
  
### Resilience
- [Verify the resilience of your workloads using Chaos Engineering](https://aws.amazon.com/cn/blogs/architecture/verify-the-resilience-of-your-workloads-using-chaos-engineering/)
- 

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


## Metaverse
- [possibilities-of-healthcare-in-the-metaverse](https://www.forbes.com/sites/bernardmarr/2022/02/23/the-amazing-possibilities-of-healthcare-in-the-metaverse/?sh=25555f319e5c)
- [life-sciences-in-the-metaverse](https://www.jdsupra.com/legalnews/life-sciences-in-the-metaverse-a-new-7682087/)


## Automotive
- [Software Define Vechile - SDV]
  - [soafee aws iotfleetwise demo](https://github.com/aws-samples/demo-soafee-aws-iotfleetwise)
  - [在AWS上构建基于SOAFEE的云原生软件定义汽车实践](https://aws.amazon.com/cn/blogs/china/build-cloud-native-software-based-on-soafee-on-aws-to-define-automobile-practice/)
  - [A Cloud-Native Environment for Distributed Automotive Software Development](https://aws.amazon.com/cn/blogs/industries/a-cloud-native-environment-for-distributed-automotive-software-development/)
  - [Simulating Automotive E/E Architectures in AWS – Part 1: Accelerating the V-Model](https://aws.amazon.com/blogs/industries/simulating-automotive-e-e-architectures-in-aws-part-1-accelerating-the-v-model/)
  - [Simulating Automotive E/E Architectures in AWS Part 2: Solution in Action](https://aws.amazon.com/blogs/industries/simulating-automotive-e-e-architectures-in-aws-part-2-solution-in-action/)
  - [Automotive Demo Lab](https://w.amazon.com/bin/view/AWS_WWSO/IST/Innovation_Prototyping_Lab_SJC25/about/demonstrators)
  - [揭秘安卓 AOSP 系统构建提速 50%](https://developer.volcengine.com/articles/7343872243241320475)
  - [车载以太网为什么要用SOME/IP？](https://mp.weixin.qq.com/s/m6kEXCkWpHnKq4hU51kNqQ)
  - [How BMW uses AWS to scale and automate SDV with virtual ECUs](https://aws.amazon.com/blogs/industries/how-bmw-uses-aws-to-scale-and-automate-sdv-with-virtual-ecus/)
  - [The AWS Architecture Behind BMW Operating System 9: How the Cloud Supports the Latest in Customized In-Car Connectivity](https://aws.amazon.com/solutions/case-studies/bmw-software-defined-vehicles/)
  - [AWS and Qualcomm Software-Defined Vehicle demonstrator for Cloud-Native Snapdragon Digital Chassis development](https://aws.amazon.com/cn/blogs/industries/aws-and-qualcomm-software-defined-vehicle-demonstrator-for-cloud-native-snapdragon-digital-chassis-development/)
  
- [Autonomous Driving]
  - [ADDF is a collection of modules, deployed using the SeedFarmer orchestration tool. ADDF modules enable users to quickly bootstrap environments](https://github.com/awslabs/autonomous-driving-data-framework)
  - [Develop and deploy a customized workflow using Autonomous Driving Data Framework (ADDF) on AWS](https://aws.amazon.com/blogs/industries/develop-and-deploy-a-customized-workflow-using-autonomous-driving-data-framework-addf-on-aws/)
  - [详解智能驾驶的功能与场景体系](https://mp.weixin.qq.com/s/GRB0YT1WDUuLL4b6Tfslrw)
  - [Deploy and Visualize ROS Bag Data on AWS](https://aws.amazon.com/blogs/architecture/field-notes-deploy-and-visualize-ros-bag-data-on-aws-using-rviz-and-webviz-for-autonomous-driving/)
    - [Scene Intelligence with Rosbag on AWS](https://aws.amazon.com/solutions/implementations/scene-intelligence-with-rosbag-on-aws/)
    - [Autonomous Driving Data Service with Rosbag on EKS](https://github.com/aws-samples/amazon-eks-autonomous-driving-data-service)
  - [在中国区部署 SIMPHERA Architecture](https://aws.amazon.com/cn/blogs/china/deploying-simphera-architecture-in-china/)
  - [理想汽车过去一年发表的16篇智驾及AI应用相关论文](https://mp.weixin.qq.com/s/3rkJpmbOsknIrgl6dKlwJw)
  - [Accelerating AI/ML development at BMW Group with Amazon SageMaker Studio](https://aws.amazon.com/cn/blogs/machine-learning/accelerating-ai-ml-development-at-bmw-group-with-amazon-sagemaker-studio/)

- [Vechile Data Plantform - VDP]
  - [BMW Cloud Data Hub: A reference implementation of the modern data architecture on AWS](https://aws.amazon.com/blogs/industries/bmw-cloud-data-hub-a-reference-implementation-of-the-modern-data-architecture-on-aws/)
  - [Advanced Vechile Data Plantform - VDP with Kafka, Redshift, Flink](https://aws.amazon.com/cn/blogs/china/build-a-reliable-data-governance-model-based-on-aws-data-analysis-services/)

- [Connected Mobility Services - CMS]
  - [一图读懂强制性国家标准GB 44495—2024《汽车整车信息安全技术要求》](https://www.miit.gov.cn/jgsj/zbys/qcgy/art/2024/art_f54547486cf94a34934802668e8f5e3f.html)
  - [Designing Next Generation Vehicle Communication with AWS IoT Core and MQTT](https://docs.aws.amazon.com/whitepapers/latest/designing-next-generation-vehicle-communication-aws-iot/designing-next-generation-vehicle-communication-aws-iot.html)
  - [GSMA’s SAS-SM](https://aws.amazon.com/blogs/industries/implementing-a-gsma-compliant-remote-sim-provisioning-workload-on-aws/)
  - [AutoMQ integraion with S3 Tables and Iceberg](https://github.com/AutoMQ/automq/wiki/Introducing-AutoMQ-Table-Topic:-Seamless-Integration-with-S3-Tables-and-Iceberg)
  - [BMW Connected Drive Migration Case](https://aws.amazon.com/solutions/case-studies/bmw-group-migration/)

- [Smart Cockpit]
  - [Building the Future of In-Vehicle Experiences with AWS Generative AI Solutions: A Strategic Overview](https://aws.amazon.com/blogs/industries/building-the-future-of-in-vehicle-experiences-with-aws-generative-ai-solutions/)
  - [Small Language Model on vehicle](https://aws.amazon.com/blogs/industries/software-defined-vehicles-genai-iot-the-path-to-ai-defined-vehicles/)

## HealthCare and Life Science
  - [Solutions for Healthcare, Life Sciences, and Genomics](https://aws.amazon.com/solutions/health/?nc=sn&loc=1&dn=he)
    
  - [High-throughput Modeling & Screening]
    - [Protein Folding and Design]
      - [AWS Batch Architecture for Protein Folding and Design](https://github.com/aws-solutions-library-samples/aws-batch-arch-for-protein-folding)
      - [基于 Alphafold2 一键构建云上高可用蛋白质结构预测平台](https://aws.amazon.com/cn/blogs/china/one-click-construction-of-a-highly-available-protein-structure-prediction-platform-on-the-cloud-part-one/)
      - [ESM3 - flagship multimodal protein generative model; ESM C - best protein representation learning model](https://github.com/evolutionaryscale/esm)
    - [Drug Discovery Workflows]
      - [AWS HealthOmics - End to End workshop](hcls/amazon_omics/amazon-omics-workshop.md)
      - [Drug Discovery Workflows for AWS HealthOmics](https://github.com/aws-samples/drug-discovery-workflows)
      - [Migration & Storage of Sequence Data with AWS HealthOmics](https://aws.amazon.com/solutions/guidance/migration-and-storage-of-sequence-data-with-aws-healthomics/)
    - [Statistical Compute Environment using R]
      - [Deploying a Statistical Compute Environment using R on Amazon EKS](https://aws.amazon.com/blogs/industries/deploying-a-statistical-compute-environment-using-r-on-amazon-eks/)
  - [Data Analysis]
    - [R&D data lake]
      - [Build a genomics data lake on AWS using Amazon EMR](https://aws.amazon.com/cn/blogs/industries/build-a-genomics-data-lake-on-aws-using-amazon-emr-part-1/)
    - [Commerical Data lake]
  - [GenAI in Life Sciences]
    - [Empowering biomedical discovery with AI agents](https://www.cell.com/cell/fulltext/S0092-8674(24)01070-5)
    - [Healthcare and Life Sciences Agent Catalog](http://hcls-agents-catalog-ui-app-blue-1955574525.us-west-2.elb.amazonaws.com/)
    - [Life Sciences Innovation with Agentic AI](https://aws.amazon.com/blogs/industries/accelerating-life-sciences-innovation-with-agentic-ai-on-aws/)
  - [LS and HC Compliance]
    - [Open source PACS (picture archiving and communication system) solution - part1](https://aws.amazon.com/cn/blogs/opensource/running-dicoogle-an-open-source-pacs-solution-on-aws-part-1/)
    - [Open source PACS (picture archiving and communication system) solution - part2](https://aws.amazon.com/blogs/opensource/running-dicoogle-an-open-source-pacs-solution-on-aws-part-2/)