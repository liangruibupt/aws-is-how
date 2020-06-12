import logging
import json
from athena_query_helper import run_sql, craeteDB, craeteTable, run_query, get_ddl, CustomError
import os

# athena constant
DATABASE = os.environ["Athena_Database"]
TABLE = os.environ["Athena_Table"]

# S3 constant
Bucket_Name = os.environ["Output_Data_Bucket"]
Output_prefix = os.environ["Output_Prefix"]
CreateTable_DDL_Bucket = os.environ["CreateTable_DDL_Bucket"]
CreateTable_DDL_File = os.environ["CreateTable_DDL_File"]

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    logger.info(event)
    logger.info(context)
    # get keyword
    database = event.get('Athena_Database', DATABASE)
    table = event.get('Athena_Table', TABLE)
    output_bucket = event.get('Output_Data_Bucket', Bucket_Name)
    output_prefix = event.get("Output_Prefix", Output_prefix)

    createtable_ddl_bucket = event.get(
        'CreateTable_DDL_Bucket', CreateTable_DDL_Bucket)
    createtable_ddl_file = event.get(
        'CreateTable_DDL_File', CreateTable_DDL_File)
    
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
        "WaitTask": {
            "QueryExecutionId": result['query_execution_id'],
            "ResultPrefix": "CreateTable",
            "QueryState": result['query_execution_status']
        }
    }

    return event
