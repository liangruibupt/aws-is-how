import time
import boto3
from botocore.exceptions import ClientError
import logging
from retrying import retry
import os
import csv
import json

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# athena client
athena_client = boto3.client('athena')
s3_client = boto3.client('s3')


# Wait 2^x * 300 milliseconds between each retry, up to 60 seconds
@retry(stop_max_attempt_number=10,
       wait_exponential_multiplier=300,
       wait_exponential_max=1 * 60 * 1000)
def poll_status(_id):
    if _id is None:
        logger.info("The query has not been executed!")
        return None

    result = athena_client.get_query_execution(QueryExecutionId=_id)
    state = result['QueryExecution']['Status']['State']
    logger.info("STATUS:" + state)

    if state == 'SUCCEEDED':
        logger.debug(result)
        return result
    elif state == 'FAILED':
        logger.debug(result)
        return result
    else:
        logger.debug(result)
        raise Exception


def get_execution_status(_id):
    if _id is None:
        logger.info("The query has not been executed!")
        return None

    result = athena_client.get_query_execution(QueryExecutionId=_id)
    logger.debug(result)
    
    _query_state = result['QueryExecution']['Status']['State']
    logger.info("Current Query State for Execution ID: %s is: %s" %
                (_id, _query_state))
    _query_string = result['QueryExecution']["Query"]

    if "StateChangeReason" in result['QueryExecution']['Status']:
        _state_change_reason = result['QueryExecution']['Status']["StateChangeReason"]
    else:
        # No state change?!?
        pass

    if "TotalExecutionTimeInMillis" in result['QueryExecution']["Statistics"]:
        _stats_execution_time_in_millis = result['QueryExecution'][
            "Statistics"]["TotalExecutionTimeInMillis"]
    else:
        _stats_execution_time_in_millis = 0

    if "DataScannedInBytes" in result['QueryExecution']["Statistics"]:
        _stats_data_scanned_in_bytes = result['QueryExecution']["Statistics"]["DataScannedInBytes"]
    else:
        _stats_data_scanned_in_bytes = 0
    
    return {
        "QueryState": _query_state,
        "QueryString": _query_string,
        "TotalExecutionTimeInMillis": _stats_execution_time_in_millis,
        "StateChangeReason": _state_change_reason,
        "DataScannedInBytes": _stats_data_scanned_in_bytes
        }

def execute_ddl(query, database, output_bucket, output_prefix):
    s3_output = "s3://%s/%s" % (output_bucket, output_prefix)

    response = athena_client.start_query_execution(
        QueryString=query,
        QueryExecutionContext={
            'Database': database
        },
        ResultConfiguration={
            'OutputLocation': s3_output
        })

    QueryExecutionId = response['QueryExecutionId']

    return QueryExecutionId


def get_query_results(query_execution_id):
    if query_execution_id is None:
        logger.info("The query has not been executed!")
        return None
    # get query results
    result = athena_client.get_query_results(
        QueryExecutionId=query_execution_id)
    return_result = {
        "query_execution_id": query_execution_id,
        "query_execution_status": "SUCCEEDED",
        "query_results": result
    }
    logging.info("get_query_results: " + json.dumps(return_result))
    return return_result

def run_sql(sqlString, database, output_bucket, output_prefix):
    QueryExecutionId = execute_ddl(
        sqlString, database, output_bucket, output_prefix)
    result = poll_status(QueryExecutionId)
    if result['QueryExecution']['Status']['State'] == 'SUCCEEDED':
        logging.info("Query SUCCEEDED: {}".format(QueryExecutionId))

        # get query results
        result = get_query_results(QueryExecutionId)
        return result
    else:
        return {
            "query_execution_id": QueryExecutionId,
            "query_execution_status": result['QueryExecution']['Status']['State']
        }


def craeteDB(database, output_bucket, output_prefix):
    try:
        getdatabse = "SHOW DATABASES LIKE '%s'" % (database)
        response = run_sql(getdatabse, database, output_bucket, output_prefix)
    except ClientError as e:
        logging.error(e.response['Error'])
        raise e
    if len(response['ResultSet']['Rows']) == 0:
        sqlString = 'create database %s' % (database)
        result = run_sql(sqlString, database, output_bucket, output_prefix)
        return result
    else: 
        return "DB %s existed, skip creation" % (database)


def craeteTable(database, table, createtable_sql, output_bucket, output_prefix):
    try:
        gettable = "SHOW TABLES IN %s '%s'" % (database, table)
        response = run_sql(gettable, database, output_bucket, output_prefix)
    except ClientError as e:
        logging.error(e.response['Error'])
        raise e

    # create table sql
    if len(response['ResultSet']['Rows']) == 0:
        result = run_sql(createtable_sql, database, output_bucket, output_prefix)
        return result
    else:
        return "Table %s existed, skip creation" % (table)


def get_query_output(query_execution_id, output_bucket, output_prefix):
    s3_key = output_prefix + "/" + query_execution_id + '.csv'
    local_filename = '/tmp/{}'.format(query_execution_id + '.csv')

    # download result file
    try:
        response = s3_client.download_file(
            output_bucket, s3_key, local_filename)
    except ClientError as e:
        if e.response['Error']['Code'] == "404":
            logging.error("The object does not exist.")
        else:
            raise e
     # read file to array and preview 20 lines
    rows = []
    with open(local_filename) as csvfile:
        reader = csv.DictReader(csvfile)
        count = 0
        for row in reader:
            if (count > 20):
                break
            rows.append(row)
            count += 1
    # delete result file
    if os.path.isfile(local_filename):
        os.remove(local_filename)

    return_result = {
        "query_execution_id": query_execution_id,
        "query_execution_status": "SUCCEEDED",
        "query_results": rows
    }
    return return_result

def run_query(query, database, output_bucket, output_prefix):
    QueryExecutionId = execute_ddl(
        query, database, output_bucket, output_prefix)

    result = poll_status(QueryExecutionId)

    if result['QueryExecution']['Status']['State'] == 'SUCCEEDED':
        logging.info("Query SUCCEEDED: {}".format(QueryExecutionId))
        return_result = get_query_output(
            QueryExecutionId, output_bucket, output_prefix)
        return return_result
    else:
        return {
            "query_execution_id": QueryExecutionId,
            "query_execution_status": result['QueryExecution']['Status']['State']
        }

def get_ddl(ddl_bucket, ddl_file):
    sql = None
    try:
        local_filename = '/tmp/{}'.format(ddl_file)
        response = s3_client.download_file(
            ddl_bucket, ddl_file, local_filename)
    except ClientError as e:
        raise e

    with open(local_filename) as ddl:
        sql = ddl.read()

    return sql
