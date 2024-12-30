import sys
import os
import logging
import pymysql
import boto3
import base64
from botocore.exceptions import ClientError

# Create a Secrets Manager client
CURRENT_REGION = os.environ["AWS_REGION"]
secretsmanager_client = boto3.client(
    'secretsmanager', region_name=CURRENT_REGION)

#rds settings
rds_host = "nlb.proxysql.local"
name = "admin"
db_name = "demo"
secret_name = "ProxysqlFargateStack-auroraMasterSecret"

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def lambda_handler(event, context):
    decoded_binary_secret = "dummy"
    try:
        describe_secret_response = secretsmanager_client.describe_secret(
            SecretId=secret_name
        )
        logger.info("describe_secret_response %s" % (describe_secret_response))
        get_secret_value_response = secretsmanager_client.get_secret_value(
            SecretId=describe_secret_response['ARN']
        )
        # logger.info("get_secret_value_response %s" %
        #             (get_secret_value_response))
    except ClientError as e:
        logger.error(e.response['Error'])
        raise e
    else:
        if 'SecretString' in get_secret_value_response:
            secret = get_secret_value_response['SecretString']
            #logger.info("secret %s " % (secret))
        else:
            decoded_binary_secret = base64.b64decode(
                get_secret_value_response['SecretBinary'])
            #logger.info("decoded_binary_secret %s " % (decoded_binary_secret))

    try:
        conn = pymysql.connect(rds_host, user=name,
                               passwd="'"+decoded_binary_secret+"'", db=db_name, connect_timeout=5)
    except pymysql.MySQLError as e:
        logger.error(
            "ERROR: Unexpected error: Could not connect to MySQL instance.")
        logger.error(e)
        sys.exit()

    logger.info("SUCCESS: Connection to RDS MySQL instance succeeded")

    """
    This function fetches content from MySQL RDS instance
    """

    item_count = 0

    with conn.cursor() as cur:
        cur.execute(
            "create table Employee ( EmpID  int NOT NULL, Name varchar(255) NOT NULL, PRIMARY KEY (EmpID))")
        cur.execute('insert into Employee (EmpID, Name) values(1, "Joe")')
        cur.execute('insert into Employee (EmpID, Name) values(2, "Bob")')
        cur.execute('insert into Employee (EmpID, Name) values(3, "Mary")')
        conn.commit()
        cur.execute("select * from Employee")
        for row in cur:
            item_count += 1
            logger.info(row)
            #print(row)
    conn.commit()

    return "Added %d items from RDS MySQL table" % (item_count)
