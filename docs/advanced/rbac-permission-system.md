# 🔐 企业级 RBAC 权限系统

**适用场景**: 多用户、多团队的 AI 网关权限管控  
**预计时间**: 90 分钟  
**难度**: ⭐⭐⭐⭐⭐  
**前置**: OpenClaw 基础、Node.js + MySQL/PostgreSQL 基础

---

## 🎯 为什么需要 RBAC？

当你的 AI 网关从「个人工具」变成「团队基础设施」，权限问题随之而来：

| 问题场景 | 无权限控制 | RBAC 后 |
|---------|----------|--------|
| 财务小王不小心调用了 GPT-4o | 产生高额费用 | 财务角色只能用 mini 模型 |
| 实习生泄露了系统 Prompt | 安全事故 | 实习生无权查看 Prompt 配置 |
| 某用户无限制发请求 | 账单暴增 | 角色级别限流，每人有配额 |
| 审计时无法追溯操作 | 无法问责 | 全链路审计日志 |

**RBAC（Role-Based Access Control）** 的核心思想：
> 权限不直接分配给用户，而是分配给角色；用户通过角色获得权限。

---

## 🏗️ 设计方案

### 数据模型

```
用户（User） ──属于──▶ 角色（Role） ──拥有──▶ 权限（Permission）
                          │
                          └──属于──▶ 组织（Organization）
```

### 核心实体

| 实体 | 说明 |
|------|------|
| `Organization` | 组织/租户（多租户隔离） |
| `User` | 用户账号 |
| `Role` | 角色（admin/developer/analyst/viewer） |
| `Permission` | 权限节点（如 `model:gpt4o:use`） |
| `ApiKey` | 用户的 API Key，携带角色信息 |
| `Quota` | 配额设置（次数/Token/费用） |
| `AuditLog` | 审计日志 |

---

## 🗄️ Step 1：数据库 Schema

```sql
-- 组织（多租户支持）
CREATE TABLE organizations (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  name        VARCHAR(100) NOT NULL,
  plan        ENUM('free', 'pro', 'enterprise') DEFAULT 'free',
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- 用户
CREATE TABLE users (
  id           VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id       VARCHAR(36) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  name         VARCHAR(100),
  password     VARCHAR(255),  -- bcrypt hash
  status       ENUM('active', 'suspended', 'pending') DEFAULT 'pending',
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login   DATETIME,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  INDEX idx_email (email),
  INDEX idx_org (org_id)
);

-- 角色
CREATE TABLE roles (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  org_id      VARCHAR(36) NOT NULL,
  name        VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  is_system   BOOLEAN DEFAULT FALSE,  -- 系统内置角色不可删除
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  UNIQUE KEY uk_org_name (org_id, name)
);

-- 权限节点
CREATE TABLE permissions (
  id       VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  code     VARCHAR(100) NOT NULL UNIQUE,  -- e.g., "model:gpt4o:use"
  resource VARCHAR(50) NOT NULL,           -- e.g., "model"
  action   VARCHAR(50) NOT NULL,           -- e.g., "use"
  target   VARCHAR(50),                    -- e.g., "gpt-4o"
  description VARCHAR(255)
);

-- 角色-权限关联
CREATE TABLE role_permissions (
  role_id       VARCHAR(36) NOT NULL,
  permission_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- 用户-角色关联
CREATE TABLE user_roles (
  user_id VARCHAR(36) NOT NULL,
  role_id VARCHAR(36) NOT NULL,
  granted_by VARCHAR(36),   -- 谁授予的
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,       -- 可设置角色过期时间
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- API Key 表
CREATE TABLE api_keys (
  id          VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  user_id     VARCHAR(36) NOT NULL,
  org_id      VARCHAR(36) NOT NULL,
  key_hash    VARCHAR(64) NOT NULL UNIQUE,  -- SHA256(api_key)
  key_prefix  VARCHAR(12) NOT NULL,          -- 展示用前缀 e.g., "sk-abc123..."
  name        VARCHAR(100),
  status      ENUM('active', 'revoked') DEFAULT 'active',
  last_used   DATETIME,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  INDEX idx_hash (key_hash)
);

-- 配额设置
CREATE TABLE quotas (
  id              VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  target_type     ENUM('user', 'role', 'org') NOT NULL,
  target_id       VARCHAR(36) NOT NULL,
  period          ENUM('hourly', 'daily', 'monthly') DEFAULT 'daily',
  max_requests    INT,         -- NULL = unlimited
  max_tokens      BIGINT,
  max_cost_usd    DECIMAL(10,4),
  allowed_models  JSON,        -- ["gpt-4o-mini", "gemini-1.5-flash"]
  INDEX idx_target (target_type, target_id)
);

-- 使用量统计
CREATE TABLE usage_stats (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id       VARCHAR(36) NOT NULL,
  user_id      VARCHAR(36) NOT NULL,
  api_key_id   VARCHAR(36),
  model        VARCHAR(100),
  period_date  DATE NOT NULL,  -- 按日聚合
  period_hour  TINYINT,        -- 0-23，小时聚合用
  requests     INT DEFAULT 0,
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  cost_usd     DECIMAL(10,6) DEFAULT 0,
  INDEX idx_user_date (user_id, period_date),
  INDEX idx_org_date (org_id, period_date)
);

-- 审计日志（append-only）
CREATE TABLE audit_logs (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  org_id     VARCHAR(36),
  user_id    VARCHAR(36),
  api_key_id VARCHAR(36),
  action     VARCHAR(100) NOT NULL,   -- e.g., "chat.completion"
  resource   VARCHAR(100),            -- e.g., "model:gpt-4o"
  result     ENUM('allow', 'deny') NOT NULL,
  deny_reason VARCHAR(255),
  request_id VARCHAR(36),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  meta       JSON,                    -- 额外信息
  created_at DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_org_time (org_id, created_at),
  INDEX idx_user_time (user_id, created_at)
) ENGINE=InnoDB;
```

