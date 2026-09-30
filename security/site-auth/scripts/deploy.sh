#!/usr/bin/env bash
# deploy.sh — 部署用户池 → 用它的输出和 JWKS 生成 edge/config.json → 打包 → 部署 Lambda@Edge，最后打印版本 ARN
# 用法：AWS_PROFILE=<profile> scripts/deploy.sh   （站点列表在 sites.json，格式见 sites.example.json）
set -euo pipefail
cd "$(dirname "$0")/.."
export AWS_REGION=us-east-1

npx cdk deploy SiteAuthPool --require-approval never
out() { aws cloudformation describe-stacks --stack-name SiteAuthPool --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
pool=$(out UserPoolId) domain=$(out Domain)
curl -fsS "https://cognito-idp.us-east-1.amazonaws.com/$pool/.well-known/jwks.json" > /tmp/site-auth-jwks.json

node - "$pool" "$domain" <<'JS'
const fs = require("node:fs"), { execFileSync } = require("node:child_process");
const [pool, domain] = process.argv.slice(2), sites = JSON.parse(fs.readFileSync("sites.json", "utf8"));
const outputs = JSON.parse(execFileSync("aws", ["cloudformation", "describe-stacks", "--stack-name", "SiteAuthPool", "--query", "Stacks[0].Outputs"], { encoding: "utf8" }));
for (const [name, s] of Object.entries(sites)) {
  const o = outputs.find(o => o.OutputKey === `ClientId${name.replace(/[^A-Za-z0-9]/g, "")}`);
  if (!o) throw new Error(`no app client for ${name}`);
  Object.assign(s, { clientId: o.OutputValue, refreshDays: s.refreshDays ?? 30 });
}
const jwks = JSON.parse(fs.readFileSync("/tmp/site-auth-jwks.json", "utf8"));
fs.writeFileSync("edge/config.json", JSON.stringify({ userPoolId: pool, domain, jwks, sites }, null, 2));
console.log(`edge/config.json: ${Object.keys(sites).join(", ")}`);
JS

npm test
npm run build
size=$(wc -c < edge/dist/index.js)
[ "$size" -lt 1000000 ] || { echo "bundle is $size bytes; viewer-request functions must stay under 1 MB" >&2; exit 1; }
npx cdk deploy SiteAuthEdge --require-approval never
aws cloudformation describe-stacks --stack-name SiteAuthEdge --query "Stacks[0].Outputs[?OutputKey=='VersionArn'].OutputValue" --output text
