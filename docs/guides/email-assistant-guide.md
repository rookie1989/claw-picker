# 📧 个人邮件助理搭建指南

30 分钟打造你的个人 AI 邮件助理，自动汇总、分类、回复邮件。

## 🎯 效果预览

搭建完成后，你可以：

```
查看未读邮件
```
```
📬 未读邮件（5 封）

🔴 紧急（1 封）
- 老板：项目进度确认

📋 普通（4 封）
- 团队：周报提醒
- 系统：服务器告警
- ...
```

```
回复上一封邮件：收到，明天提交
```
```
✅ 已回复

收件人：老板
主题：Re: 项目进度确认
内容：收到，明天提交
```

## 📋 前置要求

- 已安装 OpenClaw
- 有邮箱账号（Gmail/Outlook/企业邮箱）
- 基础配置知识

## 🚀 步骤 1：配置邮件访问

### 方法 1：使用 himalaya（推荐）

himalaya 是命令行邮件客户端，支持 IMAP/SMTP。

#### 1.1 安装 himalaya

```bash
# macOS
brew install himalaya

# Linux
curl --proto '=https' --tlsv1.2 -sSf https://himalaya.app/install.sh | sh
```

#### 1.2 配置邮箱

创建 `~/.config/himalaya/config.toml`：

```toml
accounts = [
  {
    name = "personal",
    display-name = "我的邮箱",
    email = "you@example.com",
    
    imap = {
      host = "imap.example.com",
      port = 993,
      username = "you@example.com",
      password = "your-password"
    },
    
    smtp = {
      host = "smtp.example.com",
      port = 587,
      username = "you@example.com",
      password = "your-password"
    }
  }
]
```

#### 1.3 测试配置

```bash
# 查看收件箱
himalaya inbox

# 发送邮件
himalaya send -t recipient@example.com -s "主题" -b "正文"
```

### 方法 2：使用邮件 API

如果使用 Gmail，可以使用 Gmail API：

```javascript
const { google } = require('googleapis');

const gmail = google.gmail({
  version: 'v1',
  auth: oauth2Client
});
```

## 🛠️ 步骤 2：创建邮件技能

### 2.1 创建技能目录

```bash
mkdir -p ~/.openclaw/skills/email-assistant
cd ~/.openclaw/skills/email-assistant
```

### 2.2 编写 SKILL.md

```markdown
# email-assistant

个人邮件助理，支持查询、回复、发送邮件。

**当以下情况时使用此技能**：
(1) 用户提到"邮件"、"email"、"信箱"
(2) 用户说"查看未读"、"有新邮件吗"
(3) 用户说"回复邮件"、"发送邮件"
```

### 2.3 编写 skill.js

