#!/usr/bin/python

# Lab 1 - Setting up.
# Make sure your host and region are correct.

import sys
import ssl
import json
import time
import uuid
import random
import datetime
import urllib.request

#you can use http://randomvin.com/ to generate a VIN number
response = urllib.request.urlopen('http://randomvin.com/getvin.php?type=real')
VIN = 'vin-' + str(response.read().decode('utf-8'))
print(VIN)

def json_encode(string):
    return json.dumps(string)

def send():
    #Declaring trip_id variables
    trip_id = str(uuid.uuid4())

    message = {
        "name": "speed",
        "value": random.randint(0, 120),
        "vin": VIN,
        "trip_id": trip_id,
        "timestamp": str(datetime.datetime.now())
    }

    #Encoding into JSON
    message = json.dumps(message)
    print("Message Published", message)

#Loop until terminated
while True:
    send()
    time.sleep(5)
