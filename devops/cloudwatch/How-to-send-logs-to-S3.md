1. [Exporting Log Data to Amazon S3](https://docs.amazonaws.cn/en_us/AmazonCloudWatch/latest/logs/S3Export.html)

You can export log data from your log groups to an Amazon S3 bucket and use this data in custom processing and analysis, or to load onto other systems.

2. [Sending Logs Directly to Amazon S3](https://docs.amazonaws.cn/en_us/AmazonCloudWatch/latest/logs/Sending-Logs-Directly-To-S3.html)

Some AWS services can publish logs directly to Amazon S3:

- VPC flow logs. see [Publishing Flow Logs to Amazon S3](https://docs.amazonaws.cn/vpc/latest/userguide/flow-logs-s3.html)

- AWS Global Accelerator flow logs. see [Publishing Global Accelerator Flow Logs to Amazon S3](https://docs.aws.amazon.com/global-accelerator/latest/dg/monitoring-global-accelerator.flow-logs.html#monitoring-global-accelerator.flow-logs-publishing-S3)

3. Using CloudWatch Logs [Subscription Filters with Amazon Kinesis Data Firehose](https://docs.amazonaws.cn/en_us/AmazonCloudWatch/latest/logs/SubscriptionFilters.html) sent logs to S3

Sends any incoming log events that match your defined filters to your Amazon Kinesis Data Firehose delivery stream. Data sent from CloudWatch Logs to Amazon Kinesis Data Firehose is already compressed with gzip level 6 compression, so you do not need to use compression within your Kinesis Data Firehose delivery stream.

4. If you need process the logs before sent to S3, you can use the [Subscription Filters with AWS Lambda](https://docs.amazonaws.cn/en_us/AmazonCloudWatch/latest/logs/SubscriptionFilters.html#LambdaFunctionExample)