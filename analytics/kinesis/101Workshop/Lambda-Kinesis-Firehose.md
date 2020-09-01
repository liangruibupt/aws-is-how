# Lambda + Kinesis Data Firehose 

- Create a Lambda function that reads from a Kinesis Data Stream. 
- Create an Amazon Kinesis Data Firehose delivery stream to write to a S3 bucket.
    Lambda function filters out the spurious data in the incoming events and then sends the clean events to Firehose Delivery Stream in batch mode (using the PutRecordBatch API).
    Kinesis Firehose write data to S3 using the parquet file format
- Discover the schema of taxi trips dataset using AWS Glue and query data via Amazon Athena

![Labs-KInesis-Lambda-Firehose](media/Labs-KInesis-Lambda-Firehose.png)

## Create the Glue and Athena Resource

- Glue Database name: kinesislab

- Create S3 bucket: kinesislab-nyctaxitrips-initials

- Create the Athena external table under kinesislab database. This table will be used by Kinesis Data Firehose as a schema for data format conversion

```sql
CREATE EXTERNAL TABLE nyctaxitrips(
    `pickup_latitude` double, 
    `pickup_longitude` double, 
    `dropoff_latitude` double, 
    `dropoff_longitude` double, 
    `trip_id` bigint, 
    `trip_distance` double, 
    `passenger_count` int, 
    `pickup_datetime` timestamp, 
    `dropoff_datetime` timestamp, 
    `total_amount` double)
    PARTITIONED BY ( 
    `year` string, 
    `month` string, 
    `day` string, 
    `hour` string)
    ROW FORMAT SERDE 
    'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe' 
    STORED AS INPUTFORMAT 
    'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat' 
    OUTPUTFORMAT 
    'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat'
    LOCATION
    's3://kinesislab-nyctaxitrips-initials/nyctaxitrips/'
    TBLPROPERTIES ('has_encrypted_data'='false');
```

## Create Kinesis Data Firehose Delivery Stream

- Kinesis Data Firehose Delivery Stream： `nyc-taxi-trips`
- Source:  `Direct PUT or other sources`
- Choose `Transform source records with AWS Lambda` as `Disabled` 
- `Record format conversion` as Enabled and choose `Output format` as `Apache Parquet`
- AWS Glue region choose the region that you created the AWS Glue database 
- AWS Glue database: kinesislab
- AWS Glue table: nyctaxitrips
- AWS Glue table version: Latest
- Destination: S3
- S3 Bucket: kinesislab-nyctaxitrips-initials
- S3 prefix: nyctaxitrips/year=!{timestamp:YYYY}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/
- S3 error prefix: nyctaxitripserror/!{firehose:error-output-type}/year=!{timestamp:YYYY}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/`
- Source record S3 backup: Disable
- Buffer size： 128 MiB
- Buffer interval: 180 seconds
- Keep the default settings for S3 compression and encryption
- Enabled for Error logging


