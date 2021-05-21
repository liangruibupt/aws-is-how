import json
import random
import time
from collections import namedtuple

import boto3
import uuid
from botocore.config import Config
import os


session = boto3.Session(region_name='us-east-1')
write_client = session.client(
    'timestream-write', endpoint_url='https://ingest-cell2.timestream.us-east-1.amazonaws.com',
    config=Config(read_timeout=20, max_pool_connections=5000, retries={'max_attempts': 10}))
# write_client = session.client(
#     'timestream-write',
#     config=Config(read_timeout=20, max_pool_connections=5000, retries={'max_attempts': 10}))

powertrainState = 'powertrain_state'
ignition_state = 'ignition_state'
bms_soc2 = 'bms_soc2'
odo = 'odo'
speed = 'speed'
gear = 'gear'
engine_rpm = 'engine_rpm'
systolic = 'systolic'
diastolic = 'diastolic'
temp = 'temp'
pressureLevel = "pressureLevel"


measuresForMetrics = [systolic, diastolic, pressureLevel, temp]

remainingmetrics = [bms_soc2, odo, speed, gear, engine_rpm]

# thinking time.
sleep_time = float(os.environ.get('sleep_time', '0.1'))
# scale factor for the threads.
thread_number = int(os.environ.get('thread_number', '50'))
# scale factor for the message for each request
scale_rate = int(os.environ.get('scale_rate', '1'))
# Optional The percentage of data written that is late arriving
percent_late = int(os.environ.get('percent_late', '0'))
# Optional The amount of time in seconds late that the data arrives
late_time = int(os.environ.get('late_time', '0'))
#
DATABASE_NAME = os.environ.get('DATABASE_NAME', "kdaflink")
TABLE_NAME = os.environ.get('TABLE_NAME', "kinesis600")


def generateDimensions(scaleFactor, vin):
    all_dimensions = []
    count = 0
    while count < scaleFactor*10:
        count += 1
        trip_id = str(uuid.uuid4())

        # dimension data
        dimension = [
            {"Name": "vin", "Value": vin},
            {"Name": "trip_id", "Value": trip_id}
        ]
        all_dimensions.append(dimension)
        #print(dimension)

    return all_dimensions


def create_record(dimensions, measure_name, measure_value, value_type, timestamp, time_unit):
    return {
        "Dimensions": dimensions,
        "MeasureName": measure_name,
        "MeasureValue": str(measure_value),
        "MeasureValueType": value_type,
        "Time": str(timestamp),
        "TimeUnit": time_unit
    }


def createRandomMetrics(dimensions, timestamp, timeUnit):
    records = list()

    records.append(create_record(dimensions, systolic, random.randint(
        50, 80), "DOUBLE", timestamp, timeUnit))
    records.append(create_record(dimensions, diastolic, random.randint(
        30, 50), "DOUBLE", timestamp, timeUnit))
    records.append(create_record(dimensions, temp, random.randint(
        0, 1000), "DOUBLE", timestamp, timeUnit))
    records.append(create_record(dimensions, pressureLevel, random.choice(
        ['LOW', 'NORMAL', 'HIGH']), "VARCHAR", timestamp, timeUnit))

    ignition_index = 100
    while ignition_index > 0:
        measure_value = 100.0 * random.random()
        measure_name = "ignition_state_{}".format(ignition_index)
        records.append(create_record(
            dimensions, measure_name, measure_value, "DOUBLE", timestamp, timeUnit))
        ignition_index = ignition_index - 1

    powertrain_index = 100
    while powertrain_index > 0:
        measure_value = round(random.uniform(1, 300), 2)
        measure_name = "powertrain_state_{}".format(powertrain_index)
        records.append(create_record(
            dimensions, measure_name, measure_value, "DOUBLE", timestamp, timeUnit))
        powertrain_index = powertrain_index - 1

    for measure in remainingmetrics:
        measure_value = 100.0 * random.random()
        records.append(create_record(
            dimensions, measure, measure_value, "DOUBLE", timestamp, timeUnit))

    return records


def send_records_to_timestream(write_client, host_scale, sleep_time, percent_late, late_time, vin):
    if percent_late > 0:
        value = random.random()*100
        if (value >= percent_late):
            print("Generating On-Time Records.")
            local_timestamp = int(time.time())
        else:
            print("Generating Late Records.")
            local_timestamp = (int(time.time()) - late_time)
    else:
        local_timestamp = int(time.time())

    all_dimensions = generateDimensions(host_scale, vin)
    #print(all_dimensions)
    print("Dimensions for metrics: {}".format(len(all_dimensions)))
    for dimension in all_dimensions:
        print("prepare dimension {}".format(dimension))
        metrics = createRandomMetrics(
            dimension, local_timestamp, "SECONDS")
        write_timestream(metrics, write_client)
        if sleep_time > 0:
            time.sleep(float(sleep_time))


def write_timestream_batch(records, write_client):
    # print(json.dumps(records))
    print("writing {} records to Timestream".format(len(records)))
    response = write_client.write_records(
        DatabaseName=DATABASE_NAME,
        TableName=TABLE_NAME,
        Records=records,
        CommonAttributes={})
    print("response - write_records: {}".format(response))  
        
def write_timestream(metrics, write_client):
    metrics_size = len(metrics)
    print("writing {} metrics to Timestream".format(metrics_size))
    records = []
    count = 0
    for metric in metrics:
        count += 1
        # write_records() now only support 100 batch
        if(count % 100 == 0):
            records.append(metric)
            write_timestream_batch(records, write_client)
            records = []
        elif(count >= metrics_size):
            records.append(metric)
            write_timestream_batch(records, write_client)
            records = []
        else:
            #print(json.dumps(metric))
            records.append(metric)

def lambda_handler(event, context):
    vin = event['vin']
    count = 0
    while True:
        count += 1
        if(count > thread_number):
            break
        send_records_to_timestream(
            write_client, scale_rate, sleep_time, percent_late, late_time, vin)
        time.sleep(float(sleep_time))
