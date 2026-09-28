# AgentCore in the AWS China regions: Runtime + Gateway + Browser

A Strands agent hosted on **AgentCore Runtime** in Beijing (`cn-north-1`) or Ningxia (`cn-northwest-1`) that

- calls MCP tools through **AgentCore Gateway** (IAM/SigV4 inbound auth, Lambda target), and
- reads Internet content with **AgentCore Browser** (managed Chrome, driven by Playwright over CDP).

```
invoke.py ──SigV4──▶ AgentCore Runtime (direct code deploy, Python 3.13, arm64)
                     └─ agent/main.py  (Strands Agent)
                          ├─ LLM: Kimi K3 on Amazon Bedrock (us-west-2, OpenAI Chat Completions API),
                          │        Bedrock API key read from AgentCore Identity (API-key provider)
                          ├─ MCP ──SigV4──▶ AgentCore Gateway ──▶ Lambda: get_current_time, lookup_china_region
                          └─ CDP ──SigV4──▶ AgentCore Browser (aws.browser.v1) ──▶ cn.bing.com / any URL
```

## AgentCore component availability (probed 2026-09-27, identical in both regions)

| Available | Not available yet |
|---|---|
| Runtime, Gateway, Identity (workload identity, API-key / OAuth2 providers, token vault), Browser, Code Interpreter | Memory, Evaluations, Policy, Registry, Harness, Payments |

"Not available" = the API returns `AccessDeniedException: Unable to determine service/operation name to be authorized` for an admin user.

## China-specific points this sample handles

| Issue | What the sample does |
|---|---|
| No Amazon Bedrock models in the China regions | The agent calls **Kimi K3** (`global.moonshotai.kimi-k3`) on Bedrock in the global partition (`us-west-2`) through its OpenAI-compatible Chat Completions endpoint with `strands.models.openai.OpenAIModel`. Chat Completions is the API the Kimi K3 model card recommends (Converse has multi-turn reasoning-replay issues). Any other OpenAI-compatible provider works via `--llm-base-url/--llm-model`. |
| The China Runtime has no global-partition AWS credentials | Bedrock is authenticated with a **Bedrock API key** (bearer token) stored in an AgentCore Identity API-key provider. `deploy.py --bedrock-token-profile <global profile>` mints a 12-hour key; for anything longer-lived use a long-term Bedrock API key via `LLM_API_KEY`. |
| `bedrock-agentcore` SDK (checked 1.2.0 and 1.23.1) builds `*.amazonaws.com` endpoints by default | `agent/main.py` sets `BEDROCK_AGENTCORE_DP_ENDPOINT` / `BEDROCK_AGENTCORE_CP_ENDPOINT` to `*.amazonaws.com.cn` **before** importing the SDK (they are read at import time). boto3 itself resolves China endpoints correctly. |
| ARNs use the `aws-cn` partition | `common.py` derives the partition from `sts get-caller-identity`; all policies are built from it. |
| Google is not reachable | `web_search` uses `cn.bing.com` via the Browser; `fetch_web_page` opens any URL. |
| Docker/ECR not required | Runtime **direct code deployment**: `deploy.py` pip-installs linux/arm64 wheels, zips, uploads to S3. |

## Files

| Path | Purpose |
|---|---|
| `agent/main.py` | Runtime entrypoint. `{"prompt": …}` runs the agent; `{"mode": "selftest"}` exercises Gateway + Browser without an LLM. |
| `agent/requirements.txt` | Pinned versions this was tested with. |
| `gateway_lambda/lambda_function.py` | The two Gateway tools and their `TOOL_SCHEMA` (registered by `deploy.py`). |
| `deploy.py` | Idempotent deploy/update: IAM roles → Lambda → Gateway + target → API-key provider → code zip → Runtime. |
| `invoke.py` | Calls `InvokeAgentRuntime` with a `runtimeUserId` so the agent gets a workload access token. |
| `cleanup.py` | Deletes everything `deploy.py` created in a region, including the service-created log groups. |
| `common.py` | Names, profile/region handling, state file (`.deploy_state.json`, git-ignored). |

