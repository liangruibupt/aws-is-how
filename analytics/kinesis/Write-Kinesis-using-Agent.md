# Writing to Kinesis Data Firehose Using Kinesis Agent

[Sending Data to an Amazon Kinesis Data Firehose Delivery Stream](https://docs.aws.amazon.com/firehose/latest/dev/basic-write.html)

[Kinesis Agent for Microsoft Windows](https://docs.aws.amazon.com/kinesis-agent-windows/latest/userguide/what-is-kinesis-agent-windows.html)

# Case 1: Linux agent
## Prerequisites
1. Prepare your system follow the [prerequisites guide](https://docs.aws.amazon.com/firehose/latest/dev/writing-with-agents.html#prereqs). Here I use the EC2 running Amazon Linux as example

2. Credentials, follow up the [guide](https://docs.aws.amazon.com/firehose/latest/dev/writing-with-agents.html#agent-credentials) to set the AWS Credentials

3. Create the S3 bucket and Kiensis Firehose deliver stream
[kinsis-firehose-s3](media/kinsis-firehose-s3.png)

- S3 bucket prefix
```bash
rawdata/kda/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/
```

- S3 bucket error prefix
```bash
rawdata/kda/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/!{firehose:error-output-type}
```

- buffer 5MB size and interval 60 seconds

## Install and configure the Agent
3. Download and Install the Agent
```bash
sudo yum install –y aws-kinesis-agent
```

4. Configure and Start the Agent

- Create or Edit `/etc/aws-kinesis/agent.json`, I use the Ningxia region cn-northwest-1 as example
```bash
{
  "cloudwatch.emitMetrics": true,
  "firehose.endpoint": "firehose.cn-northwest-1.amazonaws.com.cn",

  "flows": [
    {
      "filePattern": "/tmp/iot-app.log*",
      "deliveryStream": "ExampleOutputStream2S3"
    }
  ]
}
```
- Start the agent manually
```bash
sudo service aws-kinesis-agent start
```

Agent activity is logged in `/var/log/aws-kinesis-agent/aws-kinesis-agent.log`. 

(Optional) Configure the agent to start on system startup:

```bash
sudo chkconfig aws-kinesis-agent on
```

## Send test logs
Here use python3 generate the dummy logs
```bash
python scripts/dummy-logs.py
```