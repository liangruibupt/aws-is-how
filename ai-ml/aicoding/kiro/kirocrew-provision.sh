#!/usr/bin/env bash
#
# kirocrew-provision.sh
#
# Idempotent provisioning of GitHub + Lark(Feishu) capabilities for the
# kirocrew agent running inside the `ghcr.io/kirodotdev/kirocrew` container.
#
# Run this ON THE HOST (as a user with sudo + docker access), e.g. via SSM:
#   sudo bash /home/ubuntu/kirocrew-provision.sh
#
# Credentials are read ONLY from the host env file (default /home/ubuntu/.env).
# Required keys in that file:
#   GITHUB_PAT_KIROCREW = <github fine-grained PAT>   (github_pat_... )
#   LARK_APP_ID         = <feishu app id>             (cli_...)
#   LARK_APP_SECRET     = <feishu app secret>
#
# The script is safe to re-run: already-installed tools are skipped,
# credentials/config are refreshed each time.
#
set -uo pipefail

# ------------------------------------------------------------------ config ---
ENV_FILE="${ENV_FILE:-/home/ubuntu/.env}"
CONTAINER_IMAGE="${CONTAINER_IMAGE:-ghcr.io/kirodotdev/kirocrew}"
CONTAINER_USER="${CONTAINER_USER:-kirocrew}"
GITHUB_USER="${GITHUB_USER:-liangruibupt}"     # GitHub account the PAT belongs to
GIT_USER_NAME="${GIT_USER_NAME:-kirocrew}"
GIT_USER_EMAIL="${GIT_USER_EMAIL:-kirocrew@rayforge.ai}"
LARK_BRAND="${LARK_BRAND:-feishu}"             # feishu | lark
LARK_DEFAULT_AS="${LARK_DEFAULT_AS:-bot}"      # bot = tenant identity

