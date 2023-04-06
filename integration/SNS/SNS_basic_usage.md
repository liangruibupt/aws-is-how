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


## Install the packages required by these examples 
1. Read the [requirements.txt](script/requirements.txt)
2. running the following in a virtual environment:

```python -m pip install -r requirements.txt```

## Run this example at a command prompt with the following command.

The [sns_basics_new.py](integration/SNS/script/sns_basics_new.py) updates the [orignal code sns_basics.py](https://github.com/awsdocs/aws-doc-sdk-examples/blob/main/python/example_code/sns/sns_basics.py) to support set the right AWS region and AWS profile in the code.


```python sns_basics_new.py```

## Reference
[AWS Sample Amazon SNS code examples for the SDK for Python](https://github.com/awsdocs/aws-doc-sdk-examples/tree/main/python/example_code/sns#code-examples)
