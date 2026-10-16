#!/usr/bin/env node
// attach.mjs — 把登录函数挂到（或摘下）一个不归 CDK 管的 CloudFront 分发的某个行为上，作为 viewer-request
// 用法：
//   AWS_PROFILE=<profile> scripts/attach.mjs <分发 ID> <行为：default 或路径如 /hermes/*> <版本 ARN>
//   AWS_PROFILE=<profile> scripts/attach.mjs <分发 ID> <行为> --detach
// 同一行为的 viewer-request 不能同时挂 CloudFront Function 和 Lambda@Edge：有 CloudFront Function 时直接报错，不替换
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const [id, path, arn] = process.argv.slice(2);
if (!id || !path || !arn) { console.error("usage: attach.mjs <distribution-id> <default|/path/*> <version-arn|--detach>"); process.exit(2); }
const aws = (...a) => JSON.parse(execFileSync("aws", [...a, "--output", "json"], { encoding: "utf8" }));

const { ETag, DistributionConfig: dc } = aws("cloudfront", "get-distribution-config", "--id", id);
const b = path === "default" ? dc.DefaultCacheBehavior : dc.CacheBehaviors?.Items?.find(x => x.PathPattern === path);
if (!b) throw new Error(`${id}: no behavior ${path}`);
if (b.FunctionAssociations?.Items?.some(f => f.EventType === "viewer-request")) throw new Error(`${id} ${path}: already has a CloudFront Function on viewer-request`);

const others = (b.LambdaFunctionAssociations?.Items ?? []).filter(l => l.EventType !== "viewer-request");
const items = arn === "--detach" ? others : [...others, { LambdaFunctionARN: arn, EventType: "viewer-request", IncludeBody: false }];
b.LambdaFunctionAssociations = { Quantity: items.length, ...(items.length ? { Items: items } : {}) };

const file = `/tmp/site-auth-${id}.json`;
fs.writeFileSync(file, JSON.stringify(dc));
const r = aws("cloudfront", "update-distribution", "--id", id, "--if-match", ETag, "--distribution-config", `file://${file}`);
console.log(`${id} ${path}: ${arn === "--detach" ? "detached" : `attached ${arn}`} (${r.Distribution.Status})`);
