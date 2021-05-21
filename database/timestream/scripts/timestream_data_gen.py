import argparse
import json
import random
import signal
import string
import sys
import time
from collections import namedtuple

import boto3
import numpy as np
import uuid
from botocore.config import Config


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


measuresForMetrics = [systolic, diastolic, pressureLevel, temp,
                      powertrainState, ignition_state, bms_soc2, odo, speed, gear, engine_rpm]

remainingmetrics = [powertrainState, ignition_state,
                    bms_soc2, odo, speed, gear, engine_rpm]

DATABASE_NAME = "kdaflink"
TABLE_NAME = "kinesis600"

# Function to get the randomvin


def rand_n(n):
    start = pow(10, n-1)
    end = pow(10, n) - 1
    return random.randint(start, end)


def random_vin():
    VIN = 'vin-' + str(rand_n(14))
    #print(VIN)
    return VIN


def generateDimensions(scaleFactor):
    count = 0
    while count < scaleFactor*10:
        count += 1
        trip_id = str(uuid.uuid4())
        vin = random_vin()

        # dimension data
        dimensions = [
            {"Name": "vin", "Value": vin},
            {"Name": "trip_id", "Value": trip_id}
        ]
        print(dimensions)

    return dimensions


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

    for measure in remainingmetrics:
        print(measure)
        value = 100.0 * random.random()
        records.append(create_record(
            dimensions, measure, value, "DOUBLE", timestamp, timeUnit))

    return records


def send_records_to_timestream(write_client, host_scale, sleep_time, percent_late, late_time):
    while True:
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

        all_dimensions = generateDimensions(host_scale)
        print(all_dimensions)
        print("Dimensions for metrics: {}".format(len(all_dimensions)))
        
        metrics = createRandomMetrics(all_dimensions,local_timestamp, "SECONDS")
        records = []
        for metric in metrics:
            data = json.dumps(metric)
            print(data)
            records.append(metric)
            # response = write_client.write_records(
            #     DatabaseName=DATABASE_NAME,
            #     TableName=TABLE_NAME,
            #     Records=records,
            #     CommonAttributes={})
            # print("wrote {} records to Timestream".format(len(records)))
            # print("response - write_records: {}".format(response))

        if sleep_time > 0:
            time.sleep(float(sleep_time))


def main(args):
    print(args)
    host_scale = args.host_scale  # scale factor for the hosts.
    profile_name = args.profile

    def signal_handler(sig, frame):
        print("Exiting Application")
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)

    session = boto3.Session(region_name='us-east-1')
    write_client = session.client(
        'timestream-write', endpoint_url='https://ingest-cell2.timestream.us-east-1.amazonaws.com',
        config=Config(read_timeout=20, max_pool_connections=5000, retries={'max_attempts': 10}))

    sleep_time = args.sleep_time
    percent_late = args.percent_late
    late_time = args.late_time

    send_records_to_timestream(write_client, host_scale, sleep_time, percent_late, late_time)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(prog='timestream_kinesis_data_gen',
                                     description='DevOps Sample Data Generator for Timestream/KDA Sample Application.')
    parser.add_argument('--host-scale', action="store", type=int, default=1,
                        help="The scale factor determines the number of hosts emitting events and metrics.")
    parser.add_argument('--profile', action="store", type=str,
                        default=None, help="The AWS Config profile to use.")

    # Optional sleep timer to slow down data
    parser.add_argument('--sleep-time', action="store", type=int, default=0,
                        help="The amount of time in seconds to sleep between sending batches.")

    # Optional "Late" arriving data parameters
    parser.add_argument('--percent-late', action="store", type=float, default=0,
                        help="The percentage of data written that is late arriving ")
    parser.add_argument("--late-time", action="store", type=int, default=0,
                        help="The amount of time in seconds late that the data arrives")

    main(parser.parse_args())
