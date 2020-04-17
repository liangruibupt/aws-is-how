# How to verify EC2 access S3 via VPC S3 Endpoint?

[How to configure VPC endpoint for S3 - quick start](https://aws.amazon.com/blogs/aws/new-vpc-endpoint-for-amazon-s3/)

[How to configure VPC endpoint for S3 - full guide](https://docs.aws.amazon.com/vpc/latest/userguide/vpce-gateway.html)

## Subnet Routing Table with NAT and VPC S3 Endpoint
![Private Subnet with NAT Gateway and VPC S3 Endpoint](vpc/VPC-Endpoint-RT.png)

1. EC2 in private Subnet access S3 via VPC S3 Endpoint
```bash
[ec2-user@ip-10-0-3-129 ~]$ sudo traceroute -n -T -p 443 s3.cn-north-1.amazonaws.com.cn
traceroute to s3.cn-north-1.amazonaws.com.cn (54.222.50.61), 30 hops max, 60 byte packets
 1 * * *
 2 * * *
 3 * * *
 4 * * *
 5 54.222.50.61 2.001 ms 1.870 ms 1.761 ms
```

2. EC2 in public Subnet access S3 via VPC S3 Endpoint
```bash
[ec2-user@ray-demo-tools ~]$ sudo traceroute -n -T -p 443 s3.cn-north-1.amazonaws.com.cn
traceroute to s3.cn-north-1.amazonaws.com.cn (54.222.49.98), 30 hops max, 60 byte packets
 1 * * *
 2 * * *
 3 * * *
 4 * * *
 5 * * *
 6 54.222.49.98 1.123 ms 0.991 ms 1.018 ms
```


## Subnet Routing Table with NAT and VPC S3 Endpoint

![Private Subnet with NAT Gateway and No VPC S3 Endpoint](vpc/VPC-Endpoint-NAT-RT.png)

NAT Gateway IP
![NAT Gateway IP](vpc/VPC-Endpoint-NAT-IP.png)

1. EC2 in private subnet without S3 VPC endpoint

Access S3 via NAT GW, you can see the first hop is NAT GW IP

```bash
[ec2-user@ip-172-16-111-53 ~]$ sudo traceroute -n -T -p 443 s3.cn-north-1.amazonaws.com.cn
traceroute to s3.cn-north-1.amazonaws.com.cn (54.222.48.46), 30 hops max, 60 byte packets
 1 172.16.169.146 0.294 ms 0.282 ms 0.508 ms
 2 * * *
 3 * * *
 4 * * *
 5 * * *
 6 54.222.48.46 0.736 ms 0.619 ms 0.541 ms
 ```

