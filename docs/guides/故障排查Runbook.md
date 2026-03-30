# 故障排查 Runbook

> **本手册定位**：生产环境值班工程师应急参考手册。每个故障场景给出「现象 → 定位命令 → 根因 → 修复步骤 → 预防措施」完整流程。

---

## 如何使用本手册

1. **发现告警** → 查目录，找到对应的故障场景
2. **按顺序执行「诊断命令」**，每步记录输出
3. **对照「可能原因」**，找到根因
4. **执行「修复步骤」**
5. **故障恢复后**，填写「事后复盘」模板

> ⚠️ **重要原则**：先止血，后根因分析。任何时候优先恢复服务，再慢慢排查为什么。

---

## 目录

| # | 故障场景 | 紧急程度 |
|---|----------|---------|
| 1 | [网关无响应 / 进程崩溃](#1-网关无响应--进程崩溃) | 🔴 P0 |
| 2 | [AI 回复全部超时](#2-ai-回复全部超时) | 🔴 P0 |
| 3 | [特定渠道消息不通](#3-特定渠道消息不通) | 🟠 P1 |
| 4 | [内存持续上涨 / OOM](#4-内存持续上涨--oom) | 🟠 P1 |
| 5 | [消息队列积压严重](#5-消息队列积压严重) | 🟠 P1 |
| 6 | [数据库连接耗尽](#6-数据库连接耗尽) | 🟠 P1 |
| 7 | [AI 回复内容异常 / 幻觉严重](#7-ai-回复内容异常) | 🟡 P2 |
| 8 | [成本异常飙升](#8-成本异常飙升) | 🟡 P2 |
| 9 | [插件/Skill 加载失败](#9-插件-skill-加载失败) | 🟡 P2 |
| 10 | [Webhook 回调丢失](#10-webhook-回调丢失) | 🟡 P2 |

---

## 1. 网关无响应 / 进程崩溃

### 现象

- 所有渠道的 Bot 停止响应
- 健康检查 `GET /health` 返回 5xx 或超时
- 监控显示进程不存在

### 诊断命令（按顺序执行）

```bash
# 1. 确认进程状态
openclaw gateway status
# 或直接查进程
ps aux | grep openclaw

# 2. 查看最后 100 行日志（看崩溃前的 ERROR）
openclaw gateway logs --tail 100 --level error

# 3. 查看系统日志（是否被 OOM Killer 杀掉）
sudo dmesg | grep -i "killed process" | tail -20
# Linux 上也可以：
journalctl -u openclaw --since "1 hour ago" | tail -50

# 4. 检查磁盘空间（写满会导致崩溃）
df -h

# 5. 检查端口占用
lsof -i :3000
```

### 可能原因与修复

| 原因 | 判断依据 | 修复 |
|------|---------|------|
| 进程崩溃（JS 未捕获异常） | 日志末尾有 `UnhandledPromiseRejection` | 重启后查堆栈 `openclaw gateway logs --level fatal` |
| OOM Killer 杀掉 | `dmesg` 中有 `Out of memory: Kill process` | 重启后限制内存或升级服务器 |
| 磁盘写满 | `df -h` 显示 100% | 立即清理日志：`openclaw logs purge --before 7d` |
| 配置文件损坏 | 日志有 `SyntaxError: config.yaml` | 恢复配置备份 |
| 端口被占用 | `lsof -i :3000` 显示其他进程 | `kill -9 <PID>` 后重启 |

### 修复步骤（通用）

```bash
# Step 1：保存当前日志（用于事后分析）
openclaw gateway logs --tail 500 > /tmp/crash-$(date +%Y%m%d-%H%M%S).log

# Step 2：重启网关
openclaw gateway restart

# Step 3：验证恢复
openclaw gateway status
curl http://localhost:3000/health

# Step 4：发送测试消息验证端到端
openclaw test send --channel telegram --message "健康检查测试"
```

### 预防措施

```bash
# 配置进程守护（使用 PM2）
npm install -g pm2
pm2 start "openclaw gateway start" --name openclaw \
  --max-memory-restart 1G \
  --restart-delay 3000
pm2 save
pm2 startup  # 设置开机自启
```

---

## 2. AI 回复全部超时

### 现象

- 所有 Bot 的 AI 回复都不来
- 日志中大量 `ai.timeout` 或 `ECONNRESET`
- 监控中 `openclaw_ai_calls_total{status="error"}` 急剧上升

### 诊断命令

```bash
# 1. 测试 AI 提供商连通性
openclaw diagnose ai --provider openai
# 预期输出：
# ✓ DNS resolution: api.openai.com → 104.18.x.x  (12ms)
# ✓ TCP connect: api.openai.com:443  (45ms)
# ✓ TLS handshake  (88ms)
# ✗ API call: TIMEOUT after 10000ms  ← 问题在这里

# 2. 检查当前 AI 错误率
openclaw stats --metric ai_error_rate --duration 15m

# 3. 查看具体错误分布
openclaw gateway logs --level error --grep "ai\." --tail 50 | \
  grep -oP '"error":"[^"]*"' | sort | uniq -c | sort -rn

# 4. 检查是否 API 密钥失效
openclaw diagnose api-key --provider openai
```

### 可能原因与修复

| 原因 | 判断依据 | 修复 |
|------|---------|------|
| OpenAI 服务故障 | [status.openai.com](https://status.openai.com) 显示 Incident | 切换备用模型（见下方） |
| API Key 到期/超限 | 日志有 `401 Unauthorized` 或 `429 RateLimitError` | 更换/充值 API Key |
| 网络故障（DNS/防火墙） | `curl https://api.openai.com` 超时 | 检查网络配置/代理 |
| 连接池耗尽 | 日志有 `connection pool exhausted` | 减少并发或扩大连接池 |

### 紧急切换备用模型

```bash
# 临时切换到备用模型（不需要重启）
openclaw config model set-active --provider anthropic --model claude-3-5-sonnet

# 验证切换生效
openclaw stats --metric ai_provider --duration 1m

# OpenAI 恢复后切回
openclaw config model set-active --provider openai --model gpt-4o
```

或者在 `config.yaml` 中预配置自动降级：

```yaml
ai:
  primary: openai/gpt-4o
  fallback:
    - anthropic/claude-3-5-sonnet   # 第一备用
    - openai/gpt-4o-mini            # 第二备用（最快最便宜）
  fallback_trigger:
    error_rate: 0.3    # 错误率超 30% 自动切换
    latency_p95: 8000  # P95 超 8 秒自动切换
```

---

## 3. 特定渠道消息不通

### 现象

- 只有某一个渠道（如 Telegram）的 Bot 不回复
- 其他渠道正常
- 日志中有 `channel.telegram: WebhookError` 或类似错误

### 诊断命令

```bash
# 1. 检查特定渠道状态
openclaw channel status telegram

# 2. 查看渠道相关日志
openclaw gateway logs --grep "telegram" --level warn --tail 100

# 3. 验证 Token 有效性
openclaw diagnose channel --type telegram

# 4. 检查 Webhook 注册状态（Telegram）
curl "https://api.telegram.org/bot${TELEGRAM_TOKEN}/getWebhookInfo" | jq .
```

### Telegram 常见问题

```bash
# 问题：Webhook 被覆盖（其他实例也在运行）
# 现象：消息只有 50% 到达，或两个实例轮流收到
# 修复：重新注册 Webhook
openclaw config channel telegram --reset-webhook

# 问题：SSL 证书问题（Telegram 要求合法证书）
# 现象：日志有 "certificate verify failed"
# 修复：检查并更新 SSL 证书
openssl s_client -connect your-domain.com:443 2>&1 | head -20

# 问题：Bot Token 被 @BotFather 撤销
# 现象：日志有 "401: Unauthorized"
# 修复：去 @BotFather 重新获取 Token 并更新配置
openclaw config channel telegram --token NEW_TOKEN
openclaw gateway restart
```

### 企业微信常见问题

```bash
# 问题：IP 白名单未更新（企业微信要求白名单）
# 确认当前服务器 IP
curl ifconfig.me

# 然后去企业微信管理后台更新 IP 白名单

# 问题：消息加密密钥不匹配
# 现象：日志有 "decrypt failed"
# 修复：在企业微信后台重新获取 EncodingAESKey
openclaw config channel weixin-work \
  --encoding-aes-key NEW_KEY
```

---

## 4. 内存持续上涨 / OOM

### 现象

- 监控显示内存使用持续增长，不释放
- 一段时间后进程被 OOM Killer 杀死
- 响应越来越慢

### 诊断命令

```bash
# 1. 当前内存使用
openclaw gateway stats --metric memory

# 2. 生成堆快照（Node.js）
openclaw debug heap-snapshot --output /tmp/heap-$(date +%s).heapsnapshot

# 3. 对比两个时间点的堆快照（需两个快照文件）
# 在 Chrome DevTools 中打开 .heapsnapshot 文件比对

# 4. 检查历史消息是否被正确清理
openclaw debug memory --check history-cleanup

# 5. 检查 EventEmitter 是否有泄漏
openclaw debug memory --check event-listeners
```

### 常见内存泄漏场景

```javascript
// ❌ 常见错误：全局变量积累会话历史，永不清理
const sessions = {};  // 每个用户的会话都存在这里，从不删除

// ✅ 正确做法：使用 LRU 缓存，自动淘汰旧会话
const LRU = require('lru-cache');
const sessions = new LRU({
  max: 10000,          // 最多缓存 1 万个会话
  ttl: 1000 * 60 * 30, // 30 分钟不活跃则淘汰
});
```

```yaml
# config.yaml 中配置会话清理策略
sessions:
  max_per_user: 1       # 每个用户最多保留 1 个活跃会话
  idle_timeout: 1800    # 30 分钟不活跃则清理
  max_history: 50       # 每个会话最多保留 50 条历史消息
  cleanup_interval: 300 # 每 5 分钟清理一次过期会话
```

### 修复步骤

```bash
# 临时止血：触发 GC 并查看内存变化
openclaw debug gc --force

# 如果内存未降：重启网关（先保证服务可用）
openclaw gateway restart

# 然后拿堆快照慢慢分析
```

---

## 5. 消息队列积压严重

### 现象

- 用户消息发出后，等待超过 2 分钟才收到回复
- 监控中 `openclaw_queue_depth` 持续升高
- 日志中有 `queue.depth > 1000, triggering alert`

### 诊断命令

```bash
# 1. 查看队列当前状态
openclaw queue status

# 输出示例
# Queue: messages
# ├── Waiting:    1,247  ← 积压数量
# ├── Active:         5  (正在处理)
# ├── Completed:  8,432  (今日)
# ├── Failed:        23  (失败)
# └── Workers:        5  (当前 Worker 数)

# 2. 查看失败任务详情
openclaw queue list --status failed --limit 10

# 3. 查看 Worker 处理速度
openclaw queue stats --metric throughput --duration 5m

# 4. 检查是否有 AI 限速
openclaw stats --metric ai_rate_limit_hit --duration 10m
```

### 修复步骤

```bash
# 方案 A：临时扩容 Worker（立竿见影）
openclaw queue scale-workers --count 10   # 从 5 增加到 10 个 Worker

# 方案 B：清理失败任务（减少重试噪音）
openclaw queue retry-failed --max 50      # 重试最近 50 个失败任务
openclaw queue clear-failed --older-than 1h  # 清理 1 小时前的失败任务

# 方案 C：临时降低 AI 模型等级（快模型处理积压）
openclaw config model set-queue-overflow gpt-4o-mini

# 方案 D：发送排队提醒（安抚用户）
openclaw queue notify-pending \
  --threshold 60 \
  --message "系统正在处理大量请求，您的消息将在 1-2 分钟内回复，感谢耐心等待 🙏"
```

### 积压根因分析

| 根因 | 判断依据 | 长期修复 |
|------|---------|---------|
| AI 模型慢（高峰期） | Worker 均在 `model.stream` 状态等待 | 增加熔断 + 备用模型 |
| 突发流量（营销活动） | 消息量比平时多 3 倍+ | 提前预扩容，或开启排队告知 |
| Worker 进程崩溃 | `active_workers < expected_workers` | 修复 Worker 崩溃 Bug |
| Redis 性能瓶颈 | Redis CPU > 80% | 升级 Redis 实例 / 集群化 |

---

## 6. 数据库连接耗尽

### 现象

- 日志中大量 `ER_CON_COUNT_ERROR` 或 `too many connections`
- 所有需要数据库的操作失败
- 会话历史、用户信息无法读取

### 诊断命令

```bash
# 1. 检查连接池状态
openclaw debug db connections

# 2. 检查 MySQL 当前连接数
mysql -u openclaw -p -e "SHOW STATUS LIKE 'Threads_connected';"
mysql -u openclaw -p -e "SHOW PROCESSLIST;" | head -30

# 3. 检查是否有慢查询导致连接被占用
mysql -u openclaw -p -e "SHOW FULL PROCESSLIST;" | grep -i "Query" | awk '$6 > 10'

# 4. 查看连接池配置
openclaw config show | grep -A 10 "database"
```

### 修复步骤

```bash
# 紧急：kill 空闲连接（超过 60 秒未活动）
mysql -u root -p -e "
  SELECT CONCAT('KILL ', id, ';') 
  FROM information_schema.processlist 
  WHERE command = 'Sleep' AND time > 60
" | mysql -u root -p

# 检查并优化连接池配置
```

```yaml
# config.yaml 连接池优化配置
database:
  pool:
    min: 5
    max: 20              # 不要超过 MySQL max_connections 的 80%
    acquire_timeout: 10000
    idle_timeout: 30000
    
    # 连接健康检查（防止使用已断开的连接）
    validate_on_borrow: true
    test_query: "SELECT 1"
    test_interval: 30000
```

```sql
-- MySQL 侧配置（在 my.cnf 中）
max_connections = 200
wait_timeout = 60        -- 空闲连接超时
interactive_timeout = 60
```

---

## 7. AI 回复内容异常

### 现象

- Bot 回复的内容明显不对（幻觉、乱码、不相关）
- 某类问题的回复质量突然下降
- 用户反馈 Bot "变笨了"

### 诊断命令

```bash
# 1. 检查 System Prompt 是否被意外修改
openclaw config show --key ai.system_prompt | md5sum
# 与之前备份的 md5 对比

# 2. 检查上下文窗口是否溢出
openclaw debug context --user USER_ID --last-session

# 3. 查看近期的 AI 请求/响应对
openclaw logs ai --last 20 --show-prompt --show-response

# 4. 检查模型版本是否变更
openclaw diagnose ai --check model-version
```

### 常见原因与修复

```bash
# 原因 1：System Prompt 被意外覆盖
# 修复：从版本控制恢复
git -C ~/.openclaw/prompts log --oneline | head -5
git -C ~/.openclaw/prompts checkout HEAD~1 -- system-prompt.txt
openclaw gateway restart

# 原因 2：上下文历史太长，导致模型"迷失"
# 修复：清理该用户的历史
openclaw session clear --user USER_ID

# 原因 3：OpenAI 更新了模型（gpt-4o 可能有小版本更新）
# 修复：固定模型版本
openclaw config set ai.model "gpt-4o-2024-11-20"  # 固定到具体版本
```

---

## 8. 成本异常飙升

### 现象

- OpenAI 账单告警触发
- 今日花费比昨日高 300%+
- 但用户量没有明显变化

### 诊断命令

```bash
# 1. 查看今日 Token 消耗趋势
openclaw stats --metric tokens_total --duration 24h --breakdown hourly

# 2. 找到 Top 消耗用户
openclaw stats --metric tokens_by_user --top 20 --duration 24h

# 3. 查看最贵的请求
openclaw logs ai --sort cost --limit 20

# 4. 检查是否有循环调用
openclaw debug --check recursive-calls --duration 1h
```

### 典型根因

```bash
# 根因 1：某个用户发送了极长文本（PDF/代码粘贴）
# 查看最大的单次请求
openclaw logs ai --sort tokens_desc --limit 5

# 修复：设置单次请求 Token 上限
openclaw config set ai.max_input_tokens 4000

# 根因 2：Skill 死循环（AI 一直调用工具）
# 修复：设置最大工具调用次数
openclaw config set ai.max_tool_calls 10

# 根因 3：恶意用户刷量
# 查看异常用户
openclaw stats --metric requests_by_user --top 10 | head -5

# 封禁并限流
openclaw user ban USER_ID --reason "abuse"
```

---

## 9. 插件/Skill 加载失败

### 现象

- 特定 Skill 无法触发
- 日志中有 `plugin.load error` 或 `Skill not found`

### 诊断命令

```bash
# 1. 查看所有插件状态
openclaw plugins list

# 2. 查看特定插件错误
openclaw plugins diagnose --name MY_SKILL

# 3. 手动加载测试
openclaw plugins load --name MY_SKILL --verbose
```

### 修复步骤

```bash
# 依赖问题
cd ~/.openclaw/skills/MY_SKILL && npm install

# 权限问题
chmod +x ~/.openclaw/skills/MY_SKILL/index.js

# 配置错误（查看 skill.config.yaml 语法）
openclaw plugins validate --name MY_SKILL

# 重新加载插件（不需要重启网关）
openclaw plugins reload --name MY_SKILL
```

---

## 10. Webhook 回调丢失

### 现象

- 支付/消息回调应该触发的业务逻辑没有执行
- 日志中有 `webhook received` 但后续处理未完成

### 诊断命令

```bash
# 1. 查看 Webhook 接收日志
openclaw gateway logs --grep "webhook" --tail 50

# 2. 检查未处理的回调
openclaw webhooks list --status pending --limit 20

# 3. 验证回调签名是否通过
openclaw webhooks test --provider wxpay --payload /tmp/sample-callback.json
```

### 修复步骤

```bash
# 重放失败的回调（幂等安全）
openclaw webhooks replay --id WEBHOOK_ID

# 批量重放最近 1 小时内失败的回调
openclaw webhooks replay-failed --since "1 hour ago"

# 检查 Webhook 处理代码的幂等性
# 确保相同的回调处理两次不会出错
```

---

## 事后复盘模板

```markdown
## 故障复盘报告

**故障编号**: INC-2026-XXXX
**日期时间**: 2026-03-30 HH:MM - HH:MM（持续 XX 分钟）
**严重程度**: P0 / P1 / P2

### 故障摘要
（一句话描述故障）

### 影响范围
- 受影响渠道：
- 受影响用户数：
- 服务降级时长：

### 时间线
| 时间 | 事件 |
|------|------|
| HH:MM | 告警触发 |
| HH:MM | 开始排查 |
| HH:MM | 定位根因 |
| HH:MM | 修复完成 |
| HH:MM | 服务恢复正常 |

### 根本原因
（技术层面的根本原因）

### 修复措施
（本次采取的具体修复步骤）

### 预防措施
（避免同类问题再次发生的长期措施）

### 经验教训
（本次故障带来的 insights）
```

---

*最后更新：2026-03-30 | 版本 v1.0 | 适用于 OpenClaw v2.x*
