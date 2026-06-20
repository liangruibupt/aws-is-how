"""
1. 先列出可用工具（tools/list）
由于你用的是 IAM 鉴权，需要用 awscurl（SigV4 签名）：
awscurl --service bedrock-agentcore --region us-east-1 \
  --profile global_ruiliang \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "list-tools",
    "method": "tools/list",
    "params": {}
  }' \
  "https://gateway-quick-start-cac2cd-shej3hnlhk.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp"

2. 调用 Web Search 工具（tools/call）
awscurl --service bedrock-agentcore --region us-east-1 \
  --profile global_ruiliang \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "call-1",
    "method": "tools/call",
    "params": {
      "name": "target-quick-start-websearch___WebSearch",
      "arguments": {
        "query": "Amazon Bedrock AgentCore",
        "maxResults": 5
      }
    }
  }' \
  "https://gateway-quick-start-cac2cd-shej3hnlhk.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp"
"""
import boto3
import json
import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# 配置
PROFILE = "global_ruiliang"
REGION = "us-east-1"
GATEWAY_URL = "https://gateway-quick-start-cac2cd-shej3hnlhk.gateway.bedrock-agentcore.us-east-1.amazonaws.com/mcp"

session = boto3.Session(profile_name=PROFILE)
credentials = session.get_credentials().get_frozen_credentials()

def send_mcp_request(method, params=None):
    """发送 MCP JSON-RPC 请求到 AgentCore Gateway（IAM SigV4 签名）"""
    payload = json.dumps({
        "jsonrpc": "2.0",
        "id": f"req-{method}",
        "method": method,
        "params": params or {}
    })
    req = AWSRequest(method="POST", url=GATEWAY_URL, data=payload, headers={"Content-Type": "application/json"})
    SigV4Auth(credentials, "bedrock-agentcore", REGION).add_auth(req)
    resp = requests.post(GATEWAY_URL, headers=dict(req.headers), data=req.body)
    return resp.json()

# 1. 列出所有工具
list_result = send_mcp_request("tools/list")
tools = list_result.get("result", {}).get("tools", [])

print("=== 可用工具 ===")
for t in tools:
    print(f"  - {t['name']}: {t['inputSchema']}")

# 2. 用第一个工具的 name 来调用 tools/call
if tools:
    tool_name = tools[0]["name"]  # target-quick-start-websearch___WebSearch
    print(f"\n=== 调用工具: {tool_name} ===")

    call_result = send_mcp_request("tools/call", {
        "name": tool_name,
        "arguments": {
            "query": "Amazon Bedrock AgentCore Gateway",
            "maxResults": 5
        }
    })
    print(json.dumps(call_result, indent=2, ensure_ascii=False))