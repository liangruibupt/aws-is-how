# AWS Cloud Control API

## What is AWS Cloud Control API?
Use AWS Cloud Control API to create, read, update, delete, and list (CRUD-L) your cloud resources that belong to a wide range of services – both AWS and third-party. With the Cloud Control API standardized set of application programming interfaces (APIs), you can perform CRUD-L operations on any supported resources in your AWS account. Using Cloud Control API, you won't have to generate code or scripts specific to each individual service responsible for those resources.

## Sample
1. Step 1: Create a resource
```bash
aws cloudcontrol create-resource --type-name AWS::Logs::LogGroup --desired-state "{\"LogGroupName\": \"CloudControlExample\",\"RetentionInDays\":7}" --region cn-north-1 --profile china_ruiliang

aws cloudcontrol create-resource \
    --type-name AWS::Kinesis::Stream \
    --desired-state "{\"Name\": \"ResourceExample\",\"RetentionPeriodHours\":168, \"ShardCount\":3}" \
    --region cn-north-1 --profile china_ruiliang

aws cloudcontrol create-resource \
    --type-name AWS::EC2::Instance \
    --desired-state "{\"ImageId\": \"ami-0115328d80e51324e\"}" \
    --region cn-north-1 --profile china_ruiliang
```
**NOTE
Until 2022-06-10 EC2 has not been supported, please monitor the AWS announcement
An error occurred (UnsupportedActionException) when calling the CreateResource operation: The resource AWS::EC2::Instance is not yet supported via Cloud Control API**


1. Check the creation status
```bash
aws cloudcontrol get-resource-request-status --request-token f6d766c5-dd85-418d-b478-e8f8d2d74ffe \
--region cn-north-1 --profile china_ruiliang
```

3. Step 2: Read (describe) a resource
```bash
aws cloudcontrol get-resource --type-name AWS::Logs::LogGroup --identifier CloudControlExample \
--region cn-north-1 --profile china_ruiliang
```

4. Step 3: Update a resource
```bash
aws cloudcontrol update-resource --type-name AWS::Logs::LogGroup --identifier CloudControlExample --patch-document "[{\"op\":\"replace\",\"path\":\"/RetentionInDays\",\"value\":14}]" \
--region cn-north-1 --profile china_ruiliang

aws cloudcontrol get-resource-request-status --request-token 03eb7af4-d264-48da-93a3-9ef64c743812 \
--region cn-north-1 --profile china_ruiliang
```

5. Step 4: List all resources of a certain type
```bash
aws cloudcontrol list-resources --type-name AWS::Logs::LogGroup \
--region cn-north-1 --profile china_ruiliang

aws cloudcontrol list-resources --type-name AWS::Kinesis::Stream \
--region cn-north-1 --profile china_ruiliang
```

6. Step 5: Delete a resource
```bash
aws cloudcontrol delete-resource --type-name AWS::Logs::LogGroup --identifier CloudControlExample \
--region cn-north-1 --profile china_ruiliang
aws cloudcontrol get-resource-request-status --request-token bdbbbf22-c9d3-42f0-9138-994c1a34c65d \
--region cn-north-1 --profile china_ruiliang

aws cloudcontrol delete-resource --type-name AWS::Kinesis::Stream --identifier ResourceExample \
--region cn-north-1 --profile china_ruiliang
aws cloudcontrol get-resource-request-status --request-token b07312fb-3818-4bb4-b3ba-db8a5f63f08b \
--region cn-north-1 --profile china_ruiliang
```

## Supported resource type
1. [Using resource types](https://docs.aws.amazon.com/cloudcontrolapi/latest/userguide/resource-types.html): You can check the AWS CloudFormation extension registry, but NOTE: Not all resource types listed in the CloudFormation registry currently support Cloud Control API. 

2. Determining if a resource type supports Cloud Control API
   - List of supported resources
    ```bash
    aws cloudformation list-types --type RESOURCE --visibility PUBLIC --provisioning-type FULLY_MUTABLE --max-results 100 --region cn-north-1 --profile china_ruiliang
    ```
    - Specific resource type
    ```bash
    aws cloudformation describe-type --type RESOURCE --type-name AWS::EC2::Instance --region cn-north-1 --profile china_ruiliang
    ```

1. Supported resource type: https://docs.aws.amazon.com/cloudcontrolapi/latest/userguide/supported-resources.html