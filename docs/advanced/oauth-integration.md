# OAuth 2.0 鉴权集成

> 为 OpenClaw 的 Web 控制台和 API 接口添加 OAuth 2.0 身份认证，支持 GitHub、Google、企业微信、飞书等主流 OAuth 提供商。

## 📋 目录

- [为什么需要 OAuth](#为什么需要-oauth)
- [支持的提供商](#支持的提供商)
- [核心概念](#核心概念)
- [GitHub OAuth 接入](#github-oauth-接入)
- [Google OAuth 接入](#google-oauth-接入)
- [飞书 OAuth 接入](#飞书-oauth-接入)
- [企业微信 OAuth 接入](#企业微信-oauth-接入)
- [自建 OAuth Server](#自建-oauth-server)
- [JWT Token 管理](#jwt-token-管理)
- [权限控制](#权限控制)
- [安全最佳实践](#安全最佳实践)

---

## 为什么需要 OAuth

OpenClaw 默认使用 Token 认证，适合本地部署。当你需要：

- 🌐 **多人使用**：团队成员用各自账号登录
- 🔐 **细粒度权限**：管理员/普通用户不同权限
- 🏢 **企业集成**：员工用企业账号（飞书/企业微信）SSO 登录
- 📱 **第三方应用**：对外提供 API，允许第三方应用接入

---

## 支持的提供商

| 提供商 | 适用场景 | 难度 |
|-------|---------|------|
| GitHub | 开发者团队 | ⭐⭐ |
| Google | 国际团队 | ⭐⭐ |
| 飞书 | 国内企业（飞书用户） | ⭐⭐⭐ |
| 企业微信 | 国内企业（企微用户） | ⭐⭐⭐ |
| 自建 OIDC | 高度自定义需求 | ⭐⭐⭐⭐ |

---

## 核心概念

### OAuth 2.0 授权码流程

```
用户                浏览器              OpenClaw          OAuth提供商
 │                   │                    │                   │
 │──点击登录────────>│                    │                   │
 │                   │──重定向到 OAuth──>│                   │
 │                   │                    │──生成 auth_url──>│
 │                   │<─────────────────redirect to provider─│
 │<──展示授权页──────│                    │                   │
 │──同意授权────────>│                    │                   │
 │                   │<──回调 + code ────│                   │
 │                   │──发送 code ────────>│                   │
 │                   │                    │──换取 tokens ───>│
 │                   │                    │<── access_token ─│
 │                   │<── JWT session ───│                   │
 │──访问应用────────>│                    │                   │
```

### OpenClaw 配置结构

```yaml
# openclaw.config.yaml
auth:
  mode: oauth2           # none / token / oauth2
  session_secret: ${SESSION_SECRET}
  jwt_expires_in: 24h
  
  providers:
    github:
      enabled: true
      client_id: ${GITHUB_CLIENT_ID}
      client_secret: ${GITHUB_CLIENT_SECRET}
      callback_url: https://your-domain.com/auth/github/callback
      scope: user:email
      
    feishu:
      enabled: true
      app_id: ${FEISHU_APP_ID}
      app_secret: ${FEISHU_APP_SECRET}
      callback_url: https://your-domain.com/auth/feishu/callback
      
  # 访问控制
  access_control:
    whitelist_mode: false  # true = 只有白名单用户可登录
    allowed_orgs:          # GitHub 限制特定组织成员
      - your-github-org
    allowed_domains:       # 限制特定邮箱域名
      - company.com
```

---

## GitHub OAuth 接入

### 第一步：创建 GitHub OAuth App

1. 访问 GitHub → Settings → Developer settings → OAuth Apps
2. 点击 **New OAuth App**，填写：
   - **Application name**: OpenClaw Dashboard
   - **Homepage URL**: `https://your-domain.com`
   - **Authorization callback URL**: `https://your-domain.com/auth/github/callback`
3. 获取 `Client ID` 和 `Client Secret`

### 第二步：安装依赖

```bash
npm install passport passport-github2 express-session jsonwebtoken
```

### 第三步：实现认证

```javascript
// src/auth/github.js
const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const jwt = require('jsonwebtoken');

passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
  scope: ['user:email']
}, async (accessToken, refreshToken, profile, done) => {
  // 验证是否为允许的组织成员
  const allowedOrgs = process.env.ALLOWED_GITHUB_ORGS?.split(',') || [];
  
  if (allowedOrgs.length > 0) {
    const isMember = await checkOrgMembership(accessToken, allowedOrgs);
    if (!isMember) {
      return done(null, false, { message: '无权访问，请联系管理员' });
    }
  }

  const user = {
    id: profile.id,
    username: profile.username,
    email: profile.emails?.[0]?.value,
    avatar: profile.photos?.[0]?.value,
    provider: 'github'
  };

  return done(null, user);
}));

// 检查 GitHub 组织成员
async function checkOrgMembership(accessToken, orgs) {
  const { Octokit } = require('@octokit/rest');
  const octokit = new Octokit({ auth: accessToken });
  
  for (const org of orgs) {
    try {
      await octokit.orgs.checkMembershipForUser({
        org,
        username: (await octokit.users.getAuthenticated()).data.login
      });
      return true;
    } catch {}
  }
  return false;
}

// 路由配置
function setupGitHubAuth(app) {
  app.get('/auth/github', passport.authenticate('github'));
  
  app.get('/auth/github/callback',
    passport.authenticate('github', { session: false }),
    (req, res) => {
      // 签发 JWT
      const token = jwt.sign(req.user, process.env.JWT_SECRET, { expiresIn: '24h' });
      
      // 设置 httpOnly Cookie
      res.cookie('auth_token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      });
      
      res.redirect('/dashboard');
    }
  );
}

module.exports = { setupGitHubAuth };
```

---

## Google OAuth 接入

```bash
npm install passport-google-oauth20
```

```javascript
// src/auth/google.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value;
  
  // 限制特定域名（如只允许 company.com 邮箱）
  const allowedDomains = process.env.ALLOWED_EMAIL_DOMAINS?.split(',') || [];
  if (allowedDomains.length > 0 && !allowedDomains.some(d => email?.endsWith('@' + d))) {
    return done(null, false, { message: '不允许的邮箱域名' });
  }

  return done(null, {
    id: profile.id,
    email,
    name: profile.displayName,
    avatar: profile.photos?.[0]?.value,
    provider: 'google'
  });
}));
```

---

## 飞书 OAuth 接入

### 应用配置

在[飞书开放平台](https://open.feishu.cn)创建企业自建应用，添加权限：
- `contact:user.base:readonly` - 获取用户信息
- 配置重定向 URL: `https://your-domain.com/auth/feishu/callback`

```javascript
// src/auth/feishu.js
const axios = require('axios');

// 飞书 OAuth 认证实现（手动实现，无官方 Passport 策略）
function setupFeishuAuth(app) {
  // 发起授权
  app.get('/auth/feishu', (req, res) => {
    const params = new URLSearchParams({
      client_id: process.env.FEISHU_APP_ID,
      redirect_uri: process.env.FEISHU_CALLBACK_URL,
      response_type: 'code',
      scope: 'contact:user.base:readonly',
      state: generateState()  // CSRF 防护
    });
    
    res.redirect(`https://open.feishu.cn/open-apis/authen/v1/authorize?${params}`);
  });

  // 回调处理
  app.get('/auth/feishu/callback', async (req, res) => {
    const { code, state } = req.query;
    
    // 验证 state（CSRF 防护）
    if (!verifyState(state)) {
      return res.status(403).send('Invalid state');
    }

    try {
      // 1. 获取应用 access_token
      const appTokenRes = await axios.post(
        'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
        {
          app_id: process.env.FEISHU_APP_ID,
          app_secret: process.env.FEISHU_APP_SECRET
        }
      );
      const appAccessToken = appTokenRes.data.app_access_token;

      // 2. 用 code 换取用户 access_token
      const userTokenRes = await axios.post(
        'https://open.feishu.cn/open-apis/authen/v1/access_token',
        { code, grant_type: 'authorization_code' },
        { headers: { 'Authorization': `Bearer ${appAccessToken}` } }
      );
      const userAccessToken = userTokenRes.data.data.access_token;

      // 3. 获取用户信息
      const userInfoRes = await axios.get(
        'https://open.feishu.cn/open-apis/authen/v1/user_info',
        { headers: { 'Authorization': `Bearer ${userAccessToken}` } }
      );
      const userInfo = userInfoRes.data.data;

      // 4. 签发 JWT
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({
        id: userInfo.open_id,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.avatar_url,
        provider: 'feishu'
      }, process.env.JWT_SECRET, { expiresIn: '8h' });

      res.cookie('auth_token', token, { httpOnly: true, secure: true });
      res.redirect('/dashboard');
      
    } catch (err) {
      console.error('飞书 OAuth 失败:', err);
      res.redirect('/login?error=oauth_failed');
    }
  });
}

// CSRF state 生成与验证
const stateCache = new Set();
function generateState() {
  const state = Math.random().toString(36).slice(2);
  stateCache.add(state);
  setTimeout(() => stateCache.delete(state), 10 * 60 * 1000);
  return state;
}
function verifyState(state) {
  return stateCache.delete(state);
}

module.exports = { setupFeishuAuth };
```

---

## JWT Token 管理

### 中间件实现

```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');

// 认证中间件
function requireAuth(req, res, next) {
  // 支持 Cookie 和 Bearer Token 两种方式
  const token = req.cookies.auth_token
    || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    if (req.accepts('html')) {
      return res.redirect('/login');
    }
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Token 刷新端点
function setupTokenRefresh(app) {
  app.post('/auth/refresh', requireAuth, (req, res) => {
    // 当 token 还有 30 分钟过期时允许刷新
    const expiresIn = req.user.exp - Math.floor(Date.now() / 1000);
    
    if (expiresIn > 30 * 60) {
      return res.status(400).json({ error: '令牌未到刷新时间' });
    }

    const newToken = jwt.sign(
      { ...req.user, iat: undefined, exp: undefined },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie('auth_token', newToken, { httpOnly: true, secure: true });
    res.json({ success: true });
  });
}

module.exports = { requireAuth, setupTokenRefresh };
```

---

## 权限控制

```javascript
// src/middleware/rbac.js

// 角色定义
const ROLES = {
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

// 权限矩阵
const PERMISSIONS = {
  'channel:read':    [ROLES.VIEWER, ROLES.EDITOR, ROLES.ADMIN],
  'channel:write':   [ROLES.EDITOR, ROLES.ADMIN],
  'channel:delete':  [ROLES.ADMIN],
  'user:manage':     [ROLES.ADMIN],
  'config:read':     [ROLES.EDITOR, ROLES.ADMIN],
  'config:write':    [ROLES.ADMIN]
};

// 权限检查中间件
function requirePermission(permission) {
  return (req, res, next) => {
    const userRole = req.user?.role || ROLES.VIEWER;
    const allowedRoles = PERMISSIONS[permission] || [];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `需要 ${permission} 权限`
      });
    }
    next();
  };
}

// 使用示例
app.delete('/api/channels/:id',
  requireAuth,
  requirePermission('channel:delete'),
  (req, res) => { /* 删除逻辑 */ }
);
```

---

## 安全最佳实践

### 1. PKCE（公开客户端强烈推荐）

```javascript
const crypto = require('crypto');

// 生成 PKCE 参数
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto.createHash('sha256')
    .update(verifier).digest('base64url');
  return { verifier, challenge };
}

// 在发起授权时使用
app.get('/auth/github', (req, res) => {
  const pkce = generatePKCE();
  req.session.pkce_verifier = pkce.verifier;
  
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    code_challenge: pkce.challenge,
    code_challenge_method: 'S256',
    // ...
  });
});
```

### 2. 安全检查清单

```markdown
- [ ] SESSION_SECRET 使用 32 字节随机值
- [ ] JWT_SECRET 独立于 SESSION_SECRET
- [ ] Cookie 设置 httpOnly + secure + sameSite=lax
- [ ] CSRF State 参数验证
- [ ] Callback URL 严格白名单（不接受动态 redirect_uri）
- [ ] 生产环境强制 HTTPS
- [ ] 定期轮换 Client Secret
- [ ] 监控异常登录（同一账号短时间大量失败）
- [ ] 设置合理的 Token 过期时间（建议 8-24h）
```

### 3. 环境变量模板

```env
# .env.example
SESSION_SECRET=change-me-to-32-random-bytes
JWT_SECRET=change-me-to-another-32-random-bytes

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=https://your-domain.com/auth/github/callback
ALLOWED_GITHUB_ORGS=your-org

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://your-domain.com/auth/google/callback
ALLOWED_EMAIL_DOMAINS=company.com

# 飞书 OAuth
FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_CALLBACK_URL=https://your-domain.com/auth/feishu/callback
```

---

## 相关文档

- [高可用部署](./ha-deployment.md)
- [监控与告警](../guides/监控与告警系统搭建.md)
- [企业微信集成](../guides/企业微信集成指南.md)
- [飞书深度集成](../feishu-integration/)
