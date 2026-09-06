# StudyLens on AWS App Runner — small Node image wrapping the published npm tarball.
# The published tarball already ships portal/dist (prebuilt SPA), so no front-end
# build is needed here; we only install the server's runtime deps.
FROM node:20-slim

WORKDIR /app

# Install studylens from npm at a pinned version, production deps only.
# --ignore-scripts skips the package's postinstall (cd portal && npm install),
# which is unnecessary because portal/dist is already built and shipped.
# The AWS SDK v3 Bedrock client is added for the OpenAI->Bedrock adapter.
RUN npm install --omit=dev --ignore-scripts \
      studylens@0.1.8 \
      @aws-sdk/client-bedrock-runtime@^3 \
    && npm cache clean --force

# Basic-Auth front door, Bedrock adapter, and config-seeding wrapper.
COPY server.js /app/server.js
COPY bedrock-openai-adapter.js /app/bedrock-openai-adapter.js
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# App Runner routes to this port; StudyLens listens on $PORT (default 3000).
ENV PORT=3000
# OpenAI->Bedrock adapter (localhost only).
ENV ADAPTER_PORT=8787
ENV BEDROCK_REGION=us-east-1
ENV BEDROCK_MODEL_ID=us.openai.gpt-5.6-luna
# Data lives on the mounted EFS volume (see App Runner service config).
ENV STUDYLENS_DATA_DIR=/data
ENV STUDYLENS_WIKI_DIR=/data/wiki
ENV STUDYLENS_CONFIG_DIR=/data
ENV STUDYLENS_UPLOAD_DIR=/data/uploads
ENV STUDYLENS_LOG_DIR=/data/logs

EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
