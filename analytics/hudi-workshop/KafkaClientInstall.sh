#!/bin/bash -xe
   
# Install the basics
yum update -y 
yum install python3.7 -y    
yum install java-1.8.0-openjdk-devel -y 
yum erase awscli -y 
yum install jq

cd /home/ec2-user 

echo "export PATH=.local/bin:$PATH" >> .bash_profile 

# Install Kafka
wget https://archive.apache.org/dist/kafka/2.2.1/kafka_2.12-2.2.1.tgz 
tar -xzf kafka_2.12-2.2.1.tgz 

cd /home/ec2-user 

wget https://bootstrap.pypa.io/get-pip.py 

su -c "python3.7 get-pip.py --user" -s /bin/sh ec2-user 

su -c "/home/ec2-user/.local/bin/pip3 install boto3 --user" -s /bin/sh 
ec2-user 

su -c "/home/ec2-user/.local/bin/pip3 install awscli --user" -s /bin/sh 
ec2-user 

# Install Debezium to stream data from Aurora MySQL to Kafka Topic using Kafka connect 
wget https://repo1.maven.org/maven2/io/debezium/debezium-connector-mysql/0.10.0.Final/debezium-connector-mysql-0.10.0.Final-plugin.tar.gz 
tar -zxvf debezium-connector-mysql-0.10.0.Final-plugin.tar.gz 

# Copy debezium connector to /usr/local/share/kafka/plugins - this where Kafka connect expects it to be
sudo mkdir -p /usr/local/share/kafka/plugins 
cd /usr/local/share/kafka/plugins/ 
sudo cp -r /home/ec2-user/debezium-connector-mysql /usr/local/share/kafka/plugins/. 

# We need to now retrieve the Kafka bootstrap server and Aurora endpoint info from 
cd ~
aws s3 cp s3://${S3Bucket}/config/stack-info.json
bootstrap_servers=`cat stack-info.json | jq '.MSKBrokerNodes[0]' | sed 's/"//g'`,`cat stack-info.json | jq '.MSKBrokerNodes[1]' | sed 's/"//g'`
aurora_endpoint=`cat stack-info.json | jq '.AuroraEndPoint.Address'`

# Download the right config files from S3 bucket  
cd ~/kafka*/config
aws s3 cp s3://{S3HudiArtifacts}/hudi/config/connect-mysql-source.properties .
aws s3 cp s3://{S3HudiArtifacts}/hudi/config/connect-standalone-hudi.properties .

# Replace the bootstrap server info in the config files
sed -i -e 's/bootstrap.servers=/bootstrap.servers='$bootstrap_servers'/g' connect-standalone-hudi.properties
sed -i -e 's/bootstrap.servers=/bootstrap.servers='$bootstrap_servers'/g' connect-mysql-source.properties
sed -i -e 's/database.hostname=/database.hostanme='$aurora_endpoint'/g' connect-mysql-source.properties
