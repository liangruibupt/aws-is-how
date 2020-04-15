# Install Neo4j on AWS China region
Below show 3 approaches to install Neo4j Community Edition
- Community Standalone directly
- Install global AMI on China region
- Start from docker

The demo in here use the m5.large EC2 instance

## Install Community Standalone directly
[Linux installation](https://neo4j.com/docs/operations-manual/current/installation/linux/)
[Neo4j File locations ](https://neo4j.com/docs/operations-manual/current/configuration/file-locations/)

```bash
export AWS_REGION=cn-north-1
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
```

## Install global AMI on China region
1. The original root volume for Marketplace AMI are 100GiB
2. Create new 200GiB EBS volume in the same AZ and attached to instance
3. Login to instance and process dd to store the root volume to /mnt/root.img
```bash
sudo fdisk -l

Disk /dev/nvme0n1: 100 GiB, 107374182400 bytes, 209715200 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes
Disklabel type: dos
Disk identifier: 0xdef2e9be

Device         Boot Start       End   Sectors  Size Id Type
/dev/nvme0n1p1 *     2048 209715166 209713119  100G 83 Linux


Disk /dev/nvme1n1: 200 GiB, 214748364800 bytes, 419430400 sectors
Units: sectors of 1 * 512 = 512 bytes
Sector size (logical/physical): 512 bytes / 512 bytes
I/O size (minimum/optimal): 512 bytes / 512 bytes

df -Th

sudo mkfs.ext4 /dev/nvme1n1
sudo mount /dev/nvme1n1 /mnt
df -Th

sudo dd if=/dev/nvme0n1 of=/mnt/root.img bs=1M
102400+0 records in
102400+0 records out
107374182400 bytes (107 GB, 100 GiB) copied, 936.357 s, 115 MB/s

```

4. Copy the root.img to China region
```bash
#us-east-1 upload

aws configure set s3.max_concurrent_requests 100 --profile cn
aws configure set s3.max_queue_size 10000 --profile cn
aws configure set s3.multipart_threshold 10MB --profile cn
aws configure set s3.multipart_chunksize 5MB --profile cn

aws s3 cp /mnt/root.img s3://ray-tools-sharing/ami/neo-root.img --profile cn --region cn-northwest-1
```

5. Download root.img from China region EC2 and dd to EBS volume
- create Unbutu TLS 18.04 instance `neo4j-dd` with root volume as 200GiB
- attach EBS volume `neo4j-dd-attach` with 200GiB to `neo4j-dd` intance
```bash
# cn-north-1 Ubuntu instance download root.img
sudo apt-get update && sudo apt install python3-pip
pip3 install --upgrade --user awscli
export PATH=$HOME/.local/bin:$PATH

aws configure set default.s3.max_concurrent_requests 100
aws configure set default.s3.max_queue_size 10000
aws configure set default.s3.multipart_threshold 10MB
aws configure set default.s3.multipart_chunksize 5MB

aws s3 cp s3://ray-tools-sharing/ami/neo-root.img /tmp/root.img --region cn-northwest-1

## dd back to EBS volume
df -Th

sudo fdisk -l
# Disk /dev/nvme0n1: 200 GiB, 214748364800 bytes, 419430400 sectors
# Units: sectors of 1 * 512 = 512 bytes
# Sector size (logical/physical): 512 bytes / 512 bytes
# I/O size (minimum/optimal): 512 bytes / 512 bytes
# Disklabel type: dos
# Disk identifier: 0x34283f9c

# Device         Boot Start       End   Sectors  Size Id Type
# /dev/nvme0n1p1 *     2048 419430366 419428319  200G 83 Linux


# Disk /dev/nvme1n1: 200 GiB, 214748364800 bytes, 419430400 sectors
# Units: sectors of 1 * 512 = 512 bytes
# Sector size (logical/physical): 512 bytes / 512 bytes
# I/O size (minimum/optimal): 512 bytes / 512 bytes

# use ‘dd’ to write the root.img to the EBS volume
sudo dd if=/tmp/root.img of=/dev/nvme1n1 bs=1M oflag=direct

sudo fdisk -l
# Disk /dev/nvme0n1: 200 GiB, 214748364800 bytes, 419430400 sectors
# Units: sectors of 1 * 512 = 512 bytes
# Sector size (logical/physical): 512 bytes / 512 bytes
# I/O size (minimum/optimal): 512 bytes / 512 bytes
# Disklabel type: dos
# Disk identifier: 0x34283f9c

# Device         Boot Start       End   Sectors  Size Id Type
# /dev/nvme0n1p1 *     2048 419430366 419428319  200G 83 Linux


# Disk /dev/nvme1n1: 200 GiB, 214748364800 bytes, 419430400 sectors
# Units: sectors of 1 * 512 = 512 bytes
# Sector size (logical/physical): 512 bytes / 512 bytes
# I/O size (minimum/optimal): 512 bytes / 512 bytes
# Disklabel type: dos
# Disk identifier: 0xdef2e9be

# Device         Boot Start       End   Sectors  Size Id Type
# /dev/nvme1n1p1 *     2048 209715166 209713119  100G 83 Linux

cat /proc/partitions
# major minor  #blocks  name

#    7        0      90520 loop0
#    7        1      18388 loop1
#  259        0  209715200 nvme0n1
#  259        1  209714159 nvme0n1p1
#  259        2  209715200 nvme1n1
#  259        3  104856559 nvme1n1p1

# Optional: delete the ssh key
#sudo partprobe
#sudo fdisk -l
mkdir -p /tmp/neo4j
sudo mount /dev/nvme1n1p1 /tmp/neo4j
sudo rm /tmp/neo4j/home/ubuntu/.ssh/authorized_keys
sudo umount /tmp/neo4j
```

6. Create the instance
- detach the EBS volumn `neo4j-dd-attach` and create a EBS snaptshot
- create image neo4j-4.0.2 from EBS snaptshot
- Launch an instance use neo4j-4.0.2 AMI, ssh to the instance and make sure everything starts correctly 
```bash
ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PublicDnsName}

sudo -i -u  neo4j
#vi /etc/neo4j/neo4j.template
dbms.default_advertised_address=$dbms_default_advertised_address
dbms.default_listen_address=$dbms_default_listen_address

#vi /etc/neo4j/pre-neo4j.sh
echo "dbms_default_listen_address" "${dbms_default_listen_address:=0.0.0.0}"
echo "dbms_default_advertised_address" "${dbms_default_advertised_address:=$EXTERNAL_IP_ADDR}"

# HTTPS
echo "dbms_connector_https_enabled" "${dbms_connector_https_enabled:=true}"
echo "dbms_connector_https_advertised_address" "${dbms_connector_https_advertised_address:=$EXTERNAL_IP_ADDR:7473}"
echo "dbms_connector_https_listen_address" "${dbms_connector_https_listen_address:=0.0.0.0:7473}"
echo "dbms_ssl_policy_https_enabled" "${dbms_ssl_policy_https_enabled:=true}"
echo "dbms_ssl_policy_https_base_directory" "${dbms_ssl_policy_https_base_directory:=/var/lib/neo4j/certificates/https}"

# HTTP
echo "dbms_connector_http_enabled" "${dbms_connector_http_enabled:=true}"
echo "dbms_connector_http_advertised_address" "${dbms_connector_http_advertised_address:=$EXTERNAL_IP_ADDR:7474}"
echo "dbms_connector_http_listen_address" "${dbms_connector_http_listen_address:=0.0.0.0:7474}"

# BOLT
echo "dbms_connector_bolt_enabled" "${dbms_connector_bolt_enabled:=true}"
echo "dbms_connector_bolt_advertised_address" "${dbms_connector_bolt_advertised_address:=$EXTERNAL_IP_ADDR:7687}"
echo "dbms_connector_bolt_tls_level" "${dbms_connector_bolt_tls_level:=OPTIONAL}"
echo "dbms_default_advertised_address" "${dbms_default_advertised_address:=$EXTERNAL_IP_ADDR}"
echo "dbms_ssl_policy_bolt_enabled" "${dbms_ssl_policy_bolt_enabled:=true}"

# exit from neo4j user
sudo systemctl restart neo4j
sudo systemctl stop neo4j
sudo systemctl start neo4j
sudo systemctl status neo4j

# Access
PublicDnsName=$(aws ec2 describe-instances --instance-ids ${InstanceId} --query "Reservations[*].Instances[*].PublicDnsName" --region ${AWS_REGION} --output text)
## Web
https://[PublicDnsName]:7473/browser/
login with the user name neo4j and password instance-ID
```

## Start from docker
[docker-run-neo4j](https://neo4j.com/developer/docker-run-neo4j/)

```bash
# SET UP docker
sudo apt-get remove docker docker-engine docker.io containerd runc
sudo apt-get update
sudo apt-get install apt-transport-https ca-certificates \
    curl gnupg-agent software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu \
   $(lsb_release -cs) stable"
sudo apt-get update && sudo apt-get install docker-ce docker-ce-cli containerd.io
sudo groupadd docker
sudo usermod -aG docker $USER
newgrp docker
docker run hello-world

# Start docker
docker run --rm --name neo4jtrail neo4j:4.0.2

docker run --name neo4jdemo -d \
    --publish=7474:7474 --publish=7687:7687 \
    -v $HOME/neo4j/data:/data \
    -v $HOME/neo4j/logs:/logs \
    -v $HOME/neo4j/import:/var/lib/neo4j/import \
    -v $HOME/neo4j/plugins:/plugins \
    -v $HOME/neo4j/conf:/var/lib/neo4j/conf \
    --env NEO4J_AUTH=neo4j/test \
    neo4j:4.0.2


# Edit /conf/neo4j.conf
dbms.connectors.default_listen_address=0.0.0.0
dbms.connectors.default_advertised_address=${YOUR_INSTANCE_IP}

dbms.connector.https.advertised_address=${YOUR_INSTANCE_IP}:7473

dbms.connector.bolt.enabled=true
#dbms.connector.bolt.listen_address=0.0.0.0:7687
dbms.connector.bolt.advertised_address=${YOUR_INSTANCE_IP}:7687
dbms.connector.bolt.tls_level:=OPTIONAL

dbms.connector.http.enabled=true
#dbms.connector.http.listen_address=0.0.0.0:7474
dbms.connector.http.advertised_address=${YOUR_INSTANCE_IP}:7474

# Using Cypher Shell 
docker exec -it neo4jdemo bash
cypher-shell -u neo4j -p test
cat <local-file> | docker exec -i neo4jdemo bin/cypher-shell -u neo4j -p test

# Use the script/enterpise/docker-compose.yml for Enterpise Edition
docker-compose up
docker-compose down
```