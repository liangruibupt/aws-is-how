###
### get-stack-info.py
###

import boto3,json

stack={}
print(boto3.__version__)

# Get Kafka broker nodes info
kafka = boto3.client('kafka')
response = kafka.list_clusters()
#clusterArn = response['ClusterInfoList'][0]['ClusterArn']
## Added Filter
clusterArns = response['ClusterInfoList']
clusterArn = [k for k in clusterArns if k['ClusterName'].startswith('Hudi-Workshop')][0]['ClusterArn']
response = kafka.list_nodes(ClusterArn=clusterArn)
print (response)
stack['MSKBrokerNodes']=[k['BrokerNodeInfo']['Endpoints'][0] for k in response['NodeInfoList']]

# get concatenated broker list
kafka_bootstrap_servers=','.join([k+":9094" for k in stack['MSKBrokerNodes']])
stack['MSKBootstrapServers']=kafka_bootstrap_servers

# Get EMR Cluster master nodes info
emr = boto3.client('emr')
response = emr.list_clusters(ClusterStates=['WAITING'])
clusterIds = [(k['Id'],k['Name']) for k in response['Clusters']]

for c in clusterIds:
    cluster_dns={}
    response = emr.list_instances(ClusterId=c[0],InstanceGroupTypes=['MASTER',])
    print (response)
    public_dns = response['Instances'][0]['PublicDnsName']
    #print (public_dns)
    private_dns = response['Instances'][0]['PrivateDnsName']
    #print (private_dns)
    cluster_dns['PublicDnsName']=public_dns
    cluster_dns['PrivateDnsName']=private_dns

    if 'Hudi' in c[1] and 'Spark' in c[1]:
        stack['EMRSparkHudiCluster'] = cluster_dns

    if 'Hudi' in c[1] and 'Presto' in c[1]:
        stack['EMRPrestoHudiCluster'] = cluster_dns

# Get Aurora endpoint info
rds = boto3.client('rds')
response = rds.describe_db_instances()
databases = response['DBInstances']
## Added Filter
database = [k for k in databases if k['DBInstanceIdentifier'].startswith('hudidb')][0]['Endpoint']
stack['AuroraEndPoint'] = database

# Get S3 Bucket
s3 = boto3.client('s3')
response = s3.list_buckets()
bucket_name = [k['Name'] for k in response['Buckets'] if 'hudi-workshop' in k['Name']][0]
stack['S3Bucket']=bucket_name

# Get Kafka EC2 Client
client = boto3.client('ec2')
custom_filter = [{
    'Name':'tag:Name',
    'Values': ['KafkaClientInstance']},{
    'Name':'instance-state-name',
    'Values': ['running']}]
response = client.describe_instances(Filters=custom_filter)
print (response)
stack['KafkaClientHost']=response['Reservations'][0]['Instances'][0]['PublicDnsName']

# Save to local file
print (json.dumps(stack))
with open('stack-info.json', 'w') as f:
    json.dump(stack, f)

# Write file to s3
with open('stack-info.json', "rb") as f:
    s3.upload_fileobj(f, bucket_name, 'config/stack-info.json')