log()  { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m[ok]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[err]\033[0m %s\n' "$*" >&2; exit 1; }

# ---------------------------------------------------------------- helpers ---

# Read a KEY from ENV_FILE. Handles optional `export`, spaces around `=`,
# surrounding single/double quotes, and trailing CR.
read_env() {
  local key="$1"
  grep -m1 -E "^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=" "$ENV_FILE" 2>/dev/null \
    | sed -e 's/^[^=]*=//' \
          -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' \
          -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" \
    | tr -d '\r'
}

# Find the running kirocrew container id by image name (robust to recreation).
find_container() {
  # match by image-name substring so it works with or without a :tag
  docker ps --format '{{.ID}} {{.Image}}' \
    | awk -v img="$CONTAINER_IMAGE" 'index($2, img){print $1; exit}'
}

# Exec a command in the container as CONTAINER_USER (login shell).
cexec() { docker exec -u "$CONTAINER_USER" "$CID" bash -lc "$1"; }
# Exec as root (for global installs).
crexec() { docker exec -u root "$CID" bash -lc "$1"; }

# ---------------------------------------------------------------- preflight ---
[ "$(id -u)" -eq 0 ] || die "must run as root (use: sudo bash $0)"
command -v docker >/dev/null 2>&1 || die "docker not found on host"
[ -f "$ENV_FILE" ] || die "env file not found: $ENV_FILE"

CID="$(find_container)"
[ -n "$CID" ] || die "no running container for image ${CONTAINER_IMAGE}"
ok "container: $CID (image ${CONTAINER_IMAGE})"

GITHUB_PAT="$(read_env GITHUB_PAT_KIROCREW)"
LARK_APP_ID="$(read_env LARK_APP_ID)"
LARK_APP_SECRET="$(read_env LARK_APP_SECRET)"

# =============================================================== GITHUB ===
provision_github() {
  log "GitHub provisioning"
  if [ -z "$GITHUB_PAT" ]; then
    warn "GITHUB_PAT_KIROCREW not set in $ENV_FILE — skipping GitHub setup"
    return 0
  fi
  ok "PAT loaded (len ${#GITHUB_PAT})"

  # git present? (base image ships git; install if somehow missing)
  if ! crexec 'command -v git >/dev/null 2>&1'; then
    log "installing git in container"
    crexec 'apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git' >/dev/null 2>&1 \
      || warn "git install failed"
  fi

  # git identity + credential store
  cexec "git config --global user.name '$GIT_USER_NAME'; \
         git config --global user.email '$GIT_USER_EMAIL'; \
         git config --global credential.helper store" \
    && ok "git identity + credential.helper=store set"

  # write ~/.git-credentials (PAT via stdin, never argv)
  printf 'https://%s:%s@github.com\n' "$GITHUB_USER" "$GITHUB_PAT" \
    | docker exec -i -u "$CONTAINER_USER" "$CID" bash -lc \
        'umask 077; cat > ~/.git-credentials && chmod 600 ~/.git-credentials' \
    && ok "~/.git-credentials written (600)"

  # gh CLI present? install via apt if missing
  if crexec 'command -v gh >/dev/null 2>&1'; then
    ok "gh already installed: $(cexec 'gh --version 2>/dev/null | head -1')"
  else
    log "installing gh in container (apt)"
    crexec 'apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq gh' >/dev/null 2>&1
    crexec 'command -v gh >/dev/null 2>&1' \
      && ok "gh installed: $(cexec 'gh --version 2>/dev/null | head -1')" \
      || warn "gh install failed (git over HTTPS still works via credential store)"
  fi

  # gh auth via token (stdin) + wire as git credential helper — only if gh exists
  if crexec 'command -v gh >/dev/null 2>&1'; then
    printf '%s' "$GITHUB_PAT" \
      | docker exec -i -u "$CONTAINER_USER" "$CID" \
          env GH_TOKEN= GITHUB_TOKEN= bash -lc \
          'gh auth login --hostname github.com --with-token && gh auth setup-git' \
      >/dev/null 2>&1 \
      && ok "gh authenticated + setup-git done" \
      || warn "gh auth step reported an error"
  fi

  # verify
  local who
  who="$(cexec 'gh api user --jq .login 2>/dev/null' 2>/dev/null || true)"
  if [ -n "$who" ]; then
    ok "GitHub verified as: $who"
  else
    # fall back to a git ls-remote check using stored credentials
    if cexec "git ls-remote https://github.com/${GITHUB_USER}/$(basename "$PWD" 2>/dev/null).git >/dev/null 2>&1"; then
      ok "GitHub HTTPS credentials working (git)"
    else
      warn "could not verify GitHub identity (check PAT validity/scopes)"
    fi
  fi
}

# ================================================================= LARK ===
provision_lark() {
  log "Lark (Feishu) provisioning"
  if [ -z "$LARK_APP_ID" ] || [ -z "$LARK_APP_SECRET" ]; then
    warn "LARK_APP_ID / LARK_APP_SECRET not set in $ENV_FILE — skipping Lark setup"
    return 0
  fi
  ok "app id ${LARK_APP_ID:0:6}… (secret len ${#LARK_APP_SECRET})"

  # Node.js (needed by lark-cli). Install via apt if missing.
  if crexec 'command -v node >/dev/null 2>&1'; then
    ok "node present: $(cexec 'node -v 2>/dev/null')"
  else
    log "installing Node.js + npm in container (apt)"
    crexec 'apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs npm' >/dev/null 2>&1
    crexec 'command -v node >/dev/null 2>&1' \
      && ok "node installed: $(cexec 'node -v 2>/dev/null')" \
      || die "Node.js install failed — lark-cli cannot run"
  fi

  # lark-cli (global, as root so it is on PATH for all users)
  if crexec 'command -v lark-cli >/dev/null 2>&1'; then
    ok "lark-cli present: $(cexec 'lark-cli --version 2>/dev/null | head -1')"
  else
    log "installing lark-cli globally (npm)"
    crexec 'npm install -g @larksuite/cli' >/dev/null 2>&1
    crexec 'command -v lark-cli >/dev/null 2>&1' \
      && ok "lark-cli installed: $(cexec 'lark-cli --version 2>/dev/null | head -1')" \
      || die "lark-cli install failed"
  fi

  # tenant config via config init (app-secret from stdin, non-interactive).
  # Re-running overwrites the app config — safe/idempotent.
  printf '%s' "$LARK_APP_SECRET" \
    | docker exec -i -u "$CONTAINER_USER" "$CID" \
        lark-cli config init --app-id "$LARK_APP_ID" --app-secret-stdin --brand "$LARK_BRAND" \
    >/dev/null 2>&1 \
    && ok "lark-cli tenant app configured (brand=$LARK_BRAND)" \
    || warn "lark-cli config init reported an error"

  # default identity = bot (tenant)
  cexec "lark-cli config default-as $LARK_DEFAULT_AS" >/dev/null 2>&1 \
    && ok "lark-cli default identity = $LARK_DEFAULT_AS"

  # verify tenant token exchange: a bot API call that only needs a valid TAT.
  # We accept either code 0 OR an app_scope_not_applied error as proof that
  # the token exchange itself succeeded (auth chain works; scope is app-side).
  local out
  out="$(cexec "lark-cli api GET /open-apis/tenant/v2/tenant/query --as bot --format json 2>&1" || true)"
  if printf '%s' "$out" | grep -q '"ok": true'; then
    ok "Lark tenant auth verified (API ok)"
  elif printf '%s' "$out" | grep -q 'app_scope_not_applied'; then
    ok "Lark tenant token exchange verified (auth chain OK; probe scope not applied — harmless)"
  elif printf '%s' "$out" | grep -qiE 'token_missing|not_configured'; then
    warn "Lark tenant auth NOT working — check app id/secret. Detail: $(printf '%s' "$out" | tr -d '\n' | head -c 300)"
  else
    warn "Lark verify inconclusive: $(printf '%s' "$out" | tr -d '\n' | head -c 300)"
  fi
}

# ========================================================= python sdks ===
# Install the Python SDKs kirocrew's application code uses for AWS testing:
#   - boto3   : AWS SDK. Resolves credentials automatically via the EC2
#               instance role over IMDS (no AWS keys land in the container).
#   - openai  : OpenAI SDK, used against Amazon Bedrock's OpenAI-compatible
#               endpoints (Responses API) for GPT models.
# NOTE: AWS access works because boto3 uses IMDS; do NOT read AWS credentials
# via shell commands (e.g. `aws sts get-caller-identity`, `env | grep AWS`) —
# kiro-cli's BUILTIN_DENY_PATTERNS guardrail blocks those. SDK usage is fine.
provision_python_sdks() {
  log "Python SDKs provisioning (boto3, openai)"

  if ! crexec 'command -v pip3 >/dev/null 2>&1 || command -v pip >/dev/null 2>&1'; then
    warn "pip not found in container — skipping Python SDK install"
    return 0
  fi

  for pkg in boto3 openai; do
    if crexec "python3 -c 'import ${pkg}' >/dev/null 2>&1"; then
      ver="$(cexec "python3 -c 'import ${pkg}; print(${pkg}.__version__)' 2>/dev/null")"
      ok "${pkg} already installed: ${ver}"
    else
      log "installing ${pkg} (pip, global)"
      crexec "pip3 install --quiet ${pkg} >/dev/null 2>&1 || pip install --quiet ${pkg} >/dev/null 2>&1"
      if crexec "python3 -c 'import ${pkg}' >/dev/null 2>&1"; then
        ver="$(cexec "python3 -c 'import ${pkg}; print(${pkg}.__version__)' 2>/dev/null")"
        ok "${pkg} installed: ${ver}"
      else
        warn "${pkg} install failed"
      fi
    fi
  done

  # Verify boto3 can resolve credentials via IMDS (instance role) — SDK path,
  # not a shell credential read, so it does not trip the guardrail.
  local out
  out="$(cexec "AWS_DEFAULT_REGION=\${AWS_DEFAULT_REGION:-us-east-1} python3 -c 'import boto3,sys; c=boto3.Session().get_credentials(); sys.stdout.write(\"iam-role\" if (c and c.method==\"iam-role\") else (c.method if c else \"none\"))' 2>&1")"
  if [ "$out" = "iam-role" ]; then
    ok "boto3 resolves instance-role credentials via IMDS (no keys in container)"
  else
    warn "boto3 credential resolution: '$out' (expected 'iam-role' — check IMDS hop limit / instance role)"
  fi
}

# ================================================================= main ===
provision_github
provision_lark
provision_python_sdks

log "Done. Summary of what kirocrew can now run inside the container:"
cat <<'USAGE'
  GitHub:
    gh repo create <name> --private
    git clone / pull / push  (HTTPS auto-auth via stored PAT)
  Lark (tenant/bot identity):
    lark-cli docs +create --title "..." --doc-format markdown --content "..." --as bot
    lark-cli docs +fetch  --doc <token|url> --as bot --doc-format markdown
    lark-cli drive +delete --file-token <token> --type docx --as bot --yes
  AWS (via boto3 + instance role over IMDS — no keys in container):
    python3 -c "import boto3; boto3.client('bedrock','us-east-1').list_foundation_models()"
    # Bedrock, AgentCore, S3, RDS/Aurora per the instance role policy.
    # Do NOT read creds via shell (aws sts / env|grep AWS) — guardrail blocks it.
  OpenAI SDK (GPT on Bedrock, Responses API):
    OPENAI_BASE_URL=https://bedrock-runtime.us-east-1.amazonaws.com/openai/v1
USAGE
ok "provisioning complete"
