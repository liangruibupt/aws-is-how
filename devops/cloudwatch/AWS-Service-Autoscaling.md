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

7. API Gateway
   
Base on Amazon API Gateway FAQ [How do APIs scale?](https://aws.amazon.com/api-gateway/faqs/#Throttling_and_Caching) Amazon API Gateway will automatically scale to handle the amount of traffic your API receives. Amazon API Gateway does not arbitrarily limit or throttle invocations to your backend operations and all requests that are not intercepted by throttling and caching settings in the Amazon API Gateway console are sent to your backend operations. 
[Throttle quota per account, per Region across HTTP APIs, REST APIs, WebSocket APIs, and WebSocket callback APIs](https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html) is 10,000 requests per second (RPS) with an additional burst capacity provided by the token bucket algorithm, using a maximum bucket capacity of 5,000 requests.

8. Lambda

[Base on lambda document](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html), the default concurrent executions quota is 1,000 and Can be increased up to Tens of thousands. [For an initial burst of traffic, your functions' cumulative concurrency in a Region can reach an initial level of between 500 and 3000, which varies per Region. ](https://docs.aws.amazon.com/lambda/latest/dg/invocation-scaling.html). To enable your function to scale without fluctuations in latency, use [provisioned concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html). Lambda also integrates with [Application Auto Scaling, allowing you to manage provisioned concurrency on a schedule or based on utilization](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html). 

9. S3

Your applications can easily achieve thousands of transactions per second in request performance when uploading and retrieving storage from Amazon S3. Amazon S3 automatically scales to high request rates. For example, your application can achieve at least 3,500 PUT/COPY/POST/DELETE or 5,500 GET/HEAD requests per second per prefix in a bucket. There are no limits to the number of prefixes in a bucket. You can increase your read or write performance by using parallelization. For example, if you create 10 prefixes in an Amazon S3 bucket to parallelize reads, you could scale your read performance to 55,000 read requests per second. Similarly, you can scale write operations by writing to multiple prefixes. Suggest read [Best practices design patterns: optimizing Amazon S3 performance](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html)

10. EFS

Amazon EFS delivers more than 10 gibibytes per second (GiBps) of throughput over 500,000 IOPS, and sub-millisecond or low single digit millisecond latencies. Suggest read [Amazon EFS performance document](https://docs.aws.amazon.com/efs/latest/ug/performance.html) and [Amazon EFS performance tips](https://docs.aws.amazon.com/efs/latest/ug/performance-tips.html)

11. EBS
12. 
Several factors, including I/O characteristics and the configuration of your instances and volumes, can affect the performance of Amazon EBS. Customers who follow the [guidance on our Amazon EBS and Amazon EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EBSPerformance.html) typically achieve good performance out of the box. You can use the [With Amazon EBS, you can use any of the standard RAID configurations](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/raid-config.html) and run [EBS benchmark](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/benchmark_procedures.html) 