---

## 🌱 Step 2：预置权限节点 & 系统角色

```javascript
// seeds/permissions.js

const PERMISSION_CODES = {
  // 模型使用权限
  'model:gpt4o:use':              { resource: 'model', action: 'use', target: 'gpt-4o' },
  'model:gpt4o-mini:use':         { resource: 'model', action: 'use', target: 'gpt-4o-mini' },
  'model:claude-sonnet:use':      { resource: 'model', action: 'use', target: 'claude-3-5-sonnet-20241022' },
  'model:gemini-pro:use':         { resource: 'model', action: 'use', target: 'gemini-1.5-pro' },
  'model:gemini-flash:use':       { resource: 'model', action: 'use', target: 'gemini-1.5-flash' },
  'model:deepseek:use':           { resource: 'model', action: 'use', target: 'deepseek-chat' },
  'model:all:use':                { resource: 'model', action: 'use', target: '*' },

  // 管理权限
  'admin:users:read':             { resource: 'admin', action: 'read', target: 'users' },
  'admin:users:write':            { resource: 'admin', action: 'write', target: 'users' },
  'admin:roles:manage':           { resource: 'admin', action: 'manage', target: 'roles' },
  'admin:quotas:manage':          { resource: 'admin', action: 'manage', target: 'quotas' },
  'admin:apikeys:revoke':         { resource: 'admin', action: 'revoke', target: 'apikeys' },
  'admin:billing:read':           { resource: 'admin', action: 'read', target: 'billing' },

  // 审计权限
  'audit:logs:read':              { resource: 'audit', action: 'read', target: 'logs' },
  'audit:reports:export':         { resource: 'audit', action: 'export', target: 'reports' },

  // 配置权限
  'config:system_prompt:read':    { resource: 'config', action: 'read', target: 'system_prompt' },
  'config:system_prompt:write':   { resource: 'config', action: 'write', target: 'system_prompt' },
  'config:routing:manage':        { resource: 'config', action: 'manage', target: 'routing' },
};

// 系统内置角色（不可删除）
const SYSTEM_ROLES = {
  'super_admin': {
    description: '超级管理员：拥有所有权限',
    permissions: Object.keys(PERMISSION_CODES)
  },
  'admin': {
    description: '管理员：用户/角色/配额管理，不含计费',
    permissions: [
      'model:all:use',
      'admin:users:read', 'admin:users:write',
      'admin:roles:manage', 'admin:quotas:manage', 'admin:apikeys:revoke',
      'audit:logs:read', 'audit:reports:export',
      'config:system_prompt:read', 'config:system_prompt:write',
      'config:routing:manage'
    ]
  },
  'developer': {
    description: '开发者：使用所有模型，查看审计',
    permissions: [
      'model:all:use',
      'audit:logs:read',
      'config:system_prompt:read'
    ]
  },
  'analyst': {
    description: '数据分析师：使用经济型模型，只读审计',
    permissions: [
      'model:gpt4o-mini:use', 'model:gemini-flash:use', 'model:deepseek:use',
      'audit:logs:read'
    ]
  },
  'viewer': {
    description: '访客：仅使用最基础模型',
    permissions: ['model:gpt4o-mini:use']
  }
};

module.exports = { PERMISSION_CODES, SYSTEM_ROLES };
```

