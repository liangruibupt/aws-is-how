import time
import boto3
from botocore.exceptions import ClientError
import logging
from retrying import retry
import os
import csv
import json

# athena constant
DATABASE = 'sampledb'
TABLE = 'user_email'

# S3 constant
Bucket_Name = 'ray-datalake-lab'
S3_Bucket = "s3://%s/sample/user_email" % (Bucket_Name)
Output_prefix = "results/user_email"
S3_Output = "s3://%s/%s" % (Bucket_Name, Output_prefix)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# athena client
athena_client = boto3.client('athena')
s3_client = boto3.client('s3')


@retry(stop_max_attempt_number=10,
       wait_exponential_multiplier=300,
       wait_exponential_max=1 * 60 * 1000)
def poll_status(_id):
    result = athena_client.get_query_execution(QueryExecutionId=_id)
    state = result['QueryExecution']['Status']['State']
    logger.info("STATUS:" + state)

    if state == 'SUCCEEDED':
        logger.info(result)
        return result
    elif state == 'FAILED':
        logger.error(result)
        return result
    else:
        logger.info(result)
        raise Exception


def run_sql(sqlString, database, s3_output):
    response = athena_client.start_query_execution(
        QueryString=sqlString,
        QueryExecutionContext={
            'Database': database
        },
        ResultConfiguration={
            'OutputLocation': s3_output
        })

    QueryExecutionId = response['QueryExecutionId']
    result = poll_status(QueryExecutionId)
    if result['QueryExecution']['Status']['State'] == 'SUCCEEDED':
        logging.info("Query SUCCEEDED: {}".format(QueryExecutionId))

        # get query results
        result = athena_client.get_query_results(
            QueryExecutionId=QueryExecutionId)
        logging.info("get_query_results: " + json.dumps(result))
        return result
    else:
        return None


def craeteDB(database, s3_output):
    try:
        getdatabse = "SHOW DATABASES LIKE '%s'" % (database)
        response = run_sql(getdatabse, database, s3_output)
    except ClientError as e:
        logging.error(e.response['Error'])
        raise e
    if len(response['ResultSet']['Rows']) == 0:
        sqlString = 'create database %s' % (database)
        run_sql(sqlString, database, s3_output)


def craeteTable(database, table, s3_location, s3_output):
    try:
        gettable = "SHOW TABLES IN %s '%s'" % (database, table)
        response = run_sql(gettable, database, s3_output)
    except ClientError as e:
        logging.error(e.response['Error'])
        raise e

    # create table sql
    if len(response['ResultSet']['Rows']) == 0:
        createtable = "CREATE EXTERNAL TABLE %s( \
                     name string, \
                     email string \
                   ) \
                   ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe' \
                   WITH SERDEPROPERTIES ('ignore.malformed.json' = 'true') \
                   LOCATION '%s'; \
                   " % (table, s3_location)

        run_sql(createtable, database, s3_output)


def run_query(query, database, output_bucket, output_prefix):
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
    result = poll_status(QueryExecutionId)

    if result['QueryExecution']['Status']['State'] == 'SUCCEEDED':
        print("Query SUCCEEDED: {}".format(QueryExecutionId))

        s3_key = output_prefix + "/" + QueryExecutionId + '.csv'
        local_filename = '/tmp/{}'.format(QueryExecutionId + '.csv')

        # download result file
        try:
            response = s3_client.download_file(
                output_bucket, s3_key, local_filename)
        except ClientError as e:
            if e.response['Error']['Code'] == "404":
                print("The object does not exist.")
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

        return rows


def lambda_handler(event, context):

    # get keyword
    database = event.get('database', DATABASE)
    table = event.get('table', TABLE)
    s3_location = event.get('s3_location', S3_Bucket)

    # Get the database
    craeteDB(database, S3_Output)

    # Create the table
    craeteTable(database, table, s3_location, S3_Output)

    # get query results
    query = "SELECT name, email FROM %s" % (table)
    result = run_query(query, database, Bucket_Name, Output_prefix)
    logging.info('THe query result: ')
    logging.info(result)

    # get data
    if len(result) == 0:
        return "Finish Lambda exeuction with non value"
    else:
        return result
