# 快速开始 - 5 分钟上手 OpenClaw

本指南将帮助你在 5 分钟内完成 OpenClaw 的基础配置并开始使用。

## 前提条件

- ✅ 已完成 [安装](installation.md)
- ✅ 拥有一个 AI 模型 API 密钥（OpenAI/Anthropic/Perplexity 等）
- ✅ 已安装 WhatsApp/Telegram/Discord 其中之一

## Step 1: 运行初始化向导 (1 分钟)

```bash
openclaw onboard
```

向导会询问：

1. **选择模型提供商**
   ```
   ? Select your AI provider:
     > OpenAI
       Anthropic
       Perplexity
       Custom
   ```

2. **输入 API 密钥**
   ```
   ? Enter your API key: ****************
   ```

3. **选择聊天应用**
   ```
   ? Which channel would you like to connect?
     > WhatsApp
       Telegram
       Discord
       iMessage
       Skip for now
   ```

## Step 2: 配置聊天应用 (2 分钟)

### 选项 A: WhatsApp

1. 扫描二维码连接
   ```bash
   # 按照终端显示的二维码，用手机 WhatsApp 扫描
   ```

2. 等待连接确认
   ```
   ✓ WhatsApp connected successfully
   ```

### 选项 B: Telegram

1. 获取 Bot Token
   - 在 Telegram 中搜索 `@BotFather`
   - 发送 `/newbot` 创建机器人
   - 复制 Bot Token

2. 配置 Token
   ```bash
   openclaw config channel telegram --token YOUR_BOT_TOKEN
   ```

### 选项 C: Discord

1. 创建 Discord 应用
   - 访问 https://discord.com/developers/applications
   - 创建新应用，获取 Bot Token

2. 邀请机器人到服务器
   - 使用 OAuth2 URL 生成器
   - 邀请到你的服务器

3. 配置
   ```bash
   openclaw config channel discord --token YOUR_BOT_TOKEN --guild YOUR_GUILD_ID
   ```

## Step 3: 测试机器人 (1 分钟)

### 发送测试消息

在你的聊天应用中发送：

```
你好，OpenClaw！
```

### 预期响应

```
你好！我是你的 OpenClaw AI 助手。我可以帮助你：

- 编写和调试代码
- 回答技术问题
- 管理任务和日程
- 搜索信息和文档

有什么我可以帮助你的吗？
```

## Step 4: 探索功能 (1 分钟)

### 基础命令

在聊天中发送以下命令测试功能：

```
# 查询帮助
/help

# 查看可用工具
/tools

# 创建任务
/task 完成项目报告 by 明天

# 搜索信息
/search OpenClaw 文档
```

### Web 控制台

访问 `http://localhost:3000` 查看：

- 📊 会话管理
- ⚙️ 配置设置
- 📝 日志查看
- 🔌 插件管理

## 下一步学习

恭喜你完成了快速开始！接下来可以：

1. **[创建第一个机器人](first-bot.md)** - 自定义你的 AI 助手
2. **[多通道配置](../advanced/multi-channel.md)** - 连接多个聊天应用
3. **[高级用法](../advanced/)** - 探索更多功能

## 常用快捷操作

### 查看网关状态
```bash
openclaw gateway status
```

### 重启网关
```bash
openclaw gateway restart
```

### 查看日志
```bash
openclaw gateway logs --tail 50
```

### 停止网关
```bash
openclaw gateway stop
```

## 遇到问题？

- 📖 查看 [安装指南](installation.md) 排查安装问题
- ❓ 访问 [FAQ](../faq/) 查找常见问题
- 💬 在 [社区](https://github.com/openclaw/openclaw/discussions) 提问

---

**提示**: 保存这个页面的链接，方便日后查阅！
