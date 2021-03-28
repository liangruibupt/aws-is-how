from pyathena import connect
from pyathena.pandas.cursor import PandasCursor
import boto3

# Use the pyathena libary: https://pypi.org/project/pyathena/

cursor = connect(profile_name="us-east-1", 
                s3_staging_dir="s3://aws-athena-query-results-710299592439-us-east-1/pyathena/stage/",
                region_name="us-east-1",
                 cursor_class=PandasCursor).cursor()


# count
def func_count(cursor):
    query_string = "SELECT count(*) FROM quicksightdb.sporting_event"
    df = cursor.execute(query_string).as_pandas()
    print("datascan {} KB".format(cursor.data_scanned_in_bytes/1024))
    print("execution time {} ms".format(cursor.engine_execution_time_in_millis))
    print("query_queue time {} ms".format(cursor.query_queue_time_in_millis))
    print(df.head())

# TIMESTAMP `BETWEEN AND` + Integer greater than
def func_between_and(cursor):
    cursor.execute("""
        SELECT vd.datetime, vd.userid, vd.ratetype, vd.heartrate
        FROM quicksightdb.heartrate_iot_data vd
        where(vd.userid=%(param1)s)
        AND(vd.datetime BETWEEN TIMESTAMP %(param2)s AND TIMESTAMP %(param3)s)
        AND vd.heartrate > %(param4)d
        ORDER BY vd.datetime
        Limit 100
        """, {"param1": "Bonny", "param2": "2021-03-04 10:00:13.000", 
            "param3": "2021-03-05 10:00:23.000", "param4": 75})
    print("datascan {} KB".format(cursor.data_scanned_in_bytes/1024))
    print("execution time {} ms".format(cursor.engine_execution_time_in_millis))
    print("query_queue time {} ms".format(cursor.query_queue_time_in_millis))
    print(cursor.fetchmany(size=10))

# GROUP BY
def func_groupby(cursor):
    cursor.execute("""
        SELECT se.sport_type_name as sport, COUNT(DISTINCT se.id) AS total
        FROM quicksightdb.sporting_event se
        WHERE (se.home_team_id = %(param1)d)
        AND (se.location_id = %(param2)d)
        AND (se.start_date_time BETWEEN TIMESTAMP %(param3)s AND TIMESTAMP %(param4)s)
        GROUP BY se.sport_type_name
        """, {"param1": 1, "param2": 5, 
            "param3": "2020-04-01 12:00:00.000", "param4": "2020-05-1 12:01:00.000"})
    print("datascan {} KB".format(cursor.data_scanned_in_bytes/1024))
    print("execution time {} ms".format(cursor.engine_execution_time_in_millis))
    print("query_queue time {} ms".format(cursor.query_queue_time_in_millis))
    print(cursor.fetchmany(size=10))

# Create view
def func_createview(cursor):
    cursor.execute("""
        CREATE OR REPLACE VIEW quicksightdb.sporting_event_info AS 
        SELECT e.id event_id, e.sport_type_name sport, e.start_date_time event_date_time, 
            h.name home_team, a.name away_team, l.name location, l.city
        FROM quicksightdb.sporting_event e, quicksightdb.sport_team h, 
            quicksightdb.sport_team a, quicksightdb.sport_location l
        WHERE (((e.home_team_id = h.id) AND (e.away_team_id = a.id)) AND (e.location_id = l.id))
        """)
    print("datascan {} KB".format(cursor.data_scanned_in_bytes/1024))
    print("execution time {} ms".format(cursor.engine_execution_time_in_millis))
    print("query_queue time {} ms".format(cursor.query_queue_time_in_millis))
    print(cursor.fetchmany(size=10))

# Query from View
def func_query_view(cursor):
    cursor.execute("""
        SELECT se.sport, COUNT(DISTINCT se.event_id) AS total
        FROM quicksightdb.sporting_event_info se
        WHERE(se.home_team=%(param1)s)
        AND(se.away_team=%(param2)s)
        AND(se.event_date_time BETWEEN TIMESTAMP %(param3)s AND TIMESTAMP %(param4)s)
        GROUP BY se.sport
        """, {"param1": "New York Mets", "param2": "Atlanta Braves",
            "param3": "2020-04-01 12:00:00.000", "param4": "2020-07-1 12:01:00.000"})
    print("datascan {} KB".format(cursor.data_scanned_in_bytes/1024))
    print("execution time {} ms".format(cursor.engine_execution_time_in_millis))
    print("query_queue time {} ms".format(cursor.query_queue_time_in_millis))
    print(cursor.fetchmany(size=10))
    
# CASE
def func_case(cursor):
    cursor.execute("""
        SELECT se.sport, se.event_id, se.home_team,
        CASE se.location WHEN %(param1)s THEN %(param2)s WHEN %(param3)s THEN %(param4)s WHEN %(param5)s THEN %(param6)s ELSE 'retry' END as instructions 
        FROM quicksightdb.sporting_event_info se
        WHERE (se.home_team = %(param7)s)
        AND (se.event_date_time BETWEEN TIMESTAMP %(param8)s AND TIMESTAMP %(param9)s)
        ORDER BY se.sport
        """, {"param1": "Citi Field", "param2": "go", "param3": "Miller Park", "param4": "caution",
            "param5": "Angel Stadium", "param6": "stop", "param7": "New York Mets", 
            "param8": "2020-04-01 12:00:00.000", "param9": "2020-07-01 12:01:00.000"})
    print("datascan {} KB".format(cursor.data_scanned_in_bytes/1024))
    print("execution time {} ms".format(cursor.engine_execution_time_in_millis))
    print("query_queue time {} ms".format(cursor.query_queue_time_in_millis))
    print(cursor.fetchmany(size=10))

