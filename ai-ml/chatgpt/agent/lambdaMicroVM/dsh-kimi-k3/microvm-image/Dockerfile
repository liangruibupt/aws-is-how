# DeepSeek Harness (dsh) + Kimi K3 on Amazon Bedrock, packaged for AWS Lambda MicroVMs (ARM_64).
#
# Build time (create-microvm-image): Lambda runs this Dockerfile, starts CMD, waits for
# /ready (returns 200 once `dsh web` has booted) and snapshots memory + disk.
# Run time (run-microvm): the VM resumes from that snapshot; /run re-applies the IMDS fence,
# resets the credential cache and restarts dsh web so each VM gets its own launch token.
FROM public.ecr.aws/lambda/microvms:al2023-minimal

# nodejs24: dsh needs Node >= 24.9. iproute: uid policy routing (IMDS fence).
# util-linux: setpriv (drop to the agent uid). bubblewrap: dsh's Linux command sandbox.
# git/python3/tar/...: everyday tools the agent's bash tool expects to find.
RUN dnf install -y --setopt=install_weak_deps=0 \
      nodejs24 nodejs24-npm iproute util-linux shadow-utils bubblewrap \
      git python3 tar gzip unzip findutils procps-ng which ca-certificates && \
    dnf clean all && rm -rf /var/cache/dnf && \
    node --version && npm --version

# Pin the harness: dsh is a developer preview with breaking changes between releases.
ARG DSH_VERSION=0.2.1-rc.5
RUN npm install -g "@deepseek-ai/dsh@${DSH_VERSION}" && npm cache clean --force && dsh --version

# The agent: an ordinary uid 1000 user that owns only its home and /workspace.
RUN useradd -u 1000 -m -d /home/agent -s /bin/bash agent && \
    mkdir -p /workspace/tasks && chown -R agent:agent /workspace

# Root sidecar (hooks, gateway, Bedrock SigV4 proxy, supervisor).
COPY sidecar/package.json /opt/sidecar/package.json
RUN cd /opt/sidecar && npm install --omit=dev --no-audit --no-fund && npm cache clean --force
COPY sidecar/server.mjs /opt/sidecar/server.mjs
COPY dsh/ /opt/dsh/

# Initialize the web and headless profiles once, as the agent, so the first boot in the
# snapshot does no profile scaffolding. --dump-config composes the tree without serving.
ENV DSH_HOME=/home/agent/.dsh
RUN setpriv --reuid=1000 --regid=1000 --clear-groups env HOME=/home/agent DSH_HOME=/home/agent/.dsh \
      dsh --profile web --patch /opt/dsh/bedrock-kimi.patch.yml --dump-config > /dev/null && \
    setpriv --reuid=1000 --regid=1000 --clear-groups env HOME=/home/agent DSH_HOME=/home/agent/.dsh \
      dsh --profile headless --patch /opt/dsh/bedrock-kimi.patch.yml --dump-config > /dev/null && \
    ls /home/agent/.dsh/profiles

# The agent runs with no_new_privs, which already neuters setuid binaries; strip the bits too.
RUN find / -xdev -perm -4000 -type f -exec chmod u-s {} + || true

ENV BEDROCK_REGION=us-east-1 \
    ALLOWED_MODELS=us.moonshotai.kimi-k3,global.moonshotai.kimi-k3 \
    WORKSPACE=/workspace \
    AGENT_HOME=/home/agent

WORKDIR /workspace
EXPOSE 8080 9000
CMD ["node", "/opt/sidecar/server.mjs"]
