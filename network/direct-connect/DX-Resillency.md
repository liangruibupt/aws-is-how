# AWS Direct Connect Resiliency 

## Overview
https://docs.aws.amazon.com/directconnect/latest/UserGuide/resilency_toolkit.html

The common scenarios to get set up with an AWS Direct Connect connection. 

https://docs.aws.amazon.com/directconnect/latest/UserGuide/getting_started.html

### Configure classic redundant connections

There are different configuration choices available when you provision two dedicated connections:

- Active/Active (BGP multipath). 

This is the default configuration, where both connections are active. AWS Direct Connect supports multipathing to multiple virtual interfaces within the same location, and traffic is load-shared between interfaces based on flow. If one connection becomes unavailable, all traffic is routed through the other connection.

[How do I set up an Active/Active or Active/Passive Direct Connect connection to AWS from a public virtual interface?](https://aws.amazon.com/premiumsupport/knowledge-center/dx-create-dx-connection-from-public-vif/)

- Active/Passive (failover). 

One connection is handling traffic, and the other is on standby. If the active connection becomes unavailable, all traffic is routed through the passive connection. You need to prepend the AS path to the routes on one of your links for that to be the passive link.

[How do I set an Active/Passive Direct Connect connection to AWS?](https://aws.amazon.com/premiumsupport/knowledge-center/active-passive-direct-connect/)


## Maximum resiliency

You can achieve maximum resiliency for critical workloads by using separate connections that terminate on separate devices in more than one location.

This model provides resiliency against device, connectivity, and complete location failures.

https://docs.aws.amazon.com/directconnect/latest/UserGuide/maximum_resiliency.html

## High resiliency

You can achieve high resiliency for critical workloads by using two single connections to multiple locations. 

This model provides resiliency against connectivity failures caused by a fiber cut or a device failure. It also helps prevent a complete location failure. 

https://docs.aws.amazon.com/directconnect/latest/UserGuide/high_resiliency.html

## Development and test 

You can achieve development and test resiliency for non-critical workloads by using separate connections that terminate on separate devices in one location. 

This model provides resiliency against device failure, but does not provide resiliency against location failure. 

https://docs.aws.amazon.com/directconnect/latest/UserGuide/dev-test-resiliency.html


## Advanced: Creating active/passive BGP connections over AWS Direct Connect via Avanced pattern

Two common patterns:

- Private Virtual Interfaces (PrivateVIF) and Direct Connect Gateway (DXGW)

- Transit Virtual Interfaces (TransitVIF) and DXGW. 

https://aws.amazon.com/blogs/networking-and-content-delivery/creating-active-passive-bgp-connections-over-aws-direct-connect/


## AWS DX – DXGW with AWS Transit Gateway, Multi-Regions
https://docs.aws.amazon.com/whitepapers/latest/hybrid-connectivity/aws-dx-dxgw-with-aws-transit-gateway-multi-regions-and-aws-public-peering.html 