## Run

```bash
pip install -r agent/requirements.txt          # local tooling (Python 3.13)

pip install aws-bedrock-token-generator==1.1.0 # only for --bedrock-token-profile

# Deploy with Kimi K3. The key goes into an AgentCore Identity API-key provider, never into Runtime env vars.
python deploy.py --profile china_ruiliang --region cn-north-1 --bedrock-token-profile global_ruiliang  # 12 h key
LLM_API_KEY=ABSK... python deploy.py --profile china_ruiliang --region cn-north-1                     # long-term key
# Another OpenAI-compatible provider instead:
LLM_API_KEY=sk-... python deploy.py --llm-base-url https://api.deepseek.com --llm-model deepseek-chat

python invoke.py --region cn-north-1 --selftest
python invoke.py --region cn-north-1 "北京区域和宁夏区域分别由谁运营？现在北京时间几点？再上网搜一下 AgentCore Runtime 是什么，给出来源链接。"

python cleanup.py --region cn-north-1          # asks for confirmation
```

Omit `LLM_API_KEY` to deploy without a model: `--selftest` still works, prompts fail with a clear error.

## Refresh the LLM key

A key minted with `--bedrock-token-profile` is valid for **12 hours**. When it expires, `--selftest` keeps working
but prompts fail with HTTP 500 from the Runtime, and the Runtime log shows `openai.AuthenticationError: Error code: 401`.

The agent reads the key from AgentCore Identity on **every invocation**, so replacing the stored key is enough. No
redeploy is needed and the next request uses the new key:

```bash
# Replace only the key held by the AgentCore Identity API-key provider (verified: takes effect on the next invoke)
aws bedrock-agentcore-control update-api-key-credential-provider \
    --profile china_ruiliang --region cn-north-1 \
    --name china-agent-demo-llm-key \
    --api-key "$(AWS_PROFILE=global_ruiliang python3 -c \
        "from aws_bedrock_token_generator import provide_token as p; print(p(region='us-west-2'))")"

python invoke.py --region cn-north-1 "现在北京时间几点？只回答时间。"   # quick check
```

Alternatives:

- `python deploy.py --profile china_ruiliang --region cn-north-1 --bedrock-token-profile global_ruiliang` refreshes
  the key too, but also rebuilds the code package and publishes a new Runtime version (a few minutes).
- For a demo that must keep working, create a **long-term Bedrock API key** in the global account and store it once:
  `LLM_API_KEY=ABSK... python deploy.py --profile china_ruiliang --region cn-north-1`.

## End-to-end test record (cn-north-1, 2026-09-27)

Account: `china_ruiliang` (aws-cn) for AgentCore; `global_ruiliang` (aws) for Bedrock Kimi K3 in us-west-2.

### Steps

| # | Command | Result |
|---|---|---|
| 1 | `python deploy.py --profile china_ruiliang --region cn-north-1` | Lambda, Gateway (`AWS_IAM` inbound) + Lambda target, S3 code bucket and Runtime created. Runtime `READY` after ~4 min on first create |
| 2 | `python invoke.py --region cn-north-1 --selftest` | HTTP 200, 24–28 s (cold session). Details below |
| 3 | Redeploy with a placeholder `LLM_API_KEY`, then send a prompt | Runtime log: `Getting API key...` succeeded (workload token → Identity → key), then the LLM returned 401. This proved the Identity path before a real key existed |
| 4 | `python deploy.py --profile china_ruiliang --region cn-north-1 --bedrock-token-profile global_ruiliang` | Minted a 12 h Bedrock key, stored it in `china-agent-demo-llm-key`, Runtime version 4 with `LLM_MODEL=global.moonshotai.kimi-k3` |
| 5 | `python invoke.py --region cn-north-1 "北京区域和宁夏区域分别由谁运营？现在北京时间几点？再上网搜一下 AgentCore Runtime 是什么，给出来源链接。"` | HTTP 200, **37.3 s**, all four tools used. Answer below |
| 6 | Set the provider to an invalid key, invoke, then run the refresh command above and invoke again | Invalid key → HTTP 500 (`RuntimeClientError`); refreshed key → HTTP 200 in 12 s, answer `17:21:56`. No redeploy |
| 7 | `python cleanup.py --region cn-north-1 --yes` | All sample resources deleted and verified gone (see below) |

### Selftest result (step 2)

| Check | Result |
|---|---|
| Gateway `tools/list` + `tools/call`, SigV4-signed by the Runtime execution role | Tools `china-tools___get_current_time`, `china-tools___lookup_china_region`; the call returned the Beijing region record (光环新网, AZs `cn-north-1a/1b/1d`) in 1.8 s |
| Browser `fetch_web_page("https://www.amazonaws.cn/")` | HTTP 200, title "Amazon Web Services … Operated by NWCD and Sinnet", 13.3 s including browser session start |
| Browser `web_search` on cn.bing.com | 6 results with titles and snippets, 6–9 s |

### Full prompt result (step 5)

```json
{
  "tools_used": ["china-tools___get_current_time", "china-tools___lookup_china_region",
                 "fetch_web_page", "web_search"],
  "model": "global.moonshotai.kimi-k3"
}
```

Answer (abridged):

> 1. 中国（北京）区域（cn-north-1）由光环新网（Beijing Sinnet）运营，3 个可用区（cn-north-1a/1b/1d）；中国（宁夏）区域（cn-northwest-1）由西云数据（Ningxia Western Cloud Data）运营，3 个可用区（cn-northwest-1a/1b/1c）。
> 2. 现在是 2026 年 9 月 27 日（星期日）17:10:08（UTC+8）。
> 3. AgentCore Runtime 是一个安全的、无服务器的运行时环境，专为部署和扩展 AI 智能体及工具而打造：快速冷启动、长时间运行、会话隔离、内置身份认证，支持多种开源框架和任意模型，以及 MCP、A2A 协议。
>
> 来源：https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html

The same prompt run locally (agent on a Mac, real Gateway and Browser in cn-north-1) took 60.8 s and used the same
four tools. The Bedrock endpoint in us-west-2 was reachable from the cn-north-1 Runtime (`PUBLIC` network mode).

### Cleanup result (step 7)

`cleanup.py` deleted the Runtime, the Gateway target and Gateway, the API-key provider, the Lambda, the S3 code
bucket, the three IAM roles, and the Runtime and Lambda CloudWatch log groups. A follow-up check found no remaining
runtime, gateway, API-key provider, Lambda, bucket, role or log group for the sample. The only thing kept is the
Bedrock usage in the global account, which is pay-per-token and needs no cleanup.

## Notes and limits

- **Package size**: 72 MiB zipped / 237 MiB unzipped, mostly the Playwright Node driver (limits: 250 MiB / 750 MiB).
- **Browser session start** takes ~5 s; the agent opens one session lazily per invocation and always stops it.
- **Bing China ranking** is uneven for mixed Chinese/English product names (e.g. a query with "亚马逊云科技 Bedrock AgentCore" returned unrelated pages). The model can refine the query or open known URLs with `fetch_web_page`.
- **IAM**: the Runtime role is scoped to this Gateway, the AWS-managed browser, this API-key provider and its Secrets Manager secret. The Gateway role can only invoke the tools Lambda. Review before reusing outside a demo account.
- The Runtime uses `PUBLIC` network mode; the LLM endpoint must be reachable from the China region. Calls cross the border to the global partition, so consider data-residency requirements before sending real data.
- **Short-term Bedrock keys expire after 12 h**; see [Refresh the LLM key](#refresh-the-llm-key).
- Strands logs `reasoningContent is not supported in multi-turn conversations with the Chat Completions API` on every turn: Kimi K3 returns `reasoning_content`, and Strands drops it from the replayed history. This is harmless and avoids the reasoning-replay error the model card warns about.
