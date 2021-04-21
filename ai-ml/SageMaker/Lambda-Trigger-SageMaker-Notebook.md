# How to Run a Sagemaker Notebook From AWS Lambdas、、

Requirement: trigger the SageMaker notebook .ipynb file by event

![Lambda-SageMaker.png](media/Lambda-SageMaker.png)

## Using Sagemaker LifeCycle Configurations

Create the LifeCycle Configurations with [script](script/LF_cycle_config.sh) for `Start Instance`. It is required Sagemaker instance has to be in Stop State before invocation

## Lambda Code
- Create Lambda function is Python 3.8 runtime with 60s timeout
- Lambda code:

```python
import json
import boto3

def lambda_handler(event, context):

    client = boto3.client('sagemaker')

    #wish to get current status of instance
    status = client.describe_notebook_instance(NotebookInstanceName='demo-notebook')
    print('NotebookInstanceStatus %s' % (status['NotebookInstanceStatus']))

    #Start the instance
    client.start_notebook_instance(NotebookInstanceName='demo-notebook')
    print("instance starting")

    # waiter = client.get_waiter('notebook_instance_in_service')
    # waiter.wait(
    #     NotebookInstanceName='demo-notebook',
    #     WaiterConfig={
    #         'Delay': 30,
    #         'MaxAttempts': 10
    #     }
    # )
    
    status = client.describe_notebook_instance(NotebookInstanceName='demo-notebook')
    print('NotebookInstanceStatus %s' % (status['NotebookInstanceStatus']))
```

# Reference
[How to Run a Sagemaker Notebook From AWS Lambdas ?](https://www.linkedin.com/pulse/how-run-sagemaker-notebook-from-aws-lambdas-saurabh-aggarwal/)

[SageMaker Notebook Instance Lifecycle Config Samples](https://github.com/aws-samples/amazon-sagemaker-notebook-instance-lifecycle-config-samples)