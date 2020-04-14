# Neo4j-On-AWS-Global

## Deploy via EC2 Neo4j Marketplace AMI
[neo4j-cloud-aws-ec2-ami guide](https://neo4j.com/developer/neo4j-cloud-aws-ec2-ami/)

```bash
export AWS_REGION=us-east-1
# Create EC2 key pair
export KEY_NAME="Neo4j-AWSMarketplace-Key"
aws ec2 create-key-pair --key-name ${KEY_NAME} \
  --query 'KeyMaterial' --output text > ~/.ssh/${KEY_NAME}.pem --region ${AWS_REGION}

# Create security group
export SG_GROUP="neo4j-sg"
export YOUR_VPC=
aws ec2 create-security-group --group-name ${SG_GROUP} --vpc-id ${YOUR_VPC} \
  --description "Neo4j security group" --region ${AWS_REGION}
SG_GROUP_ID=$(aws ec2 describe-security-groups --filters "Name=vpc-id,Values=${YOUR_VPC}" "Name=group-name,Values=${SG_GROUP}" --query "SecurityGroups[0].GroupId" --region ${AWS_REGION} --output text)
for port in 22 7474 7473 7687 443 80; do
  aws ec2 authorize-security-group-ingress --group-id ${SG_GROUP_ID} --protocol tcp --port ${port} --cidr 0.0.0.0/0 --region ${AWS_REGION}
done


# Locate the AMI ID
aws ec2 describe-images --region ${AWS_REGION} \
  --filters "Name=owner-alias,Values=aws-marketplace" "Name=name,Values=neo4j-community-1-4.0.2*" \
  --query "Images[*].{ImageId:ImageId,Name:Name}"

export NEO4J_AMI=
export YOUR_Subnet_ID=

aws ec2 run-instances --image-id ${NEO4J_AMI} \
  --count 1 --instance-type m5.large \
  --key-name ${KEY_NAME} --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=100,VolumeType=gp2}" \
  --subnet-id ${YOUR_Subnet_ID} --security-group-ids ${SG_GROUP_ID} \
  --query "Instances[*].InstanceId" \
  --region ${AWS_REGION}

export InstanceId=

aws ec2 create-tags --resources ${InstanceId} --tags Key=Name,Value=neo4j-demo --region ${AWS_REGION}

# Access
PublicDnsName=$(aws ec2 describe-instances --instance-ids ${InstanceId} --query "Reservations[*].Instances[*].PublicDnsName" --region ${AWS_REGION} --output text)
## Web
https://[PublicDnsName]:7473/browser/
login with the user name neo4j and password instance-ID
## SSH
chmod 600 ~/.ssh/${KEY_NAME}.pem
ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PublicDnsName}

# Terminating the instance
aws ec2 terminate-instances \
  --instance-ids [InstanceId] \
  --region us-east-1
```

## Troubleshooting Connection Issues to Neo4j
https://community.neo4j.com/t/troubleshooting-connection-issues-to-neo4j/129

## Fix Browser Certificates error for Neo4j
https://medium.com/neo4j/getting-certificates-for-neo4j-with-letsencrypt-a8d05c415bbd


## Install  Community Standalone directly
[Neo4j File locations ](https://neo4j.com/docs/operations-manual/current/configuration/file-locations/)

```bash
# install java-1.11.0-openjdk-amd64
sudo apt-get update
sudo apt install java-common
sudo apt install default-jdk

update-java-alternatives --list

sudo update-alternatives --config java

# Add the repository 
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable 4.0' | sudo tee -a /etc/apt/sources.list.d/neo4j.list
sudo apt-get update

apt list -a neo4j
Listing... Done
neo4j/stable 1:4.0.3 all
neo4j/stable 1:4.0.2 all
neo4j/stable 1:4.0.1 all
neo4j/stable 1:4.0.0 all

# Install Neo4j 
sudo apt-get install neo4j=1:4.0.2

# Congifure Neo4j
sudo -i -u  neo4j

# Edit /etc/neo4j/neo4j.conf

dbms.connectors.default_listen_address=0.0.0.0
dbms.connectors.default_advertised_address=0.0.0.0

dbms.connector.bolt.enabled=true
dbms.connector.bolt.listen_address=0.0.0.0:7687

dbms.connector.http.enabled=true
dbms.connector.http.listen_address=0.0.0.0:7474

sudo systemctl restart neo4j
sudo systemctl stop neo4j
sudo systemctl start neo4j
sudo systemctl status neo4j

# Access browser
http://[PublicDnsName]:7474/browser/
http://ec2-3-228-1-54.compute-1.amazonaws.com:7474/browser/
```

## Install via docker
```bash
```

## Install Community Standalone from Cloudfromation
```bash
VERSION=3.5.3
export COMMUNITY_TEMPLATE=http://neo4j-cloudformation.s3.amazonaws.com/neo4j-community-standalone-stack-$VERSION.json
export STACKNAME=neo4j-comm-$(echo $VERSION | sed s/[^A-Za-z0-9]/-/g)
export INSTANCE=m5.large
export REGION=us-east-1
export SSHKEY=my-ssh-keyname
aws cloudformation create-stack \
   --stack-name $STACKNAME \
   --region $REGION \
   --template-url $COMMUNITY_TEMPLATE \
   --parameters ParameterKey=InstanceType,ParameterValue=$INSTANCE \
     ParameterKey=NetworkWhitelist,ParameterValue=0.0.0.0/0 \
     ParameterKey=Password,ParameterValue=s00pers3cret \
     ParameterKey=SSHKeyName,ParameterValue=$SSHKEY \
     ParameterKey=VolumeSizeGB,ParameterValue=37 \
     ParameterKey=VolumeType,ParameterValue=gp2 \
     --capabilities CAPABILITY_NAMED_IAM

aws cloudformation wait stack-create-complete --region $REGION --stack-name "$STACKNAME"

aws cloudformation describe-stacks --region $REGION --stack-name "$STACKNAME" | jq -r '.Stacks[0].Outputs[]'

https://instance-ip-address:7473/

echo "Deleting stack $1"
aws cloudformation delete-stack --stack-name "$1" --region us-east-1
```

## Install causal cluster (Enterprise Edition)
- In AWS global region, Enterprise Causal Cluster 3.5.16 by [cloudformation](database/neo4j/script/enterpise/Neo4j-Causal-Cluster-3.5.16.template)

- Enterprise Causal Cluster 4.0-enterprise via docker-compose
  1. Creates a five instance cluster with four core containers and one read replica container.
  2. Neo4j Browser to access the core1 instance on port 7474 or setup the load balancer for master route to 7474 backend port.
  3. Open ports 7474, 6477, 7687; 7475, 6478, 7688; 7476, 6479, 7689; 7477, 6480, 7690; 7978, 6481, 7691 and 5000

- Enterprise Causal Cluster 4.0-enterprise via distribute EC2 instance
Each EC2 instance Open ports 7474, 7687, 5000, 6000, 7000
Public-address is the public ip-address of the EC2 instance. If you use the private subnet, you can use the private ip-address of the EC2 instance.
```bash
docker run --name=neo4j-core --detach \
         --network=host \
         --publish=7474:7474 --publish=7687:7687 \
         --publish=5000:5000 --publish=6000:6000 --publish=7000:7000 \
         --hostname=public-address \
         --env NEO4J_dbms_mode=CORE \
         --env NEO4J_causal__clustering_expected__core__cluster__size=3 \
         --env NEO4J_causal__clustering_initial__discovery__members=core1-public-address:5000,core2-public-address:5000,core3-public-address:5000 \
         --env NEO4J_causal__clustering_discovery__advertised__address=public-address:5000 \
         --env NEO4J_causal__clustering_transaction__advertised__address=public-address:6000 \
         --env NEO4J_causal__clustering_raft__advertised__address=public-address:7000 \
         --env NEO4J_dbms_connectors_default__advertised__address=public-address \
         --env NEO4J_ACCEPT_LICENSE_AGREEMENT=yes \
         --env NEO4J_dbms_connector_bolt_advertised__address=public-address:7687 \
         --env NEO4J_dbms_connector_http_advertised__address=public-address:7474 \
         neo4j:4.0-enterprise
```
