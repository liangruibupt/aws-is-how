[Introducing AWS Gateway Load Balancer: Supported architecture patterns](https://aws.amazon.com/blogs/networking-and-content-delivery/introducing-aws-gateway-load-balancer-supported-architecture-patterns/)

[GWLB integrated with FortiGate](https://aws.amazon.com/cn/blogs/china/gateway-load-balancing-services-integrate-fortigate-security-gateways/)
    - [FortiGate双臂模式](https://aws.amazon.com/cn/blogs/china/aws-gateway-load-balancing-integration-fortigate-dual-arm-mode/)

[利用 Transit Gateway 和 Fortigate 实现企业东西向和南北向流量安全控制](https://aws.amazon.com/cn/blogs/china/enterprise-traffic-security-control-with-transit-gateway-and-fortigate/)

[使用Gateway Load Balancer和Palo alto防火墙实现集中的网络流量深度检测](https://aws.amazon.com/cn/blogs/china/centralized-network-traffic-depth-detection-using-gateway-load-balancer-and-palo-alto-firewalls/)

[Centralized inspection architecture with AWS Gateway Load Balancer and AWS Transit Gateway](https://aws.amazon.com/blogs/networking-and-content-delivery/centralized-inspection-architecture-with-aws-gateway-load-balancer-and-aws-transit-gateway/)

[Scaling network traffic inspection using AWS Gateway Load Balancer](https://aws.amazon.com/blogs/networking-and-content-delivery/scaling-network-traffic-inspection-using-aws-gateway-load-balancer/)

[Best practices for deploying Gateway Load Balancer](https://aws.amazon.com/blogs/networking-and-content-delivery/best-practices-for-deploying-gateway-load-balancer/)
    - Tune TCP keep-alive or timeout values to support long-lived TCP flows
    - Enable Appliance Mode on AWS Transit Gateway to maintain flow symmetry for inter-VPC traffic inspection
      - Appliance Mode is disabled by default on the VPC attachments in AWS Transit Gateway. For VPC-to-VPC traffic inspection through Appliance VPC, you are required to enable Appliance Mode on the VPC attachment connected to the Appliance VPC. However, enabling Appliance Mode is optional for inspection of traffic originating from a spoke VPC destined to the Internet via dedicated Egress VPC. In either case, when you enable Appliance Mode, AWS Transit Gateway no longer maintains the AZ affinity, and incurs standard inter-AZ charges when traffic crosses AZ.
    - Understand when to use Cross-Zone Load Balancing
    - Understand appliance and AZ failure scenarios
    - Choose one-arm or two-arm firewall deployment modes for egress traffic inspection
      - One-arm mode: The firewall is deployed in one-arm mode just for traffic inspection whereas NAT Gateway performs translation. This is the most common deployment method, and eliminates dependency on firewall supporting NAT functionality. Also, it increases performance of the firewall by offloading NAT to NAT Gateway.
      - Two-arm mode: The firewall is deployed in two-arm mode and performs both inspection as well as NAT. Some AWS partners provide firewall with NAT functionality. GWLB integrates seamlessly in such deployment mode. You don’t need to do any additional configuration changes in the GWLB. However, the firewall networking differs – one network interface is on the private subnet and the other is on public subnet. This mode requires software support from the firewall partner (Fortinet, Palo Alto Networks, Valtix) support this feature.
    - Choose one-arm or two-arm firewall deployment modes for SSL/TLS traffic inspection

