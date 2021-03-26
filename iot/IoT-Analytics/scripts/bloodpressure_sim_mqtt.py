import json
import random
import sys
import ssl
import uuid
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import urllib.request
import time
import datetime


thingName = "ratchet-azer"

mqttc = AWSIoTMQTTClient(thingName)

#Make sure you use the correct region!
mqttc.configureEndpoint("data.iot.us-east-1.amazonaws.com", 8883)
mqttc.configureCredentials(
    "./rootCA.pem", "./ratchet-azer-privateKey.pem", "./ratchet-azer-certificate.pem")

#Function to encode a payload into JSON
def json_encode(string):
    return json.dumps(string)

mqttc.json_encode = json_encode

#Connect to the gateway
mqttc.connect()
print("Connected")

# Function to get the randomvin
def random_vin():
    #you can use http: // randomvin.com / to generate a VIN number
    response = urllib.request.urlopen('http://randomvin.com/getvin.php?type=real')
    VIN = 'vin-' + str(response.read().decode('utf-8'))
    print(VIN)
    return VIN

#This sends our test message to the iot topic
def send(message):
    mqttc.publish("data/"+thingName+"/pressure", message, 0)
    print("Message Published")

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
        "timestamp": str(datetime.datetime.now())
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
        "timestamp": str(datetime.datetime.now())
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
        "PressureLevel": 'LOW',
        "timestamp": str(datetime.datetime.now())
    }
    data = json.dumps(data)
    return data


vin = random_vin()
count = 0
while True:
    count += 1
    if(count % 100 == 0):
        vin = random_vin()
    rnd = random.random()
    if (rnd < 0.005):
        data = get_low_pressure(vin)
        print(data)
        send(data)
    elif (rnd > 0.995):
        data = get_high_pressure(vin)
        print(data)
        send(data)
    else:
        data = get_normal_pressure(vin)
        print(data)
        send(data)
    time.sleep(3)

mqttc.disconnect()
