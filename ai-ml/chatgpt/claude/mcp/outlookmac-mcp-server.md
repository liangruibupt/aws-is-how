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
  }
}