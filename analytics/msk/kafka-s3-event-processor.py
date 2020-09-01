import json
from kafka import KafkaProducer
import ssl
import os

ssl_context = ssl.create_default_context()
ssl_context.options &= ssl.OP_NO_TLSv1
ssl_context.options &= ssl.OP_NO_TLSv1_1
ssl_context.check_hostname = False

kafka_bootstrap_servers=os.environ['kafka_bootstrap_servers'].split(',')
print ("kafka_bootstrap_server : "+str(kafka_bootstrap_servers))

# The Kafka topic name
events_topic = 's3_event_stream'

def lambda_handler(event, context):

    event_logger = KafkaProducer(bootstrap_servers=kafka_bootstrap_servers,security_protocol="SSL",\
                             ssl_context=ssl_context)

    print ('Event : '+str(event))
    s3_events = ['s3://'+str(k['s3']['bucket']['name'])+'/'+str(k['s3']['object']['key']) for k in event['Records']]

    for e in s3_events:
       d={}
       d['filePath']=e
       print ("Sending to Kafka : " +str(d))
       event_logger.send(events_topic, json.dumps(d).encode())

    event_logger.flush()

    return True
