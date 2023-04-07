# Amazon SNS code examples

## Overview

Shows how to use the AWS SDK for Python (Boto3) to work with Amazon Simple Notification Service (Amazon SNS) for below actions:

- Create a topic (CreateTopic)
- Delete a subscription (Unsubscribe)
- Delete a topic (DeleteTopic)
- List the subscribers of a topic (ListSubscriptions)
- List topics (ListTopics)
- Publish an SMS text message (Publish)
- Publish to a topic with subscribed email destination (Publish)
- Set a filter policy (SetSubscriptionAttributes)
- Subscribe an email address to a topic (Subscribe)

The client can be same or different AWS regions (e.g. us-east-1 and eu-central-1) or AWS partitions (e.g. China and Global)

## Install the packages required by these examples 
1. Read the [requirements.txt](script/requirements.txt)
2. running the following in a virtual environment:

```python -m pip install -r requirements.txt```

## Run this example at a command prompt with the following command.

The [sns_basics_new.py](integration/SNS/script/sns_basics_new.py) updates the [orignal code sns_basics.py](https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/python/example_code/sns/sns_basics.py) to support set the right AWS region (default is `us-west-1`) and AWS profile (change the profile name based on your environment. If you invoke global SNS from China region, you need set the global region credential in the profile) in the code.


```python sns_basics_new.py```

## Run the example at lambda

1. Python 3.8 environment
2. The sample lambda code [sns_basics_lambda.py](script/sns_basics_lambda.py)
3. Create the environment variable `PHONE_HNUMBER` and `EMAIL_ADDRESS`
4. Update the code with right AWS region (default is `us-west-1`) 
5. To support invoke global SNS from China region, you need set the global region credential in the Secret Manager global_secret_name (default is `/ses/tokyo/credential`) with `AWS_ACCESS_KEY_ID_GLB` and `AWS_SECRET_ACCESS_KEY_GLB`
6. Run the lambda test

## Reference
[AWS Sample Amazon SNS code examples for the SDK for Python](https://github.com/awsdocs/aws-doc-sdk-examples/tree/main/python/example_code/sns#code-examples)
