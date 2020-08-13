from redshift_utils import ScriptReader
from redshift_utils import RedshiftDataManager
import os, getopt
import sys
import logging
import boto3

REDSHIFT_DATABASE = os.environ['REDSHIFT_DATABASE']
REDSHIFT_USER = os.environ['REDSHIFT_USER']
REDSHIFT_PASSWD = os.environ['REDSHIFT_PASSWD']
REDSHIFT_PORT = os.environ['REDSHIFT_PORT']
REDSHIFT_ENDPOINT = os.environ['REDSHIFT_ENDPOINT']
REDSHIFT_CLUSTER = os.environ['REDSHIFT_CLUSTER']
S3_BUCKET_REGION = os.environ['S3_BUCKET_REGION']

print('my_region %s' % S3_BUCKET_REGION)

client = boto3.client('redshift', region_name=S3_BUCKET_REGION)

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


def redshift_update(event, context, script_path):
    logger.info(event)
    logger.info(context)

    DB_CONNECTION = get_creds()
    script = ScriptReader.get_script(script_path)
    #print(script)
    result = RedshiftDataManager.run_update(script, DB_CONNECTION)
    event = {
        "ExecutionState": result['ExecutionState'],
        "ExecutionMessage": result['ExecutionMessage']
    }

    return event


def redshift_query(event, context, script_path):
    logger.info(event)
    logger.info(context)

    DB_CONNECTION = get_creds()
    script = ScriptReader.get_script(script_path)
    result = RedshiftDataManager.run_query(script, DB_CONNECTION)
    event = {
        "ExecutionState": result['ExecutionState'],
        "ExecutionMessage": result['ExecutionMessage']
    }

    return event


# def redshift_long_query(event, context, script_path, output_bucket, output_prefix):
#     logger.info(event)
#     logger.info(context)

#     DB_CONNECTION = get_creds()
#     script = ScriptReader.get_script(script_path)
#     result = RedshiftDataManager.run_query_output(
#         script, DB_CONNECTION, output_bucket, output_prefix)
        
#     event = {
#         "ExecutionState": result['ExecutionState'],
#         "ExecutionMessage": result['ExecutionMessage']
#     }

#     return event

def flights_table_demo(event, context):
    #create_flights_table
    SCRIPT_PATH='create_flights_table.ddl'
    result = redshift_update(event,context,SCRIPT_PATH)
    print("create_flights_table %s" % (result))
    
    #copy_flights_table_data
    SCRIPT_PATH='copy_flights_table_data.ddl'
    result = redshift_update(event,context,SCRIPT_PATH)
    print("copy_flights_table_data %s" % (result))
    
    #query_flights_table
    SCRIPT_PATH='query_flights_table.ddl'
    result = redshift_query(event,context,SCRIPT_PATH)
    print("query_flights_table %s" % (result))
    
def aircraft_table_demo(event, context):
    #create_aircraft_table
    SCRIPT_PATH='create_aircraft_table.ddl'
    result = redshift_update(event,context,SCRIPT_PATH)
    print("create_aircraft_table %s" % (result))
    
    #copy_aircraft_table_data
    SCRIPT_PATH='copy_aircraft_table_data.ddl'
    result = redshift_update(event,context,SCRIPT_PATH)
    print("copy_aircraft_table_data %s" % (result))
    
    #query_aircraft_table
    SCRIPT_PATH='query_aircraft_table.ddl'
    result = redshift_query(event,context,SCRIPT_PATH)
    print("query_aircraft_table %s" % (result))

def airports_table_demo(event, context):
    
    # try:
    #     output_bucket = event.get('Output_Data_Bucket')
    #     output_prefix = event.get('Output_Data_Prefix')
    # except Exception as error:
    #     output_bucket = 'ray-redshift-training'
    #     output_prefix = 'results/redshift_etl_demo/'
        
    #create_airports_table
    SCRIPT_PATH='create_airports_table.ddl'
    result = redshift_update(event,context,SCRIPT_PATH)
    print("create_airports_table %s" % (result))
    
    #copy_airports_table_data
    SCRIPT_PATH='copy_airports_table_data.ddl'
    result = redshift_update(event,context,SCRIPT_PATH)
    print("copy_airports_table_data %s" % (result))
    
    #create_as_select_table
    SCRIPT_PATH='create_as_select_table.ddl'
    result = redshift_update(event,context,SCRIPT_PATH)
    print("create_as_select_table %s" % (result))
    
    #query_create_as_select_table
    SCRIPT_PATH='query_create_as_select_table.ddl'
    result = redshift_update(event,context,SCRIPT_PATH)
    print("query_create_as_select_table %s" % (result))
    
    #query_create_as_select_table2
    SCRIPT_PATH='query_create_as_select_table2.ddl'
    result = redshift_update(event,context,SCRIPT_PATH)
    print("query_create_as_select_table2 %s" % (result))
    
def main():
    event={}
    context={}
    function=None
    verbose = False
    opts, args = getopt.getopt(sys.argv[1:],"hf:s:v",["help","function=", "sql_path="])
    #print(opts, args)
    for opt, arg in opts:
      #print(opt,arg)
      if opt == "-v":
        verbose = True
      elif opt in ("-h", "--help"):
        print('redshift_etl_demo.py -f <function> -s <sql_path>')
        sys.exit()
      elif opt in ("-f", "--function"):
        function = arg
      elif opt in ("-s", "--sql_path"):
        sql_path = arg
     
    print('function is %s sql_path is %s' % (function, sql_path))
    
    if function=='flights_table_demo':
        flights_table_demo(event, context)
    elif function=='aircraft_table_demo':
        aircraft_table_demo(event, context)
    elif function=='airports_table_demo':
        airports_table_demo(event, context)
    elif function=='redshift_update':
        if sql_path == "":
            print('redshift_update missing sql_path')
            sys.exit() 
        else:
            result = redshift_update(event,context,sql_path)
            print("redshift_update %s" % (result))
    elif function=='redshift_query':
        if sql_path == "":
            print('redshift_query missing sql_path')
            sys.exit() 
        else:
            result = redshift_query(event,context,sql_path)
            print("redshift_query %s" % (result))
            
if __name__ == "__main__":
    main()