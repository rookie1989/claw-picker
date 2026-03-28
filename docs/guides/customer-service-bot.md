# 📞 客服机器人搭建指南

7x24 小时智能客服，自动回复常见问题。

## 🎯 效果预览

### 自动回复

```
用户：你们的价格是多少？
```
```
📋 价格方案

基础版：¥99/月
- 10 个用户
- 基础功能
- 邮件支持

专业版：¥299/月
- 无限用户
- 全部功能
- 专属客服

企业版：联系销售
- 定制开发
- 私有部署
- SLA 保障
```

### 问题分类

```
用户：我的账号登录不了
```
```
🔧 登录问题

已为您分类：账号问题

常见解决方案：
1. 检查密码是否正确
2. 尝试找回密码
3. 清除浏览器缓存

需要人工客服吗？回复"是"转人工。
```

### 工单创建

```
用户：我要反馈一个问题
```
```
✅ 已创建工单

工单号：#20260328001
问题：功能建议
优先级：中

客服会在 24 小时内回复您。
```

## 📋 前置要求

- 已安装 OpenClaw
- 有客服需求（电商/SaaS/服务）
- 常见问题文档
- 多渠道接入（网站/微信/APP）

## 🚀 步骤 1：选择接入渠道

### 推荐渠道组合

| 渠道 | 适用场景 | 配置难度 |
|------|----------|----------|
| 微信公众号 | 国内用户 | ⭐⭐ |
| 企业微信 | 内部客服 | ⭐⭐ |
| 网站聊天 | 官网访客 | ⭐⭐⭐ |
| 邮件 | 正式沟通 | ⭐ |
| 电话 | VIP 客户 | ⭐⭐⭐⭐ |

### 多渠道配置

```json
{
  "plugins": {
    "entries": ["wechat", "email"],
    "wechat": {
      "appId": "wx_xxx",
      "appSecret": "xxx",
      "token": "xxx"
    },
    "email": {
      "smtp": { /* ... */ },
      "imap": { /* ... */ }
    }
  }
}
```

## 🛠️ 步骤 2：知识库配置

### 2.1 整理常见问题

创建 FAQ 文档：

```markdown
# 常见问题库

## 账号问题

Q: 忘记密码怎么办？
A: 点击登录页"忘记密码"，按提示重置。

Q: 账号被锁定了？
A: 联系客服解锁，提供注册邮箱。

## 支付问题

Q: 支持哪些支付方式？
A: 微信支付、支付宝、银行卡。

Q: 如何申请退款？
A: 订单页申请，3-5 个工作日到账。

## 功能问题

Q: 如何导出数据？
A: 设置 → 数据导出 → 选择格式。
```

### 2.2 创建客服技能

```bash
mkdir -p ~/.openclaw/skills/customer-service
```

**SKILL.md**：
```markdown
# customer-service

智能客服，自动回复常见问题。

**当以下情况时使用此技能**：
(1) 用户咨询产品/服务
(2) 用户反馈问题
(3) 用户寻求帮助
(4) 用户提到"价格"、"购买"、"退款"等关键词
```

**skill.js**：
```javascript
const fs = require('fs').promises;

module.exports = {
  name: 'customer-service',
  
  execute: async (context) => {
    const message = context.message;
    
    // 1. 加载知识库
    const faq = await loadFAQ();
    
    // 2. 匹配问题
    const match = findBestMatch(message, faq);
    
    if (match.confidence > 0.8) {
      // 3. 自动回复
      return formatResponse(match.answer);
    }
    
    // 4. 转人工
    return `
🤔 这个问题我需要确认一下

已为您转接人工客服，请稍候...

工单号：#${generateTicketId()}
    `.trim();
  }
};

async function loadFAQ() {
  const content = await fs.readFile('./faq.md', 'utf8');
  return parseFAQ(content);
}

function findBestMatch(question, faq) {
  // 使用相似度算法
  // 实际应用中可用 TF-IDF 或 Embedding
  let bestMatch = null;
  let bestScore = 0;
  
  for (const item of faq) {
    const score = calculateSimilarity(question, item.question);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = item;
    }
  }
  
  return {
    answer: bestMatch?.answer,
    confidence: bestScore
  };
}

function formatResponse(answer) {
  return `
📋 为您解答

${answer}

还有其他问题吗？
  `.trim();
}

function generateTicketId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = Math.floor(Math.random() * 1000);
  return `#${date}${seq.toString().padStart(3, '0')}`;
}

function calculateSimilarity(s1, s2) {
  // 简化的相似度计算
  // 实际应使用更复杂的 NLP 算法
  const words1 = s1.split(' ');
  const words2 = s2.split(' ');
  const common = words1.filter(w => words2.includes(w));
  return common.length / Math.max(words1.length, words2.length);
}

