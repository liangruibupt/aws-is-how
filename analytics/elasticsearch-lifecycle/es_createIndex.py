import requests
import json
import time
import pytz
from datetime import datetime
import random
from elasticsearch import Elasticsearch

now = datetime.now()
dt_string = now.strftime("%Y-%m-%d")
back_index = "testes-lifecycle-" + dt_string
metric_list = ['CPU', 'Memory', 'DiskIO', 'NetworkIO', 'Throuput']

for i in range(1000):
    back_body = {
      "source": "elasticsearch_aws_ec2",
      "cloud": "aws",
      "@timestamp": datetime.now(pytz.utc),
      "check_status":"ok",
      "metric_name": random.choice(metric_list),
      "testId": random.randint(0, 1600)
    }
    print(back_index, back_body)
    es = Elasticsearch("localhost",port=9200,use_ssl=False,verify_certs=False,)
    es.index(index=back_index, body=back_body)
