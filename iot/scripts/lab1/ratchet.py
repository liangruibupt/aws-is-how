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

mqttc = AWSIoTMQTTClient("1234")

#Make sure you use the correct region!
mqttc.configureEndpoint("data.iot.us-west-2.amazonaws.com",8883)
mqttc.configureCredentials("./rootCA.pem","./ratchet/ratchet.private.key","./ratchet/ratchet.cert.pem")

#Function to encode a payload into JSON
def json_encode(string):
        return json.dumps(string)

mqttc.json_encode=json_encode

#This sends our test message to the iot topic
def send(count):
    now = datetime.datetime.now()
    # Need Python3
    str_now = now.timestamp()
    #Declaring our variables
    CORP = random.choice(['AAPL', 'AMZN', 'MSFT', 'INTC', 'TBV'])
    message ={
        'Critical': random.choice(range(5)),
        'AlertMessage': "Temperature exceeded " + CORP,
        'AlertCount': random.choice(range(count)),
        'Device': "RAT Internals - " + str(count),
        'EventTime': str_now
    }

    #Encoding into JSON
    message = mqttc.json_encode(message)

    mqttc.publish("iot-alert", message, 0)
    print("Message {} Published. Data: {}".format(count, message))

def send_iot(x):
    message ={
        'val1': "Value 1 - " + str(x+1),
        'val2': "Value 2 - " + str(x+1),
        'val3': "Value 3 - " + str(x+1),
        'message': "Test Message - " + str(x+1)
    }
    message = mqttc.json_encode(message)
    mqttc.publish("iot", message, 0)
    print("Message "+ str(x+1) + " published. Data:" + message)
        

#Connect to the gateway
mqttc.connect()
print("Connected")

#Loop until terminated
count = 0
while True:
    count += 1
    #send(count)
    send_iot(count)
    if(count > 100):
        break
    time.sleep(5)

mqttc.disconnect()
#To check and see if your message was published to the message broker go to the MQTT Client and subscribe to the iot topic and you should see your JSON Payload
