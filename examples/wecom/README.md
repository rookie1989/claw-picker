# 企业微信集成示例

本目录包含 OpenClaw 与企业微信集成的代码示例。

## 📁 文件说明

| 文件 | 描述 |
|------|------|
| `wecom-bot.js` | 企业微信群机器人完整示例 |

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install axios node-cron
```

### 2. 配置环境变量

```bash
# 企业微信群机器人 Webhook URL
export WECOM_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY"

# 签名 Secret（启用加签模式时需要）
export WECOM_SECRET="SECxxxxxxxxxxxxxxxxxx"
```

### 3. 运行示例

```bash
node wecom-bot.js
```

## 📖 功能列表

### 消息类型

- ✅ **文本消息** - 支持 @成员、@全员
- ✅ **Markdown 消息** - 富文本格式，支持标题/列表/链接
- ✅ **图文消息（News）** - 带图片的卡片链接
- ✅ **模板卡片** - 带操作按钮的任务卡片

### 自动化功能

- ✅ **每日早报** - 每天 9:00 自动发送工作提醒
- ✅ **项目进度通知** - 可视化进度条展示
- ✅ **告警通知** - 支持 critical/warning/info 三个级别

## 💡 使用示例

### 发送文本消息

```javascript
const { sendText } = require('./wecom-bot');

// 发送普通文本
await sendText('Hello World!');

// @指定成员
await sendText('请查看这个 Bug！', {
  mentionList: ['zhangsan', 'lisi'],
  mentionMobiles: ['13800138000']
});

// @所有人
await sendText('紧急通知！', {
  mentionList: ['@all']
});
```

### 发送 Markdown 消息

```javascript
const { sendMarkdown } = require('./wecom-bot');

await sendMarkdown(`## 📊 项目周报
  
**本周完成：**
- ✅ 功能开发
- ✅ 单元测试

**下周计划：**
- 性能优化
- 文档更新`);
```

### 发送告警通知

```javascript
const { sendAlert } = require('./wecom-bot');

await sendAlert({
  level: 'critical',          // critical / warning / info
  title: '生产环境异常',
  detail: 'API 服务响应超时，P99 延迟达到 30s',
  oncallUser: 'zhangsan'      // 企业微信 userid
});
```

### 启动每日日报

```javascript
const { startDailyReport } = require('./wecom-bot');

startDailyReport();
// 每天工作日 9:00 自动发送日报
```

## 🔒 安全配置

建议使用「加签」模式防止 Webhook URL 泄露被滥用：

1. 在群机器人设置中选择「加签」
2. 复制 Secret
3. 设置 `WECOM_SECRET` 环境变量

详细配置见 [企业微信集成指南](../../docs/guides/企业微信集成指南.md)

## 📚 相关文档

- [企业微信集成指南](../../docs/guides/企业微信集成指南.md)
- [企业微信官方文档](https://developer.work.weixin.qq.com/document/path/91770)
