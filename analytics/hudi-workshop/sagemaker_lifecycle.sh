##
## Standalone script to test SageMaker LifeCycle
## sagemaker_life_cycle.sh
##

# Install necessary tools

# awscli
#pip install awscli
#pip install boto3

# MySQL
sudo yum install -y mysql-devel
sudo yum -y install mysql

## Install mysql package in conda python3 env
source activate python3
pip install mysql
source deactivate

# Kafka Python client
pip install kafka-python

# Download and save stack-info python script
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/get-stack-info.py /home/ec2-user/scripts/
chmod +x /home/ec2-user/scripts/get-stack-info.py
python /home/ec2-user/scripts/get-stack-info.py

# create the kafka topics
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/create-kafka-topics.py /home/ec2-user/scripts/
chmod +x /home/ec2-user/scripts/create-kafka-topics.py
python /home/ec2-user/scripts/create-kafka-topics.py

# Copy sample notebooks
aws s3 cp --recursive s3://emr-workshops-cn-northwest-1/hudi/notebooks/ /home/ec2-user/SageMaker

# Replace token in notebook 1
aurora_endpoint=`cat stack-info.json | jq -r .AuroraEndPoint.Address`
echo "aurora_endpoint : $aurora_endpoint"

s3_bucket=`cat stack-info.json | jq -r .S3Bucket`
echo "s3_bucket : $s3_bucket"

kafka_client_host=`cat stack-info.json | jq -r .KafkaClientHost`
echo "kafka_client_host : $kafka_client_host"

# stage lambda artifacts
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/s3-event-processor-lambda.zip s3://$s3_bucket/scripts/
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/LambdaS3.zip s3://$s3_bucket/scripts/
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/kafka-python.zip s3://$s3_bucket/scripts/

# write a temporary file to DMS path for Lambda PutBucketNotification
touch testfile.temp
aws s3 cp testfile.tmp s3://$s3_bucket/dms-full-load-path/testfile.tmp

emr_presto_cluster_master=`cat stack-info.json | jq -r .EMRPrestoHudiCluster.PublicDnsName`
echo "emr_presto_cluster_master : $emr_presto_cluster_master"

emr_spark_cluster_master=`cat stack-info.json | jq -r .EMRSparkHudiCluster.PublicDnsName`
echo "emr_spark_cluster_master : $emr_spark_cluster_master"

emr_spark_cluster_master_private=`cat stack-info.json | jq -r .EMRSparkHudiCluster.PrivateDnsName`
echo "emr_spark_cluster_master_private : $emr_spark_cluster_master_private"

kafka_brokers=`cat stack-info.json | jq -r .MSKBootstrapServers`
echo "kafka_client_host : $kafka_brokers"

#sed -i "s/###kafka_client_host###/$kafka_client_host/" SageMaker/2_Consume_Streaming_Updates.ipynb

# Replace tokens in notebooks
sed -i "s/###aurora_endpoint###/$aurora_endpoint/" /home/ec2-user/SageMaker/1_Source_Database_and_CDC.ipynb
sed -i "s/###emr_spark_cluster_master###/$emr_spark_cluster_master/g" /home/ec2-user/SageMaker/1_Source_Database_and_CDC.ipynb


sed -i "s/###s3_bucket###/$s3_bucket/" /home/ec2-user/SageMaker/2_Consume_Streaming_Updates.ipynb
sed -i "s/###emr_presto_cluster_master###/$emr_presto_cluster_master/" /home/ec2-user/SageMaker/2_Consume_Streaming_Updates.ipynb
sed -i "s/###emr_spark_cluster_master###/$emr_spark_cluster_master/" /home/ec2-user/SageMaker/2_Consume_Streaming_Updates.ipynb
sed -i "s/###kafka_brokers###/$kafka_brokers/" /home/ec2-user/SageMaker/2_Consume_Streaming_Updates.ipynb

sed -i "s/###s3_bucket###/$s3_bucket/" /home/ec2-user/SageMaker/3_GDPR_Deletes.ipynb

# Copy AVRO schema to local bucket
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/config/sales_order_detail.schema s3://$s3_bucket/config/

# Copy SQL Script
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/salesdb.sql /home/ec2-user/scripts/salesdb.sql

# Load the data into Aurora
echo "aurora_endpoint : $aurora_endpoint"
mysql -f -u master -h $aurora_endpoint  --password="S3cretPwd99" < /home/ec2-user/scripts/salesdb.sql

# Update config file with DNS name of EMR cluster
cat >/home/ec2-user/.sparkmagic/config.json <<EOL
{
  "kernel_scala_credentials" : {
    "url": "http://$emr_spark_cluster_master_private:8998"
  },
  "wait_for_idle_timeout_seconds": 15,
  "livy_session_startup_timeout_seconds": 3600,
  "fatal_error_suggestion": "The code failed because of a fatal error:\n\t{}.\n\nSome things to try:\na) Make sure Spark has enough available resources for Jupyter to create a Spark context.\nb) Contact your Jupyter administrator to make sure the Spark magics library is configured correctly.\nc) Restart the kernel.",
  "session_configs": {
    "driverMemory": "2G",
    "executorCores": 1,
    "executorMemory": "7G"
  },
  "use_auto_viz": true,
  "coerce_dataframe": true,
  "max_results_sql": 2500,
  "pyspark_dataframe_encoding": "utf-8",

  "heartbeat_refresh_seconds": 30,
  "livy_server_heartbeat_timeout_seconds": 0,
  "heartbeat_retry_seconds": 10,
  "custom_headers": {},
  "retry_policy": "configurable",
  "retry_seconds_to_sleep_list": [0.2, 0.5, 1, 3, 5],
  "configurable_retry_policy_max_retries": 8
}
EOL

# create lambda function
aws s3 cp s3://emr-workshops-cn-northwest-1/hudi/scripts/create-lambda-function.py /home/ec2-user/scripts/
chmod +x /home/ec2-user/scripts/create-lambda-function.py
python /home/ec2-user/scripts/create-lambda-function.py
