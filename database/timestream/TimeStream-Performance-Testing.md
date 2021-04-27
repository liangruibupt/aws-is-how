# Amazon Timestream Performance Testing

Architecture

You can use the [sample data ingestion load and query load generator](https://github.com/awslabs/amazon-timestream-tools/tree/master/tools/perf-scale-workload) to generate the ingest and query workload.

You can also use the IoT simulator to generate the load to Kinesis and using Connector to ingest data into Amazon Timestream database table. Below are testing architecture

![TimeStream-Performance-PoC](image/TimeStream-Performance-PoC.png)

## Setup the interface VPC endpoint

You can establish a private connection between your VPC and Amazon Timestream by creating an interface VPC endpoint. Interface endpoints are powered by AWS PrivateLink, a technology that enables the instances in your VPC to privately access Timestream APIs without public IP addresses. Traffic between your VPC and Timestream does not leave the Amazon network. 

1. Creating an interface VPC endpoint for Timestream 
- Constructing a VPC endpoint service name using your Timestream cell
```bash
aws timestream-query describe-endpoints --profile timestream-test --region us-east-1
{
    "Endpoints": [
        {
            "Address": "query-cell2.timestream.us-east-1.amazonaws.com",
            "CachePeriodInMinutes": 1440
        }
    ]
}
com.amazonaws.us-east-1.timestream.query-cell2

aws timestream-write describe-endpoints --profile timestream-test --region us-east-1
{
    "Endpoints": [
        {
            "Address": "ingest-cell2.timestream.us-east-1.amazonaws.com",
            "CachePeriodInMinutes": 1440
        }
    ]
}
com.amazonaws.us-east-1.timestream.ingest-cell2
```

## Create the sample database
1. On Timestream Console and create a database named `kdaflink`

2. Under the `kdaflink` database, create a table named `kinesisdata1`

## Ingest Data

We will use the Kinesis Stream to generate the sample data used by performance testing as streaming appoarch and use the Flink to insert data into TimeStream table

1. Create a kinesis data stream `TimestreamTestStream`

2. 启动一台服务器 EC2， git clone 将此 repo 下载到到服务器上

3. Check the EC2 installed the `maven`

4. Install Flink
```bash
wget https://archive.apache.org/dist/flink/flink-1.8.2/flink-1.8.2-src.tgz
tar -xvf flink-1.8.2-src.tgz
cd flink-1.8.2
mvn clean install -Pinclude-kinesis -DskipTests
```

5. Build the `flink_connector`
```bash
# cd ~/timestream-scale-performance/flink_connector
mvn clean compile
mvn exec:java -
Dexec.mainClass="com.amazonaws.services.kinesisanalytics.StreamingJob" -
Dexec.args="--InputStreamName TimestreamTestStream --Region us-east-1 --
TimestreamDbName kdaflink --TimestreamTableName kinesisdata1"
```

6. Open a new Terminal and execute the `producer` to simulate the IoT data.
- stream is Kinesis stream name
- region is Timestream and Kinesis region。
```
# cd ~/timestream-scale-performance
python3 timestream_kinesis_data_gen_blog.py --stream TimestreamTestStream --region us-east-1
```


## Query the Data
Using the script [query_test.py](scripts/query_test.py) to do query. Each SQL will running 5 times and calculate the average response time

```bash
python query_test.py
```

## Reference
[Amazon Timestream Tools and Samples](https://github.com/awslabs/amazon-timestream-tools)

[Deriving real-time insights over petabytes of time series data with Amazon Timestream](https://aws.amazon.com/cn/blogs/database/deriving-real-time-insights-over-petabytes-of-time-series-data-with-amazon-timestream/)