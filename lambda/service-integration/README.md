# Lambda Service Integration

在 Lambda 函数里调用其他 AWS 服务或外部服务的示例脚本。

## Scripts

- [scripts/call-rekgonition.py](scripts/call-rekgonition.py)：S3 上传图片触发，调用 Rekognition 人脸检测，结果写入输出 S3 桶，年龄段 / 性别更新到 DynamoDB
- [scripts/lambda_ses.py](scripts/lambda_ses.py)：从 Secrets Manager 取凭证，创建 Global 区域 SES 客户端发送测试邮件（HTML + 文本）
- [scripts/lambda_ses_sendcloud.py](scripts/lambda_ses_sendcloud.py)：从 Secrets Manager 取凭证，通过 SendCloud HTTP API 发送测试邮件
- [scripts/lambda-ssm-variables.py](scripts/lambda-ssm-variables.py)：按事件中的参数名读取 SSM Parameter Store（`WithDecryption=True`）
- [scripts/lambda-access-internet.py](scripts/lambda-access-internet.py)：测试 Lambda 公网访问：请求外部网站和 API Gateway，用 checkip.amazonaws.com 获取出口公网 IP
- [scripts/ec2_operation.py](scripts/ec2_operation.py)：按名称 `EC2-Default-SG` 查询安全组及其规则并打印
