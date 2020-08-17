# Add a Cross-Region action in CodePipeline

Reuse the [CodePiple with CodeCommit and CodeDeploy](/aws-is-how/devops/codepipeline/quickstart/) pipeline and add a cross-Region action to a pipeline stage

# Pipeline and Deployment target in different Global regions

![Pipeline and Deployment target in different Global regions](media/cross-region1.png)

## Prepare the EC2 instance in new region - Tokyo Region
- Region: ap-northeast-1 Tokyo Region
- AMI: Amazon Linux 2 AMI (HVM), SSD Volume Type
- instance type: t2.micro
- IAM Role: ec2-codeX-instance-profile,
- User data: 
 
```bash
#!/bin/bash
yum -y update
yum install -y ruby
yum install -y aws-cli
cd /home/ec2-user
aws s3 cp s3://aws-codedeploy-us-east-2/latest/install . --region us-east-2
chmod +x ./install
./install auto
```

- Tag: Name:MyCodePipelineDemoProduction
- Security Group: 80, 443, 22

## Add CodeDeploy Project in Tokyo region
1. Create an application `MyDemoApplication` in CodeDeploy
- Choose EC2/On-premises as Compute Platform

2. Create Deployment group `MyDemoDeploymentGroup-Tokyo`
- MyCodeDeployRole as Service Role, follow the guide [create-service-role-for-codedeploy](https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-service-role.html)
- Deployment type: In-place
- Environment configuration, choose Amazon EC2 Instances with tag `MyCodePipelineDemoProduction`
- Deployment configuration, choose `CodeDeployDefault.OneAtaTime`

## Add a cross-Region action to a pipeline stage
1. Add a cross-Region stage
- Add stage immediately after the Deploy stage with name `Cross-Region`
- Add action group with name `Deploy-Tokyo-Region`, Action provider as AWS CodeDeploy, Region as `Tokyo`
- Input artifacts: `SourceArtifact`, Application name: `MyDemoApplication`, Deployment group: `MyDemoDeploymentGroup-Tokyo`. Choose Save.

2. Trigger the new pipeline
```bash
aws codepipeline start-pipeline-execution --name two-stage-pipeline --region ap-southeast-1 --profile global
```

3. Verify your pipeline ran successfully and access the Public DNS of Tokyo region EC2 instances in your browser to view the index page for the sample application


# Pipeline in Global region and Deployment target in China region

![Pipeline in Global region and Deployment target in China region](media/cross-region2.png)


# Pipeline and Deployment target in China region

Here use the Jenkins to create the whole CI/CD pipeline

![Pipeline and Deployment target in China region](media/china-region1.png)