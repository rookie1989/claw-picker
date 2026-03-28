# 🛠️ 技能示例

本目录提供自定义技能的完整示例代码。

## 📁 示例列表

| 示例 | 功能 | 难度 | 文件 |
|------|------|------|------|
| 天气查询技能 | 查询任意城市天气 | ⭐ | `weather-skill.js` |
| 智能提醒技能 | 定时/条件提醒 | ⭐⭐ | `reminder-skill.js` |

## 🚀 什么是技能？

技能是 OpenClaw 的可扩展功能模块，允许你：
- 调用外部 API
- 执行系统命令
- 管理文件和数据
- 与其他服务集成

## 📖 创建你的第一个技能

### 1. 创建技能目录

```bash
mkdir -p ~/.openclaw/skills/my-skill
```

### 2. 编写 SKILL.md

```markdown
# my-skill

描述你的技能功能...

**当以下情况时使用此技能**：
(1) 用户提到关键词...
(2) 需要执行某操作...
```

### 3. 编写技能逻辑

```javascript
// skill.js
module.exports = {
  name: 'my-skill',
  execute: async (context, params) => {
    // 你的逻辑
    return '结果';
  }
};
```

### 4. 注册技能

在 `~/.openclaw/config.json` 中添加：

```json
{
  "skills": {
    "entries": ["my-skill"]
  }
}
```

## 💡 技能示例解析

### 天气查询技能

```javascript
// 1. 解析用户输入的城市
const city = extractCity(message);

// 2. 调用天气 API
const weather = await fetch(`https://wttr.in/${city}?format=j1`);

// 3. 格式化返回
return `🌤️ ${city} 今天 ${weather.temp}°C，${weather.desc}`;
```

### 智能提醒技能

```javascript
// 1. 解析提醒内容和时间
const { text, time } = parseReminder(message);

// 2. 创建 cron 任务
await cron.add({
  schedule: { kind: 'at', at: time },
  payload: { kind: 'systemEvent', text: `⏰ 提醒：${text}` }
});

// 3. 确认创建
return `✅ 已设置提醒：${time}`;
```

## 🔧 技能开发最佳实践

### 1. 明确的触发条件

在 SKILL.md 中清晰描述何时使用该技能，避免误触发。

### 2. 错误处理

```javascript
try {
  const result = await api.call();
  return result;
} catch (error) {
  return `❌ 操作失败：${error.message}`;
}
```

### 3. 用户反馈

技能执行后应返回清晰的反馈，包括：
- ✅ 成功结果
- ❌ 失败原因
- 💡 后续建议

### 4. 权限控制

敏感操作（删除、外部 API）应先确认：

```javascript
if (requiresConfirmation) {
  return `⚠️ 确认执行？回复"是"继续`;
}
```

## 📚 更多资源

- [技能开发教程](../../docs/advanced/skill-development.md)
- [技能创建工具](../../skills/skill-creator/SKILL.md)
- [官方技能列表](https://github.com/openclaw/openclaw/tree/main/skills)

## 🎯 灵感来源

不知道创建什么技能？试试这些：

- 📧 邮件摘要技能
- 📊 数据报表技能
- 🎵 音乐推荐技能
- 📱 社交媒体发布技能
- 🏠 智能家居控制技能
- 💰 记账/预算跟踪技能

## 📮 反馈

遇到问题？提交 [Issue](https://github.com/rookie1989/claw-picker/issues)
