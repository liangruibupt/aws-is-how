import boto3
import json

client = boto3.client('health', region_name='cn-northwest-1')


def get_events():
    client.describe_event_aggregates(
        aggregateField='eventTypeCategory'
    )

    client.describe_events()


if __name__ == '__main__':
    get_events()
