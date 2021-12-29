# Monitoring Amazon MSK clusters

- **Monitoring Amazon MSK clusters using Prometheus and Grafana**
- Monitor using Cloudwatch monitoring

## Monitoring using Prometheus and Grafana

Kafka emits a very large number of metrics via JMX, many of which can be useful for tuning the performance of your cluster, producers, and consumers. However, at that large volume comes complexity with monitoring.

By default, Amazon MSK clusters come with Cloudwatch monitoring of your essential metrics, but if you want access to the full suite of metrics, you can now use Open Monitoring with Prometheus. 

1. Enable Enable open monitoring with Prometheus
- Edit Monitoring section of you Cluster on MSK console
- Select the Enable open monitoring with Prometheus
- Select the JMX Exporter and the Node Exporter
- Click Save Changes

2. Create a new SG called MSK_Monitoring

3. Edit MSKWorkshop-KafkaService SG to add inbound rule

    Type: Custom TCP
    Port range: 11001-11002
    Source: MSK_Monitoring security group
    Description: Prometheus monitoring

4. Attach the MSK_Monitoring SG to your KafkaClientInstance instance and your Cloud9 instance

5. Run Prometheus using Docker

- On KafkaClientInstance
```bash
mkdir ~/prometheus
cd ~/prometheus/
```

cat prometheus.yml

```yaml
# file: prometheus.yml
# my global config
global:
  scrape_interval:     10s

# A scrape configuration containing exactly one endpoint to scrape:
# Here it's Prometheus itself.
scrape_configs:
# The job name is added as a label `job=<job_name>` to any timeseries scraped from this config.
- job_name: 'prometheus'
  static_configs:
  # 9090 is the prometheus server port
  - targets: ['localhost:9090']
- job_name: 'broker'
  file_sd_configs:
  - files:
    - 'targets.json'
```

cat targets.json
```json
[
{
    "labels": {
    "job": "jmx"
    },
    "targets": [
    "b-1.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11001",
    "b-2.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11001",
    "b-3.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11001",
    "b-4.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11001",
    "b-5.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11001",
    "b-6.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11001"
    ]
},
{
    "labels": {
    "job": "node"
    },
    "targets": [
    "b-1.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11002",
    "b-2.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11002",
    "b-3.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11002",
    "b-4.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11002",
    "b-5.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11002",
    "b-6.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11002"
    ]
}
]
```

- Run prometheus docker
```bash
sudo docker run -d -p 9090:9090 --name=prometheus -v /home/ec2-user/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml -v /home/ec2-user/prometheus/targets.json:/etc/prometheus/targets.json prom/prometheus --config.file=/etc/prometheus/prometheus.yml

docker ps
CONTAINER ID        IMAGE               COMMAND                  CREATED             STATUS              PORTS                    NAMES
bb10fa16c663        prom/prometheus     "/bin/prometheus --c…"   35 seconds ago      Up 34 seconds       0.0.0.0:9090->9090/tcp   prometheus

sudo docker logs bb10fa16c663
level=info ts=2020-08-28T10:03:10.539Z caller=main.go:805 msg="Loading configuration file" filename=/etc/prometheus/prometheus.yml
level=info ts=2020-08-28T10:03:10.540Z caller=main.go:833 msg="Completed loading of configuration file" filename=/etc/prometheus/prometheus.yml
level=info ts=2020-08-28T10:03:10.540Z caller=main.go:652 msg="Server is ready to receive web requests.
```

- Update the security group on your KafkaClientInstance and cloud9

Rule 1 - Prometheus

    Type: Custom TCP
    Port Range: 9090
    Description: Prometheus

Rule 2 - Grafana

    Type: Custom TCP
    Port Range: 3000
    Description: Grafana

- Access the Prometheus console

http://<KafkaClientInstance-DNS>:9090

kafka_controller_KafkaController_Value{name="OfflinePartitionsCount"} to get a graph of offline partitions

kafka_cluster_Partition_Value to get the partition info

- Finding Kafka Native Metrics
```bash
curl b-1.mskcluster-mmstack1.p6hcmn.c4.kafka.us-west-2.amazonaws.com:11001/metrics
```

## Using Grafana Dashboard
- On Cloud9
```bash
docker run -d -p 3000:3000 --name=grafana -e "GF_INSTALL_PLUGINS=grafana-clock-panel" grafana/grafana
```

- Grafana Dashboard

http://<KafkaClientInstance-DNS>:3000

- Add the Prometheus Data Source
    URL: http://<KafkaClientInstance_INTERNAL>:9090
    Access: Server (default)