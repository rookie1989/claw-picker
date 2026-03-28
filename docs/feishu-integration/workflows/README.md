# 🤝 飞书工作流实战

本目录提供基于飞书的实战工作流示例。

## 📁 工作流列表

| 工作流 | 功能 | 难度 | 状态 |
|--------|------|------|------|
| 晨间简报 | 每日自动汇总 | ⭐⭐ | ✅ 完成 |
| 会议纪要 | 自动生成 + 分发 | ⭐⭐⭐ | 🚧 制作中 |
| 周报生成 | 每周自动汇总 | ⭐⭐ | 📋 计划 |
| 项目同步 | GitHub → 飞书 | ⭐⭐⭐ | 📋 计划 |
| 智能提醒 | 条件触发提醒 | ⭐⭐ | 📋 计划 |

## 🌅 晨间简报工作流

**触发时间**：每个工作日 8:00

**流程**：
1. 查询今日日程（飞书日历）
2. 获取天气信息（天气 API）
3. 汇总未读邮件（邮件系统）
4. 生成简报消息
5. 发送到指定渠道

**代码示例**：[晨间简报教程](../../tutorials/03-晨间简报自动化.md)

## 📝 会议纪要工作流

**触发条件**：会议结束后

**流程**：
1. 监听日历事件结束
2. 读取会议聊天记录
3. 调用 AI 生成纪要
4. 创建飞书文档
5. 发送给参会人

**所需技能**：
- `feishu-calendar` - 日历查询
- `feishu-create-doc` - 文档创建
- `feishu-im-user-message` - 消息发送

**代码框架**：
```javascript
async function generateMeetingNotes(eventId) {
  // 1. 获取会议信息
  const event = await calendar.get(eventId);
  
  // 2. 读取聊天记录
  const messages = await getChatMessages(event.chatId);
  
  // 3. AI 生成纪要
  const notes = await ai.summarize(messages);
  
  // 4. 创建文档
  const doc = await createDoc({
    title: `${event.summary} - 会议纪要`,
    content: notes
  });
  
  // 5. 发送给参会人
  for (const attendee of event.attendees) {
    await sendMessage(attendee.id, doc.link);
  }
}
```

## 📊 周报生成工作流

**触发时间**：每周五 18:00

**流程**：
1. 查询本周完成的任务（飞书任务）
2. 查询本周的日历事件
3. 查询代码提交记录（GitHub）
4. 生成周报内容
5. 创建飞书文档并发送

**周报模板**：
```markdown
# 周报 - 2026-W13

## ✅ 本周完成
- 任务 1
- 任务 2

## 📅 会议参与
- 会议 1
- 会议 2

## 🐙 代码贡献
- Commit 1
- Commit 2

## 📝 下周计划
- 计划 1
- 计划 2
```

## 🔄 项目同步工作流

**触发条件**：GitHub Issue/PR 更新

**流程**：
1. 监听 GitHub Webhook
2. 解析事件内容
3. 更新飞书多维表格
4. 发送通知消息

**应用场景**：
- 研发团队任务同步
- 跨部门项目协作
- 进度可视化看板

**配置示例**：
```json
{
  "cron": {
    "jobs": [
      {
        "name": "GitHub 同步",
        "schedule": { "kind": "every", "everyMs": 3600000 },
        "payload": {
          "kind": "agentTurn",
          "message": "同步 GitHub Issue 到飞书"
        }
      }
    ]
  }
}
```

## ⏰ 智能提醒工作流

**触发条件**：条件满足时

**提醒类型**：
- 任务截止前提醒
- 会议开始前提醒
- 生日/纪念日提醒
- 自定义条件提醒

**代码示例**：
```javascript
// 任务截止提醒
async function taskReminder() {
  const tasks = await getTasks({
    due_before: tomorrow,
    completed: false
  });
  
  for (const task of tasks) {
    await sendMessage(task.assignee, `
⏰ 任务提醒
${task.summary}
截止时间：${task.due}
    `);
  }
}
```

## 🛠️ 搭建指南

### 1. 准备环境

- 已安装 OpenClaw
- 飞书应用已创建并授权
- 必要技能已启用

### 2. 配置凭证

```json
{
  "plugins": {
    "feishu": {
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "userToken": "u-xxx"
    }
  }
}
```

### 3. 创建定时任务

```bash
# 添加晨间简报任务
/cron add "每天早上 8 点生成晨间简报"

# 添加周报任务
/cron add "每周五 18 点生成周报"
```

### 4. 测试与调试

```bash
# 手动触发测试
/message 生成晨间简报

# 查看执行日志
openclaw logs --grep cron
```

## 💡 最佳实践

### 1. 错误处理

```javascript
try {
  await runWorkflow();
} catch (error) {
  console.error(`工作流失败：${error.message}`);
  // 发送失败通知
  await sendAlert(error);
}
```

### 2. 幂等性

确保工作流可重复执行：
```javascript
// 检查是否已处理
if (await isProcessed(eventId)) {
  return; // 跳过已处理
}
```

### 3. 日志记录

```javascript
console.log(`[${new Date().toISOString()}] 开始执行工作流`);
console.log(`处理了 ${count} 条记录`);
```

### 4. 性能优化

- 批量 API 调用
- 合理使用缓存
- 避免频繁轮询

## 📚 相关资源

- [飞书 API 文档](https://open.feishu.cn/document/)
- [OpenClaw Cron 教程](../../advanced/cron-jobs.md)
- [技能开发指南](../../advanced/skill-development.md)

## 📮 反馈

遇到问题？提交 [Issue](https://github.com/rookie1989/claw-picker/issues)

---

_最后更新：2026-03-28_
