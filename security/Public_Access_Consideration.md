# Public Access Consideration

正常情况下，AWS China Account 可以通过做 ICP Exception（通过AWS BD），将账号资源的80/8080/443端口会自动开通，例如 API Gateway，ALB，EC2。偶尔情况下，API gateway开通80/8080/443端口需要开case 人工介入。开通80/8080/443端口是正常的业务行为，即使内网访问也需要开通。

API Gateway本身就分成公共API和私有API, 这个可以按照业务需求和暴露的信息分级去配置。开通私有API的方法： https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-apis.html 。对于公有API 可以参考文档中的保护措施 https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-protect.html ，使用私有API是其中手段之一。

在VPC内部的服务，例如EC2,RDS,EMR,ElasticSearch,Redis，这些受到子网，安全组，NACL，authentication，authorization的保护，本身应该是安全的。RDS,EMR,ElasticSearch 还额外有默认关闭公网访问的选项。S3本身默认是不开启公网访问的，lambda也无法从外部直接调用。对于有默认关闭公网访问的选项的服务，可以通过CloudTrail 或者 Config 去检测开启公网访问的行为，并且阻断。

对于Load Balance, API Gateway 这样的用于expose service and api的，本身就可以按照业务需求和暴露的信息分级去配置是否需要public internet facing。
