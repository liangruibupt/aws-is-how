#!/usr/bin/env python
# coding=utf-8

import os
import sys
import boto3
import base64
import json
from botocore.exceptions import ClientError

basedir = os.path.abspath(os.path.dirname(__file__))
sys.path.append(basedir)
from mysql import connector
import logging
import traceback
import datetime
from logging.handlers import RotatingFileHandler
import configparser
import codecs

cp = configparser.SafeConfigParser()
with codecs.open('./db_config.ini', 'r', encoding='utf-8') as f:
    cp.readfp(f)

def getDbConn(db_user, db_pwd, db_host, db_port, db_database):
    try:
        db = connector.connect(user=db_user, password=db_pwd, host=db_host, port=db_port, database=db_database)
        _status = True
    except Exception:
        db = ''
        _status = False
        logging.error(traceback.format_exc())
    finally:
        return db, _status


def create_table(db):
    logging.info('create_user_table')
    items = cp.items('create_table')
    try:
        for item in items:
            table_name = item[0]
            table_sql = item[1]
            logging.info(table_sql)
            cur = db.cursor()
            cur.execute(table_sql)
            cur.close()
    except Exception as e:
        logging.error('执行异常' + str(e))


def insert_table(db):
    logging.info('insert_table')
    result_info = {}
    items = cp.items('insert_table')
    try:
        for item in items:
            table_schema = item[0]
            table_sql = item[1]
            logging.info(table_sql)
            cur = db.cursor()
            cur.execute(table_sql)
            db.commit()
    except Exception as e:
        logging.error('执行异常' + str(e))
        db.rollback()


def query_user(db):
    logging.info('query_user')
    result_info = []
    try:
        table_sql = cp.get('query_table', 'query_user')
        logging.info(table_sql)
        cur = db.cursor()
        cur.execute(table_sql)
        res = cur.fetchall()
        exec_result = {}
        for col in res:
            id = col[0]
            employee_id = col[1]
            user_type = col[2]
            username = col[3]
            password = col[4]
            exec_result['id'] = id
            exec_result['employee_id'] = employee_id
            exec_result['user_type'] = user_type
            exec_result['username'] = username
            exec_result['password'] = password
            result_info.append(exec_result)

        cur.close()
    except Exception as e:
        logging.error('执行异常' + str(e))
        pass
    logging.info(result_info)
    return result_info


def query_employee(db):
    logging.info('get_user')
    result_info = []
    try:
        table_sql = cp.get('query_table', 'query_employee')
        logging.info(table_sql)
        cur = db.cursor()
        cur.execute(table_sql)
        res = cur.fetchall()
        exec_result = {}
        for col in res:
            id = col[0]
            first_name = col[1]
            last_name = col[2]
            job_title = col[3]
            salary = col[4]
            notes = col[5]
            exec_result['id'] = id
            exec_result['first_name'] = first_name
            exec_result['last_name'] = last_name
            exec_result['job_title'] = job_title
            exec_result['salary'] = salary
            exec_result['notes'] = notes
            result_info.append(exec_result)

        cur.close()
    except Exception as e:
        logging.error('执行异常' + str(e))
        pass
    logging.info(result_info)
    return result_info


def query_employee_user(db):
    logging.info('query_employee_user')
    result_info = []
    try:
        table_sql = cp.get('query_table', 'query_employee_user')
        logging.info(table_sql)
        cur = db.cursor()
        cur.execute(table_sql)
        res = cur.fetchall()
        exec_result = {}
        for col in res:
            first_name = col[0]
            last_name = col[1]
            job_title = col[2]
            salary = col[3]
            user_type = col[4]
            exec_result['first_name'] = first_name
            exec_result['last_name'] = last_name
            exec_result['job_title'] = job_title
            exec_result['salary'] = salary
            exec_result['user_type'] = user_type
            result_info.append(exec_result)

        cur.close()
    except Exception as e:
        logging.error('执行异常' + str(e))
        pass
    logging.info(result_info)
    return result_info


def update_table(db):
    logging.info('update_table')
    result_info = {}
    items = cp.items('update_table')
    try:
        for item in items:
            table_schema = item[0]
            table_sql = item[1]
            logging.info(table_sql)
            cur = db.cursor()
            cur.execute(table_sql)
            db.commit()
    except Exception as e:
        logging.error('执行异常' + str(e))
        db.rollback()


