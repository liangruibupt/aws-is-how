这是一份非常完整的社区教程！我来帮你整理成保姆级教程：

https://github.com/m1heng/clawdbot-feishu?tab=readme-ov-file#english

https://docs.openclaw.ai/channels/feishu

---

# 🎯 OpenClaw 飞书集成保姆级教程（支持流式输出）

---

## 📋 总览

| 项目 | 内容 |
|------|------|
| **适用版本** | OpenClaw ≥ 2026.2 |
| **预计耗时** | 15-20 分钟 |
| **需要服务器** | ❌ 不需要，长连接模式 |
| **流式输出** | ✅ 默认开启 |

---

## 第一部分：飞书开放平台配置

### Step 1️⃣ 创建飞书应用

1. 打开 [飞书开放平台](https://open.feishu.cn/app)，用飞书账号登录
2. 点击 **创建企业自建应用**
3. 填写：
   - 应用名称（如 "AI助手"）
   - 描述（随意）
   - 选个图标
4. 点击创建

### Step 2️⃣ 启用机器人能力

1. 进入刚创建的应用
2. 左侧菜单 → **应用能力** → **机器人**
3. 开启机器人能力
4. 给机器人起个名字

### Step 3️⃣ 配置权限（一键导入）

1. 左侧菜单 → **权限管理**
2. 点击 **批量导入**
3. 粘贴以下 JSON：

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
      "bitable:app",
      "bitable:app:readonly",
      "cardkit:card:write",
      "contact:contact.base:readonly",
      "contact:user.base:readonly",
      "contact:user.employee_id:readonly",
      "corehr:file:download",
      "docs:document.content:read",
      "docx:document",
      "docx:document.block:convert",
      "docx:document:readonly",
      "drive:drive",
      "drive:drive:readonly",
      "event:ip_list",
      "im:chat",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.group_msg",
      "im:message.p2p_msg:readonly",
      "im:message.reactions:read",
      "im:message:readonly",
      "im:message:recall",
      "im:message:send_as_bot",
      "im:message:update",
      "im:resource",
      "sheets:spreadsheet",
      "task:task:read",
      "task:task:write",
      "wiki:wiki",
      "wiki:wiki:readonly"
    ],
    "user": [
      "aily:file:read",
      "aily:file:write",
      "contact:contact.base:readonly",
      "im:chat.access_event.bot_p2p_chat:read"
    ]
  }
}
```

4. 点击导入

### Step 4️⃣ 配置事件订阅（关键！）

1. 左侧菜单 → **事件与回调** → **事件配置**
2. 请求方式选择：**使用长连接接收事件** ⚠️ 必须选这个！
3. 点击 **添加事件**
4. 搜索 `im.message.receive_v1`（接收消息），勾选添加

### Step 5️⃣ 记下凭证

在 **凭证与基础信息** 页面，复制保存：
- **App ID**（格式如 `cli_xxxxxxxxx`）
- **App Secret**（重要，妥善保管！）

### Step 6️⃣ 发布应用

1. 左侧菜单 → **版本管理与发布**
2. **创建版本** → 填写版本说明 → 提交
3. 等待审批（企业内部应用通常秒过）

---

## 第二部分：OpenClaw 配置

### Step 7️⃣ 安装飞书插件

```bash
# 安装官方飞书插件
openclaw plugins install @openclaw/feishu
```

### Step 8️⃣ 添加飞书渠道

```bash
openclaw channels add
```

按提示操作：
- 选择 **Feishu**
- 粘贴 **App ID**
- 粘贴 **App Secret**

### Step 9️⃣ 重启网关

```bash
openclaw gateway restart
```

### Step 🔟 查看日志确认连接

```bash
openclaw logs --follow
```

看到类似以下内容说明连接成功：
```
feishu ws connected
feishu provider ready
```
---

## 第三部分：测试 & 配对

### 发消息测试

1. 在飞书中搜索你的机器人名字
2. 打开对话，发送 "你好"
3. 如果机器人回复了**配对码**，在终端运行：

```bash
openclaw pairing approve feishu <配对码>
```

4. 授权后再发一条消息，收到正常回复 = 配置完成 🎉

---

## 第四部分：流式输出配置

### 默认已开启

流式输出**默认开启**，机器人会边生成边更新消息。

### 手动配置（可选）

编辑配置文件 `~/.openclaw/openclaw.json`：

```json
{
  "channels": {
    "feishu": {
      "enabled": true,
      "streaming": true,
      "blockStreaming": true,
      "appId": "cli_xxxxxxxxx",
      "appSecret": "你的AppSecret",
      "domain": "feishu",
      "groupPolicy": "allowlist",
      "groupAllowFrom": [
        "oc_xxxxx"
      ]
    }
  }
}
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `streaming` | 流式卡片输出 | `true` |
| `blockStreaming` | 块级流式输出 | `true` |

如需关闭流式（等完整回复后一次发送），设置 `streaming: false`。

---

## 第五部分：进阶配置

### 群聊配置

默认行为：群聊必须 @机器人 才回复。

**特定群组无需 @：**
```json
{
  "channels": {
    "feishu": {
      "groups": {
        "oc_你的群组ID": { "requireMention": false }
      }
    }
  }
}
```

**获取群组ID / 用户ID：** 发消息后看日志 `openclaw logs --follow`

### 访问控制策略

| dmPolicy | 行为 |
|----------|------|
| `"pairing"` | 默认，新用户需配对授权 |
| `"allowlist"` | 仅白名单用户可对话 |
| `"open"` | 允许所有人对话 |
| `"disabled"` | 禁止私聊 |

### 开机自启

```bash
openclaw gateway install
```

---

## 🔧 常见问题排查

### 机器人完全没反应

按顺序检查：
```bash
# 1. 网关在运行吗？
openclaw gateway status

# 2. 看日志
openclaw logs --follow
```

- 飞书应用发布了吗？
- 事件订阅选的是**长连接**吗？
- 添加了 `im.message.receive_v1` 事件吗？

### 回复特别慢

- 流式输出默认开启，检查 `streaming: true`
- 超过30秒无回复，查日志看模型调用是否出错

### 图片/文件 AI 看不到

- 确认有 `im:resource` 权限
- 补权限后要**创建新版本** → **发布**
- 重启网关：`openclaw gateway restart`

### Unknown model 错误

```bash
openclaw gateway restart
```

---

## 📋 命令速查表

| 命令 | 说明 |
|------|------|
| `openclaw gateway status` | 查看网关状态 |
| `openclaw gateway restart` | 重启网关 |
| `openclaw gateway install` | 安装开机自启 |
| `openclaw logs --follow` | 实时查看日志 |
| `openclaw pairing list feishu` | 查看待授权配对 |
| `openclaw pairing approve feishu <CODE>` | 批准配对 |
| `openclaw plugins list` | 查看已安装插件 |
| `openclaw channels add` | 添加新渠道 |

---

## 🔗 相关链接

- 📖 [OpenClaw 官方文档](https://docs.openclaw.ai)

---