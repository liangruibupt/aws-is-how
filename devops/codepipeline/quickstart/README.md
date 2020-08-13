# Quick start

## Two-stage pipeline

- A source stage: detects changes in the versioned sample application stored in the S3 bucket and pulls those changes into the pipeline.
- A Deploy stage that deploys those changes to EC2 instances with CodeDeploy.

### How to build it?

1. Create a S3 bucket `ray-awscodepipeline-demobucket` and enable the versioning

2. Upload the [sample application](https://docs.aws.amazon.com/codepipeline/latest/userguide/samples/SampleApp_Linux.zip) and upload to S3 bucket

```
aws s3 cp SampleApp_Linux.zip s3://ray-awscodepipeline-demobucket/source/SampleApp_Linux.zip --region ap-southeast-1 --profile global
```

3. Create an instance role for EC2 `ec2-codeX-instance-profile` with permission `AmazonEC2RoleforAWSCodeDeploy`
 
4. Create 2 EC2 Linux instances and install the CodeDeploy agent: 

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

- Tag: Name:MyCodePipelineDemo
- Security Group: 80, 443, 22

Create other EC2 instance, but with Tag: Name:MyCodePipelineDemoProduction

5. Create an application `MyDemoApplication` in CodeDeploy
- Choose EC2/On-premises as Compute Platform

6. Create Deployment group `MyDemoDeploymentGroup`
- MyCodeDeployRole as Service Role, follow the guide [create-service-role-for-codedeploy](https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-service-role.html)
- Deployment type: In-place
- Environment configuration, choose Amazon EC2 Instances with tag `MyCodePipelineDemo`
- Deployment configuration, choose `CodeDeployDefault.OneAtaTime`

7. Create two-stage pipeline in CodePipeline
- pipeline name: `two-stage-pipeline`
- Source: Provider: `S3`, Bucket: `ray-awscodepipeline-demobucket`, Object Key: `source/SampleApp_Linux.zip`
- Skip build stage
- Deploy provider: AWS CodeDeploy in the same region, Application name: `MyDemoApplication`, Deployment group: `MyDemoDeploymentGroup`

8. Verify your pipeline ran successfully and access the Public DNS of your EC2 instances in your browser to view the index page for the sample application

### Extension - Update the `two-stage-pipeline` to staging deployment and production deployment
1. Create a second deployment group in CodeDeploy for `MyDemoApplication` Application
- name: `CodePipelineProductionFleet`
- Others setting follow up the first deployment group but specify the EC2 instance with tag Name:MyCodePipelineDemoProduction

2. Add the deployment group `CodePipelineProductionFleet` as third stage in your pipeline
- Add stage immediately after the Deploy stage with name `Production`
- Add action group with name `Deploy-Production`, Action provider as AWS CodeDeploy
- Input artifacts: `SourceArtifact`, Application name: `MyDemoApplication`, Deployment group: `CodePipelineProductionFleet`. Choose Save.

3. Modify the code
```bash
unzip SampleApp_Linux.zip -d SampleApp_Linux
Modify the index.html
zip -r SampleApp_Linux.zip SampleApp_Linux
aws s3 cp SampleApp_Linux.zip s3://ray-awscodepipeline-demobucket/source/SampleApp_Linux.zip --region ap-southeast-1 --profile global
```

3. Trigger the new pipeline
The pipeline should triggered automatically by S3 upload new version source package. Otherwise, you can use the below command to trigger the code.
```bash
aws codepipeline start-pipeline-execution --name two-stage-pipeline --region ap-southeast-1 --profile global
```

## Two-stage pipeline with CodeCommit as Source Repository
1. Create CodeCommit Repository with name `MyDemoRepo`
2. Clone the CodeCommit Repository

```bash
git clone ssh://git-codecommit.ap-southeast-1.amazonaws.com/v1/repos/MyDemoRepo
cd SampleApp_Linux/
mv * ~/MyDemoRepo/
cd ~/MyDemoRepo/

tree
.
├── appspec.yml
├── index.html
├── LICENSE.txt
└── scripts
    ├── install_dependencies
    ├── start_server
    └── stop_server

1 directory, 6 files

git add -A
git commit -m "Add sample application files"
git push
```

3. Modify the `two-stage-pipeline` Pipeline
- Modify the Source stage. Source provider: `AWS CodeCommit`, Repository name: `MyDemoRepo`, Branch name: master.
- Modify the source code index.html
```html
<head>
  <meta charset="utf-8">
  <title>Sample Deployment</title>
  <style>
    body {
      color: #000000;
      background-color: #CCFFCC;
      font-family: Arial, sans-serif;
      font-size: 14px;
    }
    
    h1 {
      font-size: 250%;
      font-weight: normal;
      margin-bottom: 0;
    }
    
    h2 {
      font-size: 175%;
      font-weight: normal;
      margin-bottom: 0;
    }
  </style>
</head>
<body>
  <div align="center">
    <h1>Congratulations</h1>
    <div align="center"><h2>This application was updated using CodePipeline, CodeCommit, and CodeDeploy.</h2></div>
    <div align="center">
      <p>Learn more:</p> 
      <p><a href="https://docs.aws.amazon.com/codepipeline/latest/userguide/">CodePipeline User Guide</a></p>
      <p><a href="https://docs.aws.amazon.com/codecommit/latest/userguide/">CodeCommit User Guide</a></p>
      <p><a href="https://docs.aws.amazon.com/codedeploy/latest/userguide/">CodeDeploy User Guide</a></p>
    </div>
  </div>
</body>
```

```bash
git commit -am "Updated sample application files"
git push
```

4. Verify your pipeline ran successfully and access the Public DNS of your EC2 instances in your browser to view the index page for the sample application