# AWS Config Rules Development Kit

The AWS Config Rules Development Kit helps developers set up, author and test custom Config rules. It contains scripts to enable AWS Config, create a Config rule and test it with sample ConfigurationItems. 

https://github.com/awslabs/aws-config-rdk

# Get Start at China region
```bash
pip install rdk

aws configure

# rdk init
rdk --region cn-northwest-1 init
Running init!
Found Config Recorder: default
Found Config Role: arn:aws-cn:iam::xxxxxxxx:role/aws-service-role/config.amazonaws.com/AWSServiceRoleForConfig
Found Bucket: config-bucket-xxxxxxxx
Config Service is ON
Config setup complete.
Creating Code bucket config-rule-code-bucket-xxxxxxxx-cn-northwest-1

# rdk create rule
rdk --region cn-northwest-1 create MyRule --runtime python3.7 --resource-types AWS::EC2::Instance --input-parameters '{"desiredInstanceType":"m5.4xlarge"}'
Running create!
Local Rule files created.

# rdk modify rule
rdk --region cn-northwest-1 modify MyRule --runtime python2.7 --maximum-frequency TwentyFour_Hours --input-parameters '{"desiredInstanceType":"m5.4xlarge"}'
Running modify!
Modified Rule 'MyRule'.  Use the `deploy` command to push your changes to AWS.

# rdk deploy rule
rdk --region cn-northwest-1 deploy MyRule
Running deploy!
Found Custom Rule.
Zipping MyRule
Uploading MyRule
Upload complete.
Creating CloudFormation Stack for MyRule
Waiting for CloudFormation stack operation to complete...
CloudFormation stack operation complete.
Config deploy complete.

# rdk logs
rdk --region cn-northwest-1 logs MyRule -n 5
```