# 💬 Slack 集成指南

**难度**: ⭐⭐⭐  
**预计时间**: 30-45 分钟  
**前置条件**: 已安装 OpenClaw、拥有 Slack Workspace 管理员权限

---

## 🎯 本文目标

- ✅ 将 OpenClaw 接入 Slack 频道
- ✅ 创建 Slack App 并配置 Bot 权限
- ✅ 实现 Slash Command（斜杠命令）
- ✅ 配置交互式消息（按钮/下拉菜单）
- ✅ 实现 Workflow 自动化触发

---

## 📋 准备工作

### 所需账号和权限

- Slack Workspace 管理员权限（安装 App 需要）
- 或 App 安装请求权限（提交审批由管理员批准）

### 获取 Workspace 信息

```bash
# 登录 Slack 后，从 URL 获取 Workspace ID
# https://app.slack.com/client/T1234ABCD/...
#                              ^^^^^^^^^^
#                              这就是 Workspace ID (Team ID)
```

---

## 🚀 快速接入：Incoming Webhooks

### 适用场景
- 单向推送通知
- 无需处理用户消息
- 5 分钟完成配置

### 步骤 1：创建 Slack App

1. 访问 [Slack API](https://api.slack.com/apps)
2. 点击「Create New App」→「From scratch」
3. 填写 App Name（如 `OpenClaw Bot`）和目标 Workspace
4. 点击「Create App」

### 步骤 2：启用 Incoming Webhooks

1. 左侧菜单 → 「Features」→「Incoming Webhooks」
2. 将开关拨到 **On**
3. 点击页面底部「Add New Webhook to Workspace」
4. 选择要发送消息的频道（如 `#general`）
5. 点击「Allow」，复制 **Webhook URL**

```
https://hooks.slack.com/services/T1234ABCD/B1234ABCD/xxxxxxxxxxxxxxxxxxxxxxxxx
```

### 步骤 3：配置 OpenClaw

```json
{
  "channels": {
    "slack-webhook": {
      "type": "slack-webhook",
      "enabled": true,
      "webhook_url": "https://hooks.slack.com/services/T1234ABCD/B1234ABCD/YOUR_TOKEN",
      "name": "Slack 通知频道",
      "options": {
        "default_channel": "#general",
        "username": "OpenClaw Bot",
        "icon_emoji": ":lobster:"
      }
    }
  }
}
```

### 步骤 4：测试推送

```bash
# 发送测试消息
openclaw send --channel slack-webhook "🦞 OpenClaw 已成功连接 Slack！"

# 发送 Block Kit 消息（富文本）
openclaw send --channel slack-webhook --type blocks '{"text":"测试消息"}'
```

---

## 🤖 完整方案：Slack Bot App（双向交互）

### 步骤 1：配置 Bot 权限

在 Slack App 配置页面 → 「OAuth & Permissions」→「Scopes」添加以下权限：

**Bot Token Scopes（必需）**：

| 权限 | 用途 |
|------|------|
| `chat:write` | 发送消息 |
| `channels:read` | 读取频道列表 |
| `im:read` | 读取私信 |
| `im:write` | 发送私信 |
| `users:read` | 读取用户信息 |
| `app_mentions:read` | 接收 @ 提及 |
| `channels:history` | 读取频道历史 |

**可选权限**：

| 权限 | 用途 |
|------|------|
| `files:read` | 读取文件 |
| `files:write` | 上传文件 |
| `reactions:write` | 添加 Emoji 反应 |
| `commands` | 使用斜杠命令 |

### 步骤 2：安装 App 到 Workspace

1. 「OAuth & Permissions」→ 「Install to Workspace」
2. 授权后复制 **Bot User OAuth Token**（以 `xoxb-` 开头）

```
[你的 Bot Token，格式为 xoxb-开头的字符串]
```

### 步骤 3：配置 Event Subscriptions

1. 左侧「Event Subscriptions」→ 开启 **On**
2. Request URL 填写你的服务器地址：
   ```
   https://your-server.com/webhook/slack
   ```
3. 添加需要监听的事件（Bot Events）：
   - `app_mention` - 有人 @ 机器人
   - `message.im` - 收到私信
   - `message.channels` - 频道消息（谨慎使用）

4. 点击「Save Changes」（需要 URL 验证通过）

### 步骤 4：完整 OpenClaw 配置

```json
{
  "channels": {
    "slack": {
      "type": "slack",
      "enabled": true,
      "bot_token": "xoxb-your-bot-token-here",
      "app_token": "xapp-your-app-token-here",
      "signing_secret": "your_signing_secret",
      "name": "Slack AI 助手",
      "options": {
        "socket_mode": true,
        "listen_events": ["app_mention", "message.im"],
        "auto_reply": true,
        "reply_in_thread": true,
        "add_reaction": "thinking_face",
        "welcome_dm": "👋 Hi！我是 OpenClaw AI 助手，有问题随时问我！"
      }
    }
  }
}
```

> 💡 **推荐使用 Socket Mode**：不需要公网 IP，通过 WebSocket 接收事件，本地开发更方便。

---

## ⚡ Slash Commands（斜杠命令）

### 创建斜杠命令

1. 左侧「Slash Commands」→「Create New Command」
2. 填写命令信息：

| 字段 | 示例值 |
|------|--------|
| Command | `/ai` |
| Request URL | `https://your-server.com/slack/commands` |
| Short Description | `向 AI 提问` |
| Usage Hint | `[你的问题]` |

### 常用命令配置

```json
{
  "slack": {
    "slash_commands": {
      "/ai": {
        "handler": "default-chat",
        "description": "向 AI 助手提问"
      },
      "/summarize": {
        "handler": "summarize-skill",
        "description": "总结频道内容",
        "options": {
          "include_history": true,
          "history_limit": 50
        }
      },
      "/translate": {
        "handler": "translate-skill",
        "description": "翻译文本",
        "preprompt": "请将以下内容翻译成中文"
      },
      "/standup": {
        "handler": "standup-skill",
        "description": "生成站会报告"
      }
    }
  }
}
```

### Slash Command 响应示例

```javascript
// 处理 /ai 命令
openclaw.on('slack:command:/ai', async (command, respond) => {
  const { text, user_name, channel_name } = command;
  
  // 立即响应（Slack 要求 3 秒内响应）
  await respond({
    response_type: 'ephemeral',  // 只有发送者可见
    text: '🤔 正在思考中...'
  });
  
  // 异步处理 AI 回复
  const aiReply = await openclaw.ai.chat(text);
  
  // 发送最终回复
  await respond({
    response_type: 'in_channel',  // 所有人可见
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*@${user_name} 提问：*\n${text}`
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AI 回复：*\n${aiReply}`
        }
      }
    ]
  });
});
```

---

## 🎨 Block Kit 富文本消息

### 常用 Block 类型

```javascript
// 发送卡片消息（Block Kit）
const message = {
  channel: '#team-updates',
  blocks: [
    // 标题
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 每日工作报告',
        emoji: true
      }
    },
    
    // 正文
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*今日完成：*\n• 修复了 3 个 Bug\n• 完成了功能文档\n• 代码 Review 了 2 个 PR'
      },
      accessory: {
        type: 'image',
        image_url: 'https://example.com/chart.png',
        alt_text: '进度图表'
      }
    },
    
    // 分割线
    { type: 'divider' },
    
    // 操作按钮
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '查看详情', emoji: true },
          style: 'primary',
          action_id: 'view_report',
          url: 'https://your-dashboard.com/report'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '生成周报', emoji: true },
          action_id: 'generate_weekly'
        }
      ]
    },
    
    // 上下文信息
    {
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: '🤖 由 OpenClaw 自动生成 | 2026-03-30 09:00'
      }]
    }
  ]
};

await openclaw.getChannel('slack').sendBlock(message);
```

---

## 🔄 Workflow 自动化

### 场景 1：代码部署通知

```javascript
// 监听 CI/CD Webhook，推送 Slack 通知
openclaw.on('github:push', async (event) => {
  const { repo, branch, commit, author } = event;
  
  if (branch === 'main') {
    await openclaw.getChannel('slack').send({
      channel: '#deployments',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🚀 *新版本已部署！*\n
*仓库：* ${repo}
*分支：* ${branch}  
*提交：* \`${commit.slice(0, 7)}\` ${commit.message}
*作者：* ${author}`
          }
        }
      ]
    });
  }
});
```

### 场景 2：智能值班提醒

```javascript
// 每天早上检查 On-Call 日程
const cron = require('node-cron');

