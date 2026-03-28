# 📦 Notion 集成示例

本目录提供 Notion 集成的完整示例代码。

## 📁 示例列表

| 示例 | 功能 | 难度 | 文件 |
|------|------|------|------|
| 页面创建器 | 自动创建 Notion 页面 | ⭐⭐ | `page-creator.js` |
| 数据库管理器 | 管理 Notion 数据库 | ⭐⭐⭐ | `database-manager.js` |

## 🚀 快速开始

### 1. 获取 Notion Token

1. 访问 https://www.notion.so/my-integrations
2. 创建新集成
3. 复制 Internal Integration Token

### 2. 配置环境变量

```bash
export NOTION_TOKEN=secret_xxx
```

或在 `~/.openclaw/config.json` 中添加：

```json
{
  "env": {
    "NOTION_TOKEN": "secret_xxx"
  }
}
```

### 3. 共享页面到集成

1. 打开要访问的 Notion 页面
2. 点击右上角 `•••` → `Connect to`
3. 选择你的集成

### 4. 运行示例

```bash
node examples/notion/page-creator.js
```

## 📖 使用场景

### 知识管理
- 自动归档聊天记录到 Notion
- 会议纪要自动生成页面
- 学习笔记自动整理

### 任务管理
- OpenClaw 任务同步到 Notion
- 项目进度自动更新
- 待办事项双向同步

### 内容创作
- 博客草稿自动创建
- 内容日历管理
- 发布状态跟踪

## 🔧 常用 API

### 创建页面

```javascript
const response = await fetch('https://api.notion.com/v1/pages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
  },
  body: JSON.stringify({
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: { title: [{ text: { content: '新页面' } }] }
    }
  })
});
```

### 查询数据库

```javascript
const response = await fetch('https://api.notion.com/v1/databases/DATABASE_ID/query', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
  }
});
```

### 更新页面

```javascript
const response = await fetch(`https://api.notion.com/v1/pages/${PAGE_ID}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${NOTION_TOKEN}`,
    'Content-Type': 'application/json',
    'Notion-Version': '2022-06-28'
  },
  body: JSON.stringify({
    properties: {
      Status: { select: { name: '已完成' } }
    }
  })
});
```

## 💡 最佳实践

### 1. 错误处理

```javascript
try {
  const page = await createPage(data);
} catch (error) {
  if (error.status === 404) {
    console.error('页面或数据库不存在');
  } else if (error.status === 403) {
    console.error('权限不足，检查集成配置');
  }
}
```

### 2. 速率限制

Notion API 限制：每秒 3 次请求

```javascript
// 添加延迟
await new Promise(resolve => setTimeout(resolve, 400));
```

### 3. 缓存

```javascript
// 缓存数据库结构
const cache = new Map();
async function getDatabaseSchema(id) {
  if (cache.has(id)) return cache.get(id);
  const schema = await fetchSchema(id);
  cache.set(id, schema);
  return schema;
}
```

## 📚 更多资源

- [Notion API 文档](https://developers.notion.com/)
- [Notion 集成教程](https://developers.notion.com/docs/create-a-notion-integration)
- [OpenClaw 技能开发](../../docs/advanced/skill-development.md)

## 📮 反馈

遇到问题？提交 [Issue](https://github.com/rookie1989/claw-picker/issues)
