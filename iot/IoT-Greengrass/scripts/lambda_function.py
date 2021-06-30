# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import json
import boto3

iot = boto3.client('iot-data', endpoint_url='https://a3lk6rh9gr0knb.ats.iot.cn-north-1.amazonaws.com.cn', region_name='cn-north-1')
def lambda_handler(event, context):
    print(event)

    topic = 'my/topic/alert'
    threshold = 26.0

    if event['value'] >= threshold:
        payload = event
        payload['threshold'] = threshold
        iot.publish(
                topic=topic,
                qos=0,
                payload=json.dumps(payload, ensure_ascii=False)
            )
