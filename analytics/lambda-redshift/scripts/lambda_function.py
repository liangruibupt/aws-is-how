from redshift_utils import ScriptReader
from redshift_utils import RedshiftDataManager
import os
import sys
import logging
import boto3

REDSHIFT_DATABASE = os.environ['REDSHIFT_DATABASE']
REDSHIFT_USER = os.environ['REDSHIFT_USER']
REDSHIFT_PASSWD = os.environ['REDSHIFT_PASSWD']
REDSHIFT_PORT = os.environ['REDSHIFT_PORT']
REDSHIFT_ENDPOINT = os.environ['REDSHIFT_ENDPOINT']
SCRIPT_PATH = os.environ['SCRIPT_PATH']
REDSHIFT_CLUSTER = os.environ['REDSHIFT_CLUSTER']

client = boto3.client('redshift')

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def get_creds():
    try:
        creds = client.get_cluster_credentials(
            DbUser=REDSHIFT_USER,
            DbName=REDSHIFT_DATABASE,
            ClusterIdentifier=REDSHIFT_CLUSTER,
            DurationSeconds=3600)
        DB_CONNECTION = {
            'db_host': REDSHIFT_ENDPOINT,
            'db_port': REDSHIFT_PORT,
            'db_name': REDSHIFT_DATABASE,
            'db_username': creds['DbUser'],
            'db_password': creds['DbPassword']
        }
        return DB_CONNECTION
    except Exception as ERROR:
        logging.error("Get credentials issue: " + ERROR)
        raise ERROR


def redshift_update(event, context):
    logger.info(event)
    logger.info(context)

    DB_CONNECTION = get_creds()
    script = ScriptReader.get_script(SCRIPT_PATH)
    result = RedshiftDataManager.run_update(script, DB_CONNECTION)
    event = {
        "ExecutionState": result['ExecutionState'],
        "ExecutionMessage": result['ExecutionMessage']
    }

    return event


def redshift_query(event, context):
    logger.info(event)
    logger.info(context)

    DB_CONNECTION = get_creds()
    script = ScriptReader.get_script(SCRIPT_PATH)
    result = RedshiftDataManager.run_query(script, DB_CONNECTION)
    event = {
        "ExecutionState": result['ExecutionState'],
        "ExecutionMessage": result['ExecutionMessage']
    }

    return event


def redshift_long_query(event, context):
    logger.info(event)
    logger.info(context)

    output_bucket = event.get('Output_Data_Bucket')

    DB_CONNECTION = get_creds()
    script = ScriptReader.get_script(SCRIPT_PATH)
    result = RedshiftDataManager.run_query_output(
        script, DB_CONNECTION, output_bucket)
        
    event = {
        "ExecutionState": result['ExecutionState'],
        "ExecutionMessage": result['ExecutionMessage']
    }

    return event
