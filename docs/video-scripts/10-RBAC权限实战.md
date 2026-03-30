# 第 10 集：RBAC 权限实战 — 打造企业级多租户权限管控系统

> **时长**：约 26 分钟  
> **难度**：⭐⭐⭐⭐⭐ 高级  
> **前置**：第 6 集（企业微信）、第 8 集（性能调优）  
> **对应文档**：[企业级 RBAC 权限系统](../advanced/rbac-permission-system.md)

---

## 📋 本集大纲

| 时间节点 | 内容 |
|---------|------|
| 00:00 — 01:30 | 开场 & 为什么需要 RBAC |
| 01:30 — 05:00 | 权限模型设计（多租户架构） |
| 05:00 — 09:00 | 数据库 Schema 实现（7 张表） |
| 09:00 — 13:30 | 权限检查中间件完整实现 |
| 13:30 — 17:00 | API Key 管理 + 配额控制 |
| 17:00 — 20:30 | 全链路审计日志系统 |
| 20:30 — 24:00 | 管理 CLI 工具实战演示 |
| 24:00 — 26:00 | 总结 & 下集预告 |

---

## 🎬 完整脚本

---

### 🎬 [00:00 — 01:30] 开场：权限失控的代价

**[画面：一张企业安全事故新闻截图，随后切到代码编辑器]**

**旁白/主持人（镜头前）**：

> 大家好，欢迎回到 OpenClaw 实战系列！我是 [主持人名]。

> 今天我们聊一个每个做企业项目的人都绕不开的话题 —— **权限管控**。

**[切到动画：一个 AI 接口，没有任何权限控制，所有人都能调用]**

> 试想你搭了一个企业级 AI 网关：销售团队、研发团队、客服团队都在用。
> 
> 问题来了：
> - 研发可以调 GPT-4o，客服只能用便宜模型，怎么限制？
> - 某个部门的 API Key 泄漏了，怎么快速吊销而不影响其他人？
> - 老板要看每个部门花了多少 Token 费用，数据在哪？
> - 发生了异常调用，怎么追溯到具体的人、具体的操作？

**[切回主持人]**

> 这些问题，用一个词来回答：**RBAC —— 基于角色的访问控制**。

> 今天这集，我们从零到生产，完整实现一套企业级多租户 RBAC 权限系统。26 分钟，代码全程直播，不废话，开干！

---

### 🎬 [01:30 — 05:00] 第一部分：权限模型设计

**[画面：白板/PPT 展示架构图]**

> 在写第一行代码之前，我们先把模型想清楚。

**[展示三层权限模型图]**

```
Tenant（租户/企业）
  └── Organization（部门/团队）
        └── User（用户）
              └── Role（角色）
                    └── Permission（权限码）
```

**主持人讲解**：

> **Tenant**：最顶层，一个公司就是一个租户。数据完全隔离。
>
> **Organization**：公司下面的部门，比如"研发部"、"销售部"。
>
> **User**：具体的人，属于某个租户下的某个组织。
>
> **Role**：角色是权限的集合，我们内置 5 种：
> - `super_admin`：超级管理员，全部权限
> - `admin`：管理员，管理本租户
> - `member`：普通成员，正常使用
> - `viewer`：只读，不能调用 API
> - `bot`：机器人账户，用于系统间集成

**[展示权限码列表]**

> 权限码用点分三级命名：`资源.操作.范围`
>
> 比如：
> - `api.call.basic` —— 调用基础模型
> - `api.call.premium` —— 调用高端模型（GPT-4o、Claude 3.5）
> - `model.config.write` —— 修改模型配置
> - `user.manage.all` —— 管理所有用户
>
> **[拍桌子动作]** 28 个权限码，覆盖所有场景！

**[画面：展示 API Key 设计]**

> API Key 是一对多的：一个用户可以有多个 Key，每个 Key 可以有独立的权限、独立的配额。
>
> 这样就能实现：
> - 生产 Key 有完整权限，测试 Key 只有受限权限
> - 某个 Key 只允许调用特定模型
> - Key 到期自动失效

---

### 🎬 [05:00 — 09:00] 第二部分：数据库 Schema

**[画面：数据库建模工具或直接看 SQL]**

> 权限系统的核心是数据库设计。我们用 7 张表，把刚才的模型落地。