function parseFAQ(content) {
  // 解析 FAQ 文档
  // 返回 [{question, answer}] 数组
  return [];
}
```

## 📝 步骤 3：配置 OpenClaw

### 3.1 基础配置

```json
{
  "plugins": {
    "entries": ["wechat"],
    "wechat": {
      "appId": "wx_xxx",
      "appSecret": "xxx",
      "token": "xxx"
    }
  },
  
  "skills": {
    "entries": ["customer-service"]
  },
  
  "customerService": {
    "autoReply": true,
    "handoffThreshold": 0.6,
    "workingHours": {
      "start": "09:00",
      "end": "21:00"
    },
    "agents": [
      {"id": "ou_xxx1", "name": "客服小王"},
      {"id": "ou_xxx2", "name": "客服小李"}
    ]
  }
}
```

### 3.2 转人工配置

```json
{
  "customerService": {
    "handoff": {
      "enabled": true,
      "notifyChannel": "feishu",
      "notifyChatId": "oc_xxx",
      "message": "🔔 新工单\n\n用户：{user}\n问题：{question}\n工单号：{ticket_id}"
    }
  }
}
```

## 💬 步骤 4：对话流程设计

### 4.1 标准流程

```
用户咨询
  ↓
意图识别
  ↓
有匹配？──是──> 自动回复
  ↓否
收集信息
  ↓
创建工单
  ↓
通知人工客服
  ↓
跟进处理
  ↓
用户评价
```

### 4.2 多轮对话

```javascript
const states = {
  WAITING_PRODUCT: 'waiting_product',
  WAITING_ISSUE: 'waiting_issue',
  WAITING_CONTACT: 'waiting_contact'
};

async function handleMultiTurn(context) {
  const state = context.session.state || {};
  
  if (!state.product) {
    context.session.state = {step: 'product'};
    return '请问您咨询哪款产品？';
  }
  
  if (!state.issue) {
    context.session.state.product = context.message;
    context.session.state = {step: 'issue'};
    return '请问遇到什么问题？';
  }
  
  // 收集完成，创建工单
  const ticket = await createTicket({
    product: state.product,
    issue: context.message,
    user: context.user
  });
  
  context.session.state = {};
  return `工单已创建：${ticket.id}`;
}
```

## 🚀 步骤 5：高级功能

### 5.1 智能路由

```javascript
function routeToAgent(ticket) {
  // 根据问题类型分配客服
  if (ticket.type === 'technical') {
    return technicalTeam;
  }
  if (ticket.type === 'billing') {
    return billingTeam;
  }
  if (ticket.priority === 'high') {
    return seniorAgent;
  }
  return generalAgent;
}
```

### 5.2 满意度调查

```javascript
async function sendSurvey(ticketId) {
  return `
📊 服务评价

您对刚才的服务满意吗？

😊 非常满意
🙂 满意
😐 一般
😞 不满意
  `;
}
```

### 5.3 工单管理

```javascript
// 工单状态
const TICKET_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  WAITING_CUSTOMER: 'waiting_customer',
  RESOLVED: 'resolved',
  CLOSED: 'closed'
};

async function updateTicket(ticketId, updates) {
  await db.update('tickets', {
    where: {id: ticketId},
    data: updates
  });
}
```

### 5.4 数据统计

```javascript
async function generateReport() {
  const today = new Date();
  const stats = await db.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) as resolved,
      AVG(response_time) as avg_response
    FROM tickets
    WHERE DATE(created_at) = DATE(${today})
  `);
  
  return `
📊 客服日报

总工单：${stats.total}
已解决：${stats.resolved}
满意度：95%
平均响应：${stats.avg_response}分钟
  `;
}
```

## 📊 步骤 6：数据看板

### 6.1 实时指标

- 在线用户数
- 排队人数
- 平均响应时间
- 今日工单数

### 6.2 质量指标

- 解决率
- 满意度
- 首次响应时间
- 平均处理时间

### 6.3 趋势分析

```javascript
// 周趋势
const weeklyTrend = {
  mon: 45,
  tue: 52,
  wed: 38,
  thu: 61,
  fri: 55,
  sat: 30,
  sun: 25
};
```

## 🐛 常见问题

### Q: 如何提高匹配准确率？

**A:** 
1. 完善知识库（更多 Q&A）
2. 使用更好的 NLP 模型
3. 收集用户反馈优化
4. 定期更新知识库

### Q: 如何处理复杂问题？

**A:** 
```javascript
if (match.confidence < 0.6) {
  return handoffToHuman();
}
if (requiresMultipleSteps) {
  return startMultiTurnDialog();
}
```

### Q: 如何保护用户隐私？

**A:** 
```json
{
  "security": {
    "maskSensitive": true,
    "fields": ["phone", "email", "id_card"]
  }
}
```

## 📚 相关资源

- [微信开发文档](https://developers.weixin.qq.com/)
- [技能开发教程](../advanced/skill-development.md)
- [定时任务教程](../advanced/cron-jobs.md)

## 💡 下一步

- [ ] 完善知识库
- [ ] 配置多渠道接入
- [ ] 设置工单流程
- [ ] 搭建数据看板

---

_最后更新：2026-03-28_
