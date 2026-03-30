# 性能调优专题

> 让 OpenClaw 跑得又快又稳——从缓存策略到连接池，从异步队列到限流降级

## 目录

1. [性能基准与目标](#一性能基准与目标)
2. [缓存策略](#二缓存策略)
3. [连接池优化](#三连接池优化)
4. [异步队列与并发控制](#四异步队列与并发控制)
5. [限流与降级](#五限流与降级)
6. [数据库查询优化](#六数据库查询优化)
7. [内存管理](#七内存管理)
8. [性能监控与分析](#八性能监控与分析)

---

## 一、性能基准与目标

### 默认配置下的基准数据

| 场景 | 默认值 | 优化后目标 |
|------|--------|-----------|
| 单次 AI 请求延迟 | ~2s | <500ms（缓存命中） |
| 并发处理能力 | 10 req/s | 100+ req/s |
| 内存占用（空闲） | ~150MB | <100MB |
| 数据库查询 P99 | 50ms | <10ms |
| 消息队列积压恢复 | 手动 | 自动弹性伸缩 |

### 性能瓶颈定位

```bash
# 开启 OpenClaw 性能诊断模式
OPENCLAW_PERF_LOG=true node server.js

# 查看慢请求日志（>500ms）
grep "SLOW_REQUEST" logs/openclaw.log | tail -50

# 实时性能监控
curl http://localhost:3000/metrics
```

---

## 二、缓存策略

### 2.1 AI 响应缓存

对相同或相似的提示词命中缓存，减少 AI API 调用成本：

```javascript
// config/cache.js
const NodeCache = require('node-cache');
const crypto = require('crypto');

class AIResponseCache {
  constructor(options = {}) {
    this.cache = new NodeCache({
      stdTTL: options.ttl || 3600,        // 默认缓存 1 小时
      checkperiod: 120,                    // 每 2 分钟清理过期项
      maxKeys: options.maxKeys || 10000   // 最多缓存 1 万条
    });
    this.hitCount = 0;
    this.missCount = 0;
  }

  // 生成缓存 key（对 prompt + 参数哈希）
  generateKey(messages, model, temperature) {
    const payload = JSON.stringify({ messages, model, temperature });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  get(messages, model, temperature) {
    const key = this.generateKey(messages, model, temperature);
    const cached = this.cache.get(key);
    if (cached) {
      this.hitCount++;
      return cached;
    }
    this.missCount++;
    return null;
  }

  set(messages, model, temperature, response) {
    const key = this.generateKey(messages, model, temperature);
    this.cache.set(key, response);
  }

  getStats() {
    const total = this.hitCount + this.missCount;
    return {
      hitRate: total > 0 ? (this.hitCount / total * 100).toFixed(1) + '%' : '0%',
      hits: this.hitCount,
      misses: this.missCount,
      keys: this.cache.keys().length
    };
  }
}

module.exports = new AIResponseCache({ ttl: 7200, maxKeys: 5000 });
```

**集成到 OpenClaw 请求流程**：

```javascript
// middleware/cache-middleware.js
const aiCache = require('../config/cache');

module.exports = async function cacheMiddleware(ctx, next) {
  const { messages, model, temperature } = ctx.request.body;
  
  // 只对 temperature=0 的确定性请求缓存
  if (temperature === 0 || temperature === undefined) {
    const cached = aiCache.get(messages, model, temperature);
    if (cached) {
      ctx.body = cached;
      ctx.set('X-Cache', 'HIT');
      return;
    }
  }

  await next();

  // 缓存响应
  if (ctx.status === 200 && (temperature === 0 || temperature === undefined)) {
    aiCache.set(messages, model, temperature, ctx.body);
    ctx.set('X-Cache', 'MISS');
  }
};
```

### 2.2 Redis 分布式缓存（多节点场景）

```javascript
// config/redis-cache.js
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

const CACHE_PREFIX = 'openclaw:ai:';
const DEFAULT_TTL = 3600;

async function getCached(key) {
  const data = await redis.get(CACHE_PREFIX + key);
  return data ? JSON.parse(data) : null;
}

async function setCached(key, value, ttl = DEFAULT_TTL) {
  await redis.setex(CACHE_PREFIX + key, ttl, JSON.stringify(value));
}

// 语义相似度缓存（使用向量检索，可选）
async function getSemanticCached(prompt, threshold = 0.95) {
  // 需配合向量数据库使用，此处为概念示例
  // 实际可用 Redis Stack + RediSearch
  const keys = await redis.keys(CACHE_PREFIX + '*');
  for (const key of keys.slice(0, 100)) { // 限制搜索范围
    const item = await redis.get(key);
    if (item) {
      const { originalPrompt, response } = JSON.parse(item);
      const similarity = cosineSimilarity(prompt, originalPrompt); // 需实现
      if (similarity >= threshold) return response;
    }
  }
  return null;
}

module.exports = { getCached, setCached };
```

### 2.3 缓存预热策略

```javascript
// scripts/cache-warmup.js
const commonPrompts = [
  '你好，请介绍一下你的功能',
  '帮我总结一下今天的工作',
  '请翻译以下内容为英文：'
];

async function warmupCache() {
  console.log('🔥 开始缓存预热...');
  for (const prompt of commonPrompts) {
    // 提前调用，触发缓存填充
    await callAI([{ role: 'user', content: prompt }], 'gpt-4o-mini', 0);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log('✅ 缓存预热完成');
}
```

---

## 三、连接池优化

### 3.1 HTTP 连接池（AI 模型请求）

```javascript
// config/http-pool.js
const https = require('https');
const axios = require('axios');

// 创建高性能 HTTP Agent
const httpsAgent = new https.Agent({
  keepAlive: true,           // 保持长连接，避免每次握手开销
  keepAliveMsecs: 10000,     // 10秒 Keep-Alive
  maxSockets: 50,            // 最大并发连接数
  maxFreeSockets: 20,        // 空闲连接池大小
  timeout: 30000,            // 连接超时 30s
  scheduling: 'fifo'         // 先进先出调度
});

// 为每个 AI 提供商创建专属客户端
const openaiClient = axios.create({
  baseURL: 'https://api.openai.com',
  httpsAgent,
  timeout: 60000,
  headers: { 'Connection': 'keep-alive' }
});

// 请求重试（指数退避）
openaiClient.interceptors.response.use(null, async error => {
  const config = error.config;
  config._retryCount = (config._retryCount || 0) + 1;
  
  if (config._retryCount <= 3 && error.response?.status >= 500) {
    const delay = Math.pow(2, config._retryCount) * 1000; // 2s, 4s, 8s
    await new Promise(r => setTimeout(r, delay));
    return openaiClient(config);
  }
  return Promise.reject(error);
});

module.exports = { openaiClient };
```

### 3.2 数据库连接池

```javascript
// config/db-pool.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  
  // 连接池参数调优
  min: 2,           // 最小连接数（保持热连接）
  max: 20,          // 最大连接数（避免过载）
  idleTimeoutMillis: 30000,   // 空闲连接 30s 后回收
  connectionTimeoutMillis: 5000, // 获取连接超时 5s
  maxUses: 7500,    // 每个连接最多使用 7500 次后重建（防内存泄漏）
  
  // SSL 配置（生产环境）
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : false
});

// 监控连接池状态
setInterval(() => {
  console.log('DB Pool Stats:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  });
}, 60000);

// 优雅关闭
process.on('SIGTERM', async () => {
  await pool.end();
  console.log('DB pool closed');
});

module.exports = pool;
```

---

## 四、异步队列与并发控制

### 4.1 消息队列（峰值削峰）

```javascript
// queue/message-queue.js
const EventEmitter = require('events');

class MessageQueue extends EventEmitter {
  constructor(options = {}) {
    super();
    this.queue = [];
    this.processing = 0;
    this.concurrency = options.concurrency || 5;    // 最大并发处理数
    this.rateLimit = options.rateLimit || 10;        // 每秒最大处理数
    this.rateLimitWindow = [];
  }

  // 入队
  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  // 速率检查
  checkRateLimit() {
    const now = Date.now();
    this.rateLimitWindow = this.rateLimitWindow.filter(t => now - t < 1000);
    if (this.rateLimitWindow.length >= this.rateLimit) {
      return false;
    }
    this.rateLimitWindow.push(now);
    return true;
  }

  async process() {
    if (this.processing >= this.concurrency || this.queue.length === 0) return;
    if (!this.checkRateLimit()) {
      setTimeout(() => this.process(), 100);
      return;
    }

    const { task, resolve, reject } = this.queue.shift();
    this.processing++;

    try {
      const result = await task();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      this.processing--;
      this.emit('taskComplete');
      this.process();
    }
  }

  getStats() {
    return {
      queued: this.queue.length,
      processing: this.processing,
      rps: this.rateLimitWindow.length
    };
  }
}

// 全局 AI 请求队列
const aiQueue = new MessageQueue({ concurrency: 10, rateLimit: 20 });

// 使用示例：所有 AI 请求通过队列
async function queuedAICall(messages) {
  return aiQueue.enqueue(() => callAI(messages));
}

module.exports = { aiQueue, queuedAICall };
```

### 4.2 批处理（Batching）

```javascript
// queue/batch-processor.js
class BatchProcessor {
  constructor(processor, options = {}) {
    this.processor = processor;
    this.batchSize = options.batchSize || 10;
    this.batchDelay = options.batchDelay || 50; // ms
    this.pending = [];
    this.timer = null;
  }

  add(item) {
    return new Promise((resolve, reject) => {
      this.pending.push({ item, resolve, reject });

      if (this.pending.length >= this.batchSize) {
        this.flush();
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchDelay);
      }
    });
  }

  async flush() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (this.pending.length === 0) return;

    const batch = this.pending.splice(0, this.batchSize);
    const items = batch.map(b => b.item);

    try {
      const results = await this.processor(items);
      batch.forEach((b, i) => b.resolve(results[i]));
    } catch (err) {
      batch.forEach(b => b.reject(err));
    }
  }
}

// 示例：批量向量化（Embedding）
const embedBatch = new BatchProcessor(
  async (texts) => {
    const res = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts
    });
    return res.data.map(d => d.embedding);
  },
  { batchSize: 20, batchDelay: 30 }
);
```

---

## 五、限流与降级

### 5.1 多层限流

```javascript
// middleware/rate-limiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// 全局限流
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1分钟窗口
  max: 300,             // 每 IP 每分钟最多 300 次
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: '请求过于频繁，请稍后再试' }
});

// AI 接口专属限流（更严格）
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.headers['x-user-id'] || req.ip,
  store: new RedisStore({ client: redis, prefix: 'rl:ai:' })
});

// 动态限流（根据系统负载自适应）
async function adaptiveLimiter(req, res, next) {
  const load = await getSystemLoad(); // CPU + 内存负载
  if (load > 0.9) {
    // 高负载时拒绝 50% 请求
    if (Math.random() < 0.5) {
      return res.status(503).json({ error: '服务繁忙，请稍后重试' });
    }
  }
  next();
}
```

### 5.2 熔断降级

```javascript
// resilience/circuit-breaker.js
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000; // 30s 半开期
    this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = Date.now();
  }

  async call(fn, fallback) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        return fallback ? fallback() : Promise.reject(new Error('Circuit breaker OPEN'));
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      if (fallback) return fallback();
      throw err;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('✅ 熔断器已恢复（CLOSED）');
      }
    }
  }

  onFailure() {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
      console.warn(`⚠️ 熔断器触发（OPEN），${this.timeout/1000}s 后重试`);
    }
  }
}

// 为每个 AI 提供商创建熔断器
const openaiBreaker = new CircuitBreaker({ failureThreshold: 3, timeout: 60000 });
const anthropicBreaker = new CircuitBreaker({ failureThreshold: 3, timeout: 60000 });

// 带降级的 AI 调用
async function resilientAICall(messages) {
  return openaiBreaker.call(
    () => callOpenAI(messages),
    // 降级：切换到备用模型
    () => anthropicBreaker.call(
      () => callAnthropic(messages),
      // 最终降级：返回缓存或固定响应
      () => ({ content: '服务暂时不可用，请稍后重试或联系管理员' })
    )
  );
}
```

---

## 六、数据库查询优化

### 6.1 索引策略

```sql
-- 消息记录核心索引
CREATE INDEX CONCURRENTLY idx_messages_channel_created 
  ON messages(channel_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_messages_user_created 
  ON messages(user_id, created_at DESC);

-- 部分索引（只索引近 30 天数据）
CREATE INDEX CONCURRENTLY idx_messages_recent 
  ON messages(created_at DESC)
  WHERE created_at > NOW() - INTERVAL '30 days';

-- 全文搜索索引
CREATE INDEX CONCURRENTLY idx_messages_content_fts 
  ON messages USING gin(to_tsvector('chinese', content));

-- 会话索引
CREATE INDEX CONCURRENTLY idx_sessions_channel_active 
  ON sessions(channel_id, last_active DESC)
  WHERE last_active > NOW() - INTERVAL '24 hours';
```

### 6.2 查询优化技巧

```javascript
// 使用游标分页代替 OFFSET（大数据量时性能更好）
async function getMessagesByCursor(channelId, cursor, limit = 20) {
  const query = cursor
    ? `SELECT * FROM messages 
       WHERE channel_id = $1 AND id < $2 
       ORDER BY id DESC LIMIT $3`
    : `SELECT * FROM messages 
       WHERE channel_id = $1 
       ORDER BY id DESC LIMIT $2`;
  
  const params = cursor ? [channelId, cursor, limit] : [channelId, limit];
  return pool.query(query, params);
}

// 使用预编译语句
const preparedGetChannel = {
  name: 'get-channel',
  text: 'SELECT * FROM channels WHERE id = $1',
  rowMode: 'array'
};

// 批量插入（比逐条 INSERT 快 10 倍）
async function batchInsertMessages(messages) {
  const values = messages.map((m, i) => 
    `($${i*3+1}, $${i*3+2}, $${i*3+3})`
  ).join(', ');
  const params = messages.flatMap(m => [m.channelId, m.content, m.createdAt]);
  
  await pool.query(
    `INSERT INTO messages (channel_id, content, created_at) VALUES ${values}`,
    params
  );
}
```

---

## 七、内存管理

### 7.1 对话上下文裁剪

```javascript
// utils/context-manager.js
const MAX_CONTEXT_TOKENS = 8000;
const AVG_CHARS_PER_TOKEN = 3.5;

function trimContext(messages, maxTokens = MAX_CONTEXT_TOKENS) {
  const maxChars = maxTokens * AVG_CHARS_PER_TOKEN;
  let totalChars = 0;
  const result = [];

  // 保留 system 消息
  const system = messages.filter(m => m.role === 'system');
  const conversation = messages.filter(m => m.role !== 'system');

  // 从最新消息往前保留
  for (let i = conversation.length - 1; i >= 0; i--) {
    const msgChars = conversation[i].content.length;
    if (totalChars + msgChars > maxChars) break;
    result.unshift(conversation[i]);
    totalChars += msgChars;
  }

  // 确保至少保留最后一条用户消息
  if (result.length === 0 && conversation.length > 0) {
    result.push(conversation[conversation.length - 1]);
  }

  return [...system, ...result];
}

// 自动清理过期会话（避免内存泄漏）
const sessionStore = new Map();

setInterval(() => {
  const now = Date.now();
  let cleaned = 0;
  for (const [id, session] of sessionStore) {
    if (now - session.lastActive > 30 * 60 * 1000) { // 30分钟无活动
      sessionStore.delete(id);
      cleaned++;
    }
  }
  if (cleaned > 0) console.log(`🧹 清理 ${cleaned} 个过期会话`);
}, 5 * 60 * 1000);
```

### 7.2 流式响应（减少内存峰值）

```javascript
// 使用流式 API，避免大响应体全量加载到内存
async function streamAIResponse(messages, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    stream: true
  });

  let fullContent = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      fullContent += delta;
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();

  return fullContent;
}
```

---

## 八、性能监控与分析

### 8.1 关键指标采集

```javascript
// monitoring/metrics.js
const prometheus = require('prom-client');

// AI 请求延迟直方图
const aiLatency = new prometheus.Histogram({
  name: 'openclaw_ai_request_duration_seconds',
  help: 'AI request latency in seconds',
  labelNames: ['model', 'channel', 'cache'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

// 缓存命中率
const cacheHits = new prometheus.Counter({
  name: 'openclaw_cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['type']
});

// 队列积压深度
const queueDepth = new prometheus.Gauge({
  name: 'openclaw_queue_depth',
  help: 'Current message queue depth',
  labelNames: ['queue']
});

// 每分钟自动采集队列状态
setInterval(() => {
  queueDepth.set({ queue: 'ai' }, aiQueue.getStats().queued);
}, 10000);

// 性能分析中间件
async function perfMiddleware(ctx, next) {
  const start = Date.now();
  await next();
  const duration = (Date.now() - start) / 1000;
  
  aiLatency.observe(
    { model: ctx.state.model || 'unknown', channel: ctx.state.channel || 'default', cache: ctx.get('X-Cache') || 'MISS' },
    duration
  );

  // 慢请求日志
  if (duration > 5) {
    console.warn(`[SLOW] ${ctx.method} ${ctx.path} - ${duration.toFixed(2)}s`);
  }
}
```

### 8.2 性能基线测试脚本

```bash
#!/bin/bash
# scripts/perf-test.sh

BASE_URL="${1:-http://localhost:3000}"
CONCURRENCY="${2:-10}"
DURATION="${3:-30}"

echo "🚀 OpenClaw 性能测试"
echo "目标：$BASE_URL | 并发：$CONCURRENCY | 持续：${DURATION}s"
echo ""

# 需安装 wrk: brew install wrk
wrk -t$CONCURRENCY -c$CONCURRENCY -d${DURATION}s \
  -s scripts/wrk-script.lua \
  "$BASE_URL/api/v1/chat"
```

```lua
-- scripts/wrk-script.lua
wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.headers["Authorization"] = "Bearer " .. os.getenv("OPENCLAW_API_KEY")
wrk.body = '{"channel":"default","messages":[{"role":"user","content":"你好"}]}'
```

### 8.3 调优 Checklist

| 项目 | 默认值 | 推荐调整 | 影响 |
|------|--------|---------|------|
| AI 响应缓存 | 关闭 | 开启（TTL=3600） | 命中时响应<10ms |
| HTTP Keep-Alive | 关闭 | 开启（50连接池） | 减少 TCP 握手 200ms |
| 数据库连接池 max | 10 | 20-50（按核数×2） | 并发提升 2-3x |
| 对话上下文 | 无限制 | max 8000 tokens | 内存减少 60% |
| 流式响应 | 关闭 | 开启 | TTFB 从 5s → 0.3s |
| 消息队列并发 | 1 | 5-10 | 吞吐提升 5-10x |

---

## 参考资料

- [OpenClaw 高可用部署](ha-deployment.md)
- [数据持久化与备份](data-persistence.md)
- [监控与告警系统搭建](../guides/监控与告警系统搭建.md)
