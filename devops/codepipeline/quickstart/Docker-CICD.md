# Create a pipeline with an Amazon ECR source and ECS-to-CodeDeploy deployment

## Step 1: Create image and push to an Amazon ECR repository
```bash
docker pull nginx
docker images
aws ecr create-repository --repository-name nginx --region ap-southeast-1 --profile global

docker tag nginx:latest aws_account_id.dkr.ecr.ap-southeast-1.amazonaws.com/nginx:latest
aws ecr get-login-password --region ap-southeast-1 --profile global | docker login --username AWS --password-stdin aws_account_id.dkr.ecr.ap-southeast-1.amazonaws.com/nginx
docker push aws_account_id.dkr.ecr.ap-southeast-1.amazonaws.com/nginx:latest
```

Step 2: Create task definition and AppSpec source files and push to a CodeCommit repository
1. Replace the <IMAGE1_NAME> placeholder to `nginx` in taskdef.json

```
aws ecs register-task-definition --cli-input-json file://taskdef.json --region ap-southeast-1 --profile global
```

2. After the task definition is registered, edit your file to replace the `nginx` back to `<IMAGE1_NAME>` placeholder text in the image field.

3. To create an AppSpec file appspec.yaml

## Step 3: Create ECS resources

1. Create your Application Load Balancer and target groups
2. Create your Amazon ECS cluster and service
```
aws ecs create-service --service-name my-service --cli-input-json file://create-service.json --region ap-southeast-1 --profile global
aws ecs describe-services --cluster ecs-demo --services my-service --region ap-southeast-1 --profile global
```

## Step 4: Create your CodeDeploy application and deployment group

1. Create Application: `MyECSDemoApplication` with ECS compute platform
2. Create a CodeDeploy deployment group
- Name: ecs-deployment
- Service Role: MyCodeDeployRole
- ECS cluster: ecs-demo
- ECS service name: my-service
- LoadBalancer: ecs-demo-alb, production listener port: 80, test listener port: 8080, TargetGroup 1: ecs-demo-alb-blue-tg (for 80), TargetGroup 2: ecs-demo-alb-gree-tg (for 8080) 
- Choose Reroute traffic immediately

## Step 5: Create your pipeline
- pipeline name: `ECS-pipeline`
- Source Stage: Provider: `CodeCommit`, Repository: `MyECSDemo`, Branch: `master`
- Skip build stage
- Deploy stage
  - Deployment provider, choose Amazon ECS (Blue/Green)
  - Cluster name: ECSDemo
  - Service name: nginx-service
- Deploy stage action
  - action name: ECSBlueGreenDeploy
  - action provider: Amazon ECS (Blue/Green)
  - Input artifacts: SourceArtifact
  - AWS CodeDeploy application name: MyECSDemoApplication
  - AWS CodeDeploy deployment group: ecs-deployment
  - Amazon ECS task definition: SourceArtifact - taskdef.json
  - AWS CodeDeploy AppSpec file: SourceArtifact - appspec.yaml
- Add an Amazon ECR source action to your pipeline Source Stage
  - Name: MyNginxImage
  - Provider: `ECR`, Repository: `nginx`
  - Output artifacts: `MyNginxImage`
- Wire your source artifacts to the deploy action 
  - Edit ECSBlueGreenDeploy action
  - Add new Input artifacts: ECRImage
  - Dynamically update task definition image
    - Input artifact with image details: MyNginxImage
    - Placeholder text in the task definition: IMAGE1_NAME

## Step 6: Verify your pipeline ran successfully
1. Verify your pipeline ran successfully
2. Access the Public DNS of your ALB in your browser to view sample ECS application (for both 80 and 8080)


## Step 7: Add a Build Specification File to Your Source Repository
1. Create CodeCommit Repository with name `MyECSDemo`
2. Checkin the buildspec.yml
```
git clone ssh://git-codecommit.ap-southeast-1.amazonaws.com/v1/repos/MyECSDemo
git add .
git commit -m "Adding container build specification."
git push
```

## Step 8: Creating ECS resources
1. Create the Task Definition for `hello-world` with hello-world ECR image and map to 9080 port
```bash
aws ecr create-repository --repository-name hello-world --region ap-southeast-1 --profile global
cd webpage-demo
docker build . -t hello-world:latest
docker tag hello-world:latest aws_account_id.dkr.ecr.ap-southeast-1.amazonaws.com/hello-world:latest
aws ecr get-login-password --region ap-southeast-1 --profile global | docker login --username AWS --password-stdin aws_account_id.dkr.ecr.ap-southeast-1.amazonaws.com/hello-world
docker push aws_account_id.dkr.ecr.ap-southeast-1.amazonaws.com/hello-world:latest
```

2. Create the Service hello-world under ecs-demo Cluster
```bash
aws ecs create-service --service-name hello-world --cli-input-json file://create-service-hello-world.json --region ap-southeast-1 --profile global
aws ecs describe-services --cluster ecs-demo --services my-service --region ap-southeast-1 --profile global
```

## Step 8: Creating the Continuous Deployment Pipeline
- pipeline name: `ECS-pipeline`
- Source: Provider: `CodeCommit`, Repository: `MyECSDemo`, Branch: `master`
- Skip build stage
- Build stage page, for Build provider choose AWS CodeBuild, and then choose Create project.
  - Project name: ECS-Nginx
  - Environment image, choose Managed image.
  - Operating system, choose Amazon Linux 2.
  - Runtime(s), choose Standard.
  - Image, choose aws/codebuild/amazonlinux2-x86_64-standard:3.0.
  - Image version and Environment type, use the default values.
  - Privileged: Select Enable this flag if you want to build Docker images or want your builds to get elevated privileges.
  - Service Role: MyCodeBuildRole (with AmazonEC2ContainerRegistryPowerUser permission)
  - Builspec: Using the buildspec.yml in the `webpage-demo` directory
  - CloudWatch logs: /aws/codebuild/codebuilddemo
  - Build type: Single build
- Deploy stage
  - Deployment provider, choose Amazon ECS.
  - Cluster name: ecs-demo
  - Service name: hello-world

## Step 9: Verify your pipeline ran successfully
1. Verify your pipeline ran successfully
2. Access the Public DNS of your ALB in your browser to view sample ECS application (9080)

## TroubleShooting: 
[Cannot connect to the Docker daemon](https://github.com/aws/aws-codebuild-docker-images/issues/164)

