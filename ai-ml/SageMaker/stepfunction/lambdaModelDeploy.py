import boto3
import os

sagemaker = boto3.client('sagemaker')
EXECUTION_ROLE = 'arn:aws:iam::account-id:role/lambda_basic_execution'
INSTANCE_TYPE = 'ml.m4.xlarge'
container = '811284229777.dkr.ecr.us-east-1.amazonaws.com/xgboost:latest'

def lambda_handler(event, context):
    best_training_job = event['best_training_job']
    endpoint = 'demobb-invoice-prediction'
    model_data_url = event['model_data_url']
    print('Creating model resource from training artifact...')
    create_model(best_training_job, container, model_data_url)
    print('Creating endpoint configuration...')
    create_endpoint_config(best_training_job)
    print('There is no existing endpoint for this model. Creating new model endpoint...')
    create_endpoint(endpoint, best_training_job)
    event['stage'] = 'Deployment'
    event['status'] = 'Creating'
    event['message'] = 'Started deploying model "{}" to endpoint "{}"'.format(best_training_job, endpoint)
    return event

def create_model(name, container, model_data_url):
    """ Create SageMaker model.
    Args:
        name (string): Name to label model with
        container (string): Registry path of the Docker image that contains the model algorithm
        model_data_url (string): URL of the model artifacts created during training to download to container
    Returns:
        (None)
    """
    try:
        sagemaker.create_model(
            ModelName=name,
            PrimaryContainer={
                'Image': container,
                'ModelDataUrl': model_data_url
            },
            ExecutionRoleArn=EXECUTION_ROLE
        )
    except Exception as e:
        print(e)
        print('Unable to create model.')
        raise(e)

def create_endpoint_config(name):
    """ Create SageMaker endpoint configuration.
    Args:
        name (string): Name to label endpoint configuration with.
    Returns:
        (None)
    """
    try:
        sagemaker.create_endpoint_config(
            EndpointConfigName=name,
            ProductionVariants=[
                {
                    'VariantName': 'prod',
                    'ModelName': name,
                    'InitialInstanceCount': 1,
                    'InstanceType': INSTANCE_TYPE
                }
            ]
        )
    except Exception as e:
        print(e)
        print('Unable to create endpoint configuration.')
        raise(e)
def create_endpoint(endpoint_name, config_name):
    """ Create SageMaker endpoint with input endpoint configuration.
    Args:
        endpoint_name (string): Name of endpoint to create.
        config_name (string): Name of endpoint configuration to create endpoint with.
    Returns:
        (None)
    """
    try:
        sagemaker.create_endpoint(
            EndpointName=endpoint_name,
            EndpointConfigName=config_name
        )
    except Exception as e:
        print(e)
        print('Unable to create endpoint.')
        raise(e)
