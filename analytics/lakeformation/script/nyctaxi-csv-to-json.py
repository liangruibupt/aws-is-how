import boto3
import io
import pandas as pd
import sys
from awsglue.utils import getResolvedOptions

args = getResolvedOptions(sys.argv, ['bucket'])

client = boto3.client('s3')
s3 = boto3.resource('s3')

bucket=args['bucket']

obj = client.get_object(Bucket=bucket, Key='glue/nyctaxi/tripdata.csv')

df = pd.read_csv(obj['Body'])

jsonBuffer = io.StringIO()

df.head(10).to_json(jsonBuffer, orient='records');

s3.Bucket(bucket).put_object(Key='glue/nyctaxi/tripdata.json', Body=jsonBuffer.getvalue())