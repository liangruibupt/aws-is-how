import psycopg2
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Functions for reading scripts
class ScriptReader(object):

    @staticmethod
    def get_script(path):
        return open(path, 'r').read()

# Redshift functions to send and retrieve data


class RedshiftDataManager(object):
    @staticmethod
    def execute_update(con, cur, script):
        message = None

        try:
            cur.execute(script)
            con.commit()
            result = True
        except Exception as error:
            logging.error(error)
            con.rollback()
            message = error
            result = False
        finally:
            con.close()

        return (result, message)

    @staticmethod
    def execute_query(con, cur, script):
        try:
            cur.execute(script)
            con.commit()
            result = cur.fetchall()
        except Exception as error:
            logging.error(error)
            con.rollback()
            result = []
        finally:
            con.close()
        return result

    @staticmethod
    def get_conn_string(db_conn):
        return "dbname='{}' port='5439' user='{}' password='{}' host='{}'".format(
            db_conn['db_name'], db_conn['db_username'], db_conn['db_password'], db_conn['db_host'])

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
