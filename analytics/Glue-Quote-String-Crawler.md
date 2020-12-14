# Glue for data contain quote string

If your CSV file contain the quote string, the Glue Crawler may failed to populate the schema. You can follow up the guide to fix the issue

## Option1: Replace the serializationLib by using OpenCSVSerde
https://docs.aws.amazon.com/athena/latest/ug/glue-best-practices.html#schema-csv-quotes

1. Edit the table created by Glue Crawler
```json
{
"location": "s3://ray-glue-streaming/catalog_test/",
"inputFormat": "org.apache.hadoop.mapred.TextInputFormat",
"outputFormat": "org.apache.hadoop.hive.ql.io.HiveIngoreKeyTextOutputFormat",
"SerDeInfo": {
    "name": "OpenCSVSerDe",
    "serializationLib": "org.apache.hadoop.hive.serde2.OpenCSVSerde",
    "parameters": {
        "escapeChar": "\\",
        "quoteChar": "\"",
        "separatorChar": ","
    }
  }
}
```

Note, your column name should avoid use the reserved-words of Athena: https://docs.aws.amazon.com/athena/latest/ug/reserved-words.html

2. Check the create table DDL in Athena include the `OpenCSVSerde` and `quoteChar`
```sql
CREATE EXTERNAL TABLE `catalog_test`(
  `mykey` string COMMENT 'from deserializer', 
  `name` string COMMENT 'from deserializer', 
  `gender` string COMMENT 'from deserializer', 
  `age` string COMMENT 'from deserializer', 
  `address` string COMMENT 'from deserializer')
ROW FORMAT SERDE 
  'org.apache.hadoop.hive.serde2.OpenCSVSerde' 
WITH SERDEPROPERTIES ( 
  'escapeChar'='\\', 
  'quoteChar'='\"', 
  'separatorChar'=',') 
STORED AS INPUTFORMAT 
  'org.apache.hadoop.mapred.TextInputFormat' 
OUTPUTFORMAT 
  'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
LOCATION
  's3://ray-glue-streaming/catalog_test/'
TBLPROPERTIES (
  'CrawlerSchemaDeserializerVersion'='1.0', 
  'CrawlerSchemaSerializerVersion'='1.0', 
  'UPDATED_BY_CRAWLER'='student', 
  'areColumnsQuoted'='false', 
  'averageRecordSize'='37', 
  'classification'='csv', 
  'columnsOrdered'='true', 
  'compressionType'='none', 
  'delimiter'=',', 
  'objectCount'='1', 
  'recordCount'='4', 
  'sizeKey'='148', 
  'skip.header.line.count'='1', 
  'typeOfData'='file')
```

## Option 2: Manually create the Table on Athena
```sql
CREATE EXTERNAL TABLE `athena_csv`(
  `PK` int, 
  `Name` string, 
  `Gender` string, 
  `Age` int,
  `Address` string)
ROW FORMAT SERDE 
  'org.apache.hadoop.hive.serde2.OpenCSVSerde' 
WITH SERDEPROPERTIES ( 
  'escapeChar'='\\', 
  'quoteChar'='\"', 
  'separatorChar'=',')
LOCATION
  's3://<location>'
TBLPROPERTIES ("skip.header.line.count"="1")
```

