# ✅ 飞书任务集成指南

完整教程：如何在 OpenClaw 中集成飞书任务。

## 🎯 功能概览

- ✅ 创建/查询/更新任务
- ✅ 任务清单管理
- ✅ 子任务管理
- ✅ 任务评论
- ✅ 成员分配

## 🔧 快速配置

```json
{
  "plugins": {
    "feishu": {
      "appId": "cli_xxx",
      "userToken": "u-xxx"
    }
  },
  "skills": {
    "entries": ["feishu-task"]
  }
}
```

## 💬 使用示例

### 创建任务

```
创建一个任务：完成项目报告，下周五截止
```

回复：
```
✅ 已创建任务

📝 完成项目报告
📅 截止：2026-04-04
👤 负责人：你
🔗 https://feishu.cn/task/xxx
```

### 查询任务

```
我有哪些未完成的任务？
```

回复：
```
📋 未完成任务（5 个）

| 任务 | 截止 | 状态 |
|------|------|------|
| 完成项目报告 | 04-04 | 进行中 |
| 准备演示材料 | 03-30 | 未开始 |
| ... |
```

### 完成任务

```
标记"完成项目报告"为已完成
```

回复：
```
✅ 任务已完成

完成项目报告 ✓
完成时间：2026-03-28 11:30
```

### 添加子任务

```
给"完成项目报告"添加子任务：收集数据、撰写初稿、审核修改
```

回复：
```
✅ 已添加 3 个子任务

- [ ] 收集数据
- [ ] 撰写初稿
- [ ] 审核修改
```

### 分配任务

```
把"准备演示材料"分配给张三
```

回复：
```
✅ 已更新负责人

准备演示材料 → 张三
```

## 🛠️ 高级用法

### 1. 任务清单

```
创建一个新的任务清单：Q2 目标
```

```javascript
await tasklist.create({name: "Q2 目标"});
```

### 2. 重复任务

```
每周一创建周报任务
```

```json
{
  "repeat_rule": "RRULE:FREQ=WEEKLY;BYDAY=MO"
}
```

### 3. 任务评论

```
给任务添加评论：需要优先处理
```

```javascript
await comment.create({
  task_guid: "xxx",
  content: "需要优先处理"
});
```

### 4. 任务筛选

```
查看本周到期的任务
```

```javascript
const tasks = await task.list({
  completed: false,
  due_before: next_week_end
});
```

## 💡 实战场景

### 晨间待办

自动汇总今日任务：
```javascript
const todayTasks = await task.list({
  due_today: true,
  completed: false
});
```

### 任务同步

GitHub Issue → 飞书任务：
```javascript
const issues = await github.listIssues();
issues.forEach(issue => {
  task.create({
    summary: issue.title,
    description: issue.body,
    due: issue.milestone?.due_on
  });
});
```

### 截止提醒

任务到期前提醒：
```javascript
const dueSoon = await task.list({
  due_before: tomorrow,
  completed: false
});
dueSoon.forEach(task => {
  sendReminder(task.assignee, task.summary);
});
```

---

_最后更新：2026-03-28_
