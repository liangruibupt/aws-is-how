# Sales Agent Toolkit

## [Offical Sales Agent Toolkit mcp server](https://w.amazon.com/bin/view/SalesAgentToolkit)
1. Valid Midway authentication - ```mwinit```
2. Install toolbox by following the [instructions](https://docs.hub.amazon.dev/builder-toolbox/user-guide/getting-started/#installing-toolbox)
3. Install [mcp-registry](https://docs.hub.amazon.dev/gen-ai-dev/mcp-guidance/#using-model-context-protocol-servers) via toolbox - ```toolbox install mcp-registry```
4. Installation mcp server
```bash
mcp-registry install aws-sentral-mcp
mcp-registry install aws-outlook-mcp
```
5. Configuration
```json
{
    "mcpServers": { 
        "aws-sentral-mcp": { 
            "command": "aws-sentral-mcp",
            "disabled": false,
         },
         "aws-outlook-mcp": { 
            "command": "aws-outlook-mcp",
            "disabled": false,
         }
      }
}
```

6. Testing
```
根据ai-ml/Dec01-Dec05.md的内容,利用aws-sentral-mcp 创建 SA activity
```t

## Self host outlook-for-mac server
1. Installation
```
ssh -V
ssh-keygen -t ecdsa
mwinit -f -s -k ~/.ssh/id_ecdsa.pub

https://console.harmony.a2z.com/mcp-registry/server/outlook-for-mac
https://code.amazon.com/packages/OutlookForMac-mcp-server/trees/mainline

git clone ssh://git.amazon.com/pkg/OutlookForMac-mcp-server

cd OutlookForMac-mcp-server/
python -m venv .venv
which python   /usr/local/bin/python
python --version Python 3.13.3

source .venv/bin/activate
pip install -r requirements.txt
```

2. MCP configuration
```json
"mcpServers": {
    "outlook-mcp-server": {
      "command": "/Users/ruiliang/Documents/workspace/OutlookForMac-mcp-server/outlook_mcp.py",
      "args": [],
      "env": {
        "OUTLOOK_MCP_LOG_LEVEL": "INFO",
        "USER_EMAIL": "ruiliang@amazon.com",
        "PYTHON_PATH": "/Users/ruiliang/Documents/workspace/OutlookForMac-mcp-server/.venv/bin/python3"
      }
    }
}
```
# Quip MCP
https://quip-amazon.com/b6lRA8oPOEZw/AWS-FAQ-Hub-User-Guide, FAQ Hub MCP 通过提供内部文档访问来扩展 Amazon Q CLI / Kiro 的功能，包括故障排除指南和 FAQ 等，包含了 aws-faq 和 quip-mcp 两个 MCP Server 的配置

# Highspot MCP
1. Install ChromeDriver
```bash
# Check Chrome version: 
chrome://version/ in chrome

# Download version matching ChromeDriver
https://googlechromelabs.github.io/chrome-for-testing/
# Or you can directly install: 
npx @puppeteer/browsers install chromedriver@142.0.7444.175

cd ~/Downloads/chromedriver-mac-arm64/
xattr -d com.apple.quarantine chromedriver
sudo mv chromedriver /usr/local/bin
/usr/local/bin/chromedriver

Starting ChromeDriver 142.0.7444.175 (xxxxx) on port 0
Only local connections are allowed.
Please see https://chromedriver.chromium.org/security-considerations for suggestions on keeping ChromeDriver safe.
ChromeDriver was started successfully on port 64499.
```

2. Setup SSH to gitlab
Configure GitLab access: https://gitlab.pages.aws.dev/docs/Platform/ssh.html#ssh-config
```bash
ssh-keygen -t ecdsa # Optional
mwinit -k ~/.ssh/id_ecdsa.pub
echo "Host ssh.gitlab.aws.dev     
    User git
    IdentityFile ~/.ssh/id_ecdsa
    CertificateFile ~/.ssh/id_ecdsa-cert.pub
    IdentitiesOnly yes
    ProxyCommand none
    ProxyJump none" >> ~/.ssh/config
ssh -T ssh.gitlab.aws.dev # tests SSH can reach Gitlab
```

3. Authenticate with AWS Midway:

每天都需要运行 mwinit -f -k ~/.ssh/id_ecdsa.pub 命令

```bash
# The midway authentication command must be executed everyday to access the mcp server.
mwinit -f -k ~/.ssh/id_ecdsa.pub 
#or 
mwinit -k ~/.ssh/id_ecdsa.pub
```

1. MCP configure
```json
"aws_highspot_mcp": {
      "type": "stdio",
      "url": "",
      "headers": {},
      "command": "uvx",
      "args": [
        "--from",
        "git+ssh://git@ssh.gitlab.aws.dev/yunqic/aws-highspot-mcp.git@main",
        "highspot-mcp"
      ],
      "timeout": 120000,
      "disabled": false
    }
```

1. MCP tools
```
get_highspot_info() - Check authentication status

search_in_highspot(query) - Search Highspot content

analyze_highspot_page(url) - Analyze a Highspot page

download_highspot_content(urls) - Download content files

chat_with_highspot(query) - Chat with Highspot knowledge base
```

6. Testing
需要显式的指定你是要 search 还是 chat 还是 download

```
# 帮我在 highspot 上面找一个 China Region 半年内最新版本的 first call deck，可能调用的是chat_with_highspot
chat_with_highspot

帮我在 highspot 上面 search 半年内最新版本的 China Region first call deck
search_in_highspot
```