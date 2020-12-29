import boto3
import os
import json
from urllib.parse import unquote_plus
import numpy as np
import pandas as pd

s3_client = boto3.client('s3')

s3_json_prefix = 'catalog_test/lambda_json/'


def convert_schema(s3_bucket, s3_key):
    file_path = 's3://{}/{}'.format(s3_bucket, s3_key)
    print('Handling {}'.format(file_path))
    # Read the s3 csv file and create the DataFrame
    raw_board_csv_df = pd.read_csv(file_path, index_col=None, nrows=1, skipinitialspace=True,
                                delim_whitespace=True, keep_default_na=True, na_filter=True)
    print(raw_board_csv_df.head())
    raw_component_csv_df = pd.read_csv(file_path, index_col=None, header=2, delimiter=',', 
                                skipinitialspace=True, keep_default_na=True, na_filter=True)
    print(raw_component_csv_df.head())

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
    local_file_name = os.path.basename(s3_key) + '.json'
    s3_json_key = s3_json_prefix + local_file_name
    upload_file_path = 's3://{}/{}'.format(s3_bucket, s3_json_key)
    print('upload to S3 {}'.format(upload_file_path))
    local_file_path = '/tmp/{}'.format(local_file_name)
    raw_data_json_df.to_json(local_file_path, orient="records", lines=True)
    s3_client.upload_file(Filename=local_file_path,
                          Bucket=s3_bucket, Key=s3_json_key)


def lambda_handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])
        convert_schema(bucket, key)
