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

#Connecting to the message broker
mqttc.connect()
print("Connected")

#For loop to generate our data
for x in range(0,100):
    message ={
      'val1': "Value 1 - " + str(x+1),
      'val2': "Value 2 - " + str(x+1),
      'val3': "Value 3 - " + str(x+1),
      'message': "Test Message - " + str(x+1),
      'SeqNumber' : x,
      'SeqSort': 1
    }
    message = mqttc.json_encode(message)
    mqttc.publish("ddb", message, 0)
    print("Message "+ str(x+1) + " published. Data:" + message)

print("Sending to DynamoDB")
mqttc.disconnect()
time.sleep(2)