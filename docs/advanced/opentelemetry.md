# OpenTelemetry 分布式追踪集成

> **本文目标**：为 OpenClaw 网关接入 OpenTelemetry，实现从「用户发消息」到「AI 回复发出」全链路的分布式追踪，让每一毫秒的耗时都可观测、可分析、可告警。

---

## 目录

1. [为什么需要分布式追踪](#为什么需要分布式追踪)
2. [架构概览](#架构概览)
3. [安装与初始化](#安装与初始化)
4. [核心 Span 埋点](#核心-span-埋点)
5. [对接 Jaeger（本地调试）](#对接-jaeger)
6. [对接 Grafana Tempo（生产推荐）](#对接-grafana-tempo)
7. [自定义属性与事件](#自定义属性与事件)
8. [告警规则](#告警规则)
9. [性能影响与采样策略](#性能影响与采样策略)
10. [实战：追踪一次 AI 超时的根因](#实战案例)

---

## 为什么需要分布式追踪

传统日志的痛点：

```
# 日志中看到一个慢请求，但无法知道慢在哪里
[ERROR] request took 8420ms  request_id=abc123

# 追查这 8 秒花在哪里，需要在 5 个服务的日志中手动比对时间戳
# 这在高并发下几乎不可能
```

有了分布式追踪之后：

```
Trace: abc123 (total: 8420ms)
├── channel.receive          12ms
├── auth.verify              5ms
├── context.build            45ms
│   ├── db.fetch_history     38ms  ← 数据库慢查询！
│   └── format               7ms
├── ai.call                  8200ms  ← AI API 超时
│   ├── queue.wait           150ms
│   ├── http.send            8ms
│   └── model.stream         8042ms  ← 模型本身慢
└── channel.send             158ms
```

一眼看出：AI 模型本身响应慢（8042ms），同时数据库有慢查询（38ms）。

---

## 架构概览

```
OpenClaw Gateway
    │
    │  OpenTelemetry SDK（自动/手动埋点）
    ▼
OTLP Exporter
    │
    ├── Jaeger（本地调试）
    └── Grafana Tempo（生产环境）
            │
            └── Grafana Dashboard（可视化追踪）
                        │
                        └── Alertmanager（异常告警）
```

---

## 安装与初始化

### 安装依赖

```bash
npm install \
  @opentelemetry/sdk-node \
  @opentelemetry/api \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  @opentelemetry/sdk-metrics
```

### 初始化（必须在应用最前面）

```javascript
// tracing.js  ← 必须是 Node.js 启动的第一个文件！
// 用法：node --require ./tracing.js ./src/index.js

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// 从环境变量读取配置
const OTLP_ENDPOINT = process.env.OTLP_ENDPOINT || 'http://localhost:4318';
const SERVICE_NAME  = process.env.SERVICE_NAME  || 'openclaw-gateway';
const SERVICE_ENV   = process.env.NODE_ENV       || 'development';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]:    SERVICE_NAME,
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION || '2.0.0',
    'deployment.environment': SERVICE_ENV,
    'openclaw.node_id': process.env.NODE_ID || require('os').hostname(),
  }),
  
  // Trace 导出器
  traceExporter: new OTLPTraceExporter({
    url: `${OTLP_ENDPOINT}/v1/traces`,
  }),
  
  // Metrics 导出器
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${OTLP_ENDPOINT}/v1/metrics`,
    }),
    exportIntervalMillis: 15000, // 每 15 秒上报一次
  }),
  
  // 自动埋点：HTTP、MySQL、Redis、gRPC 等
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        // 过滤健康检查等噪音请求
        ignoreIncomingRequestHook: (req) => {
          return req.url?.startsWith('/health') || req.url?.startsWith('/metrics');
        },
      },
      '@opentelemetry/instrumentation-fs': {
        enabled: false,  // 文件 IO 追踪太噪，关闭
      },
    }),
  ],
});

sdk.start();

// 优雅退出时 flush 未发送的数据
process.on('SIGTERM', async () => {
  await sdk.shutdown();
  process.exit(0);
});

