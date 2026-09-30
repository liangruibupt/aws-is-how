// app.mjs — 两个栈，由 scripts/deploy.sh 依次部署：
//   SiteAuthPool：Cognito 用户池 + 托管登录域名 + 每个站点一个 app client
//   SiteAuthEdge：Lambda@Edge 函数（打包时带上 SiteAuthPool 的输出，见 edge/config.json）
import fs from "node:fs";
import { App, CfnOutput, DefaultStackSynthesizer, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";

const root = new URL("..", import.meta.url);
const sites = JSON.parse(fs.readFileSync(new URL("sites.json", root), "utf8"));
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: "us-east-1" };   // Lambda@Edge 只能建在 us-east-1
const synthesizer = new DefaultStackSynthesizer({ qualifier: process.env.CDK_QUALIFIER ?? "mdi2024" });
const app = new App();

const pool = new Stack(app, "SiteAuthPool", { env, synthesizer, description: "site-auth: Cognito user pool and hosted login for CloudFront sites" });
const users = new cognito.UserPool(pool, "Users", {
  userPoolName: "site-auth-users",
  selfSignUpEnabled: false,                                  // 不开放注册：scripts/add-user.sh 建号
  signInAliases: { username: true },
  signInCaseSensitive: false,
  passwordPolicy: { minLength: 12, requireSymbols: false },
  accountRecovery: cognito.AccountRecovery.NONE,             // 没有邮箱：忘记密码由管理员重置
  featurePlan: cognito.FeaturePlan.ESSENTIALS,
  deletionProtection: true,
  removalPolicy: RemovalPolicy.RETAIN,
});
const domain = users.addDomain("Domain", {
  cognitoDomain: { domainPrefix: process.env.SITE_AUTH_DOMAIN_PREFIX ?? "ruiliang-site-auth" },
  managedLoginVersion: cognito.ManagedLoginVersion.NEWER_MANAGED_LOGIN,
});
const clients = {};
for (const [name, s] of Object.entries(sites)) {
  const client = users.addClient(`Client-${name}`, {
    userPoolClientName: `site-auth-${name}`,
    generateSecret: false,                                   // 公共客户端 + PKCE：不用把 client secret 打进函数包
    authFlows: {},
    oAuth: {
      flows: { authorizationCodeGrant: true },
      scopes: [cognito.OAuthScope.OPENID],
      callbackUrls: [`https://${s.host}${s.authPrefix}/callback`],
      logoutUrls: [`https://${s.host}${s.home}`],
    },
    supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
    idTokenValidity: Duration.hours(12),
    accessTokenValidity: Duration.hours(12),
    refreshTokenValidity: Duration.days(s.refreshDays ?? 30),
    preventUserExistenceErrors: true,
  });
  new cognito.CfnManagedLoginBranding(pool, `Branding-${name}`, { userPoolId: users.userPoolId, clientId: client.userPoolClientId, useCognitoProvidedValues: true });
  clients[name] = client.userPoolClientId;
}
new CfnOutput(pool, "UserPoolId", { value: users.userPoolId });
new CfnOutput(pool, "Domain", { value: domain.baseUrl() });
for (const [name, id] of Object.entries(clients)) new CfnOutput(pool, `ClientId${name.replace(/[^A-Za-z0-9]/g, "")}`, { value: id, description: name });

if (fs.existsSync(new URL("edge/dist/index.js", root))) {
  const edge = new Stack(app, "SiteAuthEdge", { env, synthesizer, description: "site-auth: Lambda@Edge viewer-request login gate" });
  const role = new iam.Role(edge, "Role", {
    assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal("lambda.amazonaws.com"), new iam.ServicePrincipal("edgelambda.amazonaws.com")),
    managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaBasicExecutionRole")],
  });
  const fn = new lambda.Function(edge, "Gate", {
    functionName: "site-auth-gate",
    runtime: lambda.Runtime.NODEJS_22_X,
    handler: "index.handler",
    code: lambda.Code.fromAsset(new URL("edge/dist", root).pathname),
    memorySize: 128,
    timeout: Duration.seconds(5),                            // viewer-request 的上限
    role,
  });
  new CfnOutput(edge, "VersionArn", { value: fn.currentVersion.functionArn, description: "attach this to CloudFront behaviors as viewer-request" });
}
