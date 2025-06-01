# Sign the request with AWS SigV4
Because you have configured VPC network access for your vector search collection, you cannot create the indexes directly. Instead, you can configure the settings to generate a JSON script with the generated curl command below, which can be copied and executed in the command shell to create an index. You must have network access to the collection endpoint and sign the request with AWS SigV4.


## 方案 1 Recommended Option: Use AWS CLI to generate temporary credentials
### 安装awscurl
```bash
pip install awscurl
```

### 使用awscurl发送签名请求
```bash
awscurl --service aoss --region us-east-1 --profile global_ruiliang \
  -vv > debug_log.txt 2>&1 \
  -H "Content-Type: application/json" \
  -X PUT \
  https://your-collection-id.us-east-1.aoss.amazonaws.com/bedrock-sample-rag-index \
  -d '{
   "settings": {
      "index.knn": "true",
       "number_of_shards": 1,
       "knn.algo_param.ef_search": 512,
       "number_of_replicas": 0
   },
   "mappings": {
      "properties": {
         "vector": {
            "type": "knn_vector",
            "dimension": 1024,
             "method": {
                 "name": "hnsw",
                 "engine": "faiss",
                 "space_type": "l2"
             }
         },
         "text": {
            "type": "text"
         },
         "text-metadata": {
            "type": "text"
         }
      }
   }
}'
```

If running on EC2, you need make sure the EC2 install profile has right permission
```bash
TOKEN=`curl -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"`
creds=`curl -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/ray-ec2-role`

export AWS_ACCESS_KEY_ID=$(echo $creds | jq -r '.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo $creds | jq -r '.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo $creds | jq -r '.Token')
```



### 方案2: 使用Python脚本
```bash
pip install boto3 requests requests-aws4auth
```

```python
import boto3
import requests
import json
from requests_aws4auth import AWS4Auth

def create_opensearch_index_in_vpc(collection_endpoint, region, index_name, payload):
    # Create AWS SigV4 auth
    credentials = boto3.Session().get_credentials()
    awsauth = AWS4Auth(
        credentials.access_key,
        credentials.secret_key,
        region,
        'aoss',
        session_token=credentials.token
    )
    
    # Prepare the request
    url = f"https://{collection_endpoint}/{index_name}"
    headers = {"Content-Type": "application/json"}
    
    # Send the request
    response = requests.put(
        url,
        auth=awsauth,
        json=payload,
        headers=headers
    )
    
    return response.text

# Example usage
if __name__ == "__main__":
    # Replace these values with your actual values
    COLLECTION_ENDPOINT = "your-collection-id.us-east-1.aoss.amazonaws.com"
    REGION = "us-east-1"
    INDEX_NAME = "my-vector-index"
    
    # Define your index mapping
    payload = {
        "settings": {
            "index.knn": "true",
            "number_of_shards": 1,
            "knn.algo_param.ef_search": 512,
            "number_of_replicas": 0
        },
        "mappings": {
            "properties": {
                "vector": {
                    "type": "knn_vector",
                    "dimension": 1024,
                    "method": {
                        "name": "hnsw",
                        "engine": "faiss",
                        "space_type": "l2"
                    }
                },
                "text": {
                    "type": "text"
                },
                "text-metadata": {
                    "type": "text"
                }
            }
        }
    }
    
    result = create_opensearch_index_in_vpc(COLLECTION_ENDPOINT, REGION, INDEX_NAME, mapping)
    print(result)
```

### check result
```bash
# 获取索引详细信息（映射、设置等）
awscurl --service aoss --region us-east-1 --profile global_ruiliang \
  https://your-collection-id.us-east-1.aoss.amazonaws.com/bedrock-sample-rag-index

# 获取索引统计信息
awscurl --service aoss --region us-east-1 --profile global_ruiliang \
  https://your-collection-id.us-east-1.aoss.amazonaws.com/bedrock-sample-rag-index/_stats

# 列出所有索引
awscurl --service aoss --region us-east-1 --profile global_ruiliang \
  https://your-collection-id.us-east-1.aoss.amazonaws.com/_cat/indices?v
```

### debug
```bash
# 基本详细输出
awscurl --service aoss --region us-east-1 \
  https://your-collection-id.us-east-1.aoss.amazonaws.com/bedrock-sample-rag-index \
  -v

# 更详细的输出（显示请求头和响应头）
awscurl --service aoss --region us-east-1 \
  https://your-collection-id.us-east-1.aoss.amazonaws.com/bedrock-sample-rag-index \
  -vv

# 最大详细程度（显示所有数据传输）
awscurl --service aoss --region us-east-1 \
  https://your-collection-id.us-east-1.aoss.amazonaws.com/bedrock-sample-rag-index \
  -vvv

# 定向日志
awscurl --service aoss --region us-east-1 \
  https://your-collection-id.us-east-1.aoss.amazonaws.com/bedrock-sample-rag-index \
  -vvv > debug_log.txt 2>&1

# check network part
# 获取域的 VPC 配置详情
aws opensearch describe-domain --domain-name your-domain-name --region us-east-1 | grep -A 15 "VPCOptions"
```