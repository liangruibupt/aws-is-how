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

3. Setup the Dataset

The `faq_data.cvs` is built based on  https://github.com/candlewill/Dialog_Corpus

4. Testing
```bash
pip install elasticsearch -t .
pip install pandas -t .
pip install requests -t .
pip install requests_aws4auth -t .

export ES_USER=TheMasterUser
export ES_PASSWORD=YOUR_PASSWORD
export ES_HOST=YOUR_ES_HOST

#python simple_chatbot.py --create_index

python simple_chatbot.py 
> 如何开发票
请在聊天窗口输入抬头，联系人和快递地址
> 什么是ai
人工智能是工程和科学的分支,致力于构建具有思维的机器。
> 迷失迷你是什么编写的
Python
> 什么是维纳斯
超声波,在医学诊断和治疗中使用,在手术等。
> 什么是聊天机器人
超声波,在医学诊断和治疗中使用,在手术等。
```

```json
GET faq/_search?q=什么是聊天机器人
```

 ## Reference
 [Internal User Database and HTTP Basic Authentication](https://docs.amazonaws.cn/elasticsearch-service/latest/developerguide/fgac.html#fgac-walkthrough-basic)