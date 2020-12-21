import boto3
import random
import json

client = boto3.client('events', region_name='cn-north-1')

event = random.choice(['ok', 'warn', 'alert'])

data = {
    "customEvent": {
        "ConnectEvent": event
    }
}
json_string = json.dumps(data)
print(json_string)

source = f'ConnectEvent.{event}'

putEvent = client.put_events(
    Entries=[
        {
            'Source': source,
            'DetailType': 'string',
            'Detail': json_string,
            'EventBusName': 'default'
        },
    ]
)
print(putEvent)
