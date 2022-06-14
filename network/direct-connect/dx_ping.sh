#!/bin/sh

## Sent 5 package and wait timeout 1 second for each package reply
ping -c 5 -W 1 $1 &> /dev/null && echo success || echo fail

## Using while loop control
while ping -c 5 -W 1 $1 &>/dev/null
do 
    echo "Host Ping Success - `date`"
done
echo "Host Ping Fail - `date`"