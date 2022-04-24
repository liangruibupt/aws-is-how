#Using boto3
import boto3
import json
import time
#A session stores configuration state and allows you to create service clients and resources.
session = boto3.Session(profile_name='THE-NAME-OF-PROFILE')
athena = session.client('athena')

response = athena.start_query_execution(
    QueryString='SELECT * FROM DATABASE.TABLE LIMIT 5',
    QueryExecutionContext={
        'Database': 'YOUR-S3-DATABASE-NAME'
    },
    ResultConfiguration={
        'OutputLocation': 'YOUR-OUTPUT-S3-TABLE-NAME',
        'EncryptionConfiguration': {
            'EncryptionOption': 'SSE_S3'
        }
    }
)

while True:
    try:
        query_results = athena.get_query_results(
            QueryExecutionId=response['QueryExecutionId']
        )
        break
    except Exception as err:
        if 'Query has not yet finished' in err.message:
            time.sleep(3)
        else:
            raise(err)

print(json.dumps(query_results['ResultSet']['Rows'], indent=4, sort_keys=False))