# Working with AWS CloudFormation StackSets

AWS CloudFormation StackSets extends the functionality of stacks by enabling you to create, update, or delete stacks across multiple accounts and Regions with a single operation. Using an administrator account, you define and manage an AWS CloudFormation template, and use the template as the basis for provisioning stacks into selected target accounts across specified AWS Regions. 

![StackSetsArchitecture](image/StackSetsArchitecture.png)

## Permission models for stack sets

Stack sets can be created using either `self-managed` permissions or `service-managed` permissions:

1. With self-managed permissions, you create the IAM roles required by StackSets to deploy across accounts and Regions. These roles are necessary to establish a trusted relationship between the account you're administering the stack set from and the account you're deploying stack instances to. More details please check [self-managed permissions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-prereqs-self-managed.html)

- The role in your administrator account should be named `AWSCloudFormationStackSetAdministrationRole`. The role in each of your target accounts should be named `AWSCloudFormationStackSetExecutionRole`. 

    - `AWSCloudFormationStackSetAdministrationRole`
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Action": [
                    "sts:AssumeRole"
                ],
                "Resource": [
                    "arn:aws:iam::*:role/AWSCloudFormationStackSetExecutionRole"
                ],
                "Effect": "Allow"
            }
        ]
    }
    ```
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
            "Effect": "Allow",
            "Principal": {
                "Service": [
                    "cloudformation.amazonaws.com",
                    "cloudformation.ap-east-1.amazonaws.com"
                ]
            },
            "Action": "sts:AssumeRole"
            }
        ]
    }
    ```
    - `AWSCloudFormationStackSetExecutionRole`
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Action": "*",
                "Resource": "*"
            }
        ]
    }
    ```
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::admin_account_id:root"
            },
            "Action": "sts:AssumeRole"
            }
        ]
    }
    ```

2. With service-managed permissions, you can deploy stack instances to accounts managed by AWS Organizations. Using this permissions model, you don't have to create the necessary IAM roles; StackSets creates the IAM roles on your behalf. With this model, you can also enable automatic deployments to accounts that are added to your organization in the future. More details please check [service-managed permissions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-enable-trusted-access.html)

- The IAM service-linked role created in the management account has the suffix `CloudFormationStackSetsOrgAdmin`. The IAM service-linked role created in each target account has the suffix `CloudFormationStackSetsOrgMember`
- With trusted access enabled, the management account and delegated administrator accounts can create and manage service-managed stack sets for their organization. You can enable trusted access via `AWS CloudFormation console` and `AWS Organizations console`
- In addition to your organization's management account, member accounts with delegated administrator permissions can create and manage stack sets with service-managed permissions for the organization. 
    


## Concept of Stack set
- Maximum concurrent accounts: lets you specify the maximum number or percentage of target accounts in which an operation is performed at one time.
- Failure tolerance: lets you specify the maximum number or percentage of stack operation failures that can occur, per Region, beyond which CloudFormation stops an operation automatically. 
- Retain stacks: lets you keep stacks and their resources running even after they have been removed from a stack set. 
- Region concurrency: lets you choose how StackSets are deployed into Regions: Sequential or Parallel
- Tags: You can add tags during stack set creation and update operations


## Lab creating a StackSet to deploy stacks across multiple regions using `Self-managed permissions`

1. Set up permissions for CloudFormation StackSets
- In management account, member accounts with delegated administrator permissions, using CloudFormation  [AWSCloudFormationStackSetAdministrationRole](https://s3.amazonaws.com/cloudformation-stackset-sample-templates-us-east-1/AWSCloudFormationStackSetAdministrationRole.yml)
- In member accounts using CloudFormation [AWSCloudFormationStackSetExecutionRole](https://s3.amazonaws.com/cloudformation-stackset-sample-templates-us-east-1/AWSCloudFormationStackSetExecutionRole.yml)

Guide [https://wellarchitectedlabs.com/reliability/200_labs/200_deploy_and_update_cloudformation/6_multi_region_deploy/]

2. Check AMI public parameters existed in the Amazon Systems Manager Parameter Store
```bash
aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2 --region cn-north-1 --profile china

aws ssm get-parameters --names /aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2 --region cn-northwest-1 --profile china
```

2. Deploy CloudFormation stacks using CloudFormation StackSets
- Go to the AWS CloudFormation StackSets console and click Create StackSet
- Using the template [create VPC-EC2-S3](script/simple_stack_plus_s3_ec2_server.yaml)
- Ensure that the values for the following Parameters are as follows. You can use default values for the rest.
    - PublicEnabledParam - set to true
    - EC2SecurityEnabledParam - set to true
- Permissions select Self-service permissions: `AWSCloudFormationStackSetAdministrationRole` and `AWSCloudFormationStackSetExecutionRole`
- Accounts, select `Deploy stacks in accounts`, and enter `Account numbers`: account numbers separated by commas, like `account1,account2`
- Specify regions, select `cn-north-1` and `cn-northwest-1`
- Leave values for `Deployment options` as-is: `Maximum concurrent accounts`: 1; `Failure tolerance`: 0; `Region concurrency`: Sequential
- Click `Submit`


## Lab creating a StackSet to deploy stacks across multiple regions using `Service-managed permissions`
- Console
   - using CloudFormation [SNS_Sample](devops/cloudformation/script/SNS_Sample.yaml)
   - Select `Service-managed permissions`
   - Under `Deployment targets`, 
     - Select `Deploy to organizational units (OUs)` and set the `AWS OU ID`
     - `Automatic deployment`: Enabled
     - `Account removal behavior`: Retain stack
    - Specify regions, select `cn-north-1` and `cn-northwest-1`
    - Leave values for `Deployment options` as-is: `Maximum concurrent accounts`: 1; `Failure tolerance`: 0; `Region concurrency`: Sequential
    - Click `Submit`

- CLI
```bash
aws cloudformation create-stack-set \
  --stack-set-name SimpleTestTopicStackSet \
  --template-url file:///script/simple_stack_service_permission_sns.yaml
```

## Terraform support aws_cloudformation_stack_set
Using the [Resource: aws_cloudformation_stack_set](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudformation_stack_set)

## The details of CloudFormation StackSets
[Working with AWS CloudFormation StackSets](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/what-is-cfnstacksets.html)