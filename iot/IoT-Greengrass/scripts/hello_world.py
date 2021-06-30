# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0
import sys
import datetime
import time

while True:
    
    message = f"Hello, {sys.argv[1]}! Current time: {str(datetime.datetime.now())}."
    
    # Print the message to stdout.
    print(message)
    
    # Append the message to the log file.
    with open('/tmp/Greengrass_HelloWorld.log', 'a') as f:
        print(message, file=f)
        
    time.sleep(1)

