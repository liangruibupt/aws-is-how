import logging
import json
from athena_query_helper import get_ddl, execute_ddl
import os

# athena constant
DATABASE = os.environ["Athena_Database"]
TABLE = os.environ["Athena_Table"]

# S3 constant
Bucket_Name = os.environ["Output_Data_Bucket"]
Output_prefix = os.environ["Output_Prefix"]
Athena_DDL_Bucket = os.environ["Athena_DDL_Bucket"]
Athena_DDL_File = os.environ["Athena_DDL_File"]

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):

    # get keyword
    database = event.get('Athena_Database', DATABASE)
    table = event.get('Athena_Table', TABLE)
    output_bucket = event.get('Output_Data_Bucket', Bucket_Name)
    output_prefix = event.get("Output_Prefix", Output_prefix)
    S3_Output = "s3://%s/%s" % (output_bucket, output_prefix)

    athena_ddl_bucket = event.get(
        'Athena_DDL_Bucket', Athena_DDL_Bucket)
    athena_ddl_file = event.get(
        'Athena_DDL_File', Athena_DDL_File)

    # Get the ddl
    athena_sql = get_ddl(athena_ddl_bucket, athena_ddl_file)
    if athena_sql == None:
        raise Exception("Get athena_sql failed")

    # get query results
    query_execution_id = execute_ddl(
        athena_sql, database, S3_Output, Output_prefix)
    logging.info('The query_execution_id %s ' % (query_execution_id))

    # This will be processed by our waiting-step
    event = {
        "MyQueryExecutionId": query_execution_id,
        "MyQueryExecutionStatus": 'Running',
        "WaitTask": {
            "QueryExecutionId": query_execution_id,
            "ResultPrefix": "LongRunning"
        }
    }
    return event
