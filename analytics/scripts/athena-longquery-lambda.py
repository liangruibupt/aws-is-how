import time
import boto3

# athena constant
DATABASE = 'your_athena_database_name'
TABLE = 'your_athena_table_name'

# S3 constant
S3_OUTPUT = 's3://your_athena_query_output_backet_name'
S3_BUCKET = 'your_athena_query_output_backet_name'

# number of retries
RETRY_COUNT = 10

# query constant
COLUMN = 'your_column_name'


def lambda_handler(event, context):

    # get keyword
    keyword = event['name']

    # created query
    query = "SELECT * FROM %s.%s where %s = '%s';" % (DATABASE, TABLE, COLUMN, keyword)

    # athena client
    client = boto3.client('athena')

    # Execution
    response = client.start_query_execution(
        QueryString=query,
        QueryExecutionContext={
            'Database': DATABASE
        },
        ResultConfiguration={
            'OutputLocation': S3_OUTPUT,
        }
    )

    # get query execution id
    query_execution_id = response['QueryExecutionId']
    print(query_execution_id)

    # get execution status
    for i in range(1, 1 + RETRY_COUNT):

        # get query execution
        query_status = client.get_query_execution(QueryExecutionId=query_execution_id)
        query_execution_status = query_status['QueryExecution']['Status']['State']

        if query_execution_status == 'SUCCEEDED':
            print("STATUS:" + query_execution_status)
            break

        if query_execution_status == 'FAILED':
            raise Exception("STATUS:" + query_execution_status)

        else:
            print("STATUS:" + query_execution_status)
            time.sleep(i)
    else:
        client.stop_query_execution(QueryExecutionId=query_execution_id)
        raise Exception('TIME OVER')

    # get query results
    result = client.get_query_results(QueryExecutionId=query_execution_id)
    print(result)

    # get data
    if len(result['ResultSet']['Rows']) == 2:

        email = result['ResultSet']['Rows'][1]['Data'][1]['VarCharValue']

        return email

    else:
        return None