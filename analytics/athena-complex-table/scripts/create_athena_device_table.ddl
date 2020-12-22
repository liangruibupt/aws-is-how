
--Create the device_csv table
-- Data type: https://docs.aws.amazon.com/athena/latest/ug/data-types.html

CREATE EXTERNAL TABLE IF NOT EXISTS `device_csv`(
  `Component ID` STRING, 
  `Volume(%)` FLOAT, 
  `Height(um)` FLOAT, 
  `Area(%)` FLOAT,
  `OffsetX(%)` FLOAT,
  `OffsetY(%)` FLOAT,
  `Volume(um3)` INT,
  `Area(um2)` INT,
  `Result` STRING,
  `PinNumber` INT, 
  `Pad Verification` STRING,
  `Shape` STRING,
  `Library_Name` STRING,
  `Vol_Min(%)` INT,
  `Vol_Max(%)` INT,
  `Height_Low(um)` INT,
  `Height_High(um)` INT,
  `Area_Min(%)` INT,
  `Area_Max(%)` INT,
  `OffsetX_Error(mm)` FLOAT,
  `OffsetY_Error(mm)` FLOAT)
ROW FORMAT SERDE 
  'org.apache.hadoop.hive.serde2.OpenCSVSerde' 
WITH SERDEPROPERTIES ( 
  'escapeChar'='\\', 
  'quoteChar'='\"', 
  'separatorChar'=',')
LOCATION
  's3://ray-glue-streaming/catalog_test/complextable/'
TBLPROPERTIES ("skip.header.line.count"="3");