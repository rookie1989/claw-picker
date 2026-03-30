# 多通道配置指南

本教程介绍如何配置 OpenClaw 同时连接多个聊天应用，实现统一的 AI 助手体验。

## 为什么需要多通道？

- 📱 **灵活性**: 在不同场景使用不同聊天应用
- 🔄 **冗余**: 一个通道故障时其他通道仍可用
- 👥 **团队协作**: 不同成员使用偏好的沟通工具
- 🎯 **场景分离**: 工作用 Discord，个人用 WhatsApp，通知用 Telegram

## 支持的平台

| 平台 | 状态 | 特性 |
|------|------|------|
| WhatsApp | ✅ 稳定 | 消息、媒体、群组 |
| Telegram | ✅ 稳定 | 消息、媒体、机器人命令 |
| Discord | ✅ 稳定 | 消息、媒体、服务器管理 |
| iMessage | ✅ 稳定 | 消息、媒体（仅 macOS） |
| Mattermost | 🔌 插件 | 消息、文件 |
| 飞书/Lark | 🔌 插件 | 消息、日历、文档、多维表格 |

## 架构设计

```
┌─────────────┐
│  WhatsApp   │────┐
└─────────────┘    │
                   │
┌─────────────┐    │    ┌──────────────┐
│  Telegram   │────┼───→│ OpenClaw     │
└─────────────┘    │    │ Gateway      │
                   │    └──────────────┘
┌─────────────┐    │           │
│   Discord   │────┘           ↓
└─────────────┘         ┌──────────────┐
                        │   AI Agent   │
                        └──────────────┘
```

**关键概念**:
- 所有通道共享同一个 AI Agent 实例
- 会话隔离：每个聊天会话独立记忆
- 统一配置：集中管理所有通道

## 配置步骤

### 前置条件

- ✅ 已完成基础安装和单通道配置
- ✅ 拥有各平台的开发者账号/API 权限
- ✅ 了解各平台的基本配置方法

### Step 1: 准备 API 凭证

#### WhatsApp
- 无需额外配置（使用二维码扫描）

#### Telegram
- Bot Token（从 @BotFather 获取）

#### Discord
- Bot Token
- Guild ID（服务器 ID）
- Channel ID（可选，指定默认频道）

#### 飞书/Lark
- App ID
- App Secret
- Verification Token

### Step 2: 配置多通道

#### 方法 A: 使用 CLI 配置

```bash
# 添加 Telegram 通道
openclaw config channel telegram add \
  --token YOUR_TELEGRAM_BOT_TOKEN \
  --name "Telegram Assistant"

# 添加 Discord 通道
openclaw config channel discord add \
  --token YOUR_DISCORD_BOT_TOKEN \
  --guild YOUR_GUILD_ID \
  --name "Discord Bot"

# 添加飞书通道
openclaw config channel feishu add \
  --app-id YOUR_APP_ID \
  --app-secret YOUR_APP_SECRET \
  --name "Feishu Assistant"

# 查看所有通道
openclaw config channel list
```

#### 方法 B: 编辑配置文件

编辑 `~/.openclaw/config.json`：

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "name": "WhatsApp Primary"
    },
    "telegram": {
      "enabled": true,
      "token": "YOUR_TELEGRAM_BOT_TOKEN",
      "name": "Telegram Assistant"
    },
    "discord": {
      "enabled": true,
      "token": "YOUR_DISCORD_BOT_TOKEN",
      "guildId": "YOUR_GUILD_ID",
      "name": "Discord Bot"
    },
    "feishu": {
      "enabled": true,
      "appId": "YOUR_APP_ID",
      "appSecret": "YOUR_APP_SECRET",
      "name": "Feishu Assistant"
    }
  }
}
```

### Step 3: 重启网关

```bash
# 重启使配置生效
openclaw gateway restart

# 验证通道状态
openclaw gateway status
```

预期输出：
```
Gateway is running
Channels: 4
  ✓ WhatsApp: connected
  ✓ Telegram: connected
  ✓ Discord: connected
  ✓ Feishu: connected
```

## 高级配置

### 1. 通道特定配置

为不同通道设置不同的行为：

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "settings": {
        "maxMessageLength": 4096,
        "enableMedia": true,
        "responseDelay": 500
      }
    },
    "telegram": {
      "enabled": true,
      "settings": {
        "enableCommands": true,
        "commands": {
          "/help": "显示帮助信息",
          "/status": "查看系统状态"
        }
      }
    },
    "discord": {
      "enabled": true,
      "settings": {
        "prefix": "!",
        "allowDM": false,
        "allowedChannels": ["channel-id-1", "channel-id-2"]
      }
    }
  }
}
```

