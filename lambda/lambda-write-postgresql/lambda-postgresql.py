import psycopg2
import logging
import traceback
from os import environ

endpoint = environ.get('RDS_HOST')
port = environ.get('RDS_PORT')
dbuser = environ.get('RDS_USERNAME')
password = environ.get('RDS_USER_PWD')
database = environ.get('RDS_DB_NAME')

logger = logging.getLogger()
logger.setLevel(logging.INFO)


def log_err(errmsg):
    logger.error(errmsg)
    return {"body": errmsg, "headers": {}, "statusCode": 400,
            "isBase64Encoded": "false"}


class ScriptReader(object):
    @staticmethod
    def get_script(path):
        return open(path, 'r').read().replace('\n', ' ')


class PostgreSQLDataManager(object):
    @staticmethod
    def execute_update(con, cur, sql_str):
        message = "execute {} done".format(sql_str)

        try:
            cur.execute(sql_str)
            con.commit()
            status = "Success"
        except Exception as error:
            con.rollback()
            status = "Failied"
            return log_err(error)
        finally:
            con.close()

        return {
            "ExecutionState": status,
            "ExecutionMessage": message
        }

    @staticmethod
    def execute_query(con, cur, sql_str):
        try:
            cur.execute(sql_str)
            con.commit()
            result = cur.fetchall()
            status = "Success"
        except Exception as error:
            con.rollback()
            status = "Failied"
            result = []
            return log_err(error)
        finally:
            con.close()
        return {
            "ExecutionState": status,
            "ExecutionMessage": result
        }

    @staticmethod
    def make_connection():
        conn_str = "host={0} dbname={1} user={2} password={3} port={4}".format(
            endpoint, database, dbuser, password, port)
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        return conn

    @staticmethod
    def run_update(sql_str):
        con = PostgreSQLDataManager.make_connection()
        return PostgreSQLDataManager.execute_update(con, con.cursor(), sql_str)

    @staticmethod
    def run_query(sql_str):
        con = PostgreSQLDataManager.make_connection()
        return PostgreSQLDataManager.execute_query(con, con.cursor(), sql_str)


logger.info("Cold start complete.")


def handler(event, context):
    logger.info(event)
    default_path = 'sample_query.ddl'
    script_path = event.get('script_path', default_path)
    try:
        #script = ScriptReader.get_script(script_path)
        #logger.info(script)
        query_str = "select * from device_status limit 5;"
        result = PostgreSQLDataManager.run_query(query_str)
        logger.info(result)

        deviceid = event.get('deviceid')
        critical = event.get('critical')
        alertmessage = event.get('alertmessage')
        alertcount = event.get('alertcount')
        eventtime = event.get('eventtime')
        script = ScriptReader.get_script(script_path)
        logger.info(script)
        sql = script % (str(deviceid), int(critical), str(
            alertmessage), int(alertcount), str(eventtime))
        logger.info(sql)
        result = PostgreSQLDataManager.run_update(sql)
        return {"body": str(result), "headers": {}, "statusCode": 200,
                "isBase64Encoded": "false"}
    except Exception as error:
        return log_err(error)


if __name__ == "__main__":
    # script = ScriptReader.get_script('sample_query.ddl')
    # print(script)
    # sql = script % ('1626712066.457285_6', 3, 'Temperature exceeded INTC', 8, '2021-07-20 00:13:16')
    # print(sql)
    handler(None, None)
