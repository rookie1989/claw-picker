# 📄 飞书云文档集成指南

完整教程：如何在 OpenClaw 中集成飞书云文档。

## 🎯 功能概览

- ✅ 创建/查询/更新文档
- ✅ 文档内容管理
- ✅ 文档评论
- ✅ 知识库管理
- ✅ 文档搜索

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
    "entries": [
      "feishu-create-doc",
      "feishu-update-doc",
      "feishu-fetch-doc"
    ]
  }
}
```

## 💬 使用示例

### 创建文档

```
创建一个新文档：项目周报，放在技术部文件夹
```

回复：
```
✅ 已创建文档

📄 项目周报
📁 位置：技术部文件夹
🔗 https://feishu.cn/docs/xxx
```

### 更新文档

```
在项目周报末尾追加本周进展
```

回复：
```
✅ 已更新文档

模式：追加
内容：本周进展...
```

### 读取文档

```
读取项目周报的内容
```

回复：
```
📄 项目周报

# 本周进展

1. 完成 API 开发
2. 前端页面 80%
3. 测试用例编写中

# 下周计划

1. 联调测试
2. 准备上线
...
```

### 搜索文档

```
搜索包含"项目报告"的文档
```

回复：
```
🔍 找到 3 个文档

1. 项目周报 - 技术部
2. Q1 项目报告 - 产品部
3. 年度项目总结 - 管理层
```

### 添加评论

```
给项目周报添加评论：记得更新数据
```

回复：
```
✅ 已添加评论

💬 记得更新数据
🕐 2026-03-28 11:45
```

## 🛠️ 高级用法

### 1. 知识库管理

```
在知识库"技术文档"下创建文档
```

```javascript
await doc.create({
  title: "API 规范",
  wiki_space: "技术文档"
});
```

### 2. 文档模板

使用模板创建：
```javascript
await doc.create({
  title: "周报",
  markdown: template.weeklyReport
});
```

### 3. 批量更新

更新多个文档：
```javascript
const docs = await doc.search("周报");
docs.forEach(d => {
  doc.update({
    doc_id: d.id,
    mode: "append",
    markdown: newContent
  });
});
```

### 4. 文档导出

```
导出项目周报为 PDF
```

```javascript
const pdf = await doc.export({
  doc_id: "xxx",
  format: "pdf"
});
```

## 💡 实战场景

### 周报自动生成

```javascript
// 收集数据
const tasks = await task.list({completed: true});
const events = await calendar.list({past_week: true});

// 生成内容
const content = `
# 周报 ${week}

## 完成任务
${tasks.map(t => `- ${t.summary}`).join('\n')}

## 参与会议
${events.map(e => `- ${e.summary}`).join('\n')}
`;

// 创建文档
await doc.create({
  title: `周报-${week}`,
  markdown: content
});
```

### 会议纪要

```javascript
// 会议结束后
const notes = await ai.summarize(chatMessages);
await doc.create({
  title: `${meeting.title} - 会议纪要`,
  markdown: notes,
  share_with: meeting.attendees
});
```

### 文档同步

GitHub README → 飞书文档：
```javascript
const readme = await github.getReadme();
await doc.update({
  doc_id: "xxx",
  mode: "overwrite",
  markdown: readme.content
});
```

---

_最后更新：2026-03-28_
