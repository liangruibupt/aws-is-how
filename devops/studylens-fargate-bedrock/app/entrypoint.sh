#!/bin/sh
set -e

# EFS is mounted at /data. Ensure the data subdirs exist.
mkdir -p /data/wiki /data/uploads /data/logs

CONFIG_FILE="${STUDYLENS_CONFIG_DIR:-/data}/llm-config.json"

# Seed the LLM config ONLY if it does not already exist, so edits made in the
# StudyLens UI (which rewrites this same file) survive redeploys. The provider
# is "openai-compatible" pointed at the local Bedrock adapter, apiKey empty
# (the adapter authenticates to Bedrock with the instance IAM role).
if [ ! -f "$CONFIG_FILE" ]; then
  echo "Seeding LLM config -> $CONFIG_FILE"
  cat > "$CONFIG_FILE" <<JSON
{
  "defaultProvider": "openai-compatible",
  "providers": {
    "openai-compatible": {
      "enabled": true,
      "baseUrl": "http://127.0.0.1:${ADAPTER_PORT:-8787}/v1",
      "apiKey": "",
      "model": "${BEDROCK_MODEL_ID:-us.openai.gpt-5.6-luna}"
    }
  },
  "taskRouting": {
    "analyze": "default",
    "questions": "default",
    "topicPage": "default",
    "qa": "default",
    "expand": "default"
  }
}
JSON
else
  echo "LLM config already present at $CONFIG_FILE — leaving as-is."
fi

# Start the Bedrock adapter in the background.
node /app/bedrock-openai-adapter.js &
ADAPTER_PID=$!

# Wait for the adapter to be healthy (max ~15s), so the first StudyLens call
# doesn't race a not-yet-listening adapter.
i=0
while [ $i -lt 30 ]; do
  if node -e "require('http').get('http://127.0.0.1:'+(process.env.ADAPTER_PORT||8787)+'/healthz',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))" 2>/dev/null; then
    echo "Adapter healthy."
    break
  fi
  i=$((i+1))
  sleep 0.5
done

# If the adapter died, fail the container (App Runner will restart it).
if ! kill -0 "$ADAPTER_PID" 2>/dev/null; then
  echo "Adapter process exited during startup — aborting."
  exit 1
fi

# Launch the auth-gated StudyLens server in the foreground (PID 1 role).
exec node /app/server.js