### 2. 会话隔离策略

#### 全局会话（默认）
所有通道共享会话历史：

```json
{
  "session": {
    "isolation": "global"
  }
}
```

#### 按通道隔离
每个通道独立会话：

```json
{
  "session": {
    "isolation": "channel"
  }
}
```

#### 按用户隔离
每个用户独立会话（推荐团队协作）：

```json
{
  "session": {
    "isolation": "user"
  }
}
```

### 3. 消息路由规则

配置特定消息类型路由到特定通道：

```json
{
  "routing": {
    "rules": [
      {
        "pattern": "紧急|urgent|emergency",
        "channels": ["telegram", "whatsapp"],
        "priority": "high"
      },
      {
        "pattern": "日报|report",
        "channels": ["feishu"],
        "priority": "normal"
      }
    ]
  }
}
```

### 4. 媒体处理配置

```json
{
  "media": {
    "maxSize": 20971520,
    "allowedTypes": ["image/*", "application/pdf"],
    "storage": {
      "type": "local",
      "path": "/tmp/openclaw/media"
    }
  }
}
```

## 测试与验证

### 测试清单

- [ ] 每个通道都能发送消息
- [ ] AI 响应正常
- [ ] 媒体文件可发送和接收
- [ ] 会话历史正确保存
- [ ] 通道间会话隔离符合预期

### 测试脚本

```bash
#!/bin/bash
# test-channels.sh

echo "Testing WhatsApp..."
# 发送测试消息到 WhatsApp

echo "Testing Telegram..."
# 发送测试消息到 Telegram

echo "Testing Discord..."
# 发送测试消息到 Discord

echo "All channels tested!"
```

## 故障排查

### 问题 1: 某个通道连接失败

**排查步骤**:
```bash
# 1. 查看该通道日志
openclaw gateway logs | grep -i telegram

# 2. 验证 API 凭证
openclaw config channel telegram test

# 3. 检查网络连通性
curl -X POST https://api.telegram.org/botYOUR_TOKEN/getMe
```

### 问题 2: 消息重复响应

**原因**: 多个通道配置了相同的 webhook

**解决方案**:
```json
{
  "channels": {
    "telegram": {
      "webhook": {
        "unique": true,
        "path": "/webhook/telegram"
      }
    }
  }
}
```

### 问题 3: 会话混乱

**排查**:
```bash
# 查看会话状态
openclaw sessions list

# 清除问题会话
openclaw sessions delete SESSION_ID
```

## 最佳实践

### 1. 通道命名规范

```
✅ 推荐：
- whatsapp-work
- telegram-personal
- discord-team

❌ 避免：
- channel1
- test
- tmp
```

### 2. 监控与告警

```json
{
  "monitoring": {
    "enabled": true,
    "alerts": {
      "channelDown": true,
      "highLatency": true,
      "errorRate": 0.1
    },
    "notify": {
      "channel": "telegram",
      "threshold": 3
    }
  }
}
```

### 3. 定期维护

```bash
# 每周检查通道状态
openclaw config channel list

# 每月清理旧会话
openclaw sessions prune --older-than 30d

# 每季度更新凭证
# 轮换 API tokens
```

## 性能优化

### 1. 连接池配置

```json
{
  "connectionPool": {
    "maxConnections": 10,
    "idleTimeout": 30000,
    "acquireTimeout": 5000
  }
}
```

### 2. 消息队列

```json
{
  "queue": {
    "enabled": true,
    "maxSize": 1000,
    "workers": 4
  }
}
```

## 安全建议

1. **API 凭证管理**
   - 使用环境变量存储敏感信息
   - 定期轮换密钥
   - 限制凭证权限范围

2. **访问控制**
   - Discord: 限制允许的频道
   - Telegram: 验证用户 ID
   - 飞书：配置可见范围

3. **数据加密**
   - 启用传输加密 (HTTPS)
   - 敏感数据本地加密存储

## 参考资源

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Discord Developer Docs](https://discord.com/developers/docs)
- [飞书开放平台](https://open.feishu.cn/document)
- [OpenClaw 通道配置](https://docs.openclaw.ai/channels/)

---

**下一步**: 学习 [自定义插件开发](custom-plugins.md) 扩展更多功能！

---

> 📈 **进阶版** → [多渠道进阶](./multi-channel-advanced.md)：渠道级权限控制、消息路由策略、跨渠道会话同步
