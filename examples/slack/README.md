# Slack 集成示例

本目录包含 OpenClaw 与 Slack 集成的代码示例。

## 📁 文件说明

| 文件 | 描述 |
|------|------|
| `slack-bot.js` | Slack Bot 完整示例（Bolt Framework） |

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install @slack/web-api @slack/bolt node-cron
```

### 2. 配置环境变量

```bash
# Bot Token（xoxb- 开头）
export SLACK_BOT_TOKEN="xoxb-your-bot-token"

# Signing Secret（验证消息来源）
export SLACK_SIGNING_SECRET="your-signing-secret"

# App-Level Token（Socket Mode 需要，xapp- 开头）
export SLACK_APP_TOKEN="xapp-your-app-token"

# 报告发送频道
export SLACK_REPORT_CHANNEL="#reports"
export SLACK_STANDUP_CHANNEL="#standup"
```

### 3. 运行示例

```bash
node slack-bot.js
```

## 📖 功能列表

### 消息发送

- ✅ **文本消息** - 简单文本推送
- ✅ **Block Kit 富文本** - 带按钮、图片、字段的卡片消息
- ✅ **AI 回复卡片** - 带反馈按钮的 AI 对话展示
- ✅ **周报卡片** - 结构化工作报告

### 交互处理

- ✅ **@ 提及响应** - 用户 @ 机器人时自动 AI 回复
- ✅ **Slash Commands** - `/ai`、`/standup`
- ✅ **按钮交互** - 处理卡片按钮点击事件

### 自动化

- ✅ **每周五发送周报**
- ✅ **每天站会提醒**

## 💡 使用示例

### @提及对话

在任意频道 @ 机器人：
```
@OpenClaw Bot 如何配置多通道路由？
```

机器人会在同一线程中回复 AI 答案。

### Slash Commands

```bash
# AI 对话
/ai 如何提升 OpenClaw 的响应速度？

# 提交站会报告
/standup
昨天完成了 API 集成
今天计划写单元测试
没有阻碍
```

### 代码调用

```javascript
const { sendBlock, sendWeeklyReport } = require('./slack-bot');

// 发送自定义 Block Kit 消息
await sendBlock('#general', [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Hello World!* 这是来自 OpenClaw 的消息 🦞'
    }
  }
]);

// 发送周报
await sendWeeklyReport('#reports');
```

## 🔑 权限要求

在 Slack App 配置中需要以下 OAuth Scopes：

**Bot Token Scopes：**
- `chat:write` - 发送消息
- `app_mentions:read` - 处理 @ 提及
- `im:read` + `im:write` - 私信
- `channels:history` - 读取频道历史
- `commands` - Slash Commands

## 📚 相关文档

- [Slack 集成指南](../../docs/guides/Slack集成指南.md)
- [Slack Bolt 框架文档](https://slack.dev/bolt-js/)
- [Block Kit Builder](https://app.slack.com/block-kit-builder)
