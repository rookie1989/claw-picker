# ⏰ Cron 定时任务实战教程

使用 OpenClaw 自动化你的日常工作流。

## 🎯 学习目标

完成本教程后，你将能够：
- ✅ 理解 Cron 表达式
- ✅ 创建定时任务
- ✅ 配置周期性检查
- ✅ 编写定时工作流
- ✅ 调试和监控任务

## 📋 Cron 表达式速查

| 表达式 | 含义 | 示例场景 |
|--------|------|----------|
| `0 9 * * *` | 每天 9:00 | 晨间简报 |
| `0 18 * * *` | 每天 18:00 | 日报汇总 |
| `0 */2 * * *` | 每 2 小时 | 定期检查 |
| `*/30 * * * *` | 每 30 分钟 | 高频监控 |
| `0 10 * * 1` | 每周一 10:00 | 周会提醒 |
| `0 9 1 * *` | 每月 1 号 9:00 | 月报生成 |
| `0 9-18 * * 1-5` | 工作日 9:00-18:00 | 工作时间 |

## 🚀 步骤 1：基础配置

### 1.1 编辑配置文件

编辑 `~/.openclaw/config.json`：

```json
{
  "cron": {
    "jobs": [
      {
        "name": "晨间简报",
        "schedule": {
          "kind": "cron",
          "expr": "0 8 * * *"
        },
        "payload": {
          "kind": "agentTurn",
          "message": "生成今日晨间简报"
        },
        "enabled": true
      }
    ]
  }
}
```

### 1.2 重启网关

```bash
openclaw gateway restart
```

### 1.3 查看任务列表

```bash
/cron list
```

## 📝 步骤 2：创建定时任务

### 方法 1：配置文件

见上方基础配置。

### 方法 2：命令行

```bash
# 添加任务
/cron add "每天早上 8 点生成晨间简报"

# 查看任务
/cron list

# 运行任务
/cron run <job-id>

# 删除任务
/cron remove <job-id>
```

### 方法 3：API 调用

```javascript
await cron.add({
  name: '晨间简报',
  schedule: { kind: 'cron', expr: '0 8 * * *' },
  payload: {
    kind: 'agentTurn',
    message: '生成今日晨间简报'
  }
});
```

## 💡 步骤 3：实战场景

### 场景 1：晨间简报

**时间**：每个工作日 8:00

**配置**：
```json
{
  "name": "晨间简报",
  "schedule": {
    "kind": "cron",
    "expr": "0 8 * * 1-5"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "生成今日晨间简报"
  }
}
```

**工作流**：
```javascript
async function morningBriefing() {
  // 1. 查询今日日程
  const events = await calendar.list({today: true});
  
  // 2. 获取天气
  const weather = await getWeather('上海');
  
  // 3. 检查邮件
  const emails = await getUnreadEmails();
  
  // 4. 生成简报
  return `
☀️ 早安！今日简报

📅 今日日程
${events.map(e => `- ${e.time} ${e.title}`).join('\n')}

🌤️ 天气
${weather}

📬 邮件
${emails.length} 封未读
  `;
}
```

### 场景 2：GitHub Issue 监控

**时间**：每 2 小时

**配置**：
```json
{
  "name": "GitHub 监控",
  "schedule": {
    "kind": "cron",
    "expr": "0 */2 * * *"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "/gh-issues rookie1989/claw-picker --label bug"
  }
}
```

### 场景 3：周报自动生成

**时间**：每周五 18:00

**配置**：
```json
{
  "name": "周报生成",
  "schedule": {
    "kind": "cron",
    "expr": "0 18 * * 5"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "生成本周工作报告"
  }
}
```

**工作流**：
```javascript
async function weeklyReport() {
  // 1. 查询本周完成任务
  const tasks = await task.list({
    completed: true,
    completed_after: last_friday
  });
  
  // 2. 查询本周会议
  const events = await calendar.list({
    past_week: true
  });
  
  // 3. 查询代码提交
  const commits = await github.getCommits({
    since: last_friday
  });
  
  // 4. 生成周报
  const report = `
# 周报 ${week}

## 完成任务
${tasks.map(t => `- ${t.summary}`).join('\n')}

## 参与会议
${events.map(e => `- ${e.summary}`).join('\n')}

## 代码贡献
${commits.map(c => `- ${c.message}`).join('\n')}
  `;
  
  // 5. 创建文档
  await doc.create({
    title: `周报-${week}`,
    markdown: report
  });
  
  return '✅ 周报已生成';
}
```

### 场景 4：服务器监控

**时间**：每 5 分钟

**配置**：
```json
{
  "name": "服务器监控",
  "schedule": {
    "kind": "every",
    "everyMs": 300000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "检查服务器状态"
  }
}
```

