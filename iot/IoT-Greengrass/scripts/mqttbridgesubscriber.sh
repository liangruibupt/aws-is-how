# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
#!/bin/sh

mosquitto_sub -h localhost -p 1883 -d -v -t $1
