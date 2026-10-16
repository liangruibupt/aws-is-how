import json
import boto3
from botocore.exceptions import ClientError

ssm = boto3.client('ssm')


class CustomError(Exception):
    pass

def lambda_handler(event, context):
    ssm_parameter_name = event.get('ssm_parameter_name')
    if ssm_parameter_name == None:
        raise CustomError("Get ssm_parameter_name failed")
    print("ssm_parameter_name: {}".format(ssm_parameter_name))
    try:
        parameter = ssm.get_parameter(
        Name=ssm_parameter_name, WithDecryption=True)
        parameter_val = parameter['Parameter']['Value']
        print(parameter_val)
    except Exception as e:
        print(e)
        print('Error getting ssm_parameter from {}. Make sure key exist and right permission.'.format(
            ssm_parameter_name))
        raise e
    return {
        'statusCode': 200,
        'body': json.dumps('Get value from SSM paramter store: ' + parameter_val)
    }
