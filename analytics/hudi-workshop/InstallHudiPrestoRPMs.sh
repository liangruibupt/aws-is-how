#!/usr/bin/env bash

# This script installs patched Hudi on Amazon EMR

set -e

mkdir -p /home/hadoop/rpms
cd /home/hadoop/rpms

# Download Hudi RPMs
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/rpms/hudi-0.5.0-1.amzn1.noarch.rpm .
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/rpms/hudi-presto-0.5.0-1.amzn1.noarch.rpm .


# Install RPMs
sudo rpm -i --force hudi-0.5.0-1.amzn1.noarch.rpm
sudo rpm -i --force hudi-presto-0.5.0-1.amzn1.noarch.rpm

## install boto3
sudo pip install boto3

## Change hive configuration to point to the Spark cluster
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/get-emr-ip-addresses.py /tmp/
chmod +x /tmp/get-emr-ip-addresses.py
python /tmp/get-emr-ip-addresses.py
spark_hive_thrift_url=thrift:\\/\\/`cat /tmp/stack-info.json | jq -r .EMRSparkHudiCluster.PrivateDnsName`:9083
presto_hive_thrift_url=thrift:\\/\\/`cat /tmp/stack-info.json | jq -r .EMRPrestoHudiCluster.PrivateDnsName`:9083
sudo sed -i "s/$presto_hive_thrift_url/$spark_hive_thrift_url/" /etc/presto/conf/catalog/hive.properties
sudo sed -i "s/$presto_hive_thrift_url/$spark_hive_thrift_url/" /etc/hive/conf/hive-site.xml


# Restart services
sudo stop hive-server2
sudo start hive-server2
sudo stop presto-server
sudo start presto-server
