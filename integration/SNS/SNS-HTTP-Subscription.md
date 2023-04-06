# 如何构建Amazon SNS HTTP Subscription?

Amazon SNS 使用 HTTP, Email, Lambda 等发送通知。
这里介绍使用 node.js + aws-sdk-js 以 HTTP 格式构建 Amazon SNS Subscription。

从SNS发布的数据有两种类型，它们由 Type 字段标识。
- 第一种是"SubscriptionConfirmation"类型的通知，即当您请求订阅时将 SNS 需要进行确认的数据。

HTTP 服务收到此消息后，将使用confirmSubscription函数传递ARN信息和令牌信息，以告知Amazon SNS确认已确定。

- 第二种数据类型是"Notification"，它是 SNS 的通知数据。

处理顺序为:
1. HTTP 服务器请求订阅主题
2. Amazon SNS 发送 SubscriptionConfirmation 消息确认订阅 HTTP 服务器，HTTP path 为 `/httpsns`
3. HTTP 服务器 通知用户确认OK
4. 开始分发 Notification 到 HTTP 服务器

## 环境准备
```bash
mkdir sns-http
cd sns-http/
mkdir aws-sns 
cd aws-sns
npm init
npm install aws-sdk
npm install async
npm install url
npm install yargs
```

## SNS 控制脚本
[参考脚本sns-manager.js实现](script/sns-manager.js)

```bash
# 
node sns-manager.js createTopic sns-http-demo
node sns-manager.js listTopic
node sns-manager.js getTopic arn:aws-cn:sns:cn-northwest-1:{your-account-id}:NotifyMe
node sns-manager.js subscribeEmail arn:aws-cn:sns:cn-northwest-1:{your-account-id}:NotifyMe "your-id@example.com"
node sns-manager.js publishMessage arn:aws-cn:sns:cn-northwest-1:{your-account-id}:NotifyMe "Hello World Testing"
```

## 准备 HTTP 接收通知服务
如果您想通过 HTTP 接收Amazon SNS通知，则需要通知目标 HTTP URL。
订阅时，通知数据将被发布到改HTTP URL，因此需要一个 HTTP服务 接收 POST 请求。该服务在EC2上运行。

[参考 HTTP Server app.js 实现](script/app.js)

### 场景1：EC2 公网访问
1. 配置好 aws configure - 这里以cn-northwest-1为例

2. 启动 HTTP 服务
```bash
node app.js
subscribe start.
Subscription ARN is pending confirmation
confirmSubscription
```

3. 发送消息
```bash
node sns-manager.js publishMessage arn:aws-cn:sns:cn-northwest-1:{your-account-id}:sns-http-demo "Hello World HTTP Testing"
```

4. 查看 HTTP 服务的输出，可以看到我们收到了消息
```bash
[ec2-user@ip-10-0-2-83 aws-sns]$ node app.js
subscribe start.
Subscription ARN is pending confirmation
confirmSubscription
TestMassge:Hello World HTTP Testing
```

### 场景2：SNS VPC endpoint + EC2 private dns domain 访问
1. 创建 SNS VPC endpoint
![sns-vpc-endpoint](media/sns-vpc-endpoint.png)

2. 确认 EC2 通过 VPC Endpoint 去往 SNS 
```bash
sudo traceroute -n -T -p 443 sns.cn-northwest-1.amazonaws.com.cn
traceroute to sns.cn-northwest-1.amazonaws.com.cn (10.0.2.105), 30 hops max, 60 byte packets
 1  10.0.2.105  0.176 ms  0.196 ms  0.209 ms
 2  * * *
 3  * * *
 4  * * *
 5  * * *
 6  * 10.0.2.105  0.639 ms  0.752 ms
 7  10.0.2.105  0.595 ms  3.379 ms  3.218 ms
```
3. 使用内部域名订阅
- 修改app.js
```javascript
var params = {
        Protocol: 'http', /* required */
        TopicArn:"arn:aws-cn:sns:cn-northwest-1:{your-account-id}:sns-http-demo",
        Endpoint:"http://{ec2-internal-domain}:3000/httpsns"
    };
```

- 重新订阅
```bash
node app.js
subscribe start.
{ InvalidParameter: Invalid parameter: Unreachable Endpoint
  message: 'Invalid parameter: Unreachable Endpoint',
  code: 'InvalidParameter',
  time: 2020-04-29T09:49:39.809Z,
  requestId: '7a928487-9ec3-52e6-8111-d3a4d1306711',
  statusCode: 400,
}
```

原因分析：
SNS 无法解析VPC 内部域名.
详情参考：https://forums.aws.amazon.com/thread.jspa?threadID=218968

4. 使用内部 IP 订阅 
- 修改app.js
```javascript
var params = {
        Protocol: 'http', /* required */
        TopicArn:"arn:aws-cn:sns:cn-northwest-1:{your-account-id}:sns-http-demo",
        Endpoint:"http://{ec2-internal-ip}:3000/httpsns"
    };
```
- 重新订阅
```bash
subscribe start.
{ AuthorizationError: Not authorized to subscribe internal endpoints
  message: 'Not authorized to subscribe internal endpoints',
  code: 'AuthorizationError',
  time: 2020-04-29T10:28:23.948Z,
  requestId: 'aee06308-d9a7-5643-9580-342b80a01694',
  statusCode: 403
}
```
5. 通过 SNS console 订阅, 结果相同

原因分析：
SNS recognized it as an Amazon internal http endpoint and failed because SNS does not have permission to do so.

详情参考：https://forums.aws.amazon.com/thread.jspa?threadID=218968