# Monitoring Amazon MSK clusters 

- Monitoring Amazon MSK clusters using Prometheus and Grafana**
- **Monitor using Cloudwatch monitoring**



## Cloudwatch monitoring  

- Basic/default metrics 
    Aggregrate CPU, Memory, Network, and Disk usage, total topics/partitions, offline partitions, and Zookeeper state. These are the essential metrics to monitor.

- Per Broker metrics 
    Giving you metrics at the broker level, including Bytes In/out, Fetch metrics (related to producers/consumers), Message rate, partition replication information, in depth metrics about producing, Network processing time, etc. These will help you understand your workloads better, as well as help debug basic problems with your producers/consumers and get a sense for the timing/delays that may show up. But these are aggregate for the broker.

- Per Topic Per Broker 
    Here you gain Bytes In/Out, Messages In, Fetch and Produce rates. These help you understand volume at the topic level, which is essential for some troubleshooting. But this is also a much higher volume of metrics in to Cloudwatch.


 # Cleanup
 ```bash
sudo docker stop prometheus

sudo docker stop grafana
```