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

### 方案2: 使用AWS CLI和OpenSearch API
```bash
aws opensearch put-index --region us-east-1 --profile global_ruiliang \
  --endpoint https://your-collection-id.us-east-1.aoss.amazonaws.com \
  --index-name bedrock-sample-rag-index \
  --body '{
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

### 方案3: 使用Python脚本
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