#!/usr/bin/env node
// feishu-auto-share.js
// 1. Bot grants user full_access (via tenant_access_token + openid)
// 2. User (as full_access) adds external user (via user_access_token + openid)

const https = require('https');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURATION — Replace these with your values =====
const APP_ID = '<YOUR_FEISHU_APP_ID>';
const APP_SECRET = '<YOUR_FEISHU_APP_SECRET>';
const OWNER_OPEN_ID = '<YOUR_OPEN_ID>';              // your open_id (local tenant)
const EXTERNAL_OPEN_ID = '<EXTERNAL_USER_OPEN_ID>';  // external user's open_id
// ===========================================================

const USER_TOKEN_FILE = path.join(process.env.HOME, '.feishu-user-token/token.json');

function httpsRequest(method, urlStr, headers, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(urlStr);
    const postData = data ? JSON.stringify(data) : '';
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(data ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
        ...headers
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch(e) { resolve({raw: body}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(postData);
    req.end();
  });
}

async function getTenantToken() {
  const resp = await httpsRequest('POST',
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {},
    { app_id: APP_ID, app_secret: APP_SECRET }
  );
  return resp.tenant_access_token;
}

async function refreshAndGetUserToken() {
  const tokenData = JSON.parse(fs.readFileSync(USER_TOKEN_FILE, 'utf8'));
  try {
    const appResp = await httpsRequest('POST',
      'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {},
      { app_id: APP_ID, app_secret: APP_SECRET }
    );
    const resp = await httpsRequest('POST',
      'https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token',
      { 'Authorization': 'Bearer ' + appResp.app_access_token },
      { grant_type: 'refresh_token', refresh_token: tokenData.refresh_token }
    );
    if (resp.code === 0) {
      tokenData.data = { ...tokenData.data, ...resp.data };
      tokenData._savedAt = Date.now() / 1000;
      fs.writeFileSync(USER_TOKEN_FILE, JSON.stringify(tokenData, null, 2));
    }
  } catch(e) {}
  return tokenData.data.access_token;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node feishu-auto-share.js <doc_token> [doc_type] [perm]');
    console.log('  doc_type: docx, wiki, sheet, file (default: docx)');
    console.log('  perm: view, edit, full_access (default: full_access)');
    return;
  }

  const docToken = args[0];
  const docType = args[1] || 'docx';
  const perm = args[2] || 'full_access';

  console.log(`Processing: ${docToken} (${docType})`);

  const tenantToken = await getTenantToken();

  // Step 1: Bot grants full_access to owner (you)
  console.log('Step 1: Bot granting you full_access...');
  const grantOwner = await httpsRequest('POST',
    `https://open.feishu.cn/open-apis/drive/v1/permissions/${docToken}/members?type=${docType}&need_notification=false`,
    { 'Authorization': 'Bearer ' + tenantToken },
    { member_type: 'openid', member_id: OWNER_OPEN_ID, perm: 'full_access' }
  );
  // code 1063003 = "Invalid operation" means you already have access, this is OK
  console.log('Grant owner:', grantOwner.code === 0 ? 'OK' :
    grantOwner.code === 1063003 ? 'OK (already has access)' : JSON.stringify(grantOwner));

  // Step 2: User (now owner/full_access) shares with external user
  console.log('Step 2: Sharing with external user...');
  const userToken = await refreshAndGetUserToken();
  const shareResp = await httpsRequest('POST',
    `https://open.feishu.cn/open-apis/drive/v1/permissions/${docToken}/members?type=${docType}&need_notification=true`,
    { 'Authorization': 'Bearer ' + userToken },
    { member_type: 'openid', member_id: EXTERNAL_OPEN_ID, perm: perm }
  );
  console.log('Share external:', shareResp.code === 0 ? 'SUCCESS' : JSON.stringify(shareResp));

  process.exit(shareResp.code === 0 ? 0 : 1);
}

main().catch(e => { console.error('Error:', e); process.exit(1); });