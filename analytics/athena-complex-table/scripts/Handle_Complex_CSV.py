import json
import boto3
import numpy as np  # linear algebra
import pandas as pd  # data processing, CSV file I/O (e.g. pd.read_csv)
import matplotlib.pyplot as plt # virtulization

# Import awswrangler for easy access to glue catalog and Athena
#!pip install -i https://pypi.tuna.tsinghua.edu.cn/simple awswrangler
import awswrangler as wr

import boto
import json
import os

"""
    List objects in an S3 bucket.

    :param bucket: Name of the S3 bucket.
    :param prefix: Only fetch objects whose key starts with
        this prefix (optional).
    :param suffix: Only fetch objects whose keys end with
        this suffix (optional).
"""
def get_all_s3_objects(bucket, prefix='', suffix=''):
    """Get a list of all keys in an S3 bucket."""
    paginator = s3_client.get_paginator("list_objects_v2")

    kwargs = {'Bucket': bucket}
    if isinstance(prefix, str):
        prefixes = (prefix, )
    else:
        prefixes = prefix

    for key_prefix in prefixes:
        kwargs["Prefix"] = key_prefix

        for page in paginator.paginate(**kwargs):
            try:
                contents = page["Contents"]
            except KeyError:
                break

            for obj in contents:
                key = obj["Key"]
                if key.endswith(suffix) and key != prefix:
                    yield obj


def get_all_s3_keys(bucket, prefix="", suffix=""):
    """
    Generate the keys in an S3 bucket.

    :param bucket: Name of the S3 bucket.
    :param prefix: Only fetch keys that start with this prefix (optional).
    :param suffix: Only fetch keys that end with this suffix (optional).
    """
    for obj in get_all_s3_objects(bucket, prefix, suffix):
        yield obj["Key"]


"""
Read the csv file from S3

raw_board_csv_df = pd.read_csv(s3.open(file_path,mode='rb'), index_col=None, nrows=1, skipinitialspace=True, delim_whitespace=True)
raw_board_csv_df = wr.s3.read_csv(file_path, index_col=None, nrows=1, skipinitialspace=True, delim_whitespace=True)

Convert the csv to json as 
    {barcode=xxx, index=xxx, ... job= xxx, component=[{Component ID=aaa, Volume=bbb, Height=ccc ...}, {Component ID=aaa1, Volume=bbb1, Height=ccc1 ...}, ....]}
"""
# Reading remote files
# https://pandas.pydata.org/pandas-docs/stable/user_guide/io.html#reading-remote-files
# !pip install -i https://pypi.tuna.tsinghua.edu.cn/simple s3fs

s3_csv_prefix = 'catalog_test/complextable/'
s3_json_prefix = 'catalog_test/complex_json/'
for s3_key in get_all_s3_keys(s3_bucket, s3_csv_prefix):
    file_path = 's3://{}/{}'.format(s3_bucket, s3_key)
    print(file_path)

    # Read the s3 csv file and create the DataFrame for BoardInfo with first 2 lines (L1 as header, L2 as data)
    # Option1：use the native pandas
    #raw_board_csv_df = pd.read_csv(s3.open(file_path,mode='rb'), index_col=None, nrows=1, skipinitialspace=True, delim_whitespace=True)
    # Option2: use the aws-data-wrangler https://aws-data-wrangler.readthedocs.io/en/stable/
    raw_board_csv_df = wr.s3.read_csv(file_path, index_col=None, nrows=1, skipinitialspace=True,
                                      delim_whitespace=True, keep_default_na=True, na_filter=True)
    #print(raw_board_csv_df.head())

    # Read the s3 csv file and create the DataFrame for ComponetInfo with rest lines (L3 as header, others as data)
    # Option1：use the native pandas
    #raw_component_csv_df = pd.read_csv(s3.open(file_path,mode='rb'), index_col=None, header=2, delimiter=',', skipinitialspace=True)
    # Option2: use the aws-data-wrangler https://aws-data-wrangler.readthedocs.io/en/stable/
    raw_component_csv_df = wr.s3.read_csv(
        file_path, index_col=None, header=2, delimiter=',', skipinitialspace=True, keep_default_na=True, na_filter=True)
    #print(raw_component_csv_df.head())

    # Iterate the DataFrame and convert to json
    raw_data_json = {}
    # BoardInfo
    for index, data in raw_board_csv_df.iterrows():
        for column_name in raw_board_csv_df.columns:
            column_name_str = column_name.replace(" ", "")
            column_name_str = column_name_str.replace("(", "_")
            column_name_str = column_name_str.replace(")", "_")
            column_name_str = column_name_str.replace("%", "percentage")
            column_name_str = column_name_str.replace(":", "_")
            raw_data_json[column_name_str] = data[column_name]
    #print('converted_raw_data:', json.dumps(raw_data_json))

    # ComponentInfo
    component_json_array = []
    for index, data in raw_component_csv_df.iterrows():
        component_json = {}
        for column_name in raw_component_csv_df.columns:
            column_name_str = column_name.replace(" ", "")
            column_name_str = column_name_str.replace("(", "_")
            column_name_str = column_name_str.replace(")", "_")
            column_name_str = column_name_str.replace("%", "percentage")
            column_name_str = column_name_str.replace(":", "_")
            component_json[column_name_str] = data[column_name]
        component_json_array.append(component_json)
    raw_data_json['aggrate_component_info'] = component_json_array

    # Convert the dict to DataFrame
    raw_data_json_df = pd.DataFrame.from_dict(raw_data_json)
    print(raw_data_json_df.head())
    print('raw_data_json_df size: ', raw_data_json_df.shape)
    print(raw_data_json_df.at[0, 'aggrate_component_info'])

    # upload to S3
    s3_json_key = s3_json_prefix + os.path.basename(s3_key) + '.json'
    upload_file_path = 's3://{}/{}'.format(s3_bucket, s3_json_key)
    print('upload to S3 {}'.format(upload_file_path))
    # json.dump can NOT support flatten array to each line
    #with open("aggrate_component_info.json", "w") as outfile:
    #    json.dump(raw_data_json, outfile)
    # upload to S3 # Option1: Save to temporay file and uplaod to S3, then Use the S3 client, here orient="records", lines=True to flatten array to each line
    #raw_data_json_df.to_json("aggrate_component_info.json", orient="records", lines=True)
    #s3_client.upload_file(Filename='aggrate_component_info.json', Bucket=s3_bucket, Key=s3_json_key)

    # Option2: use the aws-data-wrangler https://aws-data-wrangler.readthedocs.io/en/stable/, here orient="records", lines=True to flatten array to each line
    wr.s3.to_json(
        df=raw_data_json_df,
        path=upload_file_path,
        orient="records",
        lines=True
    )

