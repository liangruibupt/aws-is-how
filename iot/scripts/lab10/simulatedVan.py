#!/usr/bin/python
#Lab 10 - Streaming data to Elasticsearch via AWS IoT

import sys
import ssl
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import json
import random
import time

#Setup our MQTT client and security certificates
#Make sure your certificate names match what you downloaded from AWS IoT

mqttc = AWSIoTMQTTClient("1234")

#Make sure you use the correct region!
mqttc.configureEndpoint("data.iot.us-west-2.amazonaws.com",8883)
mqttc.configureCredentials("./rootCA.pem","./ratchet/ratchet.private.key","./ratchet/ratchet.cert.pem")

def json_encode(string):
        return json.dumps(string)

mqttc.json_encode=json_encode

#Connecting to the message broker
mqttc.connect()
print("Connected")

#For loop to generate our data
while True:
    try:
        x
    except NameError:
        x = 1412638168724
        lon = 39.09972
        lat = -94.57853
        pre =111
        engTemp = 211
        carTemp = 41
        rpm = 2216
        speed = 18
        bat = 12.3
    else :
        lon = lon + (random.randrange(-1,2,1) * float(format(random.random()* .001,'.5f')))
        lat = lat + (random.randrange(-1,2,1) * float(format(random.random()* .001,'.5f')))
        pre = pre + int(random.randrange(-1,2,1) *random.random()* 5)
        engTemp = engTemp + int(random.randrange(-1,2,1) *random.random()* 5)
        carTemp = carTemp + int(random.randrange(-1,2,1) *random.random()* 5)
        rpm = rpm + int(random.randrange(-1,2,1) *random.random()* 10)
        speed = speed + int(random.randrange(-1,2,1) *random.random()*2)
        bat = bat + float(random.randrange(-1,2,1) * float(format(random.random()* .1,'.1f')))
        message ={
          'nms':  "%s" % (x),
          'location': "%s, %s" % (lon,lat),
          'geoJSON': {
            'type': "Point",
            'coordinates':[
                "%s" % (lon),
                "%s" % (lat)
            ]},
          'pressure': pre,
          'engine_temperature' : engTemp,
          'cargo_temperature': carTemp,
          'rpm':rpm,
          'speed' : speed,
          'battery': bat
        }
        message = mqttc.json_encode(message)
        mqttc.publish("truck/truck1", message, 0)
        print("Message published. Data:" + message)
        time.sleep(2)

