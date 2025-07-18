# Install amzn-mcp via toolbox (Recommended)
The toolbox version is currently available on Mac(ARM CPU)/Amazon Linux2/Ubuntu

## Install toolbox
https://docs.hub.amazon.dev/builder-toolbox/user-guide/getting-started/
```bash
mwinit

curl -X POST \
  --data '{"os":"osx"}' \
  -H "Authorization: $(curl -L \
  --cookie $HOME/.midway/cookie \
  --cookie-jar $HOME/.midway/cookie \
  "https://midway-auth.amazon.com/SSO?client_id=https://us-east-1.prod.release-service.toolbox.builder-tools.aws.dev&response_type=id_token&nonce=$RANDOM&redirect_uri=https://us-east-1.prod.release-service.toolbox.builder-tools.aws.dev:443")" \
  https://us-east-1.prod.release-service.toolbox.builder-tools.aws.dev/v1/bootstrap \
  > ~/toolbox-bootstrap.sh

bash ~/toolbox-bootstrap.sh

rm ~/toolbox-bootstrap.sh

source ~/.$(basename "$SHELL")rc

toolbox list
```

## Install amzn-mcp
```bash
toolbox registry add s3://amzn-mcp-prod-registry-bucket-us-west-2/tools.json
toolbox install amzn-mcp

toolbox update --check

toolbox update amzn-mcp

# toolbox uninstall amzn-mcp
```

## Quip API Token configuration

There are multiple ways to provide Quip API token to MCP server:

1. Through QUIP_API_TOKEN environment variable
2. Through an env file with QUIP_API_TOKEN=<token> value by Creating an env file at ~/.amazon-internal-mcp-server/.env 
3. To get Quip API token visit: https://quip-amazon.com/dev/token

You can test weather this works by following command:

```json
echo '{"jsonrpc": "2.0", "method": "tools/call", "params": {"name": "read_quip", "arguments": {"documentId": "https://quip-amazon.com/nJKtAZhnDt2a/Q-DEV-CLI-MCP-Beta"}}, "id": 1}' | amzn-mcp
```

## Configure MCP client
```json
{
  "mcpServers": {
   "amzn-mcp": {
      "command": "amzn-mcp",
      "args": [
        "--include-tags=read",  // Optional: Include only tools with all these tags
        "--exclude-tags=write"         // Optional: Exclude tools with any of these tags
      ],
      "disabled": false,
      "env": {
            "QUIP_API_TOKEN": "YOUR QUIP KEY"
        },
      "autoApprove": [],
      "timeout": 60000
   }
  }
}
```