"""
## Create the external table (AWS Glue Catalog table)

- You can run crawler to create the table
- You can also create the external table on Athena
"""
json_file_path = 's3://{}/{}'.format(s3_bucket, s3_json_prefix)

query = r'''
      CREATE EXTERNAL TABLE IF NOT EXISTS `sampledb`.`complex_json_structure` (
      `BARCODE` string, 
      `INDEX` int,
      `DATE` string,
      `S.TIME` string,
      `E.TIME` string,
      `JOB` string,
      `RESULT` string,
      `USER` string,
      `LOTINFO` string,
      `MACHINE` string,
      `SIDE` string,
      `aggrate_component_info` struct<ComponentID:string,Volume_percentage_:float,Height_um_:float,Area_percentage_:float,OffsetX_percentage_:float,OffsetY_percentage_:float,Volume_um3_:int,Area_um2_:int,Result:string,PinNumber:string,PadVerification:string,Shape:string,Library_Name:string,Vol_Min_percentage_:int,Vol_Max_percentage_:int,Height_Low_um_:int,Height_High_um_:int,Area_Min_percentage_:int,Area_Max_percentage_:int,OffsetX_Error_mm_:float,OffsetY_Error_mm_:float,Unnamed_21:string>
      )
    ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
    WITH SERDEPROPERTIES (
      'ignore.malformed.json'='true',
      'paths'='BARCODE,INDEX,DATE,S.TIME,E.TIME,JOB,RESULT,USER,LOTINFO,MACHINE,SIDE,aggrate_component_info'
    )
    STORED AS INPUTFORMAT 'org.apache.hadoop.mapred.TextInputFormat' 
    OUTPUTFORMAT 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'
    LOCATION '{}'
    '''
query = query.format(json_file_path)
print(query)

query_exec_id = wr.athena.start_query_execution(sql=query, database="sampledb")
wr.athena.wait_query(query_execution_id=query_exec_id)
res = wr.athena.get_query_execution(query_execution_id=query_exec_id)
print("Athena query {} result: {}".format(query_exec_id, res["Status"]["State"]))

"""
## Athena Query
"""
# Retrieving the data from Amazon Athena
query = r'''SELECT * FROM "sampledb"."complex_json_structure" limit 10;
    '''
df = wr.athena.read_sql_query(sql=query, database="sampledb")
print(df.head())
scanned_bytes = df.query_metadata["Statistics"]["DataScannedInBytes"]
print(scanned_bytes/1024)

query = r'''
SELECT * FROM "sampledb"."complex_json_structure" as t 
where t.barcode='MN634850' and t.index=24857 and t.JOB='A5E41637164-04-TOP' limit 10;
'''
df = wr.athena.read_sql_query(sql=query, database="sampledb")
print(df.head())
# Check how many date athen scanned to get the result
scanned_bytes = df.query_metadata["Statistics"]["DataScannedInBytes"]
print(scanned_bytes/1024)

query = r'''
SELECT * FROM "sampledb"."complex_json_structure" as t 
where t.barcode='MN635582' and t.index=24566 and t.JOB='A5E41637164-04-BOT' and t.aggrate_component_info.ComponentID='1:C82_01' 
limit 10;
'''
df = wr.athena.read_sql_query(sql=query, database="sampledb")
print(df.head())
# Check how many date athen scanned to get the result
scanned_bytes = df.query_metadata["Statistics"]["DataScannedInBytes"]
print(scanned_bytes/1024)
