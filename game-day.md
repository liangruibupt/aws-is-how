http://3.217.247.122/healthcheck
http://mod-gd201-elasticl-1fj1pafk4v5uh-877132311.us-east-1.elb.amazonaws.com/healthcheck
http://d2rb37jqs6j2tv.cloudfront.net/

Spot instance

#!/bin/bash
yum -y install wget
wget https://s3.amazonaws.com/ee-assets-prod-us-east-1/modules/gd2015-loadgen/v0.1/server
chmod +x server
./server
# Reboot if the server crashes
shutdown -h now





/server-bang.osx http://gameday-alb-871349438.us-east-1.elb.amazonaws.com/healthcheck

https://w.amazon.com/bin/view/AWS_GameDay/version_2015_v2/

http://d2rb37jqs6j2tv.cloudfront.net/calc?input=3615-7184-2117


Autoscaling: As required to maintain Application Load Balancer Request Count Per Target at 20
You can also configured LB target response time


a few seconds ago   1586836829474   -1  Order Processor Computed Unicorn did not match (got "Yj2l9tCHfZMh2fcZz2ssuog19az/jnU0PjDXJNRGqQ==", expected "rmtLSoZe+ac6WvYJV006wq4JUT552gZ+7DQ7V/wrrg==")

http://d2rb37jqs6j2tv.cloudfront.net/


#!/bin/bash
yum -y install wget
wget https://s3.amazonaws.com/ee-assets-prod-us-east-1/modules/gd2015-loadgen/v0.1/server2
chmod +x server2
./server2
# Reboot if the server crashes
shutdown -h now


#!/bin/bash
yum -y install wget
wget https://s3.amazonaws.com/ee-assets-prod-us-east-1/modules/gd2015-loadgen/v0.1/server3
chmod +x server3
./server3 -memcache-server gameday.bzym8l.cfg.use1.cache.amazonaws.com:11211
# Reboot if the server crashes
shutdown -h now



Monitor your RT and NACL, it can be changed to DENY, make it automatically check the NACL and make sure the inbound/outbound are ALLOW
