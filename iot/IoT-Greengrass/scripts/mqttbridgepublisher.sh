# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#!/bin/sh

mosquitto_pub -h localhost -p 1883 -q 1 -d -t $1 -m "{\"MQTT Bridge message\": \""$2" @ "$(date +"%m-%d-%Y-%H-%M-%s")"\"}"
