# 🔄 多通道配置进阶

高级多通道部署、路由、同步策略。

## 🎯 学习目标

完成本教程后，你将能够：
- ✅ 配置多个聊天应用
- ✅ 实现消息路由
- ✅ 同步会话状态
- ✅ 统一用户身份
- ✅ 负载均衡

## 📋 前置要求

- 已安装 OpenClaw
- 至少 2 个聊天应用账号
- 基础配置知识

## 🚀 步骤 1：基础多通道配置

### 1.1 配置多个渠道

编辑 `~/.openclaw/config.json`：

```json
{
  "plugins": {
    "entries": ["telegram", "discord", "feishu"],
    "telegram": {
      "token": "TELEGRAM_BOT_TOKEN"
    },
    "discord": {
      "token": "DISCORD_BOT_TOKEN"
    },
    "feishu": {
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "userToken": "u-xxx"
    }
  }
}
```

### 1.2 重启网关

```bash
openclaw gateway restart
```

### 1.3 验证连接

```bash
openclaw plugins list
```

## 💬 步骤 2：消息路由策略

### 2.1 基于用户类型路由

```javascript
// skills/router.js
module.exports = {
  name: 'smart-router',
  execute: async (context) => {
    const channel = context.channel;
    const user = context.user;
    
    // Telegram 用户 → 快速模型
    if (channel === 'telegram') {
      context.model = 'qwen3.5-lite';
    }
    
    // 飞书用户 → 专业模型
    if (channel === 'feishu') {
      context.model = 'qwen3.5-plus';
    }
    
    // VIP 用户 → GPT-4
    if (isVIP(user)) {
      context.model = 'gpt-4';
    }
    
    return null; // 继续处理
  }
};
```

### 2.2 基于内容路由

```javascript
function routeByContent(message) {
  if (message.includes('代码') || message.includes('bug')) {
    return 'coding-agent';
  }
  if (message.includes('天气') || message.includes('气温')) {
    return 'weather-skill';
  }
  if (message.includes('会议') || message.includes('日程')) {
    return 'feishu-calendar';
  }
  return 'default';
}
```

### 2.3 基于时间路由

```json
{
  "routing": {
    "business_hours": {
      "start": "09:00",
      "end": "18:00",
      "model": "qwen3.5-plus"
    },
    "after_hours": {
      "model": "qwen3.5-lite"
    }
  }
}
```

## 🔄 步骤 3：会话同步

### 3.1 跨通道会话共享

```javascript
// 使用统一会话 ID
const sessionKey = `user:${userId}`;

// 不同渠道共享同一会话
async function getSharedSession(userId, channel) {
  const session = await sessions.get(`user:${userId}`);
  if (!session) {
    return sessions.create(`user:${userId}`);
  }
  return session;
}
```

### 3.2 消息历史同步

```javascript
async function syncMessage(message) {
  // 保存到统一存储
  await db.messages.insert({
    userId: message.user.id,
    channel: message.channel,
    content: message.content,
    timestamp: message.timestamp
  });
  
  // 可选：推送到其他渠道
  if (message.user.linkedChannels) {
    for (const channel of message.user.linkedChannels) {
      if (channel !== message.channel) {
        await sendToChannel(channel, message);
      }
    }
  }
}
```

## 👤 步骤 4：用户身份统一

### 4.1 用户映射表

```javascript
const userMapping = {
  'telegram:123456': {
    unifiedId: 'user_001',
    name: '张三',
    channels: ['telegram', 'feishu']
  },
  'feishu:ou_xxx': {
    unifiedId: 'user_001',
    name: '张三',
    channels: ['telegram', 'feishu']
  }
};
```

### 4.2 自动关联用户

```javascript
async function linkUser(channel, channelId, email) {
  // 通过邮箱关联不同渠道账号
  const existingUser = await db.users.findOne({email});
  
  if (existingUser) {
    await db.users.update(existingUser.id, {
      channels: [...existingUser.channels, {channel, channelId}]
    });
    return existingUser.id;
  }
  
  // 创建新用户
  return await db.users.insert({
    email,
    channels: [{channel, channelId}],
    createdAt: new Date()
  });
}
```

## ⚖️ 步骤 5：负载均衡

### 5.1 多实例部署

```yaml
# docker-compose.yml
version: '3.8'
services:
  openclaw-1:
    image: openclaw/gateway:latest
    environment:
      - INSTANCE_ID=1
      - CHANNELS=telegram,discord
    ports:
      - "3001:3000"
  
  openclaw-2:
    image: openclaw/gateway:latest
    environment:
      - INSTANCE_ID=2
      - CHANNELS=feishu,wechat
    ports:
      - "3002:3000"
  
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
```

### 5.2 Nginx 配置

```nginx
upstream openclaw {
    least_conn;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    
    location / {
        proxy_pass http://openclaw;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 5.3 基于渠道的负载均衡

```javascript
const channelRouting = {
  'telegram': 'instance-1',
  'discord': 'instance-1',
  'feishu': 'instance-2',
  'wechat': 'instance-2'
};

function getInstance(channel) {
  return channelRouting[channel] || 'instance-1';
}
```

## 📊 步骤 6：监控与统计

### 6.1 跨渠道统计

```javascript
async function getChannelStats() {
  const stats = await db.query(`
    SELECT 
      channel,
      COUNT(*) as messages,
      COUNT(DISTINCT user_id) as users,
      AVG(response_time) as avg_response
    FROM messages
    WHERE DATE(timestamp) = DATE(NOW())
    GROUP BY channel
  `);
  
  return stats;
}
```

### 6.2 统一仪表板

```javascript
const dashboard = {
  totalUsers: 1250,
  activeChannels: 4,
  messagesToday: 3500,
  byChannel: {
    telegram: {messages: 1200, users: 450},
    discord: {messages: 800, users: 320},
    feishu: {messages: 1000, users: 380},
    wechat: {messages: 500, users: 100}
  },
  avgResponseTime: '1.2s'
};
```

## 🐛 常见问题

### Q: 消息重复发送？

**A:** 确保每个渠道只配置一次：
```json
{
  "plugins": {
    "entries": ["telegram"]  // 不要重复
  }
}
```

### Q: 会话不同步？

**A:** 使用统一会话存储：
```javascript
// 使用 Redis 共享会话
const session = redis.get(`session:${userId}`);
```

### Q: 用户身份混乱？

**A:** 建立用户映射表，统一标识符。

## 📚 相关资源

- [配置文件速查](../入门指南/03-配置文件速查手册.md)
- [远程部署指南](../guides/remote-deployment-guide.md)
- [Cron 定时任务](../advanced/cron-jobs.md)

---

_最后更新：2026-03-28_
