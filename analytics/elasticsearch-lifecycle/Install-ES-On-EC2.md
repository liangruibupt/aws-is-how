# Install ElasticSearch on EC2

1. Launch EC2 instance
- r5.large Amazon Linux 2
- Security Group open for 22, 9200, 9300, 443, 5601

2. Elasticsearch Setup on Single Node
```bash
# Import Elasticsearch PGP Key
sudo su
rpm --import https://artifacts.elastic.co/GPG-KEY-elasticsearch

# Configure RPM Repository for Elasticsearch
cd /etc/yum.repos.d/
vi elasticsearch.repo

[elasticsearch]
name=Elasticsearch repository for 7.x packages
baseurl=https://artifacts.elastic.co/packages/7.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=0
autorefresh=1
type=rpm-md

# Install Elasticsearch from RPM Repository
yum install -y --enablerepo=elasticsearch elasticsearch

# Configure Elasticsearch to run on bootup
systemctl daemon-reload
systemctl enable elasticsearch.service

# Start Elasticsearch
systemctl start elasticsearch.service
systemctl status elasticsearch.service

# Check logs
tail /var/log/elasticsearch/elasticsearch.log

`
[2020-11-25T01:49:10,533][INFO ][o.e.h.AbstractHttpServerTransport] [ip-.ec2.internal] publish_address {127.0.0.1:9200}, bound_addresses {[::1]:9200}, {127.0.0.1:9200}
[2020-11-25T01:49:10,536][INFO ][o.e.n.Node               ] [ip-.ec2.internal] started
`

# Get the cluster details
curl -X GET "http://localhost:9200/?pretty"
{
  "name" : "ip-.ec2.internal",
  "cluster_name" : "elasticsearch",
  "cluster_uuid" : "sj8mnPw8RXCGRBA98cRtaA",
  "version" : {
    "number" : "7.10.0",
    "build_flavor" : "default",
    "build_type" : "rpm",
    "build_hash" : "51e9d6f22758d0374a0f3f5c6e8f3a7997850f96",
    "build_date" : "2020-11-09T21:30:33.964949Z",
    "build_snapshot" : false,
    "lucene_version" : "8.7.0",
    "minimum_wire_compatibility_version" : "6.8.0",
    "minimum_index_compatibility_version" : "6.0.0-beta1"
  },
  "tagline" : "You Know, for Search"
}
```

3. Configure the Elasticsearch
```bash
# heapsize: update the heap size to be 50% of the 16GB RAM
cd /etc/elasticsearch/jvm.options.d/
vi jvm.options
-Xms8g
-Xmx8g

# Elasticsearch Networking configuration
# _local_ refers to Any loopback addresses on the system and _site_ refers to Any site-local addresses on the system
vi /etc/elasticsearch/elasticsearch.yml
cluster.name: es710dev
network.host: [_local_,_site_]
http.port: 9200

# Disable Swapping
vi /etc/elasticsearch/elasticsearch.yml
bootstrap.memory_lock: true
mkdir -p /etc/systemd/system/elasticsearch.service.d/
vi /etc/systemd/system/elasticsearch.service.d/override.conf
[Service]
LimitMEMLOCK=infinity

# Optional: Discovery Settings
#Bootstrap check requires any one of below properties to be set:	 
##discovery.seed_hosts: Setting to provide a list of other nodes in the cluster that are master-eligible and likely to be live and contactable in order to seed the discovery process
##discovery.seed_providers: Configure the list of seed nodes: a settings-based, a file-based or cloud based seed hosts provider
##cluster.initial_master_nodes: Explicitly list the master-eligible nodes whose votes should be counted in the very first election

#Here use of EC2 discovery plugin adds a hosts provider that uses the AWS API to find a list of seed nodes.

/usr/share/elasticsearch/bin/elasticsearch-plugin install discovery-ec2

vi /etc/elasticsearch/elasticsearch.yml
discovery.seed_providers: ec2
discovery.ec2.endpoint: ec2.us-east-1.amazonaws.com

# Restart to apply configuration updates
systemctl daemon-reload
systemctl restart elasticsearch.service

# Check status
curl http://<ec2_private_ip>:9200/?pretty
curl http://<ec2_private_ip>:9200/_cluster/health?pretty

# Check Swapping status
curl -X GET http://localhost:9200/_nodes?filter_path=**.mlockall | jq
{"nodes":{"IdG_Tx4XSN-XaHg0soArHg":{"process":{"mlockall":true}}}}

# Check the number of open files descriptors
curl -X GET http://localhost:9200/_nodes/stats/process?filter_path=**.max_file_descriptors
{"nodes":{"IdG_Tx4XSN-XaHg0soArHg":{"process":{"max_file_descriptors":65535}}}}

# Virtual Memory & Threads
# AWS Linux 2 AMI should already have max_map_count set to 262144 and number of threads that can be created to be at least 4096.
# check max_map_count value
sysctl vm.max_map_count
vm.max_map_count = 262144

# check -u value
ulimit -a
```