console.log(`[OTel] Tracing initialized → ${OTLP_ENDPOINT}`);
```

### 修改启动命令

```bash
# package.json
{
  "scripts": {
    "start": "node --require ./tracing.js ./src/index.js",
    "dev":   "nodemon --require ./tracing.js ./src/index.js"
  }
}
```

---

## 核心 Span 埋点

### 请求全链路追踪

```javascript
// src/middleware/tracing.js

const { trace, context, SpanStatusCode } = require('@opentelemetry/api');

const tracer = trace.getTracer('openclaw', '2.0.0');

/**
 * OpenClaw 消息处理的核心 Span 包装器
 */
async function withSpan(spanName, attributes, fn) {
  return tracer.startActiveSpan(spanName, { attributes }, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err.message,
      });
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}

/**
 * 消息处理主流程
 */
async function handleMessage(rawMessage, channelAdapter) {
  return withSpan('openclaw.message.handle', {
    'message.channel': channelAdapter.name,
    'message.type': rawMessage.type || 'text',
  }, async (rootSpan) => {
    
    // 阶段 1：鉴权
    const user = await withSpan('openclaw.auth.verify', {
      'auth.method': 'token',
    }, async () => {
      return authService.verify(rawMessage.token);
    });
    
    rootSpan.setAttribute('user.id', user.id);
    rootSpan.setAttribute('user.plan', user.plan);
    
    // 阶段 2：构建上下文（含历史记录查询）
    const ctx = await withSpan('openclaw.context.build', {}, async (span) => {
      const history = await withSpan('openclaw.db.fetch_history', {
        'db.system': 'mysql',
        'db.operation': 'SELECT',
      }, async () => {
        return db.messages.findRecent(user.id, 10);
      });
      
      span.setAttribute('context.history_count', history.length);
      return buildContext(user, history);
    });
    
    // 阶段 3：技能路由
    const skill = await withSpan('openclaw.skill.route', {}, async (span) => {
      const matched = router.match(rawMessage.text, ctx);
      span.setAttribute('skill.name', matched?.name || 'default');
      return matched;
    });
    
    // 阶段 4：AI 调用（最关键的 Span）
    const aiResponse = await withSpan('openclaw.ai.call', {
      'ai.provider': ctx.model.provider,
      'ai.model': ctx.model.name,
      'ai.stream': true,
    }, async (span) => {
      
      const startTime = Date.now();
      
      // 记录等待 Token（限流排队时间）
      span.addEvent('queue.entered');
      await queue.waitForSlot(user.plan);
      span.addEvent('queue.acquired', {
        'queue.wait_ms': Date.now() - startTime,
      });
      
      // 实际 AI 请求
      const resp = await aiClient.chat(ctx);
      
      // 记录关键指标
      span.setAttributes({
        'ai.prompt_tokens':     resp.usage.prompt_tokens,
        'ai.completion_tokens': resp.usage.completion_tokens,
        'ai.total_tokens':      resp.usage.total_tokens,
        'ai.latency_ms':        Date.now() - startTime,
        'ai.cache_hit':         resp.fromCache || false,
      });
      
      return resp;
    });
    
    // 阶段 5：发送响应
    await withSpan('openclaw.channel.send', {
      'channel.name': channelAdapter.name,
    }, async () => {
      return channelAdapter.send(user, aiResponse.text);
    });
    
    // 在根 Span 上记录整体指标
    rootSpan.setAttributes({
      'request.success': true,
      'request.total_tokens': aiResponse.usage.total_tokens,
    });
  });
}

module.exports = { handleMessage, withSpan };
```

---

## 对接 Jaeger

> 用于本地调试，5 分钟搭好。

```bash
# 一键启动 Jaeger（All-in-One 模式）
docker run -d \
  --name jaeger \
  -p 16686:16686 \   # Jaeger UI
  -p 4318:4318 \     # OTLP HTTP 接收端
  -e COLLECTOR_OTLP_ENABLED=true \
  jaegertracing/all-in-one:1.55

# 启动 OpenClaw
OTLP_ENDPOINT=http://localhost:4318 npm start

