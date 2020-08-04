脚本文件	功能概述
hudi-workshop-template.yaml	Cloudformation自动化部署文件
sagemaker_lifecycle.sh	配置笔记本环境，调用脚本创建lambda，创建kafka topics，RDS加载数据等
KafkaClientInstall.sh	配置kafka客户端，运行数据管道创建脚本
InstallHudiSparkRPMs.sh	脚本在运行Spark 的EMR创建后自动运行，作用于Amazon EMR上安装Hudi补丁
InstallHudiPrestoRPMs.sh	脚本在运行Presto 的EMR创建后自动运行，作用于Amazon EMR上安装Hudi补丁
salesdb.sql	Copy SQL Script
sales_order_detail.schema	Copy AVRO schema to local bucket
create-lambda-function.py	在sagemaker笔记本中运行，create lambda function
get-stack-info.py	获取环境中 (MSK, Aurora) 信息
create-kafka-topics.py	create the kafka topics