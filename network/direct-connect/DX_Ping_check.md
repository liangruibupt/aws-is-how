# How to do DX ping test

## Script dx_ping.sh
```sh
#!/bin/sh

## Sent 5 package and wait timeout 1 second for each package reply
ping -c 5 -W 1 $1 &> /dev/null && echo success || echo fail

## Using while loop control
while ping -c 5 -W 1 $1 &>/dev/null
do 
    echo "Host Ping Success - `date`"
done
echo "Host Ping Fail - `date`"
```

## Testing
```sh
#./dx_ping.sh HOSTNAME

## 127.0.0.1
./dx_ping.sh 127.0.0.1
success
Host Ping Success - Tue Jun 14 14:35:16 CST 2022
Host Ping Success - Tue Jun 14 14:35:20 CST 2022
Host Ping Success - Tue Jun 14 14:35:24 CST 2022

## google.com
./dx_ping.sh google.com
fail
Host Ping Fail - Tue Jun 14 14:32:41 CST 2022
```