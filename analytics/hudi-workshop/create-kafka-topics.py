##
## create-kafka-topics.py
##
from kafka.admin import KafkaAdminClient, NewTopic
from kafka.errors import TopicAlreadyExistsError
import json
import ssl

topics = ['s3_event_stream',
'hudids.salesdb.SALES_ORDER_DETAIL_DS',
'hudids.salesdb.SALES_ORDER_DETAIL',
'hudids.salesdb.SALES_ORDER_ALL',
'hudids.salesdb.SUPPLIER',
'hudids.salesdb.CUSTOMER',
'hudids.salesdb.CUSTOMER_SITE',
'hudids.salesdb.SALES_ORDER',
'hudids.salesdb.PRODUCT',
'hudids.salesdb.PRODUCT_CATEGORY'
]

context = ssl.create_default_context()
context.options &= ssl.OP_NO_TLSv1
context.options &= ssl.OP_NO_TLSv1_1
#context.load_verify_locations(cafile=/secure/cacerts)
context.check_hostname = False

# read stack info
with open('stack-info.json') as json_file:
    stack = json.load(json_file)

kafka_bootstrap_servers=','.join([k+":9094" for k in stack['MSKBrokerNodes']])
print (kafka_bootstrap_servers)

admin_client = KafkaAdminClient(bootstrap_servers=kafka_bootstrap_servers, client_id='admin',security_protocol="SSL",\
                             ssl_context=context)

topic_list=[]

for t in topics:
    topic_list.append(NewTopic(name=t, num_partitions=10, replication_factor=2))
try:
    response=admin_client.create_topics(new_topics=topic_list, validate_only=False)
    print (response)
except TopicAlreadyExistsError as e:
    print (e)
