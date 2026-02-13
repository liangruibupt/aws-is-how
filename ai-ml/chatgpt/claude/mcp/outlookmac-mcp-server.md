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
## Quip MCP
https://quip-amazon.com/b6lRA8oPOEZw/AWS-FAQ-Hub-User-Guide, FAQ Hub MCP 通过提供内部文档访问来扩展 Amazon Q CLI / Kiro 的功能，包括故障排除指南和 FAQ 等，包含了 aws-faq 和 quip-mcp 两个 MCP Server 的配置

## Highspot MCP

Highspot MCP 配置 https://quip-amazon.com/ucGaAhcH9243/AWS-Highspot-MCP-

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

## Asana MCP
1. Step 1: Request Asana Personal Access Token
   
    1.1 File Token Request Reference Ticket: https://t.corp.amazon.com/V2072051873/communication 

    1.2 Generate Token: Once approved, follow instructions at: https://developers.asana.com/docs/personal-access-token 

2. Step 2: Setup the Asana MCP
   
    2.1 Permissions: You must be a member of the following POSIX groups (verify at Permissions Portal): `software, source-code, apolloop, and toolbox-users-*`. If you're missing any, your manager can add you — see [What to do if you're missing permissions](https://docs.hub.amazon.dev/dev-setup/prerequisites/#development-prereq-missing-permissions)
   
    2.2 Option1: The full guidance reference [Asana MCP Server Setup Guide - Complete Configuration and Usage](https://w.amazon.com/bin/view/UPMT/DiscoTec/Teams/Churro/AI/Asana)

        ```
        Install via AIM (Recommended) `aim mcp install asana-mcp`
   
        But I encounter the error when running command
    
        aim mcp install asana-mcp
        ✗ Failed to install MCP server

        Failed to resolve version set 'AsanaMCPServer/development' for package 'AsanaMCPServer-1.0'.
        The version set may be deprecated or unavailable.
        Contact the package owner to revive the version set, or check if a newer version is available.
        ```

        So I change to manual install
        ```
        git clone ssh://git.amazon.com/pkg/AsanaMCPServer
        cd AsanaMCPServer
        git log
        npm install
        npm run build
        ```
    
    2.3 Option2: [Asana MCP Server Runbook](https://w.amazon.com/bin/view/Victoria/Ark/SOPs/AsanaMCP/)
    
    - install [brazil cli on by macbook](https://docs.hub.amazon.dev/brazil/cli-guide/setup-macos/) `toolbox install brazilcli`

        Since Mac OS 10.15 (Catalina), the root filesystem is read-only. But, for backwards compatibility, a tool (for example, Brazil CLI) wants to install some shims under /apollo. To get around this, Mac OS provides functionality to create a synthetic root filesystem symlink on boot; Builder Toolbox knows how to do this for you. You just need restart the Macbook once you first run `toolbox install brazilcli`, then you can run it again. more information, please check [Troubleshooting Builder Toolbox](https://docs.hub.amazon.dev/builder-toolbox/user-guide/troubleshooting/#trying-to-install-a-tool-that-has-exports-located-on-the-root-filesystem)

        ```
        toolbox install brazilcli
        Installing brazilcli version 2.0.215533.0   
        Successfully installed brazilcli version 2.0.215533.0

        Tool: brazilcli
        Description: Brazil CLI
        Team: Build Execution
        Email: bx-team@amazon.com

        For more information about this tool, see https://w.amazon.com/index.php/BrazilCLI_2.0
        To report bug/issue, see https://w.amazon.com/index.php/BrazilCLI_2.0#bug

        Commands: brazil, brazil-bootstrap, brazil-build, brazil-build-rainbow, brazil-build-tool-exec, brazil-cmd-complete, brazil-context, brazil-farm, brazil-json-client, brazil-package-cache, brazil-path, brazil-recursive-cmd, brazil-runtime-exec, brazil-setup, brazil-test-exec, brazil-wire-ctl, downloadS3Binary, findup, get-current-platform
        ```

    - Test your setup by running `brazil help`

    - Enable Brazil CLI tab completion: `brazil setup completion`

    - Clone and setup the repo
      ```
      # Clone the repository
      brazil ws create --root asana_mcp
      cd asana_mcp
      brazil ws use -p AsanaMCPServer (use live version set)
      cd AsanaMCPServer

      # Install dependencies
      npm install

      # Build the server
      npm run build
      ```

3. Configure the MCP

~/.kiro/settings/mcp.json
~/.aws/amazonq/mcp.json
```
{
  "mcpServers": {
    "asana": {
      "command": "node",
      "args": [
        "~/workspaces/AsanaMCPServer/dist/src/bin/mcp-server.js"
      ],
      "env": {
        "ASANA_ACCESS_TOKEN": "YOUR_TOKEN_HERE"
      },
      "disabled": false
    }
  }
}
```

4. Testing in Kiro
```
Can you show me my current Asana tasks?

Can you show me the recent 7 days tasks under project 'xxxx'
```

## Quip Exporter
1. Install link: https://w.amazon.com/bin/view/Quip_Exporter/
2. Usage `./quip-exporter --access-token "YOUR_PAT" --id "FOLDER_OR_DOC_ID" --output-dir ./export`