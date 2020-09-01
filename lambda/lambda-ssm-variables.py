import json
import boto3

def lambda_handler(event, context):
    ssm = boto3.client('ssm')
    parameter = ssm.get_parameter(Name='lambda_env_var_demo')
    parameter_val = parameter['Parameter']['Value']
    print(parameter_val)
    return {
        'statusCode': 200,
        'body': json.dumps('Get value from SSM paramter store: ' + parameter_val)
    }
