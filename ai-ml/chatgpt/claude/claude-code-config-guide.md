# Claude Code 高级配置指南

版本 **2.1.37** | Bedrock + Opus 4.6 + 1M 上下文

---

## 1. Bedrock + 1M 上下文

`~/.claude/settings.json`：

```json
{
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_REGION": "ap-northeast-1",
    "AWS_BEARER_TOKEN_BEDROCK": "<Bedrock API Key>",
    "ANTHROPIC_MODEL": "global.anthropic.claude-opus-4-6-v1[1m]"
  }
}
```

| 参数 | 说明 |
|------|------|
| `CLAUDE_CODE_USE_BEDROCK` | 启用 Bedrock（必需） |
| `AWS_REGION` | AWS 区域（必需，不读取 `.aws` config） |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock API Key，[获取方式](https://aws.amazon.com/blogs/machine-learning/accelerate-ai-development-with-amazon-bedrock-api-keys/) |
| `ANTHROPIC_MODEL` | 主模型，`[1m]` 后缀启用 1M 上下文（Claude Code 标记，非 Bedrock 模型 ID） |

认证也支持 `aws configure`、`AWS_ACCESS_KEY_ID`+`AWS_SECRET_ACCESS_KEY`、`AWS_PROFILE`(SSO)、`aws login`。

> 1M 上下文仅对 API 和按量付费用户开放，Pro/Max/Teams/Enterprise 订阅暂不支持。

---

## 2. Agent Teams

多个 Claude Code 实例并行协作，teammates 之间可直接通信（实验性功能）。

```json
{ "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
```

**vs Subagents**：Subagents 只能向主 agent 汇报结果；Agent Teams 有共享任务列表 + 互相通信，适合需要讨论协作的复杂工作，但 token 消耗更高。

**显示模式**（`teammateMode` 或 `--teammate-mode`）：
- `auto`（默认）— tmux 中分屏，否则 in-process
- `in-process` — 主终端内，Shift+Up/Down 切换
- `tmux` — 每个 teammate 独立 pane

**Tips**：确保 teammates 操作不同文件；`Shift+Tab` 开启 delegate mode 让 lead 只协调不写代码。

---

## 3. Thinking Effort Level

Opus 4.6 使用 **adaptive thinking**，由 effort level 控制深度。`MAX_THINKING_TOKENS` 已废弃（Opus 4.6 下被忽略）。

| 级别 | 说明 |
|------|------|
| `low` | 快速响应，简单任务 |
| `medium` | 适度推理 |
| `high` | 深度推理（**默认**），仅 Opus 4.6 生效 |

配置方式（任选）：
- 环境变量：`"CLAUDE_CODE_EFFORT_LEVEL": "high"`
- settings 字段：`"effortLevel": "high"`
- 会话内：`/model` 用方向键调整滑块，或输入 `ultrathink`

---

## 4. Auto Compact

1M 上下文下建议**关闭**。触发阈值 ~950K tokens，日常极少触及，compact 会丢失对话细节。

`.claude.json` 中设置：
```json
{ "autoCompactEnabled": false }
```

如需保留但推迟触发：`"CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "98"`

---

## 5. 完整配置与模型路由

### ~/.claude/settings.json

```json
{
  "permissions": { "allow": [] },
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_REGION": "ap-northeast-1",
    "AWS_BEARER_TOKEN_BEDROCK": "<Bedrock API Key>",
    "ANTHROPIC_MODEL": "global.anthropic.claude-opus-4-6-v1[1m]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "global.anthropic.claude-opus-4-6-v1[1m]",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "global.anthropic.claude-opus-4-6-v1[1m]",
    "CLAUDE_CODE_EFFORT_LEVEL": "high",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "32000",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

### 模型路由

| 环境变量 | 作用 |
|---------|------|
| `ANTHROPIC_MODEL` | 主模型，覆盖默认 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Opus 别名 / `opusplan` 计划阶段 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Sonnet 别名 / `opusplan` 执行阶段 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Haiku 别名 / 后台功能 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 子 agent 专用 |

> 本机三个槽位都指向 Opus 4.6。节约成本可将 Haiku 改回 `us.anthropic.claude-haiku-4-5-20251001-v1:0`。

会话内模型别名：`opus`、`sonnet`、`haiku`、`sonnet[1m]`、`opusplan`

---

## 6. 快速配置（新机器）

```bash
npm install -g @anthropic-ai/claude-code
mkdir -p ~/.claude
cat > ~/.claude/settings.json << 'EOF'
{
  "permissions": { "allow": [] },
  "env": {
    "CLAUDE_CODE_USE_BEDROCK": "1",
    "AWS_REGION": "ap-northeast-1",
    "AWS_BEARER_TOKEN_BEDROCK": "<替换 Bedrock API Key>",
    "ANTHROPIC_MODEL": "global.anthropic.claude-opus-4-6-v1[1m]",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "global.anthropic.claude-opus-4-6-v1[1m]",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "global.anthropic.claude-opus-4-6-v1[1m]",
    "CLAUDE_CODE_EFFORT_LEVEL": "high",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "32000",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
EOF
claude --version
```

验证：模型显示 `Opus 4.6 (1M context)` | `/status` 正常 | agent team 可用