# 发几条消息，然后打开 Jaeger UI
open http://localhost:16686
```

**Jaeger UI 查看追踪：**
1. 在 **Service** 下拉框选择 `openclaw-gateway`
2. 点击 **Find Traces**
3. 点击一条 trace，展开瀑布图
4. 慢的 Span 会有橙色/红色高亮

---

## 对接 Grafana Tempo

> 生产环境推荐，与 Grafana 无缝集成，支持 TraceQL 查询语言。

### Docker Compose 配置

```yaml
# docker-compose.observability.yml

version: '3.8'

services:
  tempo:
    image: grafana/tempo:2.4.0
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./config/tempo.yaml:/etc/tempo.yaml
      - tempo_data:/var/tempo
    ports:
      - "3200:3200"   # Tempo API
      - "4318:4318"   # OTLP HTTP
    
  grafana:
    image: grafana/grafana:10.4.0
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
    ports:
      - "3001:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./config/grafana/provisioning:/etc/grafana/provisioning

volumes:
  tempo_data:
  grafana_data:
```

```yaml
# config/tempo.yaml

server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        http:
          endpoint: 0.0.0.0:4318

storage:
  trace:
    backend: local
    local:
      path: /var/tempo/traces
    wal:
      path: /var/tempo/wal

compactor:
  compaction:
    block_retention: 48h   # 保留 48 小时的 trace
```

### Grafana 数据源配置（自动 Provisioning）

```yaml
# config/grafana/provisioning/datasources/tempo.yaml

apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    url: http://tempo:3200
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki  # 关联 Loki 日志
        filterByTraceID: true
      serviceMap:
        datasourceUid: prometheus
      nodeGraph:
        enabled: true        # 显示服务依赖图
```

---

## 自定义属性与事件

### 业务关键属性规范

```javascript
// constants/otel-attrs.js

// 定义 OpenClaw 自定义属性规范
// 保持全局一致，方便在 Grafana 中过滤和聚合

const OPENCLAW_ATTRS = {
  // 用户相关
  USER_ID:        'openclaw.user.id',
  USER_PLAN:      'openclaw.user.plan',       // free | premium | enterprise
  
  // 消息相关
  MSG_CHANNEL:    'openclaw.message.channel', // telegram | slack | weixin_work
  MSG_TYPE:       'openclaw.message.type',    // text | voice | image
  
  // AI 相关
  AI_PROVIDER:    'openclaw.ai.provider',     // openai | anthropic | gemini
  AI_MODEL:       'openclaw.ai.model',        // gpt-4o | claude-3-5-sonnet
  AI_CACHE_HIT:   'openclaw.ai.cache_hit',    // true | false
  AI_SKILL:       'openclaw.ai.skill',        // 命中的技能名称
  
  // 计费相关
  TOKEN_PROMPT:   'openclaw.tokens.prompt',
  TOKEN_COMPLETE: 'openclaw.tokens.completion',
  COST_USD:       'openclaw.cost.usd',        // 本次请求费用（美元）
};

module.exports = OPENCLAW_ATTRS;
```

### 记录异常事件

```javascript
const { trace } = require('@opentelemetry/api');

// 在任意地方获取当前 Span 并记录事件
function recordAITimeout(model, latencyMs) {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent('ai.timeout', {
      'ai.model': model,
      'ai.latency_ms': latencyMs,
      'ai.timeout_threshold_ms': 10000,
    });
    span.setStatus({ code: SpanStatusCode.ERROR, message: 'AI request timeout' });
  }
}

function recordRateLimit(userId, plan) {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent('rate_limit.triggered', {
      'user.id': userId,
      'user.plan': plan,
    });
  }
}
```

---

## 告警规则

### 基于 Tempo 的 TraceQL 告警

在 Grafana Alerting 中创建以下规则：

```
# 告警 1：P99 延迟 > 5 秒
{ resource.service.name = "openclaw-gateway" && duration > 5s }
  | rate() > 0.05   # 每秒超过 5% 的请求超 5 秒

# 告警 2：AI 调用错误率 > 5%
{ name = "openclaw.ai.call" && status = error }
  | rate() > 0.05

