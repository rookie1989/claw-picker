# OpenClaw × Notion 集成示例

本示例演示如何将 OpenClaw 多通道 AI 网关与 Notion 深度集成，实现智能知识管理与自动化工作流。

## 功能概览

| 功能 | 说明 |
|------|------|
| 批量 AI 摘要 | 自动读取数据库页面，用 AI 生成摘要并写回 |
| 消息→Notion | 飞书/企微/钉钉消息一键整理为结构化 Notion 文档 |
| 知识库问答 | 基于 Notion 内容回答问题（RAG 模式） |
| 每日报告 | 自动汇总当日更新，推送到企微/飞书/钉钉 |

## 快速开始

### 1. 安装依赖

```bash
npm install @notionhq/client axios dotenv
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

`.env` 文件内容：

```env
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENCLAW_URL=http://localhost:3000
OPENCLAW_API_KEY=your-openclaw-api-key
OPENCLAW_CHANNEL=default
WEBHOOK_URL=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
```

### 3. 获取 Notion Token

1. 访问 [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. 创建新 Integration，选择「Internal Integration」
3. 复制 Token（`secret_` 开头）
4. 在目标数据库页面右上角 → 「...」→「Add connections」→ 添加你的 Integration

### 4. 获取数据库 ID

打开 Notion 数据库页面，URL 格式为：
```
https://www.notion.so/{workspace}/{DATABASE_ID}?v=...
```
复制 `DATABASE_ID`（32位字符串）。

## 使用方法

### 批量 AI 摘要处理

处理数据库中 `Status = 待处理` 的所有页面：

```bash
node notion-sync.js summarize
```

**数据库字段要求**：
- `Name`（Title）- 页面标题
- `Status`（Select）- 处理状态，需有 `待处理` / `AI已处理` 选项
- `AI摘要`（Rich Text）- 用于存储 AI 摘要
- `处理时间`（Date）- 处理时间戳

### 知识库问答

```bash
node notion-sync.js ask "飞书机器人如何配置 WebSocket 模式？"
```

自动搜索 Notion 内容，基于检索结果回答问题（RAG 模式）。

### 消息同步到 Notion

```bash
node notion-sync.js sync "今天客户反馈了连接超时问题，需要检查连接池配置，预计下周修复"
```

AI 自动将消息整理为结构化文档（标题 + 要点 + 背景 + 行动建议）存入 Notion。

### 生成每日报告

```bash
# 使用环境变量中的 Webhook
node notion-sync.js report

# 或指定 Webhook URL
node notion-sync.js report https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx
```

## 作为模块引用

```javascript
const {
  messageToNotion,
  searchAndAnswer,
  batchSummarize,
  generateDailyReport
} = require('./notion-sync');

// 在飞书/企微 Bot 中接收消息并同步到 Notion
app.post('/webhook', async (req, res) => {
  const message = req.body.text;
  
  // 判断是否为"保存到 Notion"指令
  if (message.startsWith('/save ')) {
    const content = message.slice(6);
    await messageToNotion(content, '飞书消息');
    res.json({ reply: '✅ 已保存到 Notion 知识库' });
  }
  
  // 知识库问答
  else if (message.startsWith('/ask ')) {
    const question = message.slice(5);
    const answer = await searchAndAnswer(question);
    res.json({ reply: answer });
  }
});

// 每天定时发送报告
const cron = require('node-cron');
cron.schedule('0 18 * * 1-5', async () => {
  await generateDailyReport(process.env.WEBHOOK_URL);
});
```

## OpenClaw 渠道配置建议

在 OpenClaw 管理后台为 Notion 集成创建专属渠道：

```yaml
# openclaw-config.yaml
channels:
  - name: notion-assistant
    model: gpt-4o
    system_prompt: |
      你是一个专业的知识管理助手，擅长：
      1. 将零散信息整理为结构化文档
      2. 提炼长文本的核心要点
      3. 基于已有知识回答问题
      请保持回答简洁、专业，使用中文。
    temperature: 0.3
    max_tokens: 2000
```

## 注意事项

- Notion API 限流：100 请求/秒，批量处理时建议加 500ms 延迟
- AI摘要字段限制 2000 字符（Notion Rich Text 上限）
- 数据库字段名区分大小写，需与代码中保持一致
- Integration 需要「Read」和「Update」权限才能读写页面

## 相关文档

- [OpenClaw 快速入门](../../docs/getting-started/quick-start.md)
- [飞书深度集成](../../docs/feishu-integration/)
- [数据持久化与备份](../../docs/advanced/data-persistence.md)
