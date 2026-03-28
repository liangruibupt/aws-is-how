#!/usr/bin/env node
// refresh-token.js — daily token refresh, called by systemd timer

const https = require('https');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURATION — Replace these with your values =====
const APP_ID = '<YOUR_FEISHU_APP_ID>';
const APP_SECRET = '<YOUR_FEISHU_APP_SECRET>';
// ===========================================================

const TOKEN_FILE = path.join(process.env.HOME, '.feishu-user-token/token.json');

function httpsPost(url, headers, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { resolve(body); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

(async () => {
  const tokenData = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));

  const appResp = await httpsPost(
    'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {},
    { app_id: APP_ID, app_secret: APP_SECRET }
  );

  const resp = await httpsPost(
    'https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token',
    { 'Authorization': 'Bearer ' + appResp.app_access_token },
    { grant_type: 'refresh_token', refresh_token: tokenData.refresh_token }
  );

  if (resp.code === 0) {
    tokenData.data = { ...tokenData.data, ...resp.data };
    tokenData._savedAt = Date.now() / 1000;
    tokenData._lastRefresh = new Date().toISOString();
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2));
    console.log('Token refreshed at', new Date().toISOString());
  } else {
    console.error('Refresh failed:', JSON.stringify(resp));
    process.exit(1);
  }
})();