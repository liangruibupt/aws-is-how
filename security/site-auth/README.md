# site-auth：给 CloudFront 站点加 Cognito 登录

几个演示站点（S3 + CloudFront）原本谁都能打开，其中一个的 `/api/*` 还会花钱调用模型。这个模块用**一个 Cognito 用户池 + 一个共用的 Lambda@Edge 函数**给它们统一加登录：

```
浏览器 ──► CloudFront ──viewer-request──► site-auth-gate（Lambda@Edge）
                                            ├─ cookie 里有有效的 ID token → 放行（去掉登录 cookie 再回源）
                                            ├─ token 过期但有 refresh token → 换新 token，307 重放原请求
                                            ├─ /api/* 未登录 → 401 JSON（fetch 不能跟着跳登录页）
                                            └─ 其他未登录 → 302 到 Cognito 托管登录页（授权码 + PKCE）
                         <authPrefix>/callback ← 登录成功，用 code 换 token，写 HttpOnly + Secure cookie，回到原页面
                         <authPrefix>/logout   → 清 cookie，再经 Cognito /logout 结束会话
```

- **Cognito**：不开放注册，管理员用脚本建号；每个站点一个 app client（公共客户端 + PKCE）；ID / access token 12 小时，refresh token 30 天。多个站点共用一个用户池，登录一次后，其他站点经 Cognito 会话直接放行。
- **Lambda@Edge**：按 `Host` 头找站点配置，没配的域名一律 403。Lambda@Edge 不能用环境变量，所以用户池 ID、各 app client 和 JWKS 在打包时写进 `edge/config.json`；JWKS 预置，边缘节点冷启动不用回源拉公钥。
- **为什么不用 CloudFront Function**：它的 crypto 只有哈希和 HMAC，验不了 Cognito 的 RS256 签名。
- 同一个行为的 viewer-request 只能挂 CloudFront Function 或 Lambda@Edge 之一。原来靠 CloudFront Function 做 SPA 路由回退的站点，在站点配置里设 `"spa": true`，改由本函数做。

## 站点配置

`sites.json`（不入库，格式见 [sites.example.json](sites.example.json)），每个站点一项：

| 字段 | 说明 |
|---|---|
| `host` | 分发域名，如 `d111111abcdef8.cloudfront.net` |
| `home` | 退出登录后回到的路径；登录后没有原页面时也回这里 |
| `authPrefix` | 回调和退出的路径前缀，必须落在**挂了本函数的行为**里。挂在 `/deck/*` 上就写 `/deck/_auth` |
| `cookiePath` | 登录 cookie 的 Path。只保护 `/deck/*` 时写 `/deck/`，同一分发的其他路径收不到 cookie |
| `api` | 可选。这些前缀未登录时返回 401，不跳登录页 |
| `spa` | 可选。放行后把不含 `.` 且不在 `api` 下的路径改写为 `/index.html` |
| `refreshDays` | 可选，refresh token 天数，默认 30 |

## 部署

需要 Node 22、AWS CLI，以及已在 us-east-1 `cdk bootstrap` 过的账号（默认 qualifier `mdi2024`，否则设 `CDK_QUALIFIER`）。登录域名前缀默认 `ruiliang-site-auth`，换账号时设 `SITE_AUTH_DOMAIN_PREFIX`。

```bash
npm install
AWS_PROFILE=<profile> scripts/deploy.sh          # 用户池 → 生成 edge/config.json → 单测 → 打包 → Lambda@Edge；最后打印版本 ARN
AWS_PROFILE=<profile> scripts/add-user.sh <用户名> # 临时密码写到 ~/.config/site-auth/<用户名>.txt，首次登录时改密码
```

改了 `sites.json`（加站点、改路径）后重新运行 `deploy.sh`：app client 更新，函数发布新版本，要把新版本 ARN 重新挂到各分发上。

### 挂到分发上

- **CDK 管的分发**：在 behavior 的 `edgeLambdas` 里挂 `VIEWER_REQUEST`，版本 ARN 用 `lambda.Version.fromVersionArn`。例子见 [jev-interest-cases](https://github.com/liangruibupt/jev-interest-cases) 的 `infra/lib/jev-lab-stack.ts`（设 `SITE_AUTH_EDGE_VERSION_ARN` 后部署）。
- **手工建的分发**：

  ```bash
  AWS_PROFILE=<profile> scripts/attach.mjs <分发 ID> default <版本 ARN>      # 默认行为
  AWS_PROFILE=<profile> scripts/attach.mjs <分发 ID> '/deck/*' <版本 ARN>    # 某个路径的行为
  AWS_PROFILE=<profile> scripts/attach.mjs <分发 ID> '/deck/*' --detach      # 摘下，恢复公开
  ```

  该行为的 viewer-request 上已有 CloudFront Function 时脚本会报错，不会替换。

### 验证

```bash
npm test                                   # 单测：本地 RSA 密钥签 token，不连网
curl -sI https://<分发域名>/ | head -3      # 未登录：302 到 *.auth.us-east-1.amazoncognito.com
curl -s  https://<分发域名>/api/health      # api 前缀未登录：401
```

## 下线

先把函数从所有分发上摘下（`attach.mjs … --detach`，或去掉 CDK 里的 `edgeLambdas` 再部署），等分发部署完成，再 `npx cdk destroy SiteAuthEdge`。Lambda@Edge 的副本在摘下后要过几小时才能删除，期间 destroy 会失败，稍后重试即可。用户池开了删除保护并设为 RETAIN，要删除需先在控制台关掉删除保护。

## 费用

Cognito Essentials 每月前 10,000 个活跃用户免费；Lambda@Edge 每百万请求 $0.60 加按 128 MB 计的运行时长。几个人用的演示站点基本为零。

## 局限

- 退出登录后，浏览器缓存里已有的页面仍可能显示（同一台设备）；页面再请求的资源和接口会被拦下、跳去登录。
- 没有邮箱：忘记密码由管理员 `aws cognito-idp admin-set-user-password` 重置。
- 登录 cookie（ID token + refresh token）约 4–5 KB，会随每个请求发到 CloudFront；回源前已去掉。