# 告警 3：特定用户异常（排查用）
{ openclaw.user.id = "suspicious-user-id" && duration > 10s }
```

### Prometheus 指标告警（配合使用）

```yaml
# alerting/rules/openclaw.yml

groups:
  - name: openclaw_performance
    rules:
      - alert: HighAILatency
        expr: |
          histogram_quantile(0.99,
            sum(rate(openclaw_ai_latency_bucket[5m])) by (le, model)
          ) > 5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "AI P99 延迟超过 5 秒"
          description: "模型 {{ $labels.model }} 的 P99 延迟为 {{ $value }}s"
          
      - alert: AICallErrorRate
        expr: |
          sum(rate(openclaw_ai_errors_total[5m])) by (provider)
          /
          sum(rate(openclaw_ai_calls_total[5m])) by (provider)
          > 0.05
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "AI 调用错误率超过 5%"
```

---

## 性能影响与采样策略

### 采样对性能的影响

| 采样率 | 额外 CPU | 额外内存 | 存储（1k req/s） |
|--------|---------|---------|----------------|
| 100%   | ~3%     | ~50MB   | ~2 GB/天        |
| 10%    | ~0.5%   | ~10MB   | ~200 MB/天      |
| 1%     | ~0.1%   | ~5MB    | ~20 MB/天       |

### 推荐采样策略

```javascript
// tracing.js —— 使用尾部采样（Tail-based Sampling）

const { ParentBasedSampler, TraceIdRatioBasedSampler } = require('@opentelemetry/sdk-trace-base');

// 生产环境：采样 10%，但错误和慢请求 100% 保留
const sampler = {
  shouldSample(context, traceId, spanName, spanKind, attributes) {
    // 有错误的请求：100% 保留
    if (attributes['error'] === true) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    
    // 慢请求（提前标记）：100% 保留
    if (attributes['slow_request'] === true) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    
    // 高价值用户：50% 采样
    if (attributes['openclaw.user.plan'] === 'enterprise') {
      return Math.random() < 0.5
        ? { decision: SamplingDecision.RECORD_AND_SAMPLED }
        : { decision: SamplingDecision.NOT_RECORD };
    }
    
    // 普通请求：10% 采样
    return Math.random() < 0.1
      ? { decision: SamplingDecision.RECORD_AND_SAMPLED }
      : { decision: SamplingDecision.NOT_RECORD };
  },
};
```

---

## 实战案例

### 追踪一次「AI 超时」的根因

**场景**：用户反馈某时间段内响应极慢（>8 秒），但日志中没有报错。

**排查步骤：**

1. **在 Grafana Tempo 查找慢 Trace**
   ```
   # TraceQL
   { resource.service.name = "openclaw-gateway" && duration > 7s }
   | select(openclaw.ai.model, openclaw.user.plan)
   ```

2. **发现共同特征**：所有慢 trace 的 `openclaw.ai.model` 都是 `gpt-4o`，而 `gpt-4o-mini` 正常

3. **展开瀑布图**：
   ```
   openclaw.message.handle       8420ms
   ├── openclaw.auth.verify          5ms
   ├── openclaw.context.build       35ms
   └── openclaw.ai.call           8350ms
       ├── queue.wait               20ms  (正常)
       └── http.connect_to_openai   30ms  (正常)
       └── model.first_token      8300ms  ← 问题在这里！
   ```

4. **结论**：OpenAI `gpt-4o` 当时出现全球性延迟（可在 [status.openai.com](https://status.openai.com) 验证）

5. **修复**：在熔断配置中为 `gpt-4o` 设置 5 秒超时，超时后自动降级到 `gpt-4o-mini`

```yaml
circuit_breaker:
  models:
    gpt-4o:
      timeout_ms: 5000
      fallback_model: gpt-4o-mini
```

**结果**：下次 OpenAI 服务波动时，用户感知延迟从 8 秒降到 1.5 秒（gpt-4o-mini 响应时间），用户甚至察觉不到切换。

---

*最后更新：2026-03-30 | OpenTelemetry SDK v1.24 | Grafana Tempo v2.4*
