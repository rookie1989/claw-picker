# 钉钉机器人示例

基于 OpenClaw 的钉钉智能机器人，支持 Stream 模式双向对话。

## 特性

- ✅ **Stream 模式**：无需公网 IP，本地即可运行
- ✅ **多轮对话**：每个用户独立会话上下文
- ✅ **签名验证**：群 Webhook 安全接入
- ✅ **定时播报**：每日 9:00 自动发送摘要
- ✅ **快捷命令**：`/help`、`/clear`

## 快速开始

### 1. 创建钉钉机器人

在[钉钉开放平台](https://open.dingtalk.com)创建企业内部应用：

1. 进入开放平台 → 应用开发 → 企业内部应用
2. 添加能力：**机器人**
3. 在机器人功能页面，开启 **Stream 模式**
4. 记录 `Client ID` 和 `Client Secret`

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入配置
```

```env
DINGTALK_CLIENT_ID=your_client_id
DINGTALK_CLIENT_SECRET=your_client_secret
DINGTALK_APP_KEY=your_app_key
DINGTALK_APP_SECRET=your_app_secret

# 群 Webhook（可选，用于定时播报）
DINGTALK_GROUP_WEBHOOK=https://oapi.dingtalk.com/robot/send?access_token=xxx
DINGTALK_GROUP_SECRET=your_webhook_secret

# AI 配置
AI_MODEL=gpt-4o
OPENAI_API_KEY=your_openai_key
```

### 3. 安装依赖并启动

```bash
npm install
node dingtalk-bot.js
```

### 4. 测试

在钉钉找到机器人对话，发送任意消息即可收到 AI 回复。

## 文件说明

| 文件 | 说明 |
|------|------|
| `dingtalk-bot.js` | 主程序（Stream 模式 + 对话处理） |
| `.env.example` | 环境变量模板 |

## 相关文档

- [钉钉机器人集成指南](../../docs/guides/钉钉机器人集成指南.md)
- [企业微信示例](../wecom/)
- [Slack 示例](../slack/)
