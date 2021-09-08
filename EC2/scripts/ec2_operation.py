import boto3

session = boto3.Session(profile_name='china_ruiliang',
                        region_name='cn-north-1')
ec2_client = session.client('ec2')

print('boto3 version {}'.format(boto3.__version__))

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