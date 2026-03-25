## 个人版本 OpenClaw
- [openclaw 在 aws 快速搭建和配置](https://mp.weixin.qq.com/s/0k62KUk6wveo1OEt72xI9Q)
      - [个人版 OpenClaw-on-AWS-with-Bedrock](https://github.com/aws-samples/sample-OpenClaw-on-AWS-with-Bedrock)
      - [个人版 lightsail-quick-start-guide-openclaw](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-quick-start-guide-openclaw.html)
      - [公司平台搭建：可以考虑这个AgentCore方案](https://github.com/aws-samples/sample-host-openclaw-on-amazon-bedrock-agentcore)
      - [多租户平台搭建基于EKS的方案: one openclaw instance per pod, multi tenant use case]( https://github.com/aws-samples/sample-multi-tenancy-openclaw-on-eks)
        - [OpenClaw on EKS的Hands-On Workshop - 包括Operator和Agent Sendbox的Demo](https://catalog.us-east-1.prod.workshops.aws/workshops/afba7f08-c987-40dc-afa5-da3e200ae7c5/zh-CN)
- [OpenClaw on EC2 Mac Instance](https://mp.weixin.qq.com/s/tT_dTZ_ykBvohCv26p3n0Q)
- [Clawdbot 接入飞书保姆级教程](https://mp.weixin.qq.com/s/_i1fgNbeDrBR5wurEmJf0A)


## 部署几百个上千个 OpenClaw
利用 https://github.com/awslabs/InfraForge 同时部署几百个上千个都没问题

如果要部署多个，设定个  instanceCount 参数即可 比方说100，当然也可以多个不同类型的机型，不同架构，不同系统同时部署，添加对应配置即可）

### 上千个 OpenClaw 快速部署手册

1. 前置要求
Linux/macOS 机器（ARM64/x86_64）已安装 AWS CDK 并配置凭证（AK/SK）

2. 部署步骤

    2.1 安装 InfraForge(使用预编译版本）
    ```
    mkdir InfraForge && cd InfraForge
    wget https://aws-hpc-builder.s3.amazonaws.com/project/apps/ifmanager.sh
    bash ifmanager.sh注：InfraForge 将安装在当前目录
    ```

    2.2 部署 OpenClaw
    ```cp configs/agentic/config_openclaw.json config.json
    ./bootstrap.sh
    ./deploy.sh
    ```


3. 访问服务

部署完成后，查看安装日志获取 Token 和访问信息：

```
cat ~/openclaw_install.log部署完成后使用 SSM 端口转发：
aws ssm start-session --target <instance-id> \
  --document-name AWS-StartPortForwardingSession \
  --parameters '{"portNumber":["18789"],"localPortNumber":["18789"]}'
```

访问：http://localhost:18789

4. 清理资源
```
./destroy.sh
```

5. 自定义配置

编辑 config.json 修改：
model: Bedrock 模型（默认 Claude Sonnet 4.5）model region: AWS Bedrock 模型区域（默认 us-west-2）security 和 subnet: 改为 "public" 启用公网访问

## 配置 Channels
### [配置 Slack](https://mp.weixin.qq.com/s/0k62KUk6wveo1OEt72xI9Q) 或者 [官方Slack配置](https://docs.openclaw.ai/channels/slack)
### [配置飞书](openclaw-feishu.md)


## 配置 Tools
### 配置 Web tools
1. [官方Web tools 文档](https://docs.openclaw.ai/tools/web)
- Brave (default): returns structured results (title, URL, snippet).
- Perplexity: returns AI-synthesized answers with citations from real-time web search.

2. Set the API Key
Recommended: run `openclaw configure --section web`. It stores the key in `~/.openclaw/openclaw.json` under `tools.web.search.apiKey`


### 配置Browser
[参考文档](https://docs.openclaw.ai/tools/browser)

1. openclaw.json
```json
"browser": {
    "enabled": true,
    "executablePath": "/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux/chrome",
    "headless": true,
    "noSandbox": true,
    "defaultProfile": "openclaw",
    "profiles": {
      "openclaw": {
        "cdpPort": 18800,
        "color": "#FF4500"
      }
    }
  }
```
2. Trouble shooting
- 之前你配置 browser 的时候，openclaw 报告了如下错误，你自己检查一下原因 
  ```
  06:39:41 error Invalid config at /home/ubuntu/.openclaw/openclaw.json:\n- browser.profiles.openclaw: Unrecognized keys: "headless", "noSandbox", "executablePath" 06:39:41 error Config invalid 06:39:41 error File: ~/.openclaw/openclaw.json 06:39:41 error Problem: 06:39:41 error - browser.profiles.openclaw: Unrecognized keys: "headless", "noSandbox", "executablePath"
  ```
  ```
  Now I see the correct schema. The headless, noSandbox, executablePath are top-level browser.* keys, not nested inside profiles.openclaw. Profiles only support cdpPort, cdpUrl, color, etc. Let me fix the config.
  ```
  ```
  {
  "status": "error",
  "tool": "browser",
  "error": "Can't reach the OpenClaw browser control service (timed out after 15000ms). Restart the OpenClaw gateway (OpenClaw.app menubar, or openclaw gateway). Do NOT retry the browser tool — it will keep failing. Use an alternative approach or inform the user that the browser is currently unavailable."
  }

  Browser control service isn't responding. The docs mentioned snap Chromium causes issues. Let me check the logs and try the manual approach.

  The browser control service says it's "ready" but times out when trying to start Chrome. The issue is likely snap Chromium. The docs recommend installing Google Chrome .deb instead. But this is arm64, so let me check architecture and try the right approach.

  Confirmed — it's snap Chromium on arm64. Google Chrome doesn't have an arm64 .deb. I'll use the attach-only approach: start Chromium manually, then have OpenClaw attach to it.

  Snap Chromium won't start in this environment. Let me try installing a non-snap Chromium via the Playwright managed binary instead.

  Playwright chromium installed. Now let me find the binary and try launching it.
  Now update config to use the Playwright Chromium binary and test it.

  ```

  ```json
  {
    "enabled": true,
    "profile": "openclaw",
    "running": true,
    "cdpReady": true,
    "cdpHttp": true,
    "pid": 24050,
    "cdpPort": 18800,
    "cdpUrl": "http://127.0.0.1:18800",
    "chosenBrowser": "custom",
    "detectedBrowser": "custom",
    "detectedExecutablePath": "/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux/chrome",
    "detectError": null,
    "userDataDir": "/home/ubuntu/.openclaw/browser/openclaw/user-data",
    "color": "#FF4500",
    "headless": true,
    "noSandbox": true,
    "executablePath": "/home/ubuntu/.cache/ms-playwright/chromium-1208/chrome-linux/chrome",
    "attachOnly": false
  }
  ```
1. 测试用例
```
现在访问 amazon.com，查询 最受欢迎的 5 款蓝牙无线耳机，信息包括品牌，售价，续航时间，并且一张产品截图，最终通过一个 html 网页展示，网页保存到s3://myseverlesswebpage/moltbot/
```

## 配置 Skills
1. 利用 ClawHub 安装 Gemini 3 Pro Image skill
```
安装 Gemini 3 Pro Image skill

状态总结：
组件 	状态
SKILL.md 	✅ 存在，配置完整
脚本 	✅ generate_image.py (5.9KB)
uv 	✅ v0.10.4
GEMINI_API_KEY 	✅ 已设置
API 调用 	✅ 测试生成成功 (1K)
支持分辨率 	1K / 2K / 4K
支持模式 	文生图 + 图生图编辑
```