# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import time
import datetime
import json
import awsiot.greengrasscoreipc
from awsiot.greengrasscoreipc.model import (
    PublishToTopicRequest,
    PublishMessage,
    JsonMessage
)
from dummy_sensor import DummySensor


TIMEOUT = 10
publish_rate = 1.0

ipc_client = awsiot.greengrasscoreipc.connect()

sensor = DummySensor()

topic = "my/topic"


while True:
    message = {"timestamp": str(datetime.datetime.now()),
               "value": sensor.read_value()}
    message_json = json.dumps(message).encode('utf-8')

    request = PublishToTopicRequest()
    request.topic = topic
    publish_message = PublishMessage()
    publish_message.json_message = JsonMessage()
    publish_message.json_message.message = message
    request.publish_message = publish_message
    operation = ipc_client.new_publish_to_topic()
    operation.activate(request)
    future = operation.get_response()
    future.result(TIMEOUT)

    print("publish")
    time.sleep(1/publish_rate)
