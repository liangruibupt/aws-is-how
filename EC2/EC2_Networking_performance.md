# EC2 Networking performance:

## EC2 Enhanced networking
Enhanced networking uses single root I/O virtualization (SR-IOV) to provide high-performance networking capabilities
 Enhanced networking provides higher bandwidth, higher packet per second (PPS) performance, and consistently lower inter-instance latencies. There is no additional charge for using enhanced networking.
The current generation instances use ENA for enhanced networking, except for C4, D2, and M4 instances smaller than m4.16xlarge.
https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/enhanced-networking.html

## E2 latency
### Benchmark latency
There is no document for latency due to it can be changed with the tehnical improvement, here is deck of reinvent-2018. AZ level is milliseconds, placement group is < 1ms
https://www.slideshare.net/AmazonWebServices/optimizing-network-performance-for-amazon-ec2-instances-cmp308r1-aws-reinvent-2018

### Low-latency by using placement group
If need low-latency between EC2 for some use case such as HPC, you can choice placement group
https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-groups.html

### Monitor network performance for your EC2 instance
https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/monitoring-network-performance-ena.html

### Testing the network-throughput-benchmark or network troubleshooting
https://aws.amazon.com/premiumsupport/knowledge-center/network-throughput-benchmark-linux-ec2/
https://aws.amazon.com/premiumsupport/knowledge-center/network-issue-vpc-onprem-ig/