# JOIN and Left Join
def func_join(cursor):
    cursor.execute("""
        SELECT e.id event_id, e.sport_type_name sport, e.start_date_time event_date_time,
        h.name home_team, l.name location, l.city city,
        CASE l.name WHEN %(param1)s THEN %(param2)s WHEN %(param3)s THEN %(param4)s WHEN %(param5)s THEN %(param6)s ELSE 'retry' END as instructions 
        FROM quicksightdb.sporting_event e
        JOIN quicksightdb.sport_team h ON e.home_team_id = h.id
        LEFT JOIN quicksightdb.sport_location l ON e.location_id = l.id
        WHERE(h.name= %(param7)s)
        AND(e.start_date_time BETWEEN TIMESTAMP %(param8)s AND TIMESTAMP %(param9)s)
        """, {"param1": "Citi Field", "param2": "go", "param3": "Miller Park", "param4": "caution",
              "param5": "Angel Stadium", "param6": "stop", "param7": "New York Mets",
              "param8": "2020-04-01 12:00:00.000", "param9": "2020-07-01 12:01:00.000"})
    print("datascan {} KB".format(cursor.data_scanned_in_bytes/1024))
    print("execution time {} ms".format(cursor.engine_execution_time_in_millis))
    print("query_queue time {} ms".format(cursor.query_queue_time_in_millis))
    print(cursor.fetchmany(size=10))

# max
def func_max1(cursor):
    cursor.execute("""
        SELECT max(t.ticket_price) AS max_price, e.sport_type_name sport, h.name home_team, l.name location,
        CASE l.name WHEN %(param1)s THEN %(param2)s WHEN %(param3)s THEN %(param4)s WHEN %(param5)s THEN %(param6)s ELSE 'retry' END as instructions
        FROM quicksightdb.sporting_event e
        JOIN quicksightdb.sporting_event_ticket t ON t.sporting_event_id = e.id
        JOIN quicksightdb.sport_team h ON e.home_team_id = h.id
        LEFT JOIN quicksightdb.sport_location l ON e.location_id = l.id
        WHERE (h.name = %(param7)s) 
        AND (e.start_date_time BETWEEN TIMESTAMP %(param8)s AND TIMESTAMP %(param9)s)
        Group by e.sport_type_name, h.name, l.name
        """, {"param1": "Citi Field", "param2": "go", "param3": "Miller Park", "param4": "caution",
              "param5": "Angel Stadium", "param6": "stop", "param7": "New York Mets",
              "param8": "2020-04-01 12:00:00.000", "param9": "2020-07-01 12:01:00.000"})
    print("datascan {} KB".format(cursor.data_scanned_in_bytes/1024))
    print("execution time {} ms".format(cursor.engine_execution_time_in_millis))
    print("query_queue time {} ms".format(cursor.query_queue_time_in_millis))
    print(cursor.fetchmany(size=10))


def func_max2(cursor):
    cursor.execute("""
        SELECT e.event_id event_id, e.sport sport, e.event_date_time event_date_time, h.name home_team, 
        l.name location, l.city city,
        CASE l.name WHEN %(param1)s THEN %(param2)s WHEN %(param3)s THEN %(param4)s WHEN %(param5)s THEN %(param6)s ELSE 'retry' END as instructions
        FROM quicksightdb.sporting_event_ticket_info e
        JOIN quicksightdb.sport_team h ON e.home_team = h.name
        LEFT JOIN quicksightdb.sport_location l ON e.location = l.name
        WHERE (h.name = %(param7)s) 
        AND e.ticket_price = (( SELECT max(t.ticket_price) AS max
           FROM quicksightdb.sporting_event_ticket t
           WHERE t.sporting_event_id = e.event_id))
        AND (e.event_date_time BETWEEN TIMESTAMP %(param8)s AND TIMESTAMP %(param9)s)
        """, {"param1": "Citi Field", "param2": "go", "param3": "Miller Park", "param4": "caution",
              "param5": "Angel Stadium", "param6": "stop", "param7": "New York Mets",
              "param8": "2020-04-01 12:00:00.000", "param9": "2020-07-01 12:01:00.000"})
    print("datascan {} KB".format(cursor.data_scanned_in_bytes/1024))
    print("execution time {} ms".format(cursor.engine_execution_time_in_millis))
    print("query_queue time {} ms".format(cursor.query_queue_time_in_millis))
    print(cursor.fetchmany(size=10))



#func_count(cursor)
# func_between_and(cursor)
# func_groupby(cursor)
# func_createview(cursor)
# func_query_view(cursor)
# func_case(cursor)
# func_join(cursor)
# func_max1(cursor)
func_max2(cursor)
