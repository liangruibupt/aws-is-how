import logging
import json
from athena_query_helper import run_sql, craeteDB, craeteTable, run_query, get_ddl, CustomError
import os

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(event)
    logger.info(context)
    # get keyword
    database = event.get('Athena_Database')
    table = event.get('Athena_Table')
    output_bucket = event.get('Output_Data_Bucket')
    output_prefix = event.get("Output_Prefix")

    createtable_ddl_bucket = event.get('Athena_DDL_Bucket')
    createtable_ddl_file = event.get('Athena_DDL_File')
    taskName = event.get('TaskName')
    
    # Get the database
    craeteDB(database, output_bucket, output_prefix)

    # Create the table
    createtable_sql = get_ddl(createtable_ddl_bucket, createtable_ddl_file)
    if createtable_sql == None:
        raise CustomError("Get createtable_ddl failed")
    
    result = craeteTable(database, table, createtable_sql, output_bucket, output_prefix)
    event = {
        "MyQueryExecutionId": result['query_execution_id'],
        "MyQueryExecutionStatus": result['query_execution_status'],
        "TaskName": taskName,
        "WaitTask": {
            "QueryExecutionId": result['query_execution_id'],
            "ResultPrefix": "CreateTable",
            "QueryState": result['query_execution_status'],
            "QueryResult": result['query_execution_result']
        }
    }

    return event