---

## ⚙️ Step 3：权限检查核心逻辑

```javascript
// auth/permission-checker.js

const db = require('../db');

// 缓存用户权限（Redis），避免每次请求都查数据库
const NodeCache = require('node-cache');
const permCache = new NodeCache({ stdTTL: 300 });  // 5分钟缓存

/**
 * 加载用户的全部权限（从角色聚合）
 */
async function loadUserPermissions(userId) {
  const cacheKey = `perm:${userId}`;
  const cached = permCache.get(cacheKey);
  if (cached) return cached;

  const [rows] = await db.query(`
    SELECT DISTINCT p.code, p.resource, p.action, p.target
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = ?
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  `, [userId]);

  const permissions = new Set(rows.map(r => r.code));
  const permissionDetails = rows;

  const result = { permissions, details: permissionDetails };
  permCache.set(cacheKey, result);
  return result;
}

/**
 * 检查用户是否有某个权限
 */
async function hasPermission(userId, permissionCode) {
  const { permissions } = await loadUserPermissions(userId);

  // 精确匹配
  if (permissions.has(permissionCode)) return true;

  // 通配符匹配：model:all:use 匹配所有 model:*:use
  const [resource, , action] = permissionCode.split(':');
  if (permissions.has(`${resource}:all:${action}`)) return true;

  return false;
}

/**
 * 检查用户是否可以使用某个模型
 */
async function canUseModel(userId, modelName) {
  // 模型名映射到权限码
  const MODEL_PERMISSION_MAP = {
    'gpt-4o':                      'model:gpt4o:use',
    'gpt-4o-mini':                  'model:gpt4o-mini:use',
    'claude-3-5-sonnet-20241022':   'model:claude-sonnet:use',
    'gemini-1.5-pro':               'model:gemini-pro:use',
    'gemini-1.5-flash':             'model:gemini-flash:use',
    'deepseek-chat':                'model:deepseek:use',
  };

  const permCode = MODEL_PERMISSION_MAP[modelName];
  if (!permCode) return false;

  return hasPermission(userId, permCode);
}

/**
 * 失效用户权限缓存（角色变更后调用）
 */
function invalidatePermissionCache(userId) {
  permCache.del(`perm:${userId}`);
}

module.exports = { loadUserPermissions, hasPermission, canUseModel, invalidatePermissionCache };
```

---

## 🛡️ Step 4：鉴权中间件

