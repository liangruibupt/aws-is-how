# How to archive the RDS postgreSQL table?

## Method 1: write code with insert/select
Write code similar like below to do individual table archiving 
```sql
insert into archive_table
select *
from t;
```
Example:
[Archiving Individual Table from PostgreSQL using Python](https://medium.com/1mgofficial/archiving-individual-table-from-postgresql-using-python-bf721971c63e)

## Method 2: Using postgresql-s3-export

You can query data from an RDS for PostgreSQL DB instance and export it directly into files stored in an Amazon S3 bucket. To do this, you use the aws_s3 PostgreSQL extension that Amazon RDS provides. Export the query data by calling the aws_s3.query_export_to_s3 function. [Servcie guide](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/postgresql-s3-export.html)

```sql
-- export
SELECT * from aws_s3.query_export_to_s3('select * from sample_table', 
   aws_commons.create_s3_uri('sample-bucket', 'sample-filepath', 'us-west-2') 
);

-- Exporting to a CSV file that uses a custom delimiter
SELECT * from aws_s3.query_export_to_s3('select * from basic_test', :'s3_uri_1', options :='format csv, delimiter $$:$$');

-- Exporting to a binary file with encoding
SELECT * from aws_s3.query_export_to_s3('select * from basic_test', :'s3_uri_1', options :='format binary, encoding WIN1253');
```

## Method 3: Archive and Purge Data for RDS for PostgreSQL and Aurora with PostgreSQL using pg_partman and Amazon S3
The solution combines PostgreSQL’s native range partitioning feature with pg_partman and Amazon RDS’s Amazon S3 export/import functions. PostgreSQL lets you divide a table into partitions based on key columns’ date/time ranges. It offers great performance and management benefits for archiving/purging historical data. Instead of bulk insert and delete, you simply copy the partition out for archive, then drop the partition when you no longer need it.

pg_partman is a PostgreSQL extension that supports PostgreSQL’s native partitioning to create and manage time-based and serial-based partition sets. It automates the child partition creation and works with your retention policy to detach or drop the obsolete partitions for you.

[Usage guide](https://aws.amazon.com/blogs/database/archive-and-purge-data-for-amazon-rds-for-postgresql-and-amazon-aurora-with-postgresql-compatibility-using-pg_partman-and-amazon-s3/)

```sql
SELECT partman.create_parent( p_parent_table => 'dms_sample.ticket_purchase_hist', p_control => 'transaction_date_time', p_type => 'native', p_interval=> 'monthly', p_premake => 7,p_start_partition => '2021-01-01');

INSERT INTO dms_sample.ticket_purchase_hist SELECT * FROM dms_sample.ticket_purchase_hist_old;

-- identify the partitions that are detached from the parent
select relname, n.nspname
from
pg_class 
join pg_namespace n on n.oid = relnamespace
where relkind = 'r' and relispartition ='f'
and relname like 'ticket_purchase_hist_p%' and n.nspname = 'dms_sample';

-- export
SELECT *
FROM aws_s3.query_export_to_s3(
'SELECT * FROM dms_sample.ticket_purchase_hist_p2021_01',
aws_commons.create_s3_uri(
'dbarchive-test',
'testdb/dms_sample/ticket_purchase_hist/202101/data','us-east-1'));

```

## Trouble shooting
1. How to avoid query timeout if you run select count for large table?

You can change [tcp_keepalives_idle](https://www.postgresql.org/docs/13/runtime-config-connection.html) or [statement_timeout](https://www.postgresql.org/docs/current/runtime-config-client.html) (not recommended baed on the postgresql document)

Both of them are [Dynamic parameters](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Parameters.html)，no need database instance reboot:
- Static parameters – Static parameters require that the RDS for PostgreSQL DB instance be rebooted after a change so that the new value can take effect.
- Dynamic parameters – Dynamic parameters don't require a reboot after changing their settings.
