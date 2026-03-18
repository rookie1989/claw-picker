# 👥 团队 Bot 搭建指南

**适用场景**: 小团队协作（3-20 人）  
**预计时间**: 1-2 小时  
**难度**: ⭐⭐⭐☆☆

---

## 🎯 这个指南适合你吗？

如果你的团队需要：

- ✅ 共享的 AI 助手，回答常见问题
- ✅ 自动化的会议纪要和任务分配
- ✅ 项目进度追踪和报告
- ✅ 知识库查询和文档管理
- ✅ 团队日程协调和会议安排

那么这个指南就是为你准备的！

---

## 📋 准备工作

### 团队规模评估

| 团队规模 | 推荐配置 | 月预算 |
|---------|---------|--------|
| 3-5 人 | 单实例 + 共享账号 | ¥100-200 |
| 6-10 人 | 单实例 + 多通道 | ¥200-400 |
| 11-20 人 | 多实例 + 负载均衡 | ¥400-800 |

### 硬件要求
- 服务器：2 核 4G 以上（本地或云端）
- 存储：10GB+（日志和缓存）
- 网络：稳定公网访问（如果需要远程）

### 账号准备
- [ ] 团队飞书账号（推荐）或企业微信
- [ ] 硅基流动企业账号（支持多用户）
- [ ] GitHub 团队账号（用于代码协作）
- [ ] 域名（可选，用于自定义 Webhook）

---

## 🏗️ 架构设计

### 方案 A：单实例共享（适合小团队）

```
┌─────────────┐
│ 团队成员 1   │
│ 团队成员 2   │────→┌──────────────┐
│ 团队成员 3   │    │  OpenClaw    │──→ AI 服务
│     ...     │    │   (单实例)    │
└─────────────┘    └──────────────┘
        ↑
   飞书群聊/频道
```

**优点**: 简单、成本低  
**缺点**: 无法区分用户、配置共享

### 方案 B：多通道隔离（推荐）

```
┌─────────────┐     ┌──────────────┐
│ 技术群      │────→│              │
└─────────────┘     │              │
┌─────────────┐     │  OpenClaw    │──→ AI 服务
│ 产品群      │────→│  (多通道)    │
└─────────────┘     │              │
┌─────────────┐     │              │
│ 设计群      │────→│              │
└─────────────┘     └──────────────┘
```

**优点**: 按群配置、权限隔离  
**缺点**: 配置稍复杂

### 方案 C：多实例部署（适合大团队）

```
┌──────────┐    ┌──────────┐
│ 技术部    │───→│ Instance1│──┐
└──────────┘    └──────────┘  │
┌──────────┐    ┌──────────┐  │    ┌─────────┐
│ 产品部    │───→│ Instance2│──┼───→│ 负载均衡 │──→ AI 服务
└──────────┘    └──────────┘  │    └─────────┘
┌──────────┐    ┌──────────┘  │
│ 设计部    │───→│ Instance3│──┘
└──────────┘    └──────────┘
```

**优点**: 完全隔离、可独立扩展  
**缺点**: 成本高、运维复杂

---

## 🚀 第一步：部署 OpenClaw（30 分钟）

### 1.1 选择部署方式

#### 本地部署（推荐测试用）

```bash
# 在团队共用电脑上安装
npm install -g openclaw
openclaw onboard
```

#### 云服务器部署（推荐生产用）

```bash
# 在服务器上安装（以 Ubuntu 为例）
ssh user@your-server.com

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 OpenClaw
npm install -g openclaw
openclaw onboard
```

#### Docker 部署（推荐）

```bash
# 创建 docker-compose.yml
version: '3'
services:
  openclaw:
    image: openclaw/openclaw:latest
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    environment:
      - NODE_ENV=production
      - API_KEY=your_api_key
```

### 1.2 配置多通道

编辑配置文件 `config.json`：

