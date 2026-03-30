# 📝 会议纪要工作流

会议结束后，自动生成 AI 纪要并创建飞书文档发送给参会人。

## 效果预览

会议结束 → 自动触发：

```
📋 会议纪要已生成

《产品评审会》2026-03-30 14:00-15:00
参会人：张三、李四、王五

✅ 决议事项
1. 新版本 UI 按方案 B 执行，负责人：张三，截止 4 月 5 日
2. API 性能优化列入下个迭代，负责人：李四

📌 待跟进
- 王五确认第三方接口文档（本周内）

🔗 完整纪要：https://feishu.cn/docs/xxx
```

---

## 工作原理

```
日历事件结束
    ↓
读取会议聊天记录
    ↓
AI 提炼决议 + 待办
    ↓
创建飞书云文档
    ↓
发送链接给全体参会人
```

---

## 前置要求

- 飞书应用已配置
- 启用技能：`feishu-calendar`、`feishu-doc`、`feishu-im`
- 会议在飞书日历中创建并有关联群聊

---

## 配置步骤

### 1. 启用所需技能

```json
{
  "skills": {
    "entries": ["feishu-calendar", "feishu-create-doc", "feishu-im-user-message"]
  }
}
```

### 2. 设置会议结束监听

```json
{
  "cron": {
    "jobs": [
      {
        "name": "会议纪要生成",
        "schedule": {
          "kind": "cron",
          "cron": "0 18 * * 1-5"
        },
        "payload": {
          "kind": "agentTurn",
          "message": "检查今天已结束的会议，生成每个会议的纪要文档并发送给参会人"
        }
      }
    ]
  }
}
```

> 💡 也可以在每次会议结束后手动触发：  
> `生成刚才产品评审会的会议纪要`

---

## 核心代码框架

```javascript
async function generateMeetingNotes(eventId) {
  // 1. 获取会议信息
  const event = await calendar.get(eventId);

  // 2. 读取会议聊天记录
  const messages = await getChatMessages(event.chatId, {
    time_start: event.start_time,
    time_end: event.end_time
  });

  // 3. AI 提炼纪要
  const notes = await ai.summarize(`
    会议：${event.summary}
    时间：${event.start_time} - ${event.end_time}
    聊天记录：${messages.map(m => m.content).join('\n')}

    请提炼：1）主要讨论内容 2）决议事项（含负责人和截止日期）3）待跟进事项
  `);

  // 4. 创建飞书文档
  const doc = await feishu.doc.create({
    title: `${event.summary} - 会议纪要 ${formatDate(event.start_time)}`,
    content: notes
  });

  // 5. 发送给全体参会人
  for (const attendee of event.attendees) {
    await feishu.im.sendMessage(attendee.open_id, `
📋 会议纪要已生成
《${event.summary}》
🔗 ${doc.url}
    `);
  }
}
```

---

## 纪要模板

AI 生成时可以指定格式：

```
请按以下格式生成会议纪要：

# 会议纪要

**会议名称**：
**时间**：
**参会人**：

## 讨论内容
（按话题分段，每段 2-3 句话）

## 决议事项
| 事项 | 负责人 | 截止日期 |
|------|--------|----------|

## 待跟进
- [ ] 事项 1（@负责人）
- [ ] 事项 2（@负责人）
```

---

## 常见问题

**Q: 没有关联群聊怎么办？**
手动触发时直接描述会议内容：`根据以下记录生成会议纪要：[粘贴聊天记录]`

**Q: 如何只发给部分参会人？**
在消息中指定：`生成会议纪要，只发给决策人（张三、李四）`

**Q: 生成的纪要质量不好？**
在 prompt 中增加约束：`提炼要简洁，每个决议必须包含负责人和明确截止日期`

---

## 相关文档

- [飞书云文档快速上手](../basic/doc-quickstart.md)
- [飞书日历 API 详解](../basic/calendar-api.md)
- [技能开发指南](../../advanced/skill-development.md)

---

_最后更新：2026-03-30_
