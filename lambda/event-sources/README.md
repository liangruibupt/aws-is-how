# Lambda Event Sources & Scheduling

用 Kinesis、EventBridge 定时规则、S3、SNS/SQS 等事件源触发 Lambda。

## Docs

- [Schedule-Invoke-Lambda](Schedule-Invoke-Lambda.md)：用 CloudFormation `AWS::Events::Rule` 的 cron 表达式定时调用 Lambda 并通过 `Input` 传入参数（片段）

## Subprojects

- [kinesis-lambda](kinesis-lambda/README.md)：Kinesis Data Stream 触发 Lambda：Node.js 解码记录示例、写 DynamoDB 并发 SNS 通知的示例（`index-ddb.js`），以及 Python 股票数据 producer / consumer 示例，含清理步骤

## Scripts

- [scripts/lambda_s3_trigger.py](scripts/lambda_s3_trigger.py)：S3 事件触发：读取上传的 JSON 对象，写到 `/tmp` 后再上传回 S3 另一个前缀
- [scripts/readSNS-SQSMessage.py](scripts/readSNS-SQSMessage.py)：打印 SNS / SQS 事件中的消息体