```json
{
  "channels": [
    {
      "name": "技术群",
      "type": "feishu",
      "chatId": "oc_xxx",
      "systemPrompt": "你是技术团队助手，擅长解答编程问题..."
    },
    {
      "name": "产品群",
      "type": "feishu",
      "chatId": "oc_yyy",
      "systemPrompt": "你是产品团队助手，擅长需求分析和文档..."
    },
    {
      "name": "设计群",
      "type": "feishu",
      "chatId": "oc_zzz",
      "systemPrompt": "你是设计团队助手，擅长 UI/UX 建议..."
    }
  ]
}
```

---

## 🔗 第二步：集成飞书（30 分钟）

### 2.1 创建飞书应用

1. 访问 [飞书开放平台](https://open.feishu.cn)
2. 创建企业自建应用
3. 添加权限：
   - 群组读写权限
   - 消息发送权限
   - 日历权限
   - 任务权限
   - 多维表格权限

### 2.2 配置应用凭证

```json
{
  "integrations": {
    "feishu": {
      "enabled": true,
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "verificationToken": "xxx"
    }
  }
}
```

### 2.3 添加机器人到群聊

1. 在飞书群设置 → 添加机器人
2. 选择你创建的应用
3. 配置 webhook（如果需要）

### 2.4 测试连接

在飞书群中发送：
```
@机器人 你好
```

---

## 📊 第三步：配置团队协作功能（30 分钟）

### 3.1 会议纪要自动化

创建会议机器人：

```javascript
// plugins/meeting-notes.js
module.exports = {
  name: 'meeting-notes',
  trigger: '/会议纪要',
  handler: async (message, context) => {
    // 1. 获取会议记录
    // 2. 调用 AI 总结
    // 3. 提取待办事项
    // 4. 发送到群聊
  }
}
```

### 3.2 任务分配和追踪

配置飞书任务集成：

```json
{
  "tasks": {
    "autoAssign": true,
    "notifyOnComplete": true,
    "dailyReminder": "09:00"
  }
}
```

### 3.3 项目进度报告

创建定时任务：

```javascript
// plugins/weekly-report.js
const cron = require('node-cron');

// 每周五下午 5 点生成周报
cron.schedule('0 17 * * 5', async () => {
  // 1. 收集本周任务完成情况
  // 2. 生成周报
  // 3. 发送到管理群
});
```

### 3.4 知识库查询

配置文档索引：

```json
{
  "knowledgeBase": {
    "enabled": true,
    "sources": [
      {
        "type": "feishu-doc",
        "spaceId": "xxx"
      },
      {
        "type": "github-wiki",
        "repo": "your-team/repo"
      }
    ]
  }
}
```

---

## 👥 第四步：权限管理（15 分钟）

### 4.1 用户角色定义

```json
{
  "roles": {
    "admin": {
      "canConfigure": true,
      "canViewLogs": true,
      "canManageUsers": true
    },
    "member": {
      "canConfigure": false,
      "canViewLogs": false,
      "canManageUsers": false
    },
    "guest": {
      "canConfigure": false,
      "canViewLogs": false,
      "canManageUsers": false,
      "messageLimit": 50
    }
  }
}
```

### 4.2 用户管理

创建用户列表：

```json
{
  "users": [
    {
      "name": "张三",
      "feishuId": "ou_xxx",
      "role": "admin",
      "channels": ["技术群", "产品群"]
    },
    {
      "name": "李四",
      "feishuId": "ou_yyy",
      "role": "member",
      "channels": ["技术群"]
    }
  ]
}
```

### 4.3 敏感操作保护

```json
{
  "security": {
    "requireApproval": ["delete", "config-change"],
    "auditLog": true,
    "rateLimit": {
      "messages": 100,
      "period": "hour"
    }
  }
}
```

---

## 📈 第五步：监控和运维（15 分钟）

### 5.1 日志配置

```json
{
  "logging": {
    "level": "info",
    "file": "/var/log/openclaw/app.log",
    "maxSize": "100MB",
    "maxFiles": 10,
    "console": true
  }
}
```

### 5.2 健康检查

创建监控脚本：

```bash
#!/bin/bash
# check-openclaw.sh

# 检查进程
if ! pgrep -f "openclaw" > /dev/null; then
  echo "OpenClaw 未运行，正在重启..."
  openclaw start
fi

# 检查 API 响应
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$response" != "200" ]; then
  echo "健康检查失败"
  # 发送告警
fi
```

### 5.3 自动备份

```bash
# 备份配置
crontab -e

# 每天凌晨 2 点备份
0 2 * * * cp -r ~/.openclaw/config /backup/openclaw-$(date +\%Y\%m\%d)
```

---

## 🎨 实用场景示例

### 场景 1：每日站会

```
机器人（每天 9:30 自动发送）：
🌞 早安！开始今天的站会吧！

请回复：
1. 昨天完成了什么
2. 今天计划做什么
3. 有什么阻碍

我会汇总发给团队！
```

### 场景 2：需求评审

```
产品经理：@机器人 评审这个需求文档
[发送飞书文档链接]

机器人：
✅ 已阅读文档

📋 评审意见：
1. 功能描述清晰
2. 缺少验收标准
3. 建议补充边界情况

❓ 问题：
- 用户权限如何设计？
- 数据量级预估是多少？

需要我生成评审报告吗？
```

### 场景 3：代码审查

```
开发者：@机器人 审查这个 PR
[发送 GitHub PR 链接]

机器人：
🔍 代码审查结果：

✅ 优点：
- 代码结构清晰
- 有单元测试

⚠️ 建议：
- 第 23 行可以提取为函数
- 缺少错误处理
- 建议添加注释

需要我生成审查报告吗？
```

### 场景 4：项目周报

```
机器人（每周五 17:00 自动发送）：
📊 项目周报 - 第 X 周

✅ 本周完成：
- 功能 A 开发（张三）
- 功能 B 测试（李四）
- 文档更新（王五）

📅 下周计划：
- 功能 C 开发
- 性能优化

⚠️ 风险：
- 服务器资源紧张
- 设计稿延期

详细报告：[飞书文档链接]
```

---

## 🛡️ 安全最佳实践

### 数据安全
- ✅ 敏感配置使用环境变量
- ✅ 定期备份配置和数据
- ✅ 限制 API 调用频率
- ✅ 审计日志保留 90 天+

### 访问控制
- ✅ 最小权限原则
- ✅ 定期审查用户权限
- ✅ 离职员工及时移除
- ✅ 敏感操作需要审批

### 合规性
- ✅ 遵守公司数据政策
- ✅ 不存储用户隐私数据
- ✅ 明确告知 AI 使用范围
- ✅ 提供人工审核通道

---

## 📊 成本优化

### API 费用分摊

| 团队规模 | 月 API 费用 | 人均成本 |
|---------|-----------|---------|
| 5 人 | ¥200 | ¥40/人 |
| 10 人 | ¥400 | ¥40/人 |
| 20 人 | ¥800 | ¥40/人 |

### 降低费用技巧

1. **使用缓存**: 常见问题缓存回复
2. **模型分级**: 简单问题用小模型
3. **限流**: 设置每人每日上限
4. **本地模型**: 敏感数据用本地模型

---

## 🆘 常见问题

### Q: 如何防止机器人被滥用？

A: 
1. 设置消息频率限制
2. 敏感词过滤
3. 用户权限管理
4. 审计日志监控

### Q: 多团队如何共享？

A:
1. 使用多通道配置
2. 每个团队独立系统提示
3. 数据隔离
4. 独立计费（如果需要）

### Q: 如何保证高可用？

A:
1. 多实例部署
2. 负载均衡
3. 健康检查
4. 自动故障转移

---

## 📚 下一步

完成团队 Bot 搭建后，你可以：

- 📖 学习 [技能开发教程](./技能开发教程.md)
- 🤖 探索 [多智能体协作](./多智能体协作.md)
- 🌐 配置 [远程部署指南](./远程部署指南.md)
- 💬 加入 [社区讨论](https://github.com/openclaw/openclaw/discussions)

---

**祝团队协作愉快！** 🦞

有任何问题，欢迎提交 Issue 或参与社区讨论。