# Install Kibana on EC2
1. Kibana Setup
```bash
# Configure RPM Repository for Kibana
cd /etc/yum.repos.d/
vi kibana.repo

[kibana]
name=Kibana repository for 7.x packages
baseurl=https://artifacts.elastic.co/packages/7.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md

# Install Kibana from RPM Repository
yum install -y --enablerepo=kibana kibana

# Configure Kibana to run on bootup
systemctl daemon-reload
systemctl enable kibana.service

# Start Kibana
systemctl start kibana.service
systemctl status kibana.service

# Check logs
tail /var/log/kibana/kibana.log
```

2. Config Kibana
```bash
vi /etc/kibana/kibana.yml

server.port: 5601
server.host: "localhost"
elasticsearch.hosts: ["http://elasticsearch-ip:9200"]

systemctl daemon-reload
systemctl restart kibana.service
```

3. Access the http://kibana-ip:5601 and http://kibana-ip:5601/status

# Optional: Installing Logstash
1. Setup Logstash on EC2
```bash
# Configure RPM Repository for Kibana
cd /etc/yum.repos.d/
vi logstash.repo

[logstash]
name=Elastic repository for 7.x packages
baseurl=https://artifacts.elastic.co/packages/7.x/yum
gpgcheck=1
gpgkey=https://artifacts.elastic.co/GPG-KEY-elasticsearch
enabled=1
autorefresh=1
type=rpm-md

# Install Kibana from RPM Repository
yum install -y --enablerepo=logstash logstash
vi /etc/logstash/logstash.yml

# Configure Kibana to run on bootup
systemctl daemon-reload
systemctl enable logstash.service

# Start Kibana
systemctl start logstash.service
systemctl status logstash.service

# Check logs
tail /var/log/logstash/logstash-plain.log
```

2. Example: Collect Apache Access Logs with Logstash
```bash
# Download sample Apache Access Logs
wget -O /home/ec2-user/apache-daily-access.log https://logz.io/sample-data

# Create a Logstash configuration file
vi /etc/logstash/conf.d/apache-01.conf
input {
  file {
    path => "/home/ec2-user/apache-daily-access.log"
  start_position => "beginning"
  sincedb_path => "/dev/null"
  }
}

filter {
  grok {
    match => { "message" => "%{COMBINEDAPACHELOG}" }
  }
  date {
    match => [ "timestamp" , "dd/MMM/yyyy:HH:mm:ss Z" ]
  }
  geoip {
    source => "clientip"
  }
}

output {
  elasticsearch { 
  hosts => ["localhost:9200"] 
  }
}


systemctl daemon-reload
systemctl restart logstash.service

# To make sure the data is being indexed, use:

curl -XGET 'localhost:9200/_cat/indices?v&pretty'

health status index   uuid  pri rep docs.count docs.deleted store.size pri.store.size
yellow open   logstash-2020.11.25-000001      Eze862PyQ5mhWJH053TyUQ   1   1          0            0       208b           208b

curl -XGET 'localhost:9200/logstash-2020.11.25-000001/_search?pretty&q=response=200'
```

- Then you access the http://kibana-ip:5601
- index pattern: `logstash-*`
- select the `@timestamp` as timestamp field

# cleanup
```
sudo su
systemctl stop elasticsearch.service
yum remove elasticsearch

systemctl stop kibana.service
yum remove kibana
```

# Reference
[How to Install the ELK Stack on AWS: A Step-By-Step Guide](https://logz.io/blog/install-elk-stack-amazon-aws/)
[Setup Elasticsearch Cluster on AWS EC2](https://rharshad.com/setup-elasticsearch-cluster-aws-ec2/)