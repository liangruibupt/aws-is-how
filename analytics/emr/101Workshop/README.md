# EMR Immersion Day

## Cluster Creation
- Create EMR cluster
```bash
aws emr create-cluster --name "emr-lab" --release-label emr-5.30.1 \
--applications Name=Hadoop Name=Pig Name=Hue Name=Spark Name=Hive Name=Tez Name=HBase Name=Presto Name=JupyterHub \
--ec2-attributes KeyName=EMRKeyPair,SubnetIds=subnet-0a5ba02735f8cb53d \
--instance-groups InstanceGroupType=MASTER,InstanceCount=1,InstanceType=m5.xlarge InstanceGroupType=CORE,InstanceCount=2,InstanceType=m5.xlarge \
--use-default-roles --log-uri s3://aws-logs-747411437379-ap-east-1/elasticmapreduce/ \
--region ap-east-1

aws emr describe-cluster --cluster-id j-TE9UNUQYSF13 --query 'Cluster.Status.State' --region ap-east-1
```

- SSH to EMR Cluster Master
```bash
cd ~/environment/SSH
ssh -i EMRKeyPair.pem hadoop@ec2-18-163-238-125.ap-east-1.compute.amazonaws.com
```

## Hive Workshop
Run some Hive SQL queries through Hive on Amazon EMR cluster to analysis New York Taxi dataset in S3 bucket.

1. Create S3 bucket: `emr-workshop-lab-747411437379` and folder for `files, logs, input, output`

2. Upload the data
```bash
aws s3 ls --recursive s3://emr-workshop-lab-747411437379/ --region ap-east-1 --profile hongkong
2020-08-26 08:24:00          0 files/
2020-08-26 08:24:07          0 input/
2020-08-26 08:25:13    1497006 input/tripdata.csv
2020-08-26 08:24:03          0 logs/
2020-08-26 08:24:11          0 output/
```

3. Hive CLI

- Define External Table in Hive
```bash
ssh -i EMRKeyPair.pem hadoop@ec2-18-163-238-125.ap-east-1.compute.amazonaws.com
hive
hive> CREATE EXTERNAL TABLE ny_taxi_test (
              vendor_id int,
              lpep_pickup_datetime string,
              lpep_dropoff_datetime string,
              store_and_fwd_flag string,
              rate_code_id smallint,
              pu_location_id int,
              do_location_id int,
              passenger_count int,
              trip_distance double,
              fare_amount double,
              mta_tax double,
              tip_amount double,
              tolls_amount double,
              ehail_fee double,
              improvement_surcharge double,
              total_amount double,
              payment_type smallint,
              trip_type smallint
       )
       ROW FORMAT DELIMITED
       FIELDS TERMINATED BY ','
       LINES TERMINATED BY '\n'
       STORED AS TEXTFILE
       LOCATION "s3://emr-workshop-lab-747411437379/input/";

hive> SELECT DISTINCT rate_code_id FROM ny_taxi_test;
hive> SELECT count(1) FROM ny_taxi_test;
```

4. HIVE - EMR STEPS
```bash
aws emr add-steps --cluster-id j-TE9UNUQYSF13 \
--steps Type=Hive,Name="ny_taxi_test",ActionOnFailure=CONTINUE,Args=[-f,s3://emr-workshop-lab-747411437379/files/ny-taxi.hql,-d,INPUT=s3://emr-workshop-lab-747411437379/input/,-d,OUTPUT=s3://emr-workshop-lab-747411437379/output/hive/,-hiveconf,hive.support.sql11.reserved.keywords=false] \
--region ap-east-1 --profile hongkong

aws emr describe-step --cluster-id j-TE9UNUQYSF13 --step-id s-12BDR0OR0VQ7O --region ap-east-1 --profile hongkong
#aws emr cancel-steps --cluster-id j-TE9UNUQYSF13 --step-ids s-12BDR0OR0VQ7O --region ap-east-1 --profile hongkong
aws s3 ls --recursive s3://emr-workshop-lab-747411437379/ --region ap-east-1 --profile hongkong
```

## Pig Workshop
Use Pig script to parse the data in CSV format and transform into TSV format
```bash
aws emr add-steps --cluster-id j-TE9UNUQYSF13 \
--steps Type=Pig,Name="ny_taxi_pig",ActionOnFailure=CONTINUE,Args=[-f,s3://emr-workshop-lab-747411437379/files/ny-taxi.pig,-d,INPUT=s3://emr-workshop-lab-747411437379/input/tripdata.csv,-d,OUTPUT=s3://emr-workshop-lab-747411437379/output/pig/] \
--region ap-east-1 --profile hongkong

aws emr describe-step --cluster-id j-TE9UNUQYSF13 --step-id s-1UOFBY7HPV3C8 --region ap-east-1 --profile hongkong
#aws emr cancel-steps --cluster-id j-TE9UNUQYSF13 --step-ids s-1UOFBY7HPV3C8 --region ap-east-1 --profile hongkong
```

## Spark-based ETL
Read CSV data from Amazon S3; Add current date to the dataset; Write updated data back to Amazon S3 in Parquet format

```bash
```

## Cleanup
```bash
aws emr terminate-clusters --cluster-id j-TE9UNUQYSF13 --region ap-east-1
```

## Reference:
[Workshop Link](https://www.immersionday.com/emr/content)


