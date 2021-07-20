#!/usr/bin/python

# Lab 1 - Setting up.
# Make sure your host and region are correct.

import sys
import ssl
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import json
import time
import random
import datetime

#Setup our MQTT client and security certificates
#Make sure your certificate names match what you downloaded from AWS IoT

mqttc = AWSIoTMQTTClient("iot-lambda")

#Make sure you use the correct region!
mqttc.configureEndpoint(
    "a3lk6rh9gr0knb.ats.iot.cn-north-1.amazonaws.com.cn", 8883)
mqttc.configureCredentials("./cert/AmazonRootCA1.pem",
                           "./cert/iot-lambda-private.pem.key", "./cert/iot-lambda-certificate.pem.crt")

#Function to encode a payload into JSON


def json_encode(string):
    return json.dumps(string)


mqttc.json_encode = json_encode

#This sends our test message to the iot topic


def send(count):
    now = datetime.datetime.now()
    # Need Python3
    str_now = now.timestamp()
    dt_string = now.strftime("%Y-%m-%d %H:%M:%S")
    #Declaring our variables
    CORP = random.choice(['AAPL', 'AMZN', 'MSFT', 'INTC', 'TBV'])
    message = {
        "deviceid": str(str_now) + "_" + str(count),
        "critical": random.choice(range(5)),
        "alertmessage": "Temperature exceeded " + CORP,
        "alertcount": count,
        "eventtime": dt_string
    }
    #Encoding into JSON
    message = mqttc.json_encode(message)

    mqttc.publish("/lambda-postgresql/iot-alert", message, 0)
    print("Message {} Published. Data: {}".format(count, message))


#Connect to the gateway
mqttc.connect()
print("Connected")

#Loop until terminated
count = 5001
while True:
    count += 1
    send(count)
    if(count > 10000):
        break
    time.sleep(0.1)

mqttc.disconnect()
#To check and see if your message was published to the message broker go to the MQTT Client and subscribe to the iot topic and you should see your JSON Payload
