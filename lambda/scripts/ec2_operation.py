import json
import boto3

ec2_client = boto3.client('ec2')
print('boto3 version {}'.format(boto3.__version__))

def lambda_handler(event, context):
    try:
        response = ec2_client.describe_security_groups(
            Filters=[
                {
                    'Name': 'group-name',
                    'Values': [
                        'EC2-Default-SG',
                    ]
                },
            ]
        )
    except:
        raise
    print(response)

    groupID = response['SecurityGroups'][0]['GroupId']
    print('groupID {}'.format(groupID))
    
    response = ec2_client.describe_security_group_rules(
        Filters=[
            {
                'Name': 'group-id',
                'Values': [
                    groupID,
                ]
            },
        ]
    )
    print(response)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from Lambda!')
    }
