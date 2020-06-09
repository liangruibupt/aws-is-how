import logging
import json
from athena_query_helper import run_sql, craeteDB, craeteTable, run_query

# athena constant
DATABASE = 'sampledb'
TABLE = 'user_email'

# S3 constant
Bucket_Name = 'ray-datalake-lab'
S3_Bucket = "s3://%s/sample/user_email" % (Bucket_Name)
Output_prefix = "results/user_email"

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):

    # get keyword
    database = event.get('database', DATABASE)
    table = event.get('table', TABLE)
    s3_location = event.get('s3_location', S3_Bucket)
    output_bucket = event.get('Bucket_Name', Bucket_Name)
    output_prefix = event.get("Output_Prefix", Output_prefix)

    # Get the database
    craeteDB(database, output_bucket, output_prefix)

    # Create the table
    createtable_sql = "CREATE EXTERNAL TABLE %s( \
                     name string, \
                     email string \
                   ) \
                   ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe' \
                   WITH SERDEPROPERTIES ('ignore.malformed.json' = 'true') \
                   LOCATION '%s'; \
                   " % (table, s3_location)
    craeteTable(database, table, createtable_sql, output_bucket, output_prefix)

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
        
