"""
Test: Web Search on Amazon Bedrock AgentCore — end-to-end via a Strands agent.

Web Search is exposed as a built-in MCP (Model Context Protocol) connector target
on an AgentCore Gateway. An agent connects to the Gateway's MCP endpoint, discovers
the tools the Gateway exposes (the web-search tool, plus anything else on the same
Gateway), and calls them with a natural-language query — getting back relevant
snippets, source URLs, titles, and publication dates.

This script wires that Gateway into a Strands `Agent` whose brain is Claude on
Amazon Bedrock, then asks a deliberately time-sensitive question so the model is
forced to call the web-search tool rather than answer from memory. That validates
the full loop: agent -> Gateway MCP -> Web Search -> grounded answer.

Inbound auth on the Gateway = IAM, so the MCP HTTP calls are SigV4-signed with your
AWS credentials (resolved from the standard chain: env, ~/.aws, SSO, role, IMDS).
No bearer token / Cognito involved.

------------------------------------------------------------------------------
Config (all via env vars so no secrets are hard-coded):

  AGENTCORE_GATEWAY_URL   (required) Full MCP endpoint of your Gateway, e.g.
                          https://<gateway-id>.gateway.bedrock-agentcore.us-west-2.amazonaws.com/mcp
  AWS_REGION              (default us-west-2) Region of the Gateway AND Bedrock model.
  BEDROCK_MODEL_ID        (default us.anthropic.claude-sonnet-4-5-20250929-v1:0)
                          The Strands agent's reasoning model (a Bedrock inference profile ID).
  AGENTCORE_SIGV4_SERVICE (default bedrock-agentcore) SigV4 service name to sign with.
                          Override only if signing is rejected (see troubleshooting).
  WEB_SEARCH_QUESTION     (optional) Override the default question.

Standard AWS credential env vars apply: AWS_PROFILE, or AWS_ACCESS_KEY_ID /
AWS_SECRET_ACCESS_KEY / AWS_SESSION_TOKEN.
------------------------------------------------------------------------------

Usage:
  pip install -U strands-agents mcp boto3 botocore httpx
  export AWS_REGION=us-east-1          # if not us-east-1
  export AGENTCORE_GATEWAY_URL="https://<gateway-id>.gateway.bedrock-agentcore.us-east-1.amazonaws
  .com/mcp"
  python web_search_agentcore_strands.py
  python web_search_agentcore_strands.py "Web Search on Amazon Bedrock AgentCore"
  
  # See the raw tool list / a direct web-search call without the LLM:
  python web_search_agentcore_strands.py --probe "GLM5.2"

Prereqs:
  - An AgentCore Gateway with the Web Search connector target attached, Inbound Auth = IAM.
  - The calling IAM principal allowed to invoke the Gateway (bedrock-agentcore InvokeGateway-style
    permission) and to call the Bedrock model (bedrock:InvokeModel*).
"""

import asyncio
import os
import sys

import boto3
import httpx
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest

# MCP Python SDK — streamable-HTTP transport + client session.
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client

# Strands: agent + MCP tool adapter + Bedrock model provider.
from strands import Agent
from strands.models import BedrockModel
from strands.tools.mcp import MCPClient

REGION = os.getenv("AWS_REGION", "us-east-1")
PROFILE = os.getenv("AWS_PROFILE", "global_ruiliang")
GATEWAY_URL = os.getenv("AGENTCORE_GATEWAY_URL", "")
MODEL_ID = os.getenv(
    "BEDROCK_MODEL_ID", "global.anthropic.claude-sonnet-4-6"
)
# AgentCore Gateway data-plane requests sign under this service name.
SIGV4_SERVICE = os.getenv("AGENTCORE_SIGV4_SERVICE", "bedrock-agentcore")

# A time-sensitive question the model cannot answer from training data, so it
# must reach for the Web Search tool. Override via CLI arg or WEB_SEARCH_QUESTION.
DEFAULT_QUESTION = os.getenv(
    "WEB_SEARCH_QUESTION",
    "Search the web: what did AWS announce about Amazon Bedrock AgentCore "
    "this week? Give me 3 concrete items, each with its source URL and "
    "publication date. Only use information you find via web search.",
)


# ---------------------------------------------------------------------------
# SigV4 signing for the MCP HTTP transport (Gateway Inbound Auth = IAM)
# ---------------------------------------------------------------------------
class SigV4HTTPXAuth(httpx.Auth):
    """Sign each outgoing MCP request with AWS SigV4.

    The MCP streamable-HTTP transport issues both POSTs (JSON-RPC) and a GET
    (the SSE response stream); this signs whatever request httpx hands us,
    including the body, so both legs authenticate.
    """

    # SigV4 must sign the exact bytes sent, so the body has to be read up front.
    requires_request_body = True

    def __init__(self, credentials, service: str, region: str):
        self._credentials = credentials
        self._service = service
        self._region = region

    def auth_flow(self, request: httpx.Request):
        aws_request = AWSRequest(
            method=request.method,
            url=str(request.url),
            data=request.content,            # exact body bytes
            headers=dict(request.headers),
        )
        SigV4Auth(self._credentials, self._service, self._region).add_auth(aws_request)
        # Copy the signed headers (Authorization, X-Amz-Date, X-Amz-Security-Token,
        # X-Amz-Content-SHA256, ...) back onto the httpx request.
        request.headers.update(dict(aws_request.headers))
        yield request


