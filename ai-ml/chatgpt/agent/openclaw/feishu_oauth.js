// 保存为 /tmp/feishu_oauth.js
const http = require('http');
const https = require('https');
const APP_ID = '<YOUR_FEISHU_APP_ID>';
const APP_SECRET = '<YOUR_FEISHU_APP_SECRET>';
const REDIRECT_URI = 'http://localhost:9876/callback';

function httpsPost(url, headers, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    const req = https.request({
      hostname: urlObj.hostname, path: urlObj.pathname + urlObj.search, method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(postData), ...headers }
    }, (res) => { let body = ''; res.on('data', d => body += d); res.on('end', () => resolve(JSON.parse(body))); });
    req.on('error', reject); req.write(postData); req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:9876');
  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    const appResp = await httpsPost('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {}, { app_id: APP_ID, app_secret: APP_SECRET });
    const tokenResp = await httpsPost('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', { 'Authorization': 'Bearer ' + appResp.app_access_token }, { grant_type: 'authorization_code', code });
    require('fs').writeFileSync('/tmp/feishu_user_token.json', JSON.stringify(tokenResp, null, 2));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>授权成功！</h1><pre>' + JSON.stringify(tokenResp.data, null, 2) + '</pre>');
    setTimeout(() => process.exit(0), 2000);
  } else {
    const scopes = 'wiki:wiki docs:permission.member:create docs:permission.member docs:permission.member:auth docs:doc drive:drive contact:user.base:readonly';
    res.writeHead(302, { Location: `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scopes)}` });
    res.end();
  }
});
server.listen(9876, () => console.log('打开浏览器: http://localhost:9876/'));