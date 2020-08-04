#!/usr/bin/env bash

# This script installs patched Hudi on Amazon EMR

set -e

mkdir -p /home/hadoop/rpms
cd /home/hadoop/rpms

# Download Hudi RPMs
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/rpms/hudi-0.5.0-1.amzn1.noarch.rpm .
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/rpms/hudi-presto-0.5.0-1.amzn1.noarch.rpm .
# Copy log4j settings
#sudo aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/log4j.properties /etc/spark/conf/
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/log4j.properties .
sudo mv -f ./log4j.properties /etc/spark/conf/

# Copy Spark Jar
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/SparkKafkaConsumerHudiProcessor-assembly-1.0.jar /home/hadoop/
sleep 5s
# Install RPMs
sudo rpm -i --force hudi-0.5.0-1.amzn1.noarch.rpm
#sudo rpm -i --force hudi-presto-0.5.0-1.amzn1.noarch.rpm
sleep 5s
# Restart services
sudo stop hive-server2
sudo start hive-server2
#sudo stop presto-server
#sudo start presto-server
sleep 5s
# Copy libraries to hdfs
hadoop fs -copyFromLocal /usr/lib/hudi/hudi-spark-bundle.jar hdfs:///
hadoop fs -copyFromLocal /usr/lib/spark/external/lib/spark-avro.jar hdfs:///
hadoop dfs -copyFromLocal /usr/lib/hudi/hudi-utilities-bundle.jar hdfs:///
sleep 5s