cron.schedule('0 8 * * 1-5', async () => {
  const oncall = await getOnCallSchedule();
  
  // 私信给今天值班的人
  await openclaw.getChannel('slack').sendDM(oncall.userId, {
    text: `☀️ 早上好！今天是你的值班日。\n\n📋 值班职责：\n• 处理用户反馈\n• 监控系统告警\n• 协调紧急修复\n\n如有问题，可以问我 /ai [你的问题]`
  });
});
```

### 场景 3：会议纪要自动生成

```javascript
// 监听 Slack 频道消息，生成会议纪要
openclaw.on('slack:message', async (event) => {
  // 检查是否包含 "会议开始" 关键词
  if (event.text.includes('会议开始') || event.text.includes('meeting started')) {
    const channelId = event.channel;
    
    // 开始收集消息
    const collector = openclaw.createMessageCollector(channelId, {
      stopKeywords: ['会议结束', 'meeting ended'],
      maxDuration: 3 * 60 * 60 * 1000  // 最长 3 小时
    });
    
    collector.on('stop', async (messages) => {
      // AI 生成会议纪要
      const summary = await openclaw.ai.summarize(
        messages.map(m => `${m.user}: ${m.text}`).join('\n'),
        { format: '会议纪要', language: 'zh' }
      );
      
      // 发送到频道
      await openclaw.getChannel('slack').send({
        channel: channelId,
        text: '📋 会议纪要已生成',
        blocks: [{
          type: 'section',
          text: { type: 'mrkdwn', text: summary }
        }]
      });
    });
  }
});
```

---

## 🛠️ 常见问题

### Q1: `dispatch_failed` 错误

**原因**：Event Subscriptions 的 Request URL 验证失败  
**解决**：
1. 确认服务正常运行
2. 确认 URL 返回正确的 challenge 响应
3. 检查 `signing_secret` 是否正确

### Q2: 收不到 @ 消息

**原因**：缺少 `app_mentions:read` 权限或未订阅 `app_mention` 事件  
**解决**：检查权限和 Event Subscriptions 配置，重新安装 App

### Q3: Slash Command 超时

**原因**：Slack 要求 3 秒内响应，AI 处理时间较长  
**解决**：
```javascript
// 立即响应，异步处理
await respond({ text: '⏳ 处理中...' });
// 使用 response_url 发送延迟消息
setTimeout(async () => {
  const result = await slowOperation();
  await sendDelayedResponse(command.response_url, result);
}, 0);
```

### Q4: Block Kit 消息不显示

**原因**：JSON 格式错误  
**解决**：使用 [Block Kit Builder](https://app.slack.com/block-kit-builder) 预览和调试

---

## 📚 相关资源

- [Slack API 官方文档](https://api.slack.com/)
- [Block Kit Builder（在线预览）](https://app.slack.com/block-kit-builder)
- [OpenClaw 多通道配置](../advanced/multi-channel.md)
- [企业微信集成指南](./企业微信集成指南.md)
- [定时任务示例](../../examples/cron/)

---

**🎉 完成！现在 OpenClaw 已经是你的 Slack 超级助手了！** 🦞
