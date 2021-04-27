import boto3
from botocore.config import Config
import json
import time

session = boto3.Session(profile_name='timestream-test', region_name='us-east-1')
query_client = session.client(
    'timestream-query', endpoint_url='https://query-cell2.timestream.us-east-1.amazonaws.com')
write_client = session.client('timestream-write',
    endpoint_url='https://vpce-07e34b7bc5649ac7e-pp6c70im.ingest-cell2.timestream.us-east-1.vpce.amazonaws.com',
        config=Config(read_timeout=20, max_pool_connections=5000, retries={'max_attempts': 10}))

DATABASE_NAME = "kdaflink"
TABLE_NAME = "kinesis-6yi"
RIGHT_TABLE_NAME = "kinesis600"
QUERY_REPEAT = 5

QUERY_COUNT = f"""
    SELECT count(*) FROM "{DATABASE_NAME}"."{TABLE_NAME}"
    """
SELECT_LIMIT_20 = f"""
    SELECT vin, temp, pressureLevel, time FROM "{DATABASE_NAME}"."{TABLE_NAME}" limit 20
    """

SELECT_BETWEEN_AND = f"""
    SELECT vd.vin, vd.trip_id, vd.temp, vd.pressureLevel
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd 
        where vd.time BETWEEN TIMESTAMP '2021-04-01 06:49:47.000000000' AND TIMESTAMP '2021-04-06 08:49:47.000000000'
        AND vd.measure_name = 'powertrain_state'AND measure_value::double > 50
        Limit 20
    """

# SELECT_GROUP_BY = f"""
#     SELECT vd.vin, COUNT(DISTINCT vd.trip_id) AS total
#         FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
#         WHERE vd.pressureLevel = 'NORMAL'
#         AND vd.time BETWEEN TIMESTAMP '2021-04-01 06:49:47.000000000' AND TIMESTAMP '2021-04-06 08:49:47.000000000'
#         GROUP BY vd.vin limit 20
#     """
SELECT_GROUP_BY = f"""
    SELECT max(vd.measure_value::double) as max_sys, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        WHERE vd.pressureLevel = 'NORMAL' AND vd.measure_value::double > 50
        AND vd.time BETWEEN TIMESTAMP '2021-04-05 05:49:47.000000000' AND TIMESTAMP '2021-04-05 05:54:47.000000000'
        GROUP BY vd.vin limit 20
    """

SELECT_CASE = f"""
    SELECT vd.vin, vd.trip_id, vd.systolic,
        CASE vd.pressureLevel WHEN 'High' THEN 'alert' WHEN 'Low' THEN 'caution' ELSE 'go' END as instructions 
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        WHERE vd.pressureLevel = 'NORMAL'
        AND vd.time BETWEEN TIMESTAMP '2021-04-01 06:49:47.000000000' AND TIMESTAMP '2021-04-06 08:49:47.000000000'
        limit 20
    """

SELECT_JOIN = f"""
    SELECT vd.vin, vd.trip_id, vd.systolic,
        CASE vd.pressureLevel WHEN 'High' THEN 'alert' WHEN 'Low' THEN 'caution' ELSE 'go' END as instructions 
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd, "{DATABASE_NAME}"."{RIGHT_TABLE_NAME}" vl
        WHERE vd.pressureLevel = vl.pressureLevel AND (vd.pressureLevel = 'NORMAL')
        AND vd.time BETWEEN TIMESTAMP '2021-04-01 06:49:47.000000000' AND TIMESTAMP '2021-04-06 08:49:47.000000000'
        Limit 20
    """

SELECT_MAX = f"""
    SELECT max(vd.measure_value::double) as max_sys, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        WHERE vd.pressureLevel = 'NORMAL' AND vd.measure_value::double > 50
        AND vd.time BETWEEN TIMESTAMP '2021-04-05 05:49:47.000000000' AND TIMESTAMP '2021-04-05 05:54:47.000000000'
        Group by vd.vin limit 20
    """

