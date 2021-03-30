import json
import random
import sys
import uuid
import boto3
import time
import datetime
from botocore.exceptions import ClientError

CHANNEL_NAME = "rtm_complex_channel"
session = boto3.Session(profile_name='us-east-1', region_name='us-east-1')
client = session.client('iotanalytics')

#Function to encode a payload into JSON
def json_encode(message):
    return json.dumps(message)

# Function to get the randomvin
def rand_n(n):
    start = pow(10, n-1)
    end = pow(10, n) - 1
    return random.randint(start, end)

def random_vin():
    VIN = 'vin-' + str(rand_n(14))
    print(VIN)
    return VIN


#This sends our test message to the iot topic
def send_batch(message1, message2, message3):
    # message_id = str(uuid.uuid4())
    try:
        response = client.batch_put_message(
            channelName=CHANNEL_NAME,
            messages=[
                {
                    'messageId': "1",
                    'payload': message1.encode()
                },
                {
                    'messageId': "2",
                    'payload': message2.encode()
                },
                {
                    'messageId': "3",
                    'payload': message3.encode()
                }
            ]
        )
        print('Message Published: HTTPStatusCode {}, error message: {}'.format(
            response['ResponseMetadata']['HTTPStatusCode'], json.dumps(response['batchPutMessageErrorEntries'])))
    except ClientError as e:
        print(e)


def send(message):
    message_id = str(uuid.uuid4())
    try:
        response = client.batch_put_message(
            channelName=CHANNEL_NAME,
            messages=[
                {
                    'messageId': message_id,
                    'payload': message.encode()
                }
            ]
        )
        print('Message Published: HTTPStatusCode {}, error message: {}'.format(
            response['ResponseMetadata']['HTTPStatusCode'], json.dumps(response['batchPutMessageErrorEntries'])))
    except ClientError as e:
        print(e)

# Generate normal pressure with a 0.995 probability


def get_normal_pressure(vin):
    #Declaring trip_id variables
    trip_id = str(uuid.uuid4())
    data = {
        "vin": vin,
        "trip_id": trip_id,
        "Systolic": random.randint(90, 120),
        "Diastolic": random.randint(60, 80),
        "PressureLevel": 'NORMAL',
        "temp": random.randint(0, 1000),
        "event_time": str(datetime.datetime.now()),
        "bms_tbc_volt": ["3.660", "3.660", "3.661", "3.660", "3.662", "3.661", "3.660", "3.657", "3.662", "3.660"]
    }
    data = json.dumps(data)
    return data

# Generate high pressure with probability 0.005


def get_high_pressure(vin):
    #Declaring trip_id variables
    trip_id = str(uuid.uuid4())
    data = {
        "vin": vin,
        "trip_id": trip_id,
        "Systolic": random.randint(130, 200),
        "Diastolic": random.randint(90, 150),
        "PressureLevel": 'HIGH',
        "temp": random.randint(0, 1000),
        "event_time": str(datetime.datetime.now()),
        "bms_tbc_volt": ["3.660", "3.660", "3.661", "3.660", "3.662", "3.661", "3.660", "3.657", "3.662", "3.660"]
    }
    data = json.dumps(data)
    return data

# Generate low pressure with probability 0.005


def get_low_pressure(vin):
    trip_id = str(uuid.uuid4())
    data = {
        "vin": vin,
        "trip_id": trip_id,
        "Systolic": random.randint(50, 80),
        "Diastolic": random.randint(30, 50),
        "PressureLevel": '',
        "temp": random.randint(0, 1000),
        "event_time": str(datetime.datetime.now()),
        "bms_tbc_volt": ["3.660", "3.660", "3.661", "3.660", "3.662", "3.661", "3.660", "3.657", "3.662", "3.660"]
    }
    data = json.dumps(data)
    return data


def generate_data(vin):
    trip_id = str(uuid.uuid4())
    signals = []
    listsignals = []
    signal_index = 90
    listsingal_index = 5
    while signal_index > 0:
        signal_value = round(random.uniform(1, 300), 2)
        signal_name = "powertrain_state_{}".format(signal_index)
        signals.append({"name": signal_name, "value" : signal_value})
        signal_index = signal_index - 1

    while listsingal_index > 0:
        listsignal_values = []
        for i in range(10):
            value = round(random.uniform(3, 5), 2)
            listsignal_values.append(value)
        listsignal_name = "bms_id_{}".format(listsingal_index)
        listsignals.append(
            {"name": listsignal_name, "value": listsignal_values})
        listsingal_index = listsingal_index - 1

    data = {
        "vin": vin,
        "event_time": str(datetime.datetime.now()),
        "trip_id": trip_id,
        "Systolic": random.randint(50, 80),
        "Diastolic": random.randint(30, 50),
        "PressureLevel": random.choice(['LOW', 'NORMAL', 'HIGH']),
        "temp": random.randint(0, 1000),
        "signals": signals,
        "listsignals": listsignals
    }
    data = json.dumps(data)
    return data

vin = random_vin()
count = 0
while True:
    count += 1
    if(count % 100 == 0):
        vin = random_vin()
    # rnd = random.random()
    # if (rnd < 0.25):
    #     data = get_low_pressure(vin)
    #     #print(data)
    #     send(data)
    # elif (rnd > 0.85):
    #     data = get_high_pressure(vin)
    #     #print(data)
    #     send(data)
    # else:
    #     data = get_normal_pressure(vin)
    #     #print(data)
    #     send(data)
    # data1 = get_low_pressure(vin)
    # data2 = get_normal_pressure(vin)
    # data3 = get_high_pressure(vin)
    # send_batch(data1, data2, data3)
    data = generate_data(vin)
    send(data)
    #print(data)
    time.sleep(0.1)
