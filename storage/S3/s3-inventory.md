# Overview of [Amazon S3 Inventory](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory.html)

Amazon S3 Inventory is one of the tools to help manage your storage. You can use it to 
- audit and report on the replication and encryption status of your objects for business, compliance, and regulatory needs. 
- simplify and speed up business workflows and big data jobs using S3 Inventory, which provides a scheduled alternative to the Amazon S3 synchronous List API operation. 
- Work with 

You can query Amazon S3 Inventory using standard SQL by using Amazon Athena, Amazon Redshift Spectrum, and other tools such as Presto, Apache Hive, and Apache Spark. 

1. [Configuring Amazon S3 Inventory](https://docs.aws.amazon.com/AmazonS3/latest/userguide/configure-inventory.html)
- ORC and Parquet formats provide faster query performance and lower query costs. 
- CSV-formatted inventory can be used by S3 Batch Operation
- If the S3 URI of `Destination` include the prefix, please not ending by `/`. Correct Format: `s3://bucket/prefix`

2. [Setting up Amazon S3 Event Notifications for inventory completion](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory-notification.html)

You can enable the S3 events to an Amazon Simple Notification Service (Amazon SNS) topic, an Amazon Simple Queue Service (Amazon SQS) queue, or an AWS Lambda function. Note [the permission setting](https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-destinations-permissions-to-s3.html)

3. Understand [your inventory list](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory-location.html)

- `destination-prefix/source-bucket/config-ID/YYYY-MM-DDTHH-MMZ/manifest.json` tracks the location of the files in the report for that date.
- `destination-prefix/source-bucket/config-ID/YYYY-MM-DDTHH-MMZ/manifest.checksum` indicate the inventory complete status
- `destination-prefix/source-bucket/config-ID/data/YYYY-MM-DD-HH-MM/`contain a gz of the inventory file you can download and unzip to manipulate manually. Note these files can be quite large.
- `destination-prefix/source-bucket/config-ID/hive/dt=YYYY-MM-DD-HH-MM/symlink.txt` contains a symlink to the gz file that you use for Athena. Athena can import the file directly into Athena for analysis.
 
4. [Querying S3 Inventory with Amazon Athena](https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-inventory-athena-query.html)

- Create external table for CSV format
```sql
# If you select all information of Inventroy
CREATE EXTERNAL TABLE ray_glue_streaming_inventory(
         bucket string,
         key string,
         version_id string,
         is_latest boolean,
         is_delete_marker boolean,
         size string,
         last_modified_date string,
         e_tag string,
         storage_class string,
         is_multipart_uploaded boolean,
         replication_status string,
         encryption_status string,
         object_lock_retain_until_date string,
         object_lock_mode string,
         object_lock_legal_hold_status string,
         intelligent_tiering_access_tier string,
         bucket_key_status string,
         checksum_algorithm string
) PARTITIONED BY (
        dt string
) 
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.SymlinkTextInputFormat'
  OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.IgnoreKeyTextOutputFormat'
  LOCATION 's3://ray-nlb-accesslogs-bjs/s3_inventory/ray-glue-streaming/ray-glue-streaming-inventory/hive/';

# If you only selected partial information of Inventory, for example: 
Size, Last modified, Storage class, ETag, Encryption, Intelligent-Tiering: Access tier

CREATE EXTERNAL TABLE ray_glue_streaming_inventory(
         bucket string,
         key string,
         size string,
         last_modified_date string,
         e_tag string,
         storage_class string,
         encryption_status string,
         intelligent_tiering_access_tier string
) PARTITIONED BY (
        dt string
) 
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
  STORED AS INPUTFORMAT 'org.apache.hadoop.hive.ql.io.SymlinkTextInputFormat'
  OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.IgnoreKeyTextOutputFormat'
  LOCATION 's3://ray-nlb-accesslogs-bjs/s3_inventory/ray-glue-streaming/ray-glue-streaming-inventory/hive/';
```

- Add new inventory lists to your table by add the partition
```sql
MSCK REPAIR TABLE ray_glue_streaming_inventory

# Output
Partitions not in metastore:	ray_glue_streaming_inventory:dt=2022-02-26-01-00
Repair: Added partition to metastore ray_glue_streaming_inventory:dt=2022-02-26-01-00
```

- Sample query
```sql
# Get list of latest inventory report dates available
SELECT DISTINCT dt FROM ray_glue_streaming_inventory ORDER BY 1 DESC limit 10;

# Get encryption status for a provided report date.
SELECT encryption_status, count(*) FROM ray_glue_streaming_inventory WHERE dt = '2022-02-26-01-00' GROUP BY encryption_status;

# Get encryption status for report dates in the provided range.
SELECT dt, encryption_status, count(*) FROM your_table_name 
WHERE dt > 'YYYY-MM-DD-HH-MM' AND dt < 'YYYY-MM-DD-HH-MM' GROUP BY dt, encryption_status;

# Preview the data
SELECT * FROM "ray_glue_streaming_inventory" limit 10;

# Sort your objects by size and report
SELECT DISTINCT size FROM ray_glue_streaming_inventory ORDER BY 1 DESC limit 10;
SELECT size, count(*) FROM ray_glue_streaming_inventory GROUP BY size;

# Check for encryption status to identify security exposure to enable encryption
SELECT encryption_status, count(*) FROM ray_glue_streaming_inventory GROUP BY encryption_status;

# Count by last modified date to see how active the data is
SELECT last_modified_date, count(*) FROM ray_glue_streaming_inventory GROUP BY last_modified_date;

# Count or list objects smaller than 128 K from a specific inventory date
SELECT COUNT(*) FROM ray_glue_streaming_inventory WHERE cast("size" as bigint) < 128000; 
SELECT bucket,key,size FROM ray_glue_streaming_inventory WHERE cast("size" as bigint) < 128000; 

# Count or list objects greater than or equal to 5 GB from a specific inventory date
SELECT COUNT(*) FROM ray_glue_streaming_inventory WHERE cast("size" as bigint) >= 5000000000;
SELECT bucket,key,size FROM ray_glue_streaming_inventory WHERE cast("size" as bigint) >5000000000;

# Report infrequently accessed by tier if for data spread
SELECT intelligent_tiering_tier,count (*) FROM ray_glue_streaming_inventory GROUP BY intelligent_tiering_tier;
```

## Reference 
[Manage and analyze your data at scale using Amazon S3 Inventory and Amazon Athena](https://aws.amazon.com/blogs/storage/manage-and-analyze-your-data-at-scale-using-amazon-s3-inventory-and-amazon-athena/)