SELECT_BIN = f"""
    SELECT BIN(vd.time, 1m) AS binned_timestamp, AVG(vd.measure_value::double) AS avg_value_1mins, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        WHERE vd.pressureLevel = 'NORMAL'
        AND vd.time BETWEEN TIMESTAMP '2021-04-05 05:49:47.000000000' AND TIMESTAMP '2021-04-05 05:54:47.000000000'
        Group by vd.vin, BIN(vd.time, 1m) limit 20
"""

SELECT_TRUNC = f"""
    SELECT date_trunc('minute', vd.time) AS min_timestamp, AVG(vd.measure_value::double) AS avg_value_1min, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        WHERE vd.pressureLevel = 'NORMAL'
        AND vd.time BETWEEN TIMESTAMP '2021-04-05 05:49:47.000000000' AND TIMESTAMP '2021-04-05 05:54:47.000000000'
        Group by 1, vd.vin limit 20 
"""

SELECT_ARBIT = f"""
    SELECT BIN(vd.time, 1m) AS binned_timestamp, arbitrary(vd.measure_value::double) AS random_value, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        WHERE vd.pressureLevel = 'NORMAL'
        AND vd.time BETWEEN TIMESTAMP '2021-04-05 05:49:47.000000000' AND TIMESTAMP '2021-04-05 05:54:47.000000000'
        Group by vd.vin, BIN(vd.time, 1m) limit 20
"""

SELECT_ARBIT = f"""
    SELECT BIN(vd.time, 1m) AS binned_timestamp, arbitrary(vd.measure_value::double) AS random_value, vd.vin
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        WHERE vd.pressureLevel = 'NORMAL'
        AND vd.time BETWEEN TIMESTAMP '2021-04-05 05:49:47.000000000' AND TIMESTAMP '2021-04-05 05:54:47.000000000'
        Group by vd.vin, BIN(vd.time, 1m) limit 20
"""

SELECT_ARBIT = f"""
    SELECT BIN(vd.time, 1m) AS binned_timestamp, vd.vin, nth_value(vd.measure_value::double, 2) over(partition by vd.vin
		order by vd.time desc
		rows between unbounded preceding and unbounded following)
        FROM "{DATABASE_NAME}"."{TABLE_NAME}" vd
        WHERE vd.pressureLevel = 'NORMAL'
        AND vd.time BETWEEN TIMESTAMP '2021-04-05 05:49:47.000000000' AND TIMESTAMP '2021-04-05 06:54:47.000000000'
        limit 100
"""

# funclist = [QUERY_COUNT, SELECT_LIMIT_20, SELECT_BETWEEN_AND, SELECT_GROUP_BY, 
#             SELECT_CASE, SELECT_JOIN, SELECT_MAX]
# joblist = ['QUERY_COUNT', 'SELECT_LIMIT_20','SELECT_BETWEEN_AND', 'SELECT_GROUP_BY', 
#            'SELECT_CASE', 'SELECT_JOIN', 'SELECT_MAX']
funclist = [SELECT_GROUP_BY, SELECT_MAX, SELECT_BIN, SELECT_TRUNC]
joblist = ['SELECT_GROUP_BY', 'SELECT_MAX', 'SELECT_BIN', 'SELECT_TRUNC']

class WriterExample:
    def __init__(self, client):
        self.client = client

    def describe_table(self):
        print("Describing table [%s]" % (TABLE_NAME))
        try:
            result = self.client.describe_table(
                DatabaseName=DATABASE_NAME, TableName=TABLE_NAME)
            print(result)
            #print(json.loads(result['Table']))
        except self.client.exceptions.ResourceNotFoundException:
            print("Table doesn't exist")
        except Exception as err:
            print("Describe table failed:", err)
    
