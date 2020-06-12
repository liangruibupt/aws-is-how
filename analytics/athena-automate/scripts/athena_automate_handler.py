import logging
import json
from athena_query_helper import get_ddl, execute_ddl, run_sql, run_query, get_execution_status, get_query_output, CustomError
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


def athena_start_long_running_query(event, context):
    logger.info(event)
    logger.info(context)        
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
        raise CustomError("Get athena_sql failed")

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

def athena_short_running_query(event, context):
    logger.info(event)
    logger.info(context)
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
        raise CustomError("Get athena_sql failed")

    # get query results
    result = run_query(athena_sql, database, S3_Output, Output_prefix)
    logging.info('The query result: ')
    logging.info(result)

    # get data
    if len(result) == 0:
        return "Finish Lambda exeuction with non value"
    else:
        return result
    

def athena_get_long_running_status(event, context):
    logger.info(event)
    logger.info(context)
    query_execution_id = event["WaitTask"]["QueryExecutionId"]

    # Get the status
    status_information = get_execution_status(query_execution_id)

    event["WaitTask"]["QueryState"] = status_information['QueryState'],

    status_key = "{}StatusInformation".format(
        event["WaitTask"]["ResultPrefix"])
    event[status_key] = status_information

    return event


def athena_get_long_running_result(event, context):
    logger.info(event)
    logger.info(context)
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