def delete_table(db):
    logging.info('update_table')
    result_info = {}
    items = cp.items('delete_table')
    try:
        for item in items:
            table_schema = item[0]
            table_sql = item[1]
            logging.info(table_sql)
            cur = db.cursor()
            cur.execute(table_sql)
            db.commit()

            table_sql="select * from myuser where username='melinda'"
            cur = db.cursor()
            cur.execute(table_sql)
            res = cur.fetchall()
            logging.info(res)

    except Exception as e:
        logging.error('执行异常' + str(e))
        db.rollback()


def exec_query(db, table_sql):
    logging.info('exec_query')
    result_info = []
    try:
        logging.info(table_sql)
        cur = db.cursor()
        cur.execute(table_sql)
        res = cur.fetchall()
        for col in res:
            result_info.append(col)
        cur.close()
    except Exception as e:
        logging.error('执行异常' + str(e))
        pass
    logging.info(result_info)
    return result_info


def main():
    basedir = os.path.abspath(os.path.dirname(sys.argv[0]))
    log_fmt = '%(asctime)s %(levelname)s MSG:%(message)s'
    log_path = os.path.join(basedir, sys.argv[0]) + '.log'
    logging.basicConfig(level=logging.INFO, format=log_fmt, filename=log_path, filemode='a')
    log_file_handler = RotatingFileHandler(log_path, mode='a', maxBytes=10 * 1024 * 1024, backupCount=1)
    formatter = logging.Formatter(log_fmt)
    log_file_handler.setFormatter(formatter)
    log = logging.getLogger()
    log.addHandler(log_file_handler)

    now = datetime.datetime.now()
    today = datetime.datetime.strftime(now, '%Y%m%d')

    secret_name = "MyTestDatabaseMasterSecret"
    region_name = "cn-north-1"

    # Create a Secrets Manager client
    session = boto3.Session(profile_name='cn-north-1')
    client = session.client('secretsmanager', region_name=region_name)
    # client = boto3.client('secretsmanager', region_name=region_name)
    
    # Get the credential and db info
    try:
        describe_secret_response = client.describe_secret(
            SecretId=secret_name
        )
        print ("describe_secret_response %s" % (describe_secret_response) )
        get_secret_value_response = client.get_secret_value(
            SecretId=describe_secret_response['ARN']
        )
        print ("get_secret_value_response %s" % (get_secret_value_response) )
    except ClientError as e:
        if e.response['Error']['Code'] == 'DecryptionFailureException':
            # Secrets Manager can't decrypt the protected secret text using the provided KMS key.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InternalServiceErrorException':
            # An error occurred on the server side.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InvalidParameterException':
            # You provided an invalid value for a parameter.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'InvalidRequestException':
            # You provided a parameter value that is not valid for the current state of the resource.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
        elif e.response['Error']['Code'] == 'ResourceNotFoundException':
            # We can't find the resource that you asked for.
            # Deal with the exception here, and/or rethrow at your discretion.
            raise e
    else:
        # Decrypts secret using the associated KMS CMK.
        # Depending on whether the secret is a string or binary, one of these fields will be populated.
        if 'SecretString' in get_secret_value_response:
            secret = get_secret_value_response['SecretString']
            print ("secret %s " % (secret) )
        else:
            secret = base64.b64decode(get_secret_value_response['SecretBinary'])
            #print ("decoded_binary_secret %s " % (secret) )

    # 获取数据库连接
    secret_json = json.loads(secret)
    master_db_user = secret_json['username']
    master_db_pwd = secret_json['password']
    master_db_host = secret_json['host']
    master_db_port = secret_json['port']
    master_db_database = secret_json['dbname']
    master_db_instance = secret_json['dbInstanceIdentifier']
    db, _status = getDbConn(master_db_user, master_db_pwd, master_db_host, master_db_port, master_db_database)
    if not _status:
        logging.error('Master数据库连接异常')
        sys.exit(4)

    try:
        create_table(db)

        insert_table(db)

        query_employee(db)

        query_user(db)

        query_employee_user(db)

        update_table(db)

        sql = "select *  from myuser where user_type = 'ADMIN' order by employee_id desc;"
        #exec_query(db, sql)

        sql = "select *  from employee where job_title = 'Software Architect' order by id desc;"
        #exec_query(db, sql)

        delete_table(db)

        sql="select * from myuser;"
        exec_query(db, sql)

    except Exception:
        logging.error(traceback.format_exc())
        sys.exit(3)
    finally:
        db.close()
    logging.info(today + 'Test RDS')


if __name__ == '__main__':
    main()