class QueryExample:
    def __init__(self, client):
        self.client = client
        self.paginator = client.get_paginator('query')

    def run_query(self, query_string):
        try:
            t1 = time.time()
            page_iterator = self.paginator.paginate(QueryString=query_string)
            for page in page_iterator:
                bytes_scanned = self._parse_query_result(page)
            t2 = time.time()
            return [t1, t2, bytes_scanned, ]
        except Exception as err:
            print("Exception while running query:", err)

    def _parse_query_result(self, query_result):
        query_status = query_result["QueryStatus"]

        progress_percentage = query_status["ProgressPercentage"]
        print(f"Query progress so far: {progress_percentage}%")

        bytes_scanned = float(
            query_status["CumulativeBytesScanned"])/1024/1024
        print('Data scanned so far is: %.6f MB' %
              (bytes_scanned))

        bytes_metered = float(
            query_status["CumulativeBytesMetered"])/1024/1024
        print('Data metered so far is: %.6f MB' %
              (bytes_metered))

        column_info = query_result['ColumnInfo']
        #print("Metadata: %s" % column_info)

        print("Data: ")
        for row in query_result['Rows']:
            print(self._parse_row(column_info, row))
        return bytes_scanned

    def _parse_row(self, column_info, row):
        data = row['Data']
        row_output = []
        for j in range(len(data)):
            info = column_info[j]
            datum = data[j]
            row_output.append(self._parse_datum(info, datum))

        return "{%s}" % str(row_output)

    def _parse_datum(self, info, datum):
        if datum.get('NullValue', False):
            return "%s=NULL" % info['Name'],

        column_type = info['Type']

        # If the column is of TimeSeries Type
        if 'TimeSeriesMeasureValueColumnInfo' in column_type:
            return self._parse_time_series(info, datum)

        # If the column is of Array Type
        elif 'ArrayColumnInfo' in column_type:
            array_values = datum['ArrayValue']
            return "%s=%s" % (info['Name'], self._parse_array(info['Type']['ArrayColumnInfo'], array_values))

        # If the column is of Row Type
        elif 'RowColumnInfo' in column_type:
            row_column_info = info['Type']['RowColumnInfo']
            row_values = datum['RowValue']
            return self._parse_row(row_column_info, row_values)

        # If the column is of Scalar Type
        else:
            return self._parse_column_name(info) + datum['ScalarValue']

    def _parse_time_series(self, info, datum):
        time_series_output = []
        for data_point in datum['TimeSeriesValue']:
            time_series_output.append("{time=%s, value=%s}"
                                      % (data_point['Time'],
                                         self._parse_datum(info['Type']['TimeSeriesMeasureValueColumnInfo'],
                                                           data_point['Value'])))
        return "[%s]" % str(time_series_output)

    def _parse_array(self, array_column_info, array_values):
        array_output = []
        for datum in array_values:
            array_output.append(self._parse_datum(array_column_info, datum))

        return "[%s]" % str(array_output)

    @staticmethod
    def _parse_column_name(info):
        if 'Name' in info:
            return info['Name'] + "="
        else:
            return ""

    def run_all_queries(self):
        for query_id in range(len(funclist)):
            jobname = joblist[query_id]
            print("Running query [%d] : [%s]" %
                  (query_id + 1, jobname))
            l1 = []
            for i in range(QUERY_REPEAT):
                t = self.run_query(funclist[query_id])
                l1.append(t)

            r = []
            totaltime = 0
            totalscan = 0
            print('\n\n###', jobname)
            print('|Seq|%-20s|' % 'spent time')
            count = 1
            for i in l1:
                spenttime = i[1]-i[0]
                print('|%-3d|%-20.6f|' % (count, spenttime))
                totaltime += spenttime
                scan_data = i[2]
                totalscan += scan_data
                count = count + 1

            print('Average data scan for %s is: %.6f MB\n' %
                  (jobname, totalscan/QUERY_REPEAT))
            print('Average time for %s is: %.6f s\n' %
                  (jobname, totaltime/QUERY_REPEAT))


write_exmaple = WriterExample(write_client)
#write_exmaple.describe_table()

query_example = QueryExample(query_client)
#query_example.run_query(QUERY_COUNT)
query_example.run_all_queries()