```javascript
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

module.exports = {
  name: 'email-assistant',
  
  execute: async (context, params) => {
    const message = context.message.toLowerCase();
    
    // 1. 识别意图
    if (message.includes('查看') || message.includes('未读')) {
      return await listUnreadEmails();
    }
    
    if (message.includes('回复')) {
      return await replyToLastEmail(extractReplyContent(message));
    }
    
    if (message.includes('发送')) {
      return await sendEmail(extractEmailDetails(message));
    }
    
    return '📧 我可以帮你：查看未读邮件、回复邮件、发送邮件。请告诉我具体需求。';
  }
};

// 列出未读邮件
async function listUnreadEmails() {
  const { stdout } = await execAsync('himalaya inbox --limit 10');
  const emails = parseEmails(stdout);
  
  const urgent = emails.filter(e => isUrgent(e));
  const normal = emails.filter(e => !isUrgent(e));
  
  let response = `📬 未读邮件（${emails.length}封）\n\n`;
  
  if (urgent.length > 0) {
    response += '🔴 紧急\n';
    urgent.forEach(e => {
      response += `- ${e.from}：${e.subject}\n`;
    });
    response += '\n';
  }
  
  if (normal.length > 0) {
    response += '📋 普通\n';
    normal.forEach(e => {
      response += `- ${e.from}：${e.subject}\n`;
    });
  }
  
  return response;
}

// 回复邮件
async function replyToLastEmail(content) {
  const { stdout } = await execAsync('himalaya inbox --limit 1');
  const lastEmail = parseEmail(stdout)[0];
  
  await execAsync(`himalaya send -t ${lastEmail.from} -s "Re: ${lastEmail.subject}" -b "${content}"`);
  
  return `✅ 已回复\n\n收件人：${lastEmail.from}\n主题：Re: ${lastEmail.subject}`;
}

// 发送邮件
async function sendEmail(details) {
  const { to, subject, body } = details;
  await execAsync(`himalaya send -t ${to} -s "${subject}" -b "${body}"`);
  return `✅ 已发送\n\n收件人：${to}\n主题：${subject}`;
}

// 解析邮件列表
function parseEmails(text) {
  // 解析 himalaya 输出
  return text.split('\n').filter(line => line.trim()).map(line => {
    const [id, from, subject, date] = line.split('\t');
    return { id, from, subject, date };
  });
}

// 判断是否紧急
function isUrgent(email) {
  const urgentKeywords = ['紧急', 'urgent', 'asap', '老板', 'alert'];
  return urgentKeywords.some(k => 
    email.subject.toLowerCase().includes(k) || 
    email.from.toLowerCase().includes(k)
  );
}

// 提取回复内容
function extractReplyContent(message) {
  const match = message.match(/回复 [：:]\s*(.+)/);
  return match ? match[1] : '收到';
}

// 提取邮件详情
function extractEmailDetails(message) {
  // 简化解析，实际应使用 NLP
  return {
    to: 'recipient@example.com',
    subject: '主题',
    body: '正文'
  };
}
```

## 📝 步骤 3：启用技能

### 3.1 配置 OpenClaw

编辑 `~/.openclaw/config.json`：

```json
{
  "skills": {
    "entries": ["email-assistant"]
  }
}
```

### 3.2 重启网关

```bash
openclaw gateway restart
```

## ✅ 步骤 4：测试功能

### 查看未读邮件

```
查看未读邮件
```

### 回复邮件

```
回复上一封邮件：收到，明天提交
```

### 发送邮件

```
发送邮件给 team@example.com，主题：周报，内容：本周完成...
```

## 🚀 进阶功能

### 1. 邮件摘要

```javascript
async function summarizeEmails() {
  const emails = await getUnreadEmails();
  const summary = await ai.summarize(emails.map(e => e.body));
  return `📧 邮件摘要\n\n${summary}`;
}
```

### 2. 智能分类

```javascript
function categorizeEmails(emails) {
  return {
    work: emails.filter(e => isWork(e)),
    personal: emails.filter(e => isPersonal(e)),
    spam: emails.filter(e => isSpam(e))
  };
}
```

### 3. 自动回复

```javascript
async function autoReply() {
  const emails = await getUnreadEmails();
  for (const email of emails) {
    if (isAutoReplyable(email)) {
      const reply = await generateReply(email);
      await sendReply(email.from, reply);
    }
  }
}
```

### 4. 定时检查

```json
{
  "cron": {
    "jobs": [
      {
        "name": "邮件检查",
        "schedule": { "kind": "every", "everyMs": 1800000 },
        "payload": {
          "kind": "agentTurn",
          "message": "检查新邮件"
        }
      }
    ]
  }
}
```

## 🐛 常见问题

### Q: himalaya 无法连接？

**A:** 检查：
1. IMAP/SMTP 配置是否正确
2. 防火墙是否阻止
3. 是否需要应用专用密码

### Q: 中文乱码？

**A:** 确保终端编码为 UTF-8：
```bash
export LANG=zh_CN.UTF-8
```

### Q: 如何支持多个邮箱？

**A:** 在 himalaya 配置中添加多个 accounts，技能中支持切换：
```javascript
async function switchAccount(name) {
  await execAsync(`himalaya config set default-account ${name}`);
}
```

## 📚 相关资源

- [himalaya 文档](https://himalaya.app/)
- [技能开发教程](../advanced/skill-development.md)
- [定时任务教程](../advanced/cron-jobs.md)

## 💡 下一步

- [ ] 添加邮件搜索功能
- [ ] 支持附件处理
- [ ] 集成日历安排
- [ ] 多邮箱账号管理

---

_最后更新：2026-03-28_
