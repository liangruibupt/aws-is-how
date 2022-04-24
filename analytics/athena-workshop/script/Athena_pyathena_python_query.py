#Using JDBC https://github.com/laughingman7743/PyAthenaJDBC/
import os
import pyathenajdbc

from pyathenajdbc import connect

conn = connect(S3OutputLocation='s3://YOUR_S3_BUCKET/path/1/',
               AwsRegion='us-west-2',
               Profile='YOUR_PROFILE_NAME')
try:
    with conn.cursor() as cursor:
        cursor.execute("""
        SELECT col_string FROM one_row_complex
        WHERE col_string = %(param)s
        """, {'param': 'a string'})
        print(cursor.fetchall())
finally:
    conn.close()


conn = connect(S3OutputLocation='s3://YOUR_S3_BUCKET/path/2/',
               AwsRegion='us-west-2')
try:
    with conn.cursor() as cursor:
        cursor.execute("""
        SELECT * FROM many_rows LIMIT 10
        """)
        for row in cursor:
            print(row)
finally:
    conn.close()