```javascript
// middleware/auth.js

const crypto = require('crypto');
const db = require('../db');
const { canUseModel, hasPermission } = require('../auth/permission-checker');

/**
 * 1. API Key 验证中间件
 */
async function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const rawKey = authHeader.slice(7);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const [rows] = await db.query(`
    SELECT k.id, k.user_id, k.org_id, k.status, k.expires_at,
           u.status as user_status, u.email
    FROM api_keys k
    JOIN users u ON k.user_id = u.id
    WHERE k.key_hash = ?
  `, [keyHash]);

  if (!rows.length) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const key = rows[0];

  if (key.status !== 'active') {
    return res.status(401).json({ error: 'API key has been revoked' });
  }
  if (key.user_status !== 'active') {
    return res.status(401).json({ error: 'User account is suspended' });
  }
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return res.status(401).json({ error: 'API key has expired' });
  }

  // 更新 last_used（异步，不阻塞请求）
  db.query('UPDATE api_keys SET last_used = NOW() WHERE id = ?', [key.id]).catch(() => {});

  req.auth = {
    userId: key.user_id,
    orgId: key.org_id,
    apiKeyId: key.id,
    email: key.email
  };

  next();
}

/**
 * 2. 模型使用权限检查中间件
 */
async function checkModelPermission(req, res, next) {
  const { userId, orgId, apiKeyId } = req.auth;
  const requestedModel = req.body?.model;

  if (!requestedModel) return next();

  const allowed = await canUseModel(userId, requestedModel);

  // 写审计日志（异步）
  logAudit({
    orgId,
    userId,
    apiKeyId,
    action: 'chat.completion',
    resource: `model:${requestedModel}`,
    result: allowed ? 'allow' : 'deny',
    denyReason: allowed ? null : `No permission for model: ${requestedModel}`,
    requestId: req.headers['x-request-id'],
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  if (!allowed) {
    return res.status(403).json({
      error: 'Permission denied',
      message: `Your role does not have access to model: ${requestedModel}`,
      allowed_models: await getAllowedModels(userId)
    });
  }

  next();
}

/**
 * 3. 配额检查中间件
 */
async function checkQuota(req, res, next) {
  const { userId, orgId } = req.auth;

  // 查询用户今日用量
  const [usageRows] = await db.query(`
    SELECT SUM(requests) as reqs, SUM(cost_usd) as cost
    FROM usage_stats
    WHERE user_id = ? AND period_date = CURDATE()
  `, [userId]);

  const usage = usageRows[0] || { reqs: 0, cost: 0 };

  // 查询配额限制
  const [quotaRows] = await db.query(`
    SELECT * FROM quotas
    WHERE target_type = 'user' AND target_id = ?
    ORDER BY period
    LIMIT 1
  `, [userId]);

  const quota = quotaRows[0];
  if (quota) {
    if (quota.max_requests && usage.reqs >= quota.max_requests) {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: `Daily request limit reached: ${usage.reqs}/${quota.max_requests}`,
        reset: 'Tomorrow 00:00'
      });
    }
    if (quota.max_cost_usd && usage.cost >= quota.max_cost_usd) {
      return res.status(429).json({
        error: 'Quota exceeded',
        message: `Daily cost limit reached: $${usage.cost}/$${quota.max_cost_usd}`
      });
    }
    if (quota.allowed_models && req.body?.model) {
      const allowed = JSON.parse(quota.allowed_models || '[]');
      if (allowed.length && !allowed.includes(req.body.model)) {
        return res.status(403).json({
          error: 'Model not in quota plan',
          allowed_models: allowed
        });
      }
    }
  }

  next();
}

/**
 * 获取用户可用的模型列表（用于错误提示）
 */
async function getAllowedModels(userId) {
  const MODEL_PERMISSIONS = {
    'gpt-4o': 'model:gpt4o:use',
    'gpt-4o-mini': 'model:gpt4o-mini:use',
    'claude-3-5-sonnet-20241022': 'model:claude-sonnet:use',
    'gemini-1.5-pro': 'model:gemini-pro:use',
    'gemini-1.5-flash': 'model:gemini-flash:use',
    'deepseek-chat': 'model:deepseek:use'
  };

  const allowed = [];
  for (const [model, perm] of Object.entries(MODEL_PERMISSIONS)) {
    if (await hasPermission(userId, perm)) allowed.push(model);
    // wildcard: model:all:use
    if (await hasPermission(userId, 'model:all:use')) {
      return Object.keys(MODEL_PERMISSIONS);
    }
  }
  return allowed;
}

/**
 * 审计日志写入（异步，不阻塞业务）
 */
async function logAudit(data) {
  try {
    await db.query(`
      INSERT INTO audit_logs (org_id, user_id, api_key_id, action, resource, result, deny_reason, request_id, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [data.orgId, data.userId, data.apiKeyId, data.action, data.resource,
        data.result, data.denyReason, data.requestId, data.ipAddress, data.userAgent]);
  } catch (e) {
    console.error('[AuditLog] Failed to write:', e.message);
  }
}

module.exports = { authenticateApiKey, checkModelPermission, checkQuota };
```

---

## 🔌 Step 5：挂载中间件

```javascript
// app.js

const express = require('express');
const { authenticateApiKey, checkModelPermission, checkQuota } = require('./middleware/auth');
const { smartProxy } = require('./gateway/smart-proxy');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ===== AI 网关核心路由 =====
app.post(
  '/v1/chat/completions',
  authenticateApiKey,       // 1. 验证 API Key
  checkModelPermission,     // 2. 检查模型权限
  checkQuota,               // 3. 检查配额
  smartProxy                // 4. 路由并转发
);

// ===== 管理 API =====

// 创建/管理用户（需要 admin 权限）
app.use('/admin', authenticateApiKey, requirePermission('admin:users:read'));
app.get('/admin/users', listUsers);
app.post('/admin/users', requirePermission('admin:users:write'), createUser);
app.put('/admin/users/:id/roles', requirePermission('admin:roles:manage'), updateUserRoles);
app.put('/admin/users/:id/suspend', requirePermission('admin:users:write'), suspendUser);

// 配额管理
app.put('/admin/quotas', requirePermission('admin:quotas:manage'), updateQuota);

