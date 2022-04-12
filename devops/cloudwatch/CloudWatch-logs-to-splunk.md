# How to stream logs from CloudWatch logs to Splunk

1. You can use the [CloudWatch Addon](https://docs.splunk.com/Documentation/AddOns/released/AWS/CloudWatchLogs)

2. Using the HTTP Event Collector
- [Lambda based](https://www.splunk.com/en_us/blog/tips-and-tricks/how-to-easily-stream-aws-cloudwatch-logs-to-splunk.html)
  - [Lambda blueprint](https://dev.splunk.com/enterprise/docs/devtools/httpeventcollector/useawshttpcollector/createlambdafunctionnodejs/)
- [Firehose based]
  - [Firehose out of box capabiliity](https://docs.aws.amazon.com/firehose/latest/dev/vpc-splunk-tutorial.html)
  - [Self build](https://www.splunk.com/en_us/blog/tips-and-tricks/how-to-ingest-any-log-from-aws-cloudwatch-logs-via-firehose.html)