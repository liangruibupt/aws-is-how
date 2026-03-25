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
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "global.anthropic.claude-sonnet-4-6",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "global.anthropic.claude-haiku-4-5-20251001-v1:0",
    "ANTHROPIC_SMALL_FAST_MODEL": "global.anthropic.claude-haiku-4-5-20251001-v1:0",
    "CLAUDE_CODE_EFFORT_LEVEL": "high",
    "CLAUDE_CODE_MAX_OUTPUT_TOKENS": "128000",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
EOF
claude --version
```

验证：模型显示 `Opus 4.6 (1M context)` | `/status` 正常 | agent team 可用

## Claude Code 省Token的 Proxy

SA 写了个小的proxy，放在Claude Code 和bedrock之间，利用 Prompt Caching 和优化 Thinking 配置，save token 消耗成本
[Bedrock Effort Max Proxy](https://github.com/KevinZhao/claudecode-bedrock-proxy)

1.  使用
```
git clone git@github.com:KevinZhao/claudecode-bedrock-proxy.git

cd claudecode-bedrock-proxy
source ../venv/bin/activate
pip install aiohttp
pip install yarl
pip install botocore

# 启动
./start.sh

# 停止
./stop.sh

# 健康检查
curl http://127.0.0.1:8888/health

```

2. 配置

参考 settings.json 配置 Claude Code（~/.claude/settings.json），包含：

- Bedrock 模式启用 + proxy 指向
- 模型配置（主模型、各级别默认模型、[1m] context window）
- 性能调优选项
- SessionStart hook 自动启动 proxy

## gstack: It turns Claude Code into a virtual engineering team
https://github.com/garrytan/gstack

### Quick start
#### Install gstack (30 seconds — see below)
  - Install on your machine
  ```
  Install gstack: run git clone https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup then add a "gstack" section to CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp__claude-in-chrome__* tools, and lists the available skills: /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /browse, /qa, /qa-only, /qa-design-review, /setup-browser-cookies, /retro, /document-release. Then ask the user if they also want to add gstack to the current project so teammates get it.
  ```
  - Add to your repo so teammates get it (optional)
  ```
  Add gstack to this project: run cp -Rf ~/.claude/skills/gstack .claude/skills/gstack && rm -rf .claude/skills/gstack/.git && cd .claude/skills/gstack && ./setup then add a "gstack" section to this project's CLAUDE.md that says to use the /browse skill from gstack for all web browsing, never use mcp__claude-in-chrome__* tools, lists the available skills: /plan-ceo-review, /plan-eng-review, /plan-design-review, /design-consultation, /review, /ship, /browse, /qa, /qa-only, /qa-design-review, /setup-browser-cookies, /retro, /document-release, and tells Claude that if gstack skills aren't working, run cd .claude/skills/gstack && ./setup to build the binary and register skills.
  ```
  - Run /plan-ceo-review on any feature idea
  - Run /review on any branch with changes
  - Run /qa on your staging URL

  - Team SKILL
    ```
    /plan-ceo-review
    /plan-eng-review
    /plan-design-review
    /design-consultation
    /review
    /ship
    /browse
    /qa
    /qa-only
    /design-review
    /setup-browser-cookies
    /retro
    /document-release
    ```

#### Install the Superpowers
1. Install
```
Install the superpowers Skill from https://claude.com/plugins/superpowers

Superpowers is installed. It's a structured software development skills
  framework by Jesse Vincent (182K+ installs) that provides:

  - Test-Driven Development — red-green-refactor cycles
  - Systematic Debugging — four-phase root cause investigation before fixes
  - Brainstorming — Socratic requirement refinement before coding
  - Code Review — built-in architectural oversight agent
  - Plan Execution — batched implementation with review checkpoints
  - Skill Authoring — create and test new skills with TDD

  You may notice some overlap with skills you already have (brainstorming, TDD,
  debugging, executing-plans). The superpowers versions tend to be more
  prescriptive/structured in their methodology.

