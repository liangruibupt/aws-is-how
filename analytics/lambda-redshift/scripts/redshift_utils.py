import psycopg2
import logging
import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3_client = boto3.client('s3')

# Functions for reading scripts


class ScriptReader(object):

    @staticmethod
    def get_script(path):
        return open(path, 'r').read().replace('\n', ' ')

# Redshift functions to send and retrieve data


class RedshiftDataManager(object):
    @staticmethod
    def execute_update(con, cur, script):
        message = "execute {} done".format(script)

        try:
            cur.execute(script)
            con.commit()
            status = "Success"
        except Exception as error:
            logging.error(error)
            con.rollback()
            message = error
            status = "Failied"
        finally:
            con.close()

        return {
            "ExecutionState": status,
            "ExecutionMessage": message
        }

    @staticmethod
    def execute_query(con, cur, script):
        try:
            cur.execute(script)
            con.commit()
            result = cur.fetchall()
            status = "Success"
        except Exception as error:
            logging.error(error)
            con.rollback()
            result = []
            status = "Failied"
        finally:
            con.close()
        return {
            "ExecutionState": status,
            "ExecutionMessage": result
        }

    # Redshfit do not support the copy_expert, you can directly use the unload function
    # @staticmethod
    # def execute_query_output(con, cur, script, output_bucket, output_prefix):
    #     message = "execute {} done".format(script)
    #     try:
    #         outputquery = "COPY ('{0}') TO STDOUT WITH CSV HEADER".format(script)
    #         print("outputquery %s" % (outputquery))
    #         local_filename = '/tmp/resultsfile.csv'
    #         with open(local_filename, 'w') as f:
    #             cur.copy_expert(outputquery, f)
    #         #con.commit()
    #         s3_client.upload_file(
    #             local_filename, output_bucket, output_prefix+'resultsfile.csv')
    #         status = "Success"
    #     except Exception as error:
    #         logging.error(error)
    #         con.rollback()
    #         status = "Failied"
    #         message = error
    #     finally:
    #         con.close()
    #     return {
    #         "ExecutionState": status,
    #         "ExecutionMessage": message
    #     }

    @staticmethod
    def get_conn_string(db_conn):
        return "dbname='{}' port='{}' user='{}' password='{}' host='{}'".format(
            db_conn['db_name'], db_conn['db_port'], db_conn['db_username'], db_conn['db_password'], db_conn['db_host'])

    @staticmethod
    def create_conn(conn_string):
        return psycopg2.connect(conn_string)

    @staticmethod
    def get_conn(db_connection):
        return RedshiftDataManager.create_conn(
            RedshiftDataManager.get_conn_string(db_connection))

    @staticmethod
    def run_update(script, db_connection):
        con = RedshiftDataManager.get_conn(db_connection)
        return RedshiftDataManager.execute_update(con, con.cursor(), script)

    @staticmethod
    def run_query(script, db_connection):
        con = RedshiftDataManager.get_conn(db_connection)
        return RedshiftDataManager.execute_query(con, con.cursor(), script)

    @staticmethod
    def run_query_output(script, db_connection, output_bucket, output_prefix):
        con = RedshiftDataManager.get_conn(db_connection)
        return RedshiftDataManager.execute_query_output(con, con.cursor(), script, output_bucket, output_prefix)
