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

## Self host outlook-for-mac server
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

{
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
        "outlook-mcp-server" : {
      "command" : "/Users/ruiliang/Documents/workspaces/OutlookForMac-mcp-server/outlook_mcp.py",
      "args" : [ ],
      "env" : {
        "OUTLOOK_MCP_LOG_LEVEL" : "INFO",
        "USER_EMAIL" : "ruiliang@amazon.com",
        "PYTHON_PATH" : "/Users/ruiliang/Documents/workspaces/OutlookForMac-mcp-server/.venv/bin/python3"
      }
  }
}