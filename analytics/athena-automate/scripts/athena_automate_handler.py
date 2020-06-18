import logging
import json
from athena_query_helper import get_ddl, execute_ddl, run_sql, run_query, get_execution_status, get_query_output, CustomError
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def athena_start_long_running_query(event, context):
    logger.info(event)
    logger.info(context)        
    # get keyword
    database = event.get('Athena_Database')
    table = event.get('Athena_Table')
    output_bucket = event.get('Output_Data_Bucket')
    output_prefix = event.get("Output_Prefix")

    athena_ddl_bucket = event.get('Athena_DDL_Bucket')
    athena_ddl_file = event.get('Athena_DDL_File')
    taskName = event.get('TaskName')

    # Get the ddl
    athena_sql = get_ddl(athena_ddl_bucket, athena_ddl_file)
    if athena_sql == None:
        raise CustomError("Get athena_sql failed")

    # get query results
    query_execution_id = execute_ddl(
        athena_sql, database, output_bucket, output_prefix)
    logging.info('The query_execution_id %s ' % (query_execution_id))

    # This will be processed by our waiting-step
    event = {
        "MyQueryExecutionId": query_execution_id,
        "MyQueryExecutionStatus": 'Running',
        "TaskName": taskName,
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
    database = event.get('Athena_Database')
    table = event.get('Athena_Table')
    output_bucket = event.get('Output_Data_Bucket')
    output_prefix = event.get("Output_Prefix")

    athena_ddl_bucket = event.get('Athena_DDL_Bucket')
    athena_ddl_file = event.get('Athena_DDL_File')
    taskName = event.get('TaskName')
    
    # Get the ddl
    athena_sql = get_ddl(athena_ddl_bucket, athena_ddl_file)
    if athena_sql == None:
        raise CustomError("Get athena_sql failed")

    # get query results
    result = run_query(athena_sql, database, output_bucket, output_prefix)
    logging.info('The query result: ')
    logging.info(result)
    
    event = {
        "MyQueryExecutionId": result['query_execution_id'],
        "MyQueryExecutionStatus": result['query_execution_status'],
        "TaskName": taskName,
        "WaitTask": {
            "QueryExecutionId": result['query_execution_id'],
            "ResultPrefix": "ShortRunning",
            "QueryState": result['query_execution_status'],
            "QueryResult": result['query_execution_result']
        }
    }
    
    return event
    

def athena_get_long_running_status(event, context):
    logger.info(event)
    logger.info(context)
    taskName = event.get('TaskName')
    query_execution_id = event.get('QueryExecutionId')

    # Get the status
    status_information = get_execution_status(query_execution_id)
    
    event = {
        "MyQueryExecutionId": query_execution_id,
        "MyQueryExecutionStatus": status_information['QueryState'],
        "TaskName": taskName,
        "WaitTask": {
            "QueryExecutionId": query_execution_id,
            "ResultPrefix": "LongRunning",
            "QueryState": status_information['QueryState'],
            "QueryResult": status_information
        }
    }
    
    return event


def athena_get_long_running_result(event, context):
    logger.info(event)
    logger.info(context)
    # get keyword
    output_bucket = event.get('Output_Data_Bucket')
    output_prefix = event.get("Output_Prefix")
    query_execution_id = event.get('QueryExecutionId')
    taskName = event.get('TaskName')

    # Get the query output
    output_information = get_query_output(
        query_execution_id, output_bucket, output_prefix)

    event = {
        "MyQueryExecutionId": query_execution_id,
        "MyQueryExecutionStatus": output_information['query_execution_status'],
        "TaskName": taskName,
        "WaitTask": {
            "QueryExecutionId": query_execution_id,
            "ResultPrefix": "LongRunning",
            "QueryState": output_information['query_execution_status'],
            "QueryResult": output_information
        }
    }
    
    return event