def _signed_transport_factory():
    """Build the kwargs streamablehttp_client needs to sign every request."""
    # Profile goes on the Session constructor; get_credentials() takes no args.
    # PROFILE or None → fall back to the default credential chain if it's empty.
    session = boto3.Session(region_name=REGION, profile_name=PROFILE or None)
    credentials = session.get_credentials()
    if credentials is None:
        sys.exit("No AWS credentials found. Configure AWS_PROFILE or access keys.")
    auth = SigV4HTTPXAuth(credentials.get_frozen_credentials(), SIGV4_SERVICE, REGION)
    return auth


def make_gateway_mcp_client() -> MCPClient:
    """A Strands MCPClient bound to the IAM-signed AgentCore Gateway endpoint."""
    if not GATEWAY_URL:
        sys.exit("Set AGENTCORE_GATEWAY_URL to your Gateway's MCP endpoint (…/mcp).")

    auth = _signed_transport_factory()

    # Strands MCPClient takes a zero-arg factory returning an MCP transport.
    # We hand streamablehttp_client our SigV4 httpx auth so every JSON-RPC POST
    # and the SSE GET are signed.
    def transport():
        return streamablehttp_client(url=GATEWAY_URL, auth=auth)

    return MCPClient(transport)


# ---------------------------------------------------------------------------
# --probe: list tools and call web search directly (no LLM in the loop)
# ---------------------------------------------------------------------------
async def _probe_async(question: str) -> None:
    """Connect to the Gateway, list tools, and invoke the web-search tool raw.

    The MCP streamable-HTTP transport and ClientSession are ASYNC context
    managers, so this runs under asyncio (the Strands path manages its own loop).
    """
    auth = _signed_transport_factory()

    print(f"[probe] connecting to {GATEWAY_URL}")
    async with streamablehttp_client(url=GATEWAY_URL, auth=auth) as (read, write, *_):
        async with ClientSession(read, write) as session:
            await session.initialize()

            tools = (await session.list_tools()).tools
            print(f"[probe] gateway exposes {len(tools)} tool(s):")
            for t in tools:
                print(f"   - {t.name}: {(t.description or '').strip()[:80]}")

            # The web-search connector tool name can vary by Gateway target name
            # (often contains 'search'); pick the first match, else the first tool.
            search_tool = next(
                (t for t in tools if "search" in t.name.lower()), tools[0]
            )
            # Infer the query parameter name from the tool's input schema
            # (commonly 'query'); fall back to 'query'.
            schema = getattr(search_tool, "inputSchema", None) or {}
            props = (schema.get("properties") or {}) if isinstance(schema, dict) else {}
            query_key = "query" if "query" in props else (next(iter(props), "query"))

            print(f"\n[probe] calling tool '{search_tool.name}' with {{{query_key!r}: ...}}")
            result = await session.call_tool(search_tool.name, {query_key: question})

            for block in result.content:
                # Text blocks carry the snippets / URLs / titles / dates.
                print(getattr(block, "text", block))


def probe(question: str) -> None:
    """Sync entry point for the async probe."""
    asyncio.run(_probe_async(question))


# ---------------------------------------------------------------------------
# default: end-to-end Strands agent grounded by Web Search
# ---------------------------------------------------------------------------
def run_agent(question: str) -> None:
    """Ask a Strands+Claude agent a question that forces a Gateway web search."""
    gateway = make_gateway_mcp_client()
    model = BedrockModel(model_id=MODEL_ID, region_name=REGION)

    # MCPClient is a context manager; tools are only usable while the session
    # is open, so build and run the agent inside the `with` block.
    with gateway:
        tools = gateway.list_tools_sync()
        print(f"[agent] loaded {len(tools)} tool(s) from the Gateway: "
              f"{[t.tool_name for t in tools]}")

        agent = Agent(
            model=model,
            tools=tools,
            system_prompt=(
                "You are a research assistant. When a question depends on current "
                "or recent information, you MUST use the web search tool to ground "
                "your answer. Cite every claim with its source URL and publication "
                "date. Do not answer time-sensitive questions from memory."
            ),
        )

        print(f"\n[agent] question: {question}\n")
        result = agent(question)  # Strands prints the streamed answer as it goes
        print("\n[agent] --- final answer ---")
        print(result)


def main() -> None:
    args = [a for a in sys.argv[1:]]
    mode_probe = "--probe" in args
    args = [a for a in args if a != "--probe"]
    question = args[0] if args else DEFAULT_QUESTION

    if mode_probe:
        probe(question)
    else:
        run_agent(question)


if __name__ == "__main__":
    main()
