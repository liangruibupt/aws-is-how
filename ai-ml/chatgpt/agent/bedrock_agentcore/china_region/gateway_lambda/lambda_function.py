"""Lambda behind the AgentCore Gateway target. The Gateway exposes each entry of TOOL_SCHEMA as an
MCP tool; when an agent calls one, the Gateway invokes this function with the tool arguments as the
event and the tool name in the client context (`<target>___<tool>`).
"""
import json
from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# Static reference data for the two AWS China regions.
CHINA_REGIONS = {
    "cn-north-1": {
        "name": "China (Beijing)", "name_zh": "中国（北京）", "operator": "Beijing Sinnet (光环新网)",
        "availability_zones": ["cn-north-1a", "cn-north-1b", "cn-north-1d"],
        "endpoint_suffix": "amazonaws.com.cn", "partition": "aws-cn",
    },
    "cn-northwest-1": {
        "name": "China (Ningxia)", "name_zh": "中国（宁夏）", "operator": "Ningxia Western Cloud Data (西云数据)",
        "availability_zones": ["cn-northwest-1a", "cn-northwest-1b", "cn-northwest-1c"],
        "endpoint_suffix": "amazonaws.com.cn", "partition": "aws-cn",
    },
}

# Kept here so deploy.py registers exactly what this function implements.
TOOL_SCHEMA = [
    {
        "name": "get_current_time",
        "description": "Get the current date and time in an IANA timezone, e.g. Asia/Shanghai.",
        "inputSchema": {
            "type": "object",
            "properties": {"timezone": {"type": "string", "description": "IANA timezone name"}},
            "required": ["timezone"],
        },
    },
    {
        "name": "lookup_china_region",
        "description": "Look up an AWS China region (cn-north-1 or cn-northwest-1): display name, "
                       "local operator, Availability Zones, partition and endpoint suffix.",
        "inputSchema": {
            "type": "object",
            "properties": {"region_code": {"type": "string", "description": "cn-north-1 or cn-northwest-1"}},
            "required": ["region_code"],
        },
    },
]


def get_current_time(timezone: str) -> dict:
    try:
        now = datetime.now(ZoneInfo(timezone))
    except (ZoneInfoNotFoundError, ValueError):
        return {"error": f"unknown timezone: {timezone}"}
    return {"timezone": timezone, "iso": now.isoformat(timespec="seconds"), "weekday": now.strftime("%A")}


def lookup_china_region(region_code: str) -> dict:
    info = CHINA_REGIONS.get(region_code.strip().lower())
    if info is None:
        return {"error": f"not an AWS China region: {region_code}", "known": sorted(CHINA_REGIONS)}
    return {"region_code": region_code, **info}


HANDLERS = {"get_current_time": get_current_time, "lookup_china_region": lookup_china_region}


def lambda_handler(event, context):
    custom = getattr(getattr(context, "client_context", None), "custom", None) or {}
    full_name = custom.get("bedrockAgentCoreToolName", "")
    tool = full_name.split("___", 1)[-1]  # strip the "<target>___" prefix the Gateway adds
    handler = HANDLERS.get(tool)
    if handler is None:
        return {"error": f"unknown tool: {full_name!r}"}
    try:
        return handler(**event)
    except TypeError as e:  # wrong/missing arguments
        return {"error": f"bad arguments for {tool}: {e}"}


if __name__ == "__main__":  # quick local check
    class _Ctx:
        class client_context:  # noqa: N801
            custom = {"bedrockAgentCoreToolName": "china-tools___lookup_china_region"}
    print(json.dumps(lambda_handler({"region_code": "cn-northwest-1"}, _Ctx()), ensure_ascii=False))
