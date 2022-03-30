# How AWS servcies do auto-scaling?

1. Use [Amazon EC2 Auto Scaling](https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html) to automatically scale Amazon EC2 instances, either with scaling policies or with scheduled scaling
   
2. Using [AWS Auto Scaling service](https://aws.amazon.com/autoscaling/) via scaling plans to set up scaling policies for below reources
- Amazon EC2 Auto Scaling groups
- Amazon Elastic Container Service (ECS) services
- Amazon EC2 Spot Fleets
- Amazon DynamoDB throughput capacity
- [Aurora replicas for Amazon Aurora](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Integrating.AutoScaling.html)

3. Using [Application Auto Scaling API](https://docs.aws.amazon.com/zh_cn/autoscaling/application/APIReference/Welcome.html)
- Amazon AppStream 2.0 fleets (not avaiable for China regions)
- Amazon Aurora Replicas
- Amazon Comprehend document classification and entity recognizer endpoints (not avaiable for China regions)
- Amazon DynamoDB tables and global secondary indexes throughput capacity
- Amazon ECS services
- Amazon ElastiCache for Redis clusters (replication groups)
- Amazon EMR clusters
- Amazon Keyspaces (for Apache Cassandra) tables
- AWS Lambda function provisioned concurrency
- Amazon Managed Streaming for Apache Kafka broker storage
- Amazon Neptune clusters
- Amazon SageMaker endpoint variants
- Spot Fleets (Amazon EC2)
- Custom resources provided by your own applications or services, for example, [Kinesis Data Analytics Auto-scaling](https://github.com/walkingerica/awscn-kda-flink-auto-scaling)

4. [Amazon ElastiCache for Redis now supports auto scaling](https://aws.amazon.com/about-aws/whats-new/2021/08/amazon-elasticache-redis/)

5. [Amazon RDS now supports Storage Auto Scaling](https://aws.amazon.com/about-aws/whats-new/2019/06/rds-storage-auto-scaling/)

6. Load Balancer

- [Network Load Balancer](https://www.amazonaws.cn/en/elasticloadbalancing/pricing/?trk=pricing-pd) is evaludate by Network Load Balancer Capacity Units (NLCU) can [effortless Scaling to Millions of Requests per Second](https://aws.amazon.com/blogs/aws/new-network-load-balancer-effortless-scaling-to-millions-of-requests-per-second/). 
  - For Transmission Control Protocol (TCP) traffic, an NLCU contains:
    - 800 new TCP connections per second.
    - 100,000 active TCP connections (sampled per minute).
    - 1 GB per hour for Amazon Elastic Compute Cloud (EC2) instances, containers, IP addresses, and Application Load Balancers as targets.

  - For User Datagram Protocol (UDP) traffic, an NLCU contains:
    - 400 new UDP flows per second.
    - 50,000 active UDP flows (sampled per minute).
    - 1 GB per hour for Amazon Elastic Compute Cloud (EC2) instances, containers, IP addresses, and Application Load Balancers as targets.

  - For Transport Layer Security (TLS) traffic, an NLCU contains:
    - 50 new TLS connections or flows per second.
    - 3,000 active TLS connections or flows (sampled per minute).
    - 1 GB per hour for Amazon Elastic Compute Cloud (EC2) instances, containers, IP addresses, and Application Load Balancers as targets. 

- [Application Load Balancer](https://www.amazonaws.cn/en/elasticloadbalancing/pricing/?trk=pricing-pd) is evaludate by Load Balancer Capacity Units (LCU). Application load balancer can auto-scale (scale up and scale out the backend instances) with demand, during the scale windows, you may experience short time 504 error. For > 5000 TSP, please contact via support case with information (1)Requests per seconds, (2) Average Request + Response (bytes), (3) Percent of requests SSL in all request, (4) Persistent Connections (Keep-alive) yes or no) to pre-warm.
  - For HTTP(S) request, an LCU contains:
    - 25 new connections per second.
    - 3,000 active connections per minute.
    - 1 GB per hour for Amazon Elastic Compute Cloud (EC2) instances, containers, and IP addresses as targets, and 0.4 GB per hour for Lambda functions as targets.
    - 1,000 rule evaluations per second

6. API Gateway

7. Lambda

8. S3

9. EFS

10. EBS