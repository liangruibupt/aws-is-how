# FAQ ChatBot

## ElasticSearch Based
1. Create the Amezon ElasticSearch Domain: `faq-es`
 - For testing, I use the Development mode
 - Public access
 - Enable Fine–grained access control: Create the master user
 - Customer access Policy
 ```json
 {
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "*"
      },
      "Action": [
        "es:*"
      ],
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": [
            "YOURID_CIDR"
          ]
        }
      },
      "Resource": "arn:aws-cn:es:cn-northwest-1:876820548815:domain/faq-es/*"
    }
  ]
}
```
- Follow up the guide to finish the [Authentication and Authorization](https://docs.amazonaws.cn/en_us/elasticsearch-service/latest/developerguide/fgac.html#fgac-walkthrough-basic) if you need more secured protection of your domain

2. Testing the Smart Chinese Analysis
- Login the Kibana
- Navigate to DevTools
```json
POST _analyze
{
  "analyzer": "smartcn",
  "text": "中国东北虎"
}

{
  "tokens" : [
    {
      "token" : "中国",
      "start_offset" : 0,
      "end_offset" : 2,
      "type" : "word",
      "position" : 0
    },
    {
      "token" : "东北虎",
      "start_offset" : 2,
      "end_offset" : 5,
      "type" : "word",
      "position" : 1
    }
  ]
}

POST _analyze
{
  "analyzer": "smartcn",
  "text": "动手学做聊天机器人系列之三：从0到1构建一个Chatbot"
}

POST _analyze
{
  "analyzer": "smartcn",
  "text": "将传统Web应用程序迁移为Serverless架构"
}
```

- Setting for index

```json
PUT /your_index
{
  "settings": {
    "index": {
      "analysis": {
        "analyzer": {
          "default": {
            "type": "smartcn"
          }
        }
      }
    }
  }
}

GET /your_index/_analyze?text='叻出色'
```

3 Setup the Dataset

https://github.com/candlewill/Dialog_Corpus



 ## Reference
 [Internal User Database and HTTP Basic Authentication](https://docs.amazonaws.cn/elasticsearch-service/latest/developerguide/fgac.html#fgac-walkthrough-basic)