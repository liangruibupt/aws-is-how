# How to check the Internet Traffic?

## For NAT Gateway, EC2 and Load Balancer, you can analysis the VPC flow logs

1. Create the flow log

https://docs.amazonaws.cn/en_us/vpc/latest/userguide/working-with-flow-logs.html


2. Query flow logs using Amazon Athena

https://docs.amazonaws.cn/en_us/vpc/latest/userguide/flow-logs-athena.html

![flow-logs-athena-integration](media/flow-logs-athena-integration.png)

- In the success message, choose the link to navigate to the bucket that you specified for the CloudFormation template, and customize the template: such as the nodejs runtime you can set to `Runtime: nodejs14.x`

- Then use the CloudFormation stack to complete the resources deployment that are specified in the template.

- Then you can run the [predefined query](https://docs.amazonaws.cn/en_us/vpc/latest/userguide/flow-logs-athena.html#flow-logs-run-athena-query)

For example: `VpcFlowLogsTotalBytesTransferred` – The 50 pairs of source and destination IP addresses with the most bytes recorded.

![flow-logs-athena-integration.png](media/flow-logs-athena-integration.png)

3. Trouble shooting
- If you find the Athena query status is `cancelled`, Please check the Athena workgroup scan limit and increase it. More infomation, please check https://docs.amazonaws.cn/athena/latest/ug/workgroups-setting-control-limits-cloudwatch.html

- Patition: S3 bucket prefix need follow up the pattern `aws-region=region/year=year/month=month/day=day/`, then you can enable automatic partition and use the `msck repair table <table-name>` to automatically identify and load the partition. If you path format is `region/year/month/day/`, then you need manually load the partition via `alter table ... add partition(...) ... location ...`

- If you set the `Partition load frequency` in your VPC Flow logs athena integration, then it will follow up the frequency to load the partition


## For S3, you can analysis the S3 access logs or Cloud Trail logs

### S3 access logs
1. Enable the [S3 server access logging](https://docs.amazonaws.cn/en_us/AmazonS3/latest/userguide/enable-server-access-logging.html)

2. Using the [Athena to do query](https://docs.amazonaws.cn/en_us/AmazonS3/latest/userguide/using-s3-access-logs-to-identify-requests.html)

Example:

```sql
create database s3_access_logs_db

CREATE
EXTERNAL TABLE `s3_access_logs_db.ray-glue-streaming_logs`(
  `bucketowner` STRING, 
  `bucket_name` STRING, 
  `requestdatetime` STRING, 
  `remoteip` STRING, 
  `requester` STRING, 
  `requestid` STRING, 
  `operation` STRING, 
  `key` STRING, 
  `request_uri` STRING, 
  `httpstatus` STRING, 
  `errorcode` STRING, 
  `bytessent` BIGINT, 
  `objectsize` BIGINT, 
  `totaltime` STRING, 
  `turnaroundtime` STRING, 
  `referrer` STRING, 
  `useragent` STRING, 
  `versionid` STRING, 
  `hostid` STRING, 
  `sigv` STRING, 
  `ciphersuite` STRING, 
  `authtype` STRING, 
  `endpoint` STRING, 
  `tlsversion` STRING)
ROW FORMATSERDE 
  'org.apache.hadoop.hive.serde2.RegexSerDe' 
WITH SERDEPROPERTIES ( 
  'input.regex'='([^ ]*) ([^ ]*) \\[(.*?)\\]
([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) (\"[^\"]*\"|-)
(-|[0-9]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*)
(\"[^\"]*\"|-) ([^ ]*)(?: ([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*) ([^
]*) ([^ ]*))?.*$') 
STORED AS INPUTFORMAT 
  'org.apache.hadoop.mapred.TextInputFormat' 
OUTPUTFORMAT
  'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION 's3://ray-accesslogs-bjs/s3_access/'
```

- query Top 50 Download IP
```sql
SELECT SUM(objectsize) AS downloadTotal, remoteip
FROM "s3_access_logs_db"."ray-glue-streaming_logs"
WHERE Operation='REST.GET.OBJECT' AND
parse_datetime(requestdatetime,'dd/MMM/yyyy:HH:mm:ss Z')
BETWEEN parse_datetime('2021-12-01','yyyy-MM-dd')
AND parse_datetime('2021-12-05','yyyy-MM-dd')
GROUP BY remoteip
ORDER BY downloadTotal LIMIT 50;
```

- query Top 50 Copy data IP
```sql
SELECT SUM(objectsize) AS downloadTotal, remoteip
FROM "s3_access_logs_db"."ray-glue-streaming_logs"
WHERE Operation='REST.COPY.OBJECT_GET' AND
parse_datetime(requestdatetime,'dd/MMM/yyyy:HH:mm:ss Z')
BETWEEN parse_datetime('2021-12-01','yyyy-MM-dd')
AND parse_datetime('2021-12-05','yyyy-MM-dd')
GROUP BY remoteip
ORDER BY downloadTotal LIMIT 50;
```

### S3 CloudTrail logs
1. [Enable the CloudTrail for S3 bucket or Object](https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-cloudtrail-logging-for-s3.html)

2. [Identifying Amazon S3 requests using CloudTrail](https://docs.aws.amazon.com/AmazonS3/latest/userguide/cloudtrail-request-identification.html)

- Manual Partition
    - [Manual load Partition](https://docs.aws.amazon.com/athena/latest/ug/cloudtrail-logs.html#create-cloudtrail-table)
    - Query with partition
    ```sql
    SELECT useridentity.arn,
    Count(requestid) AS RequestCount
    FROM s3_cloudtrail_events_db.cloudtrail_myawsexamplebucket1_table_partitioned
    WHERE eventsource='s3.amazonaws.com'
    AND region='us-east-1'
    AND year='2019'
    AND month='02'
    AND day='19'
    Group by useridentity.arn

    SELECT count(requestid), sourceipaddress FROM s3_cloudtrail_events_db.cloudtrail_myawsexamplebucket1_pp
    WHERE eventsource='s3.amazonaws.com' AND region='us-east-1'
    AND year='2019'
    AND month='02'
    AND day='19'
    AND eventname in ('GetObject') AND requestparameters LIKE '%[ray-tools-sharing]%'
    group by sourceipaddress               
    ```
- Automatically Partition Projection
    - [Automatically add the partition](https://docs.aws.amazon.com/athena/latest/ug/cloudtrail-logs.html#create-cloudtrail-table-partition-projection)
    - Load partition
    ```sql
    MSCK REPAIR TABLE `cloudtrail_logs_pp`;
    ```
