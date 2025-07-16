# Technology Stack

## Primary Technologies
- **Python**: Main scripting language for AWS automation and data processing
- **Bash/Shell**: Infrastructure automation and deployment scripts
- **Jupyter Notebooks**: Interactive data analysis and ML experimentation
- **CloudFormation/YAML**: Infrastructure as Code templates
- **Markdown**: Documentation format

## AWS Services Coverage
- **Compute**: EC2, Lambda, ECS, EKS, Fargate
- **AI/ML**: SageMaker, Bedrock, Comprehend, Rekognition
- **Analytics**: Athena, Glue, EMR, Kinesis, Redshift, OpenSearch
- **Storage**: S3, EBS, EFS, FSx
- **Database**: RDS, DynamoDB, DocumentDB, Neptune, Timestream
- **Networking**: VPC, ALB/NLB, Route 53, CloudFront, Direct Connect
- **Security**: IAM, KMS, Secrets Manager, GuardDuty, WAF
- **DevOps**: CodeCommit, CodeBuild, CodePipeline, CloudWatch, X-Ray

## Development Patterns
- **Boto3**: AWS SDK for Python automation scripts
- **AWS CLI**: Command-line operations and scripting
- **SAM/CDK**: Serverless application development
- **Docker**: Containerized applications and services
- **Infrastructure as Code**: CloudFormation templates for reproducible deployments

## Common Commands
```bash
# AWS CLI profile setup for China regions
aws configure --profile china_region

# Python virtual environment setup
python3 -m venv venv
source venv/bin/activate
pip install boto3 pandas jupyter

# Jupyter notebook server
jupyter notebook --ip=0.0.0.0 --port=8888

# CloudFormation deployment
aws cloudformation deploy --template-file template.yaml --stack-name my-stack

# Docker build and push to ECR
docker build -t my-app .
aws ecr get-login-password | docker login --username AWS --password-stdin
docker push my-app
```

## Regional Considerations
- Examples include both AWS Global and AWS China region configurations
- Profile-based AWS CLI setup for multi-region development
- Region-specific service endpoints and limitations documented