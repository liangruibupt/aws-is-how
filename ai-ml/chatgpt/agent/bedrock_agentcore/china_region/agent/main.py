"""Strands agent hosted on AgentCore Runtime in an AWS China region.

  * Tools from an AgentCore Gateway (MCP over streamable HTTP, IAM/SigV4 inbound auth, Lambda target)
  * Web tools backed by the AgentCore Browser (managed Chrome driven with Playwright over CDP)
  * LLM: Kimi K3 on Amazon Bedrock (global Region) via its OpenAI-compatible Chat Completions API;
    Bedrock models are not offered in the China regions. Any OpenAI-compatible endpoint works. The
    key (a Bedrock API key) is read from an AgentCore Identity API-key provider at invocation time.

Payloads
  {"prompt": "..."}      run the agent
  {"mode": "selftest"}   exercise Gateway + Browser directly, no LLM needed

Env (set on the Runtime by deploy.py)
  AWS_REGION             cn-north-1 / cn-northwest-1 (set by Runtime)
  GATEWAY_URL            https://<id>.gateway.bedrock-agentcore.<region>.amazonaws.com.cn/mcp
  LLM_BASE_URL           OpenAI-compatible base URL; default Amazon Bedrock (us-west-2) OpenAI endpoint
  LLM_MODEL              default global.moonshotai.kimi-k3 (Kimi K3, global cross-Region inference)
  LLM_API_KEY_PROVIDER   AgentCore Identity API-key provider name holding the LLM key
  LLM_API_KEY            local-dev fallback only; do not set this on the Runtime
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from urllib.parse import quote_plus

REGION = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "cn-north-1"

# bedrock-agentcore SDK <= 1.2 builds endpoints as *.amazonaws.com, which does not exist for the
# aws-cn partition. Its override env vars are read at import time, so set them before importing it.
if REGION.startswith("cn-"):
    os.environ.setdefault("BEDROCK_AGENTCORE_DP_ENDPOINT", f"https://bedrock-agentcore.{REGION}.amazonaws.com.cn")
    os.environ.setdefault("BEDROCK_AGENTCORE_CP_ENDPOINT",
                          f"https://bedrock-agentcore-control.{REGION}.amazonaws.com.cn")

import boto3  # noqa: E402
import httpx  # noqa: E402
from botocore.auth import SigV4Auth  # noqa: E402
from botocore.awsrequest import AWSRequest  # noqa: E402
from bedrock_agentcore.runtime import BedrockAgentCoreApp, BedrockAgentCoreContext  # noqa: E402
from bedrock_agentcore.services.identity import IdentityClient  # noqa: E402
from bedrock_agentcore.tools.browser_client import BrowserClient  # noqa: E402
from mcp import ClientSession  # noqa: E402
from mcp.client.streamable_http import streamablehttp_client  # noqa: E402
from playwright.async_api import async_playwright  # noqa: E402
from strands import Agent, tool  # noqa: E402
from strands.models.openai import OpenAIModel  # noqa: E402
from strands.tools.mcp import MCPClient  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("china-agent")

GATEWAY_URL = os.environ.get("GATEWAY_URL", "")
LLM_BASE_URL = os.environ.get("LLM_BASE_URL", "https://bedrock-runtime.us-west-2.amazonaws.com/openai/v1")
LLM_MODEL = os.environ.get("LLM_MODEL", "global.moonshotai.kimi-k3")
LLM_API_KEY_PROVIDER = os.environ.get("LLM_API_KEY_PROVIDER", "")
MAX_PAGE_CHARS = 6000

SYSTEM_PROMPT = """You are an assistant running on Amazon Bedrock AgentCore in an AWS China region.
- Use the Gateway tools (get_current_time, lookup_china_region) for time and AWS China region facts.
- Use web_search to find pages and fetch_web_page to read them when the question needs Internet content.
- Cite the URLs you used. Answer in the user's language."""

app = BedrockAgentCoreApp()


# --------------------------------------------------------------------------- Gateway (MCP, SigV4)
class SigV4HttpxAuth(httpx.Auth):
    """Signs every MCP HTTP request to the Gateway with the caller's IAM credentials."""

    requires_request_body = True

    def __init__(self, region: str, service: str = "bedrock-agentcore"):
        self.region, self.service = region, service
        self.session = boto3.Session()

    def auth_flow(self, request: httpx.Request):
        creds = self.session.get_credentials().get_frozen_credentials()
        aws_req = AWSRequest(method=request.method, url=str(request.url), data=request.content,
                             headers={"Content-Type": request.headers.get("Content-Type", "application/json")})
        SigV4Auth(creds, self.service, self.region).add_auth(aws_req)
        for k in ("Authorization", "X-Amz-Date", "X-Amz-Security-Token"):
            if k in aws_req.headers:
                request.headers[k] = aws_req.headers[k]
        yield request


def gateway_transport():
    if not GATEWAY_URL:
        raise RuntimeError("GATEWAY_URL is not set")
    return streamablehttp_client(GATEWAY_URL, auth=SigV4HttpxAuth(REGION))


# --------------------------------------------------------------------------- Browser
class AgentCoreBrowser:
    """One AgentCore Browser session per invocation, opened lazily on first use."""

    def __init__(self, region: str):
        self.region = region
        self._client = self._pw = self._browser = self._page = None
        self._lock = asyncio.Lock()

    async def page(self):
        async with self._lock:
            if self._page is None:
                t0 = time.time()
                self._client = BrowserClient(self.region)
                await asyncio.to_thread(self._client.start, session_timeout_seconds=900)
                ws_url, headers = self._client.generate_ws_headers()
                self._pw = await async_playwright().start()
                self._browser = await self._pw.chromium.connect_over_cdp(ws_url, headers=headers)
                ctx = self._browser.contexts[0] if self._browser.contexts else await self._browser.new_context()
                self._page = ctx.pages[0] if ctx.pages else await ctx.new_page()
                log.info("browser session %s ready in %.1fs", self._client.session_id, time.time() - t0)
            return self._page

    async def fetch(self, url: str) -> dict:
        page = await self.page()
        resp = await page.goto(url, wait_until="domcontentloaded", timeout=45_000)
        text = (await page.inner_text("body")).strip()
        return {"url": page.url, "status": resp.status if resp else None, "title": await page.title(),
                "text": text[:MAX_PAGE_CHARS], "truncated": len(text) > MAX_PAGE_CHARS}

    async def search(self, query: str, limit: int = 6) -> dict:
        # cn.bing.com is reachable from the China regions; Google is not.
        page = await self.page()
        await page.goto(f"https://cn.bing.com/search?q={quote_plus(query)}", wait_until="domcontentloaded",
                        timeout=45_000)
        # Bing may redirect once (region/consent) after the first load; wait for the result list itself.
        try:
            await page.wait_for_selector("li.b_algo h2 a", timeout=20_000)
        except Exception:  # noqa: BLE001 - return whatever is there (possibly nothing)
            log.warning("no Bing results rendered for %r (url=%s)", query, page.url)
        await page.wait_for_load_state("domcontentloaded")
        results = await page.eval_on_selector_all(
            "li.b_algo",
            """els => els.map(e => {
                 const t = n => (n ? (n.innerText || n.textContent || '') : '').replace(/\\s+/g, ' ').trim();
                 return { title: t(e.querySelector('h2')), url: e.querySelector('h2 a')?.href || '',
                          snippet: t(e.querySelector('.b_caption p') || e.querySelector('p')) };
               }).filter(r => r.url)""")
        return {"query": query, "results": results[:limit]}

    async def close(self):
        for step in (lambda: self._browser and self._browser.close(), lambda: self._pw and self._pw.stop()):
            try:
                coro = step()
                if coro:
                    await coro
            except Exception:  # noqa: BLE001
                log.warning("browser cleanup step failed", exc_info=True)
        if self._client is not None:
            await asyncio.to_thread(self._client.stop)
        self._client = self._pw = self._browser = self._page = None