**工作流**：
```javascript
async function serverMonitor() {
  const servers = ['web', 'api', 'db'];
  const alerts = [];
  
  for (const server of servers) {
    const status = await checkHealth(server);
    if (!status.healthy) {
      alerts.push(`❌ ${server}: ${status.error}`);
    }
  }
  
  if (alerts.length > 0) {
    await sendAlert(alerts.join('\n'));
  }
  
  return alerts.length ? '⚠️ 发现异常' : '✅ 所有服务正常';
}
```

### 场景 5：生日提醒

**时间**：每天 9:00

**配置**：
```json
{
  "name": "生日提醒",
  "schedule": {
    "kind": "cron",
    "expr": "0 9 * * *"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "检查今日生日"
  }
}
```

**工作流**：
```javascript
async function birthdayReminder() {
  const today = new Date();
  const birthdays = await getBirthdays();
  
  const todayBirthdays = birthdays.filter(b =>
    b.date.getMonth() === today.getMonth() &&
    b.date.getDate() === today.getDate()
  );
  
  if (todayBirthdays.length > 0) {
    const names = todayBirthdays.map(b => b.name).join('、');
    return `🎂 今天${names}生日！记得送祝福～`;
  }
  
  return null; // 无生日，不发送
}
```

## 🔧 步骤 4：高级配置

### 4.1 条件触发

```json
{
  "name": "邮件检查",
  "schedule": {
    "kind": "cron",
    "expr": "0 */30 * * *"
  },
  "payload": {
    "kind": "agentTurn",
    "message": "检查紧急邮件"
  },
  "condition": {
    "type": "business_hours",
    "start": "09:00",
    "end": "18:00",
    "weekdays": [1, 2, 3, 4, 5]
  }
}
```

### 4.2 任务依赖

```json
{
  "name": "部署后通知",
  "schedule": {
    "kind": "event",
    "event": "deployment_complete"
  },
  "depends_on": ["deploy-prod"],
  "payload": {
    "kind": "agentTurn",
    "message": "部署完成，通知团队"
  }
}
```

### 4.3 错误重试

```json
{
  "name": "数据同步",
  "schedule": {
    "kind": "cron",
    "expr": "0 2 * * *"
  },
  "retry": {
    "max_attempts": 3,
    "delay_ms": 60000
  },
  "payload": {
    "kind": "agentTurn",
    "message": "同步数据到备份"
  }
}
```

## 🐛 步骤 5：调试与监控

### 查看任务日志

```bash
# 查看所有任务日志
openclaw logs --grep cron

# 查看特定任务
openclaw logs --grep "晨间简报"

# 实时跟踪
openclaw logs --follow --grep cron
```

### 手动触发测试

```bash
# 立即运行任务
/cron run <job-id>

# 测试消息
/message 生成晨间简报
```

### 禁用/启用任务

```json
{
  "name": "晨间简报",
  "enabled": false  // 临时禁用
}
```

### 修改任务

```bash
# 编辑配置
openclaw config edit

# 重启应用
openclaw gateway restart
```

## 📊 任务管理最佳实践

### 1. 命名规范

```javascript
// ✅ 好的命名
'晨间简报'
'GitHub-Issue-监控'
'服务器健康检查'

// ❌ 避免
'任务 1'
'test'
'asdf'
```

### 2. 时间选择

```javascript
// ✅ 避开高峰
'0 2 * * *'  // 凌晨 2 点

// ❌ 避免高峰
'0 9 * * *'   // 早上 9 点（可能拥堵）
```

### 3. 错误处理

```javascript
async function safeTask() {
  try {
    await doTask();
  } catch (error) {
    console.error('[cron] 任务失败:', error);
    await sendAlert(`任务失败：${error.message}`);
  }
}
```

### 4. 幂等性

```javascript
async function idempotentTask() {
  // 检查是否已执行
  if (await isDone(today)) {
    return '已执行，跳过';
  }
  
  await doTask();
  await markDone(today);
}
```

## 📚 相关资源

- [Cron 表达式生成器](https://crontab.guru/)
- [定时任务示例](../../examples/cron/README.md)
- [技能开发教程](./skill-development-tutorial.md)

## 💡 更多创意

| 场景 | 频率 | 描述 |
|------|------|------|
| 喝水提醒 | 每小时 | 健康提醒 |
| 站立提醒 | 每 2 小时 | 久坐提醒 |
| 新闻摘要 | 每天 8:00 | 热点新闻 |
| 股票收盘 | 工作日 15:30 | 持仓汇总 |
| 备份检查 | 每天 3:00 | 验证备份 |
| 证书到期 | 每周 | SSL 证书检查 |
| 费用统计 | 每月 1 号 | 账单汇总 |

---

_最后更新：2026-03-28_