// 审计日志
app.get('/admin/audit', requirePermission('audit:logs:read'), getAuditLogs);
app.get('/admin/audit/export', requirePermission('audit:reports:export'), exportAuditReport);

// 模型使用统计
app.get('/admin/stats', requirePermission('admin:billing:read'), getUsageStats);

function requirePermission(permCode) {
  return async (req, res, next) => {
    const { hasPermission } = require('./auth/permission-checker');
    const allowed = await hasPermission(req.auth.userId, permCode);
    if (!allowed) return res.status(403).json({ error: `Required permission: ${permCode}` });
    next();
  };
}

app.listen(3000, () => console.log('🔐 RBAC-protected OpenClaw gateway running on :3000'));
```

---

## 📊 Step 6：用量统计（异步更新）

```javascript
// analytics/usage-tracker.js

const db = require('../db');

/**
 * 在 AI 响应完成后调用此函数记录用量
 */
async function trackUsage({ orgId, userId, apiKeyId, model, inputTokens, outputTokens, costUsd }) {
  const today = new Date().toISOString().split('T')[0];  // YYYY-MM-DD
  const hour = new Date().getHours();

  // UPSERT（当天已有记录则累加）
  await db.query(`
    INSERT INTO usage_stats (org_id, user_id, api_key_id, model, period_date, period_hour, requests, input_tokens, output_tokens, cost_usd)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      requests = requests + 1,
      input_tokens = input_tokens + VALUES(input_tokens),
      output_tokens = output_tokens + VALUES(output_tokens),
      cost_usd = cost_usd + VALUES(cost_usd)
  `, [orgId, userId, apiKeyId, model, today, hour, inputTokens, outputTokens, costUsd]);
}

/**
 * 查询用户用量（管理接口）
 */
async function getUserUsage(userId, days = 30) {
  const [rows] = await db.query(`
    SELECT period_date, model, SUM(requests) as requests,
           SUM(input_tokens) as input_tokens, SUM(output_tokens) as output_tokens,
           SUM(cost_usd) as cost_usd
    FROM usage_stats
    WHERE user_id = ? AND period_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY period_date, model
    ORDER BY period_date DESC, cost_usd DESC
  `, [userId, days]);

  return rows;
}

module.exports = { trackUsage, getUserUsage };
```

---

## 🛠️ Step 7：管理 CLI 工具

```javascript
#!/usr/bin/env node
// scripts/rbac-cli.js
// 用法：node scripts/rbac-cli.js <command> [args...]

const db = require('../db');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { invalidatePermissionCache } = require('../auth/permission-checker');

const [,, command, ...args] = process.argv;

const commands = {

  // 创建用户
  async 'create-user'([email, name, role = 'viewer', orgId]) {
    if (!email || !orgId) return console.error('Usage: create-user <email> <name> <role> <orgId>');
    const userId = crypto.randomUUID();
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const hash = await bcrypt.hash(tempPassword, 12);

    await db.query(
      'INSERT INTO users (id, org_id, email, name, password, status) VALUES (?, ?, ?, ?, ?, "active")',
      [userId, orgId, email, name, hash]
    );

    // 分配角色
    const [roleRows] = await db.query('SELECT id FROM roles WHERE name = ? AND org_id = ?', [role, orgId]);
    if (roleRows.length) {
      await db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleRows[0].id]);
    }

    console.log(`✅ User created: ${email}`);
    console.log(`   Temp password: ${tempPassword}`);
    console.log(`   Role: ${role}`);
  },

  // 生成 API Key
  async 'create-apikey'([userId, name]) {
    if (!userId) return console.error('Usage: create-apikey <userId> [name]');
    const raw = 'sk-' + crypto.randomBytes(24).toString('base64url');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const prefix = raw.substring(0, 12) + '...';

    const [userRows] = await db.query('SELECT org_id FROM users WHERE id = ?', [userId]);
    if (!userRows.length) return console.error('User not found');

    await db.query(
      'INSERT INTO api_keys (user_id, org_id, key_hash, key_prefix, name) VALUES (?, ?, ?, ?, ?)',
      [userId, userRows[0].org_id, hash, prefix, name || 'Default']
    );

    console.log(`✅ API Key created (shown once, save it now):`);
    console.log(`   ${raw}`);
  },

  // 修改用户角色
  async 'set-role'([userId, roleName, orgId]) {
    if (!userId || !roleName) return console.error('Usage: set-role <userId> <roleName> <orgId>');
    const [roleRows] = await db.query('SELECT id FROM roles WHERE name = ? AND org_id = ?', [roleName, orgId]);
    if (!roleRows.length) return console.error(`Role "${roleName}" not found`);

    await db.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
    await db.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [userId, roleRows[0].id]);
    invalidatePermissionCache(userId);

    console.log(`✅ User ${userId} now has role: ${roleName}`);
  },

  // 查询用户权限
  async 'show-perms'([userId]) {
    if (!userId) return console.error('Usage: show-perms <userId>');
    const [rows] = await db.query(`
      SELECT r.name as role, p.code as permission
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = ?
      ORDER BY r.name, p.code
    `, [userId]);

    if (!rows.length) return console.log('No permissions found for this user');

    let currentRole = '';
    for (const row of rows) {
      if (row.role !== currentRole) {
        console.log(`\n📦 Role: ${row.role}`);
        currentRole = row.role;
      }
      console.log(`   ✓ ${row.permission}`);
    }
  }
};