def browser_tools(browser: AgentCoreBrowser):
    @tool
    async def web_search(query: str) -> str:
        """Search the web (Bing China) using the AgentCore Browser. Returns titles, URLs and snippets.

        Args:
            query: search keywords
        """
        return json.dumps(await browser.search(query), ensure_ascii=False)

    @tool
    async def fetch_web_page(url: str) -> str:
        """Open a URL in the AgentCore Browser and return the page title and visible text (truncated).

        Args:
            url: absolute http(s) URL
        """
        if not url.startswith(("http://", "https://")):
            return json.dumps({"error": "url must start with http:// or https://"})
        return json.dumps(await browser.fetch(url), ensure_ascii=False)

    return [web_search, fetch_web_page]


# --------------------------------------------------------------------------- LLM
async def llm_api_key() -> str:
    if LLM_API_KEY_PROVIDER:
        token = BedrockAgentCoreContext.get_workload_access_token()
        if not token:
            raise RuntimeError("no workload access token; invoke the runtime with a runtimeUserId")
        return await IdentityClient(REGION).get_api_key(provider_name=LLM_API_KEY_PROVIDER,
                                                        agent_identity_token=token)
    key = os.environ.get("LLM_API_KEY")
    if not key:
        raise RuntimeError("set LLM_API_KEY_PROVIDER (Runtime) or LLM_API_KEY (local dev)")
    return key


# --------------------------------------------------------------------------- entrypoints
async def run_agent(prompt: str) -> dict:
    model = OpenAIModel(client_args={"api_key": await llm_api_key(), "base_url": LLM_BASE_URL},
                        model_id=LLM_MODEL)  # Kimi K3 reasons before answering: no max_tokens cap
    browser = AgentCoreBrowser(REGION)
    gateway = MCPClient(gateway_transport)
    try:
        with gateway:
            tools = gateway.list_tools_sync() + browser_tools(browser)
            agent = Agent(model=model, tools=tools, system_prompt=SYSTEM_PROMPT, callback_handler=None)
            result = await agent.invoke_async(prompt)
    finally:
        await browser.close()
    return {"result": str(result), "tools_used": sorted(result.metrics.tool_metrics.keys()),
            "model": LLM_MODEL}


async def selftest() -> dict:
    """Checks every AgentCore piece this sample depends on without calling an LLM."""
    report: dict = {"region": REGION}
    t0 = time.time()
    async with streamablehttp_client(GATEWAY_URL, auth=SigV4HttpxAuth(REGION)) as (r, w, _):
        async with ClientSession(r, w) as mcp:
            await mcp.initialize()
            names = [t.name for t in (await mcp.list_tools()).tools]
            lookup = next(n for n in names if n.endswith("lookup_china_region"))
            res = await mcp.call_tool(lookup, {"region_code": REGION})
            report["gateway"] = {"tools": names, "call": lookup,
                                 "result": json.loads(res.content[0].text), "seconds": round(time.time() - t0, 1)}
    browser = AgentCoreBrowser(REGION)
    try:
        t0 = time.time()
        page = await browser.fetch("https://www.amazonaws.cn/")
        report["browser_fetch"] = {k: page[k] for k in ("url", "status", "title")} | {
            "text_head": page["text"][:200], "seconds": round(time.time() - t0, 1)}
        t0 = time.time()
        found = await browser.search("AWS 北京区域 光环新网")
        report["browser_search"] = {"results": found["results"][:3], "count": len(found["results"]),
                                    "seconds": round(time.time() - t0, 1)}
    finally:
        await browser.close()
    return report


@app.entrypoint
async def invoke(payload: dict, context=None):
    if payload.get("mode") == "selftest":
        return await selftest()
    prompt = payload.get("prompt")
    if not prompt:
        return {"error": 'payload needs "prompt" (or {"mode": "selftest"})'}
    return await run_agent(prompt)


if __name__ == "__main__":
    app.run()