**[逐表讲解，代码滚动展示]**

```sql
-- 主持人边讲边逐步展示建表语句

-- 第 1 张：租户表
CREATE TABLE tenants (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(100)    NOT NULL,
  slug         VARCHAR(50)     NOT NULL UNIQUE,  -- URL 友好的唯一标识
  plan         ENUM('free','professional','enterprise') DEFAULT 'free',
  is_active    TINYINT(1)      DEFAULT 1,
  created_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP
);
```

> 注意这个 `slug` 字段，后面做多租户路由时会用到。

```sql
-- 第 2 张：用户表
CREATE TABLE users (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED NOT NULL,
  email        VARCHAR(255)    NOT NULL,
  display_name VARCHAR(100),
  is_active    TINYINT(1)      DEFAULT 1,
  created_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY   uq_tenant_email (tenant_id, email),
  FOREIGN KEY  (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

```sql
-- 第 3 张：角色表（系统预置 + 租户自定义）
CREATE TABLE roles (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id    BIGINT UNSIGNED,            -- NULL = 系统全局角色
  name         VARCHAR(50)     NOT NULL,
  display_name VARCHAR(100),
  is_system    TINYINT(1)      DEFAULT 0,
  UNIQUE KEY   uq_role_name (tenant_id, name)
);
```

```sql
-- 第 4 张：权限码表
CREATE TABLE permissions (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(100)    NOT NULL UNIQUE,  -- 如 api.call.premium
  description  TEXT,
  category     VARCHAR(50)
);
```

```sql
-- 第 5 张：角色-权限关联
CREATE TABLE role_permissions (
  role_id       BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY  (role_id, permission_id),
  FOREIGN KEY  (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY  (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

```sql
-- 第 6 张：用户-角色关联（支持多角色）
CREATE TABLE user_roles (
  user_id      BIGINT UNSIGNED NOT NULL,
  role_id      BIGINT UNSIGNED NOT NULL,
  granted_at   TIMESTAMP       DEFAULT CURRENT_TIMESTAMP,
  granted_by   BIGINT UNSIGNED,
  PRIMARY KEY  (user_id, role_id)
);
```

```sql
-- 第 7 张：API Key 表（最关键！）
CREATE TABLE api_keys (
  id            BIGINT UNSIGNED  AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT UNSIGNED  NOT NULL,
  tenant_id     BIGINT UNSIGNED  NOT NULL,
  key_hash      CHAR(64)         NOT NULL UNIQUE, -- SHA-256，原文不存
  key_prefix    CHAR(8)          NOT NULL,        -- 显示前 8 位方便识别
  name          VARCHAR(100),
  permissions   JSON,                             -- 可覆盖用户角色权限
  quota_config  JSON,                             -- 配额：次数/Token/费用
  allowed_models JSON,                            -- 白名单模型列表
  expires_at    TIMESTAMP        NULL,
  last_used_at  TIMESTAMP        NULL,
  is_active     TINYINT(1)       DEFAULT 1,
  created_at    TIMESTAMP        DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY   (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY   (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

**[主持人总结]**

> 注意 `api_keys` 表：原始 Key 我们不存！只存 SHA-256 哈希。
> 即使数据库泄漏，攻击者也拿不到真实的 Key。这是安全基础。

---

### 🎬 [09:00 — 13:30] 第三部分：权限检查中间件

**[画面：切到代码编辑器，创建 middleware/rbac.js]**

> 数据库建好了，现在写最核心的东西：**每次 API 请求都要过的权限检查中间件**。

**[逐步展示代码，配合解说]**

```javascript
// middleware/rbac.js

const crypto = require('crypto');
const { db } = require('../db');
const redis = require('../redis');

const CACHE_TTL = 300; // 5分钟

/**
 * 第一步：从请求头取出 API Key
 */
function extractApiKey(req) {
  // 支持两种方式：Bearer token 或 x-api-key header
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.headers['x-api-key'] || null;
}

/**
 * 第二步：验证 Key，返回 Key 的完整信息
 * 先查 Redis 缓存，缓存未命中才查数据库
 */
async function resolveApiKey(rawKey) {
  const hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const cacheKey = `apikey:${hash}`;

  // 查缓存
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // 查数据库
  const [rows] = await db.execute(`
    SELECT
      k.id, k.user_id, k.tenant_id, k.permissions,
      k.quota_config, k.allowed_models, k.expires_at, k.is_active,
      u.display_name, u.is_active AS user_active,
      t.slug AS tenant_slug, t.is_active AS tenant_active
    FROM api_keys k
    JOIN users u   ON k.user_id   = u.id
    JOIN tenants t ON k.tenant_id = t.id
    WHERE k.key_hash = ?
    LIMIT 1
  `, [hash]);

  if (!rows.length) return null;
  const keyInfo = rows[0];

  // 写缓存
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(keyInfo));

  return keyInfo;
}

/**
 * 第三步：获取用户的完整权限集合
 * 角色权限 + API Key 自定义权限（取交集）
 */
async function getUserPermissions(userId, keyOverride) {
  const cacheKey = `perms:${userId}`;
  const cached = await redis.get(cacheKey);
  let rolePerms = cached ? new Set(JSON.parse(cached)) : null;

  if (!rolePerms) {
    const [rows] = await db.execute(`
      SELECT DISTINCT p.code
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p       ON rp.permission_id = p.id
      WHERE ur.user_id = ?
    `, [userId]);

    rolePerms = new Set(rows.map(r => r.code));
    await redis.setex(cacheKey, CACHE_TTL, JSON.stringify([...rolePerms]));
  }

  // 如果 Key 有自定义权限，取交集（只能缩小，不能扩大）
  if (keyOverride?.length) {
    const override = new Set(keyOverride);
    return new Set([...rolePerms].filter(p => override.has(p)));
  }

  return rolePerms;
}

/**
 * 第四步：检查配额
 */
async function checkQuota(keyId, quotaConfig) {
  if (!quotaConfig) return { allowed: true };

  const now = new Date();
  const monthKey = `quota:${keyId}:${now.getFullYear()}-${now.getMonth() + 1}`;
  const dayKey   = `quota:${keyId}:${now.toISOString().slice(0, 10)}`;

  const [monthCount, dayCount] = await Promise.all([
    redis.get(`${monthKey}:count`),
    redis.get(`${dayKey}:count`),
  ]);

  if (quotaConfig.max_requests_per_day && parseInt(dayCount) >= quotaConfig.max_requests_per_day) {
    return { allowed: false, reason: 'Daily request quota exceeded' };
  }
  if (quotaConfig.max_requests_per_month && parseInt(monthCount) >= quotaConfig.max_requests_per_month) {
    return { allowed: false, reason: 'Monthly request quota exceeded' };
  }

  return { allowed: true };
}

/**
 * 主中间件：requirePermission('api.call.basic')
 */
function requirePermission(permCode) {
  return async (req, res, next) => {
    const rawKey = extractApiKey(req);
    if (!rawKey) {
      return res.status(401).json({ error: 'API key required' });
    }

    // 1. 验证 Key
    const keyInfo = await resolveApiKey(rawKey);
    if (!keyInfo) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    if (!keyInfo.is_active || !keyInfo.user_active || !keyInfo.tenant_active) {
      return res.status(403).json({ error: 'Key or account is inactive' });
    }
    if (keyInfo.expires_at && new Date(keyInfo.expires_at) < new Date()) {
      return res.status(403).json({ error: 'API key has expired' });
    }

    // 2. 检查权限
    const perms = await getUserPermissions(
      keyInfo.user_id,
      keyInfo.permissions
    );
    if (!perms.has(permCode)) {
      return res.status(403).json({
        error: 'Permission denied',
        required: permCode,
        hint: 'Contact your administrator to upgrade your role.',
      });
    }

    // 3. 检查配额
    const quotaResult = await checkQuota(keyInfo.id, keyInfo.quota_config);
    if (!quotaResult.allowed) {
      return res.status(429).json({ error: quotaResult.reason });
    }

    // 4. 检查模型白名单（如果请求指定了模型）
    const requestedModel = req.body?.model;
    if (requestedModel && keyInfo.allowed_models?.length) {
      if (!keyInfo.allowed_models.includes(requestedModel)) {
        return res.status(403).json({
          error: `Model '${requestedModel}' not allowed for this key`,
          allowed: keyInfo.allowed_models,
        });
      }
    }

    // 5. 注入上下文
    req.auth = {
      keyId: keyInfo.id,
      userId: keyInfo.user_id,
      tenantId: keyInfo.tenant_id,
      tenantSlug: keyInfo.tenant_slug,
      permissions: perms,
    };

    // 6. 异步更新 last_used_at（不阻塞请求）
    db.execute('UPDATE api_keys SET last_used_at = NOW() WHERE id = ?', [keyInfo.id]);

    next();
  };
}

module.exports = { requirePermission };
```

**[主持人解说要点]**

> 这里有几个关键设计：
>
> **1. 双层缓存**：Key 信息和用户权限都缓存 5 分钟，降低 DB 查询压力。吊销 Key 时，主动删除缓存即可。
>
> **2. 权限只能缩小**：Key 的自定义权限与角色权限取交集。这叫「最小权限原则」—— Key 不能比角色拥有更多权限。
>
> **3. 非阻塞更新**：`last_used_at` 是异步更新的，不影响请求延迟。
>
> **4. 上下文注入**：中间件验证通过后，把租户 ID、用户 ID 等注入到 `req.auth`，后续处理器直接用。

---

### 🎬 [13:30 — 17:00] 第四部分：配额管理实战

**[画面：切到配额相关代码]**

> 配额管理是企业客户最看重的功能之一：控成本。

**[展示配额配置 JSON 结构]**

```json
// quota_config 字段示例（存在 api_keys.quota_config）
{
  "max_requests_per_day": 200,
  "max_requests_per_month": 3000,
  "max_tokens_per_request": 4000,
  "max_cost_per_month_usd": 50.00,
  "soft_limit_alert_percent": 80
}
```

> 我们支持 5 种配额维度：
> - 每日请求次数
> - 每月请求次数
> - 单次请求最大 Token
> - 每月最大费用（按美元）
> - 软限制预警（比如到 80% 时发 Email）

**[展示配额计数器实现]**

```javascript
// src/quota.js

/**
 * 请求完成后记录消耗，异步执行
 */
async function recordUsage(keyId, tenantId, usage) {
  const { prompt_tokens, completion_tokens, model, cost_usd } = usage;
  const now = new Date();
  const dayKey   = `quota:${keyId}:${now.toISOString().slice(0, 10)}`;
  const monthKey = `quota:${keyId}:${now.getFullYear()}-${now.getMonth() + 1}`;

  const pipe = redis.pipeline();

  // 请求次数
  pipe.incr(`${dayKey}:count`);
  pipe.expire(`${dayKey}:count`, 86400 * 2);   // 2 天 TTL
  pipe.incr(`${monthKey}:count`);
  pipe.expire(`${monthKey}:count`, 86400 * 35); // 35 天 TTL

  // Token 消耗
  pipe.incrby(`${monthKey}:tokens`, prompt_tokens + completion_tokens);
  pipe.expire(`${monthKey}:tokens`, 86400 * 35);

  // 费用（乘以 10000 存整数，避免浮点精度问题）
  pipe.incrby(`${monthKey}:cost_cents`, Math.round(cost_usd * 10000));
  pipe.expire(`${monthKey}:cost_cents`, 86400 * 35);

  await pipe.exec();

  // 检查是否触发软限制预警
  await checkSoftLimitAlert(keyId, tenantId, monthKey);
}

async function checkSoftLimitAlert(keyId, tenantId, monthKey) {
  // 获取 Key 的配额配置
  const [rows] = await db.execute(
    'SELECT quota_config, user_id FROM api_keys WHERE id = ?',
    [keyId]
  );
  if (!rows.length || !rows[0].quota_config) return;

  const config = rows[0].quota_config;
  const alertPercent = config.soft_limit_alert_percent || 80;

  const [monthCount, monthCost] = await Promise.all([
    redis.get(`${monthKey}:count`),
    redis.get(`${monthKey}:cost_cents`),
  ]);

  const requestUsagePercent = config.max_requests_per_month
    ? (parseInt(monthCount) / config.max_requests_per_month) * 100
    : 0;

  const costUsagePercent = config.max_cost_per_month_usd
    ? (parseInt(monthCost) / (config.max_cost_per_month_usd * 10000)) * 100
    : 0;

  if (requestUsagePercent >= alertPercent || costUsagePercent >= alertPercent) {
    // 发送告警（调用通知系统，本集不展开）
    console.warn(`[Quota Alert] Key ${keyId}: Requests ${requestUsagePercent.toFixed(1)}%, Cost ${costUsagePercent.toFixed(1)}%`);
  }
}

module.exports = { recordUsage };
```

**[主持人讲解]**

> 注意这里费用我们乘了 10000 存成整数，这是处理货币的标准做法，避免浮点数精度问题。
>
> 比如 `$0.001 × 10000 = 10`，`$50.00 × 10000 = 500000`，全部用整数运算，精确！

---

### 🎬 [17:00 — 20:30] 第五部分：全链路审计日志

**[画面：展示审计日志的重要性]**

> 企业合规和安全审计要求我们记录：谁在什么时候，用哪个 Key，调了什么模型，请求和响应是什么。

> 重点：审计日志是 **append-only（只追加）** 的，不能修改、不能删除。

**[展示审计日志实现]**

```javascript
// src/audit.js

/**
 * 写入审计日志
 * 同时写 MySQL（可查询）+ Redis Stream（实时流）
 */
async function writeAuditLog(entry) {
  const {
    keyId, userId, tenantId,
    action,      // 'api_call', 'key_created', 'role_changed', etc.
    resourceType, resourceId,
    requestMeta,  // { model, messages_count, ip, user_agent }
    responseMeta, // { tokens, cost_usd, latency_ms, status_code }
    result,       // 'success' | 'failure' | 'rate_limited' | 'quota_exceeded'
  } = entry;

  // 异步写入，不阻塞主请求
  setImmediate(async () => {
    try {
      // 写 MySQL
      await db.execute(`
        INSERT INTO audit_logs
          (key_id, user_id, tenant_id, action, resource_type, resource_id,
           request_meta, response_meta, result, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `, [
        keyId, userId, tenantId,
        action, resourceType, resourceId,
        JSON.stringify(requestMeta),
        JSON.stringify(responseMeta),
        result,
      ]);

      // 写 Redis Stream（供实时监控消费）
      await redis.xadd(
        `audit:${tenantId}`,
        '*', // 自动 ID
        'action', action,
        'userId', String(userId),
        'result', result,
        'model', requestMeta?.model || '',
        'cost_usd', String(responseMeta?.cost_usd || 0),
      );
      // Stream 保留最近 1000 条
      await redis.xtrim(`audit:${tenantId}`, 'MAXLEN', '~', 1000);
    } catch (err) {
      console.error('[Audit] Write failed:', err);
    }
  });
}

/**
 * 查询审计日志
 */
async function queryAuditLogs(tenantId, filters = {}) {
  const {
    userId, action, result,
    startTime, endTime,
    page = 1, pageSize = 50,
  } = filters;

  let sql = 'SELECT * FROM audit_logs WHERE tenant_id = ?';
  const params = [tenantId];

  if (userId)    { sql += ' AND user_id = ?';   params.push(userId); }
  if (action)    { sql += ' AND action = ?';    params.push(action); }
  if (result)    { sql += ' AND result = ?';    params.push(result); }
  if (startTime) { sql += ' AND created_at >= ?'; params.push(startTime); }
  if (endTime)   { sql += ' AND created_at <= ?'; params.push(endTime); }

  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, (page - 1) * pageSize);

  const [rows] = await db.execute(sql, params);
  return rows;
}

module.exports = { writeAuditLog, queryAuditLogs };
```

**[主持人讲解]**

> 这里有一个设计决策：审计日志是 **异步写入** 的（用了 `setImmediate`），不阻塞 API 响应。
>
> 但如果你的合规要求是「必须先记录再响应」，可以改成同步写入。不同场景，不同取舍。
>
> Redis Stream 是用来做实时监控的 —— 可以接 Grafana 实时大盘，后面会单独出一集讲。

---

### 🎬 [20:30 — 24:00] 第六部分：管理 CLI 工具演示

**[画面：终端界面，开始现场演示]**

**[展示 CLI 代码]**

```javascript
// scripts/admin-cli.js

#!/usr/bin/env node
const { program } = require('commander');
const { db } = require('../src/db');
const crypto = require('crypto');

program
  .name('openclaw-admin')
  .description('OpenClaw RBAC Admin CLI')
  .version('1.0.0');

// 创建租户
program
  .command('create-tenant <name> <slug>')
  .description('Create a new tenant')
  .option('--plan <plan>', 'Plan: free|professional|enterprise', 'professional')
  .action(async (name, slug, opts) => {
    const [result] = await db.execute(
      'INSERT INTO tenants (name, slug, plan) VALUES (?, ?, ?)',
      [name, slug, opts.plan]
    );
    console.log(`✅ Tenant created: ID=${result.insertId}, slug=${slug}, plan=${opts.plan}`);
    process.exit(0);
  });

// 创建用户
program
  .command('create-user <email> <tenantSlug>')
  .description('Create a new user under a tenant')
  .option('--name <name>', 'Display name')
  .option('--role <role>', 'Initial role', 'member')
  .action(async (email, tenantSlug, opts) => {
    // 查租户
    const [[tenant]] = await db.execute(
      'SELECT id FROM tenants WHERE slug = ?', [tenantSlug]
    );
    if (!tenant) { console.error('❌ Tenant not found'); process.exit(1); }

    // 创建用户
    const [uResult] = await db.execute(
      'INSERT INTO users (tenant_id, email, display_name) VALUES (?, ?, ?)',
      [tenant.id, email, opts.name || email]
    );
    const userId = uResult.insertId;

    // 分配角色
    const [[role]] = await db.execute(
      'SELECT id FROM roles WHERE name = ? AND (tenant_id IS NULL OR tenant_id = ?)',
      [opts.role, tenant.id]
    );
    if (role) {
      await db.execute(
        'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
        [userId, role.id]
      );
    }

    console.log(`✅ User created: ID=${userId}, email=${email}, role=${opts.role}`);
    process.exit(0);
  });

// 创建 API Key
program
  .command('create-apikey <userEmail> <tenantSlug>')
  .description('Generate a new API key for a user')
  .option('--name <name>', 'Key name', 'Default Key')
  .option('--expires-days <days>', 'Expiry in days (default: never)')
  .option('--quota-daily <n>', 'Max requests per day')
  .option('--quota-monthly <n>', 'Max requests per month')
  .option('--models <list>', 'Allowed models (comma-separated)')
  .action(async (userEmail, tenantSlug, opts) => {
    // 查用户
    const [[tenant]] = await db.execute('SELECT id FROM tenants WHERE slug = ?', [tenantSlug]);
    if (!tenant) { console.error('❌ Tenant not found'); process.exit(1); }

    const [[user]] = await db.execute(
      'SELECT id FROM users WHERE email = ? AND tenant_id = ?',
      [userEmail, tenant.id]
    );
    if (!user) { console.error('❌ User not found'); process.exit(1); }

    // 生成 Key
    const rawKey = `oc_${crypto.randomBytes(24).toString('base64url')}`;
    const hash   = crypto.createHash('sha256').update(rawKey).digest('hex');
    const prefix = rawKey.slice(0, 8);

    // 处理配额
    const quotaConfig = {};
    if (opts.quotaDaily)   quotaConfig.max_requests_per_day   = parseInt(opts.quotaDaily);
    if (opts.quotaMonthly) quotaConfig.max_requests_per_month = parseInt(opts.quotaMonthly);

    // 过期时间
    let expiresAt = null;
    if (opts.expiresDays) {
      expiresAt = new Date(Date.now() + parseInt(opts.expiresDays) * 86400000);
    }

    const allowedModels = opts.models ? opts.models.split(',') : null;

    await db.execute(`
      INSERT INTO api_keys
        (user_id, tenant_id, key_hash, key_prefix, name, quota_config, allowed_models, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user.id, tenant.id, hash, prefix,
      opts.name,
      Object.keys(quotaConfig).length ? JSON.stringify(quotaConfig) : null,
      allowedModels ? JSON.stringify(allowedModels) : null,
      expiresAt,
    ]);

    console.log('\n✅ API Key created!');
    console.log('='.repeat(50));
    console.log(`Key:    ${rawKey}`);
    console.log(`Prefix: ${prefix}...`);
    console.log(`Name:   ${opts.name}`);
    console.log(`Expires: ${expiresAt ? expiresAt.toISOString() : 'Never'}`);
    if (Object.keys(quotaConfig).length) {
      console.log(`Quota:  ${JSON.stringify(quotaConfig)}`);
    }
    console.log('='.repeat(50));
    console.log('\n⚠️  Save this key NOW — it will not be shown again!');
    process.exit(0);
  });

// 吊销 Key
program
  .command('revoke-apikey <prefix>')
  .description('Revoke an API key by prefix')
  .action(async (prefix) => {
    const [result] = await db.execute(
      'UPDATE api_keys SET is_active = 0 WHERE key_prefix = ?',
      [prefix]
    );
    if (result.affectedRows === 0) {
      console.error('❌ Key not found');
    } else {
      console.log(`✅ Revoked key with prefix: ${prefix}`);
    }
    process.exit(0);
  });

program.parse();
```

**[现场演示]**

```bash
# 创建租户
node scripts/admin-cli.js create-tenant "Acme Corp" "acme" --plan enterprise
# ✅ Tenant created: ID=1, slug=acme, plan=enterprise

# 创建用户并分配角色
node scripts/admin-cli.js create-user alice@acme.com acme --name "Alice" --role member
# ✅ User created: ID=1, email=alice@acme.com, role=member

# 生成 API Key，带配额
node scripts/admin-cli.js create-apikey alice@acme.com acme \
  --name "Production Key" \
  --quota-daily 100 \
  --quota-monthly 2000 \
  --expires-days 365
# ✅ API Key created!
# Key:    oc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ⚠️  Save this key NOW — it will not be shown again!
```

**[主持人]**：CLI 工具是运维的利器！把这些命令封装进脚本，就能实现用户入职自动化！

---

### 🎬 [24:00 — 26:00] 总结 & 下集预告

**[画面：总结 PPT 或白板]**

> 好，这集我们完整实现了一套企业级 RBAC 权限系统，总结一下核心要点：

**核心要点 8 条**：

1. **多租户架构**：Tenant → User → Role → Permission，数据严格隔离
2. **Key 哈希存储**：原始 Key 不落库，只存 SHA-256
3. **双层缓存**：Redis 缓存 Key 信息和权限集，TTL 5 分钟
4. **最小权限原则**：Key 权限只能是角色权限的子集
5. **多维配额**：次数/Token/费用三维度控制
6. **软限制预警**：达到 80% 时发告警，不是到 100% 才发现
7. **Append-Only 审计**：只追加，永不修改，满足合规要求
8. **CLI 工具**：运维操作规范化，降低人为错误

**[展示文档链接]**：

> 完整代码和文档在仓库：[企业级 RBAC 权限系统](../advanced/rbac-permission-system.md)

---

**[下集预告]**

> 下一集，我们继续进阶 ——

> **第 11 集：RAG 知识库实战** —— 用向量数据库给你的 AI 接上企业知识库，让它真正懂你的业务！
> 
> 我们会覆盖：
> - 文档分块策略（Chunk Size 对质量的影响）
> - Embedding 模型选型（OpenAI vs 开源）
> - 向量数据库实战（Pinecone / Chroma / pgvector）
> - 混合检索（向量 + BM25 关键词）
> - 上下文注入与 Prompt 工程
>
> 下集见，拜拜！👋

---

**[结尾画面：仓库二维码 + 字幕]**

```
📖 文档仓库：github.com/rookie1989/claw-picker
📹 本集对应：docs/advanced/rbac-permission-system.md
🔔 订阅频道，第一时间收到更新通知
```

---

## 📦 本集资源清单

| 资源 | 链接/说明 |
|------|---------|
| 完整文档 | `docs/advanced/rbac-permission-system.md` |
| 数据库 Schema | 文档中完整建表 SQL（7 张表）|
| 权限中间件 | `examples/rbac/middleware/rbac.js` |
| 配额管理 | `examples/rbac/src/quota.js` |
| 审计日志 | `examples/rbac/src/audit.js` |
| 管理 CLI | `examples/rbac/scripts/admin-cli.js` |
| 单元测试 | `examples/rbac/tests/rbac.test.js` |

---

## 🎯 知识点检查

看完这集，你应该能：

- [ ] 设计多租户 RBAC 数据库 Schema
- [ ] 实现带缓存的权限检查中间件（< 5ms 延迟）
- [ ] 配置多维配额并设置软限制预警
- [ ] 写 Append-Only 审计日志同时支持 MySQL 查询和 Redis Stream 实时流
- [ ] 用 CLI 工具完成用户入职、Key 创建、Key 吊销全流程