if (commands[command]) {
  commands[command](args).then(() => process.exit(0)).catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
} else {
  console.log('Available commands:');
  Object.keys(commands).forEach(c => console.log(`  node scripts/rbac-cli.js ${c}`));
}
```

---

## 🧪 测试用例

```javascript
// tests/rbac.test.js

describe('RBAC 权限测试', () => {

  test('viewer 角色只能使用 gpt-4o-mini', async () => {
    const viewerUserId = 'test-viewer-id';
    expect(await canUseModel(viewerUserId, 'gpt-4o-mini')).toBe(true);
    expect(await canUseModel(viewerUserId, 'gpt-4o')).toBe(false);
    expect(await canUseModel(viewerUserId, 'claude-3-5-sonnet-20241022')).toBe(false);
  });

  test('developer 角色可以使用所有模型', async () => {
    const devUserId = 'test-developer-id';
    for (const model of ['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet-20241022', 'gemini-1.5-pro']) {
      expect(await canUseModel(devUserId, model)).toBe(true);
    }
  });

  test('超出配额返回 429', async () => {
    // 模拟今日已用 1000 次，配额为 1000
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer sk-quota-exceeded-test-key')
      .send({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'test' }] });

    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Quota exceeded');
  });

  test('无效 API Key 返回 401', async () => {
    const response = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer sk-invalid-key-xxx')
      .send({ model: 'gpt-4o-mini', messages: [] });

    expect(response.status).toBe(401);
  });

  test('角色变更后权限缓存自动刷新', async () => {
    const userId = 'test-user-cache';
    // 第一次加载（viewer 权限）
    await loadUserPermissions(userId);
    // 切换为 developer
    await setRole(userId, 'developer');
    invalidatePermissionCache(userId);
    // 重新加载
    const { permissions } = await loadUserPermissions(userId);
    expect(permissions.has('model:all:use')).toBe(true);
  });
});
```

---

## 📋 运维速查

```bash
# 创建组织和管理员
node scripts/rbac-cli.js create-org "Acme Corp" enterprise
node scripts/rbac-cli.js create-user admin@acme.com "系统管理员" super_admin <orgId>

# 批量创建团队成员
node scripts/rbac-cli.js create-user alice@acme.com "Alice" developer <orgId>
node scripts/rbac-cli.js create-user bob@acme.com "Bob" analyst <orgId>
node scripts/rbac-cli.js create-user intern@acme.com "实习生" viewer <orgId>

# 查看某用户权限
node scripts/rbac-cli.js show-perms <userId>

# 临时提升权限（指定过期时间）
# UPDATE user_roles SET expires_at = DATE_ADD(NOW(), INTERVAL 1 DAY) WHERE user_id = ...

# 撤销 API Key
UPDATE api_keys SET status = 'revoked' WHERE key_prefix = 'sk-abc123...';

# 查询审计日志（谁在什么时间用了什么模型）
SELECT u.email, a.action, a.resource, a.result, a.created_at
FROM audit_logs a JOIN users u ON a.user_id = u.id
WHERE a.org_id = '<orgId>'
  AND a.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY a.created_at DESC
LIMIT 100;
```

---

## 📚 相关文档

- [高可用部署](ha-deployment.md) — 多节点部署 RBAC 服务
- [监控与告警](../guides/监控与告警系统搭建.md) — 监控鉴权失败率
- [OpenTelemetry 追踪](opentelemetry.md) — 追踪权限检查链路
- [故障排查 Runbook](../guides/故障排查Runbook.md) — 鉴权失败排查步骤
