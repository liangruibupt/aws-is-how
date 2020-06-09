import logging
import json
from athena_query_helper import get_query_output
import os

# S3 constant
Bucket_Name = os.environ["Output_Data_Bucket"]
Output_prefix = os.environ["Output_Prefix"]

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    # get keyword
    output_bucket = event.get('Output_Data_Bucket', Bucket_Name)
    output_prefix = event.get("Output_Prefix", Output_prefix)
    query_execution_id = event["MyQueryExecutionId"]

    # Get the query output
    output_information = get_query_output(
        query_execution_id, output_bucket, output_prefix)

    event["GotResult"] = True

    output_key = "{}OutputInformation".format(
        event["WaitTask"]["ResultPrefix"])
    event[output_key] = output_information

    return event
