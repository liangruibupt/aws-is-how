# Cost saving for openclaw

- [OpenClaw Cost Optimization: Complete Token Management Guide to Cut Your AI Bills by 50-80%](https://blog.laozhang.ai/en/posts/openclaw-cost-optimization-token-management)

1. Heartbeat 配置: Haiku 4.5, 55分钟间隔
```json
    "heartbeat": {
      "every": "55m",                                        // 每55分钟
      "model": "amazon-bedrock/global.anthropic.claude-haiku-4-5-20251001-v1:0",  // Haiku
      "target": "last"                                       // 回复到最近的channel
    }
```
2. Prompt Cache (1小时) 
```json
    "models": {
      "amazon-bedrock/global.anthropic.claude-opus-4-6-v1": {
        "alias": "opus",
        "params": { "cacheRetention": "long" }
      },
      "amazon-bedrock/global.anthropic.claude-sonnet-4-6": {
        "alias": "sonnet",
        "params": { "cacheRetention": "long" }
      },
      "amazon-bedrock/global.anthropic.claude-haiku-4-5-20251001-v1:0": {
        "alias": "haiku",
        "params": { "cacheRetention": "long" }
      }
    }
 ```
3. Context pruning TTL → 1小时
```json
"contextPruning": {
    "mode": "cache-ttl",
    "ttl": "1h"
}
````

- [Proxy 放在Claude Code 和 bedrock之间，利用 Prompt Caching 和优化 Thinking 配置](https://github.com/KevinZhao/claudecode-bedrock-proxy)