Based on the installed skills, Superpowers provides these commands:

  ┌─────────────────┬──────────────────────────┬──────────────────────────────┐
  │      Skill      │         Command          │         When to Use          │
  ├─────────────────┼──────────────────────────┼──────────────────────────────┤
  │                 │                          │ Before any creative work —   │
  │ Brainstorming   │ /brainstorming           │ explore requirements &       │
  │                 │                          │ design before coding         │
  ├─────────────────┼──────────────────────────┼──────────────────────────────┤
  │ Test-Driven     │                          │ Before writing               │
  │ Development     │ /test-driven-development │ implementation code for      │
  │                 │                          │ features or bugfixes         │
  ├─────────────────┼──────────────────────────┼──────────────────────────────┤
  │ Systematic      │                          │ When encountering bugs, test │
  │ Debugging       │ /systematic-debugging    │  failures, or unexpected     │
  │                 │                          │ behavior                     │
  ├─────────────────┼──────────────────────────┼──────────────────────────────┤
  │                 │                          │ When you have a              │
  │ Writing Plans   │ /writing-plans           │ spec/requirements and need a │
  │                 │                          │  multi-step plan             │
  ├─────────────────┼──────────────────────────┼──────────────────────────────┤
  │ Executing Plans │ /executing-plans         │ Run a written plan with      │
  │                 │                          │ review checkpoints           │
  ├─────────────────┼──────────────────────────┼──────────────────────────────┤
  │                 │                          │ After completing tasks or    │
  │ Code Review     │ /requesting-code-review  │ major features, before       │
  │                 │                          │ merging                      │
  ├─────────────────┼──────────────────────────┼──────────────────────────────┤
  │                 │                          │ Review changed code for      │
  │ Simplify        │ /simplify                │ reuse, quality, and          │
  │                 │                          │ efficiency                   │
  ├─────────────────┼──────────────────────────┼──────────────────────────────┤
  │ Skill Creator   │ /skill-creator           │ Create or update new skills  │
  └─────────────────┴──────────────────────────┴──────────────────────────────┘

  The typical workflow Superpowers enforces:
  1. /brainstorming — clarify what to build
  2. /writing-plans — plan the implementation
  3. /test-driven-development — write tests first, then code
  4. /systematic-debugging — if something breaks, investigate root cause first
  5. /requesting-code-review — verify before merging
  6. /simplify — clean up
```

2. gstack V.S Superpowers
```
❯ ok, I installed gstack and Superpowers 2 skills, Do I need them both or you
recommend only use the Superpowers will be enough or better?

⏺ Good question. Here's a practical comparison:

  Superpowers (dev methodology):
  - TDD (red-green-refactor)
  - Systematic debugging (root cause first)
  - Brainstorming (requirements before code)
  - Plan execution with review checkpoints

  gstack (product/QA workflow):
  - /browse — headless browser (its killer feature)
  - /qa, /qa-only — QA testing
  - /review, /ship — code review & ship checklists
  - /plan-*-review — CEO/eng/design plan reviews
  - /retro, /document-release — team process

  Overlap: brainstorming, code review, planning

  My recommendation: For your project (Python CLI, no web frontend), Superpowers
  alone is sufficient. Here's why:

  1. The TDD and systematic debugging skills are directly useful for your daily
  coding
  1. gstack's main differentiator (/browse) overlaps with the agent-browser skill
  you just installed
  1. gstack's design reviews, ship checklists, and retros are more relevant for
  frontend/product teams
```

#### Install the agent browser
```
you can also help me install the skill https://agent-browser.dev/skills, you can use it for web testing
This gives you browser automation for web testing — navigation, snapshots, form filling, screenshots, data extraction, session management, and visual diffing.
You can invoke it with the /agent-browser skill.
You're now running with Superpowers + agent-browser.
```