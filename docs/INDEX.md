# OpenClaw 文档中心

> 多通道 AI 网关 · 从安装到精通

---

## 🗺️ 学习路径

```
入门  ──→  实战  ──→  进阶  ──→  专家
10 min     1-2 hr    半天       持续精进
```

---

## 第一阶段：入门（10 分钟跑起来）

| 文档 | 说明 |
|------|------|
| [📦 安装教程](tutorials/01-安装教程.md) | Node.js 安装、npm 配置、首次启动 |
| [⚡ 5 分钟快速上手](tutorials/02-5%20分钟快速上手.md) | 连接 AI + 发第一条消息 |
| [🤖 创建第一个 Bot](getting-started/first-bot.md) | 完成一个可用的 Bot |

---

## 第二阶段：实战（选择你的场景）

### 🧑 个人使用

| 文档 | 适合 |
|------|------|
| [个人助理搭建指南](guides/个人助理搭建指南.md) | 日常工作、写作、信息查询 |
| [晨间简报自动化](tutorials/03-晨间简报自动化.md) | 每天自动推送简报 |
| [邮件助理指南](guides/email-assistant-guide.md) | 邮件撰写与分类 |

### 👥 团队协作

| 文档 | 适合 |
|------|------|
| [团队 Bot 搭建指南](guides/团队%20Bot%20搭建指南.md) | 3-20 人团队，知识库 + 任务跟踪 |
| [客服机器人搭建指南](guides/客服机器人搭建指南.md) | 7×24 自动回复、工单处理 |
| [GitHub Issue 自动化](guides/github-issue-auto.md) | Issue 分配、PR 提醒 |

### 🔗 平台集成

| 平台 | 文档 |
|------|------|
| 飞书 | [飞书深度集成总览](feishu-integration/) |
| 企业微信 | [企业微信集成指南](guides/企业微信集成指南.md) |
| 微信公众号 | [微信公众号集成指南](guides/微信公众号集成指南.md) |
| 钉钉 | [钉钉机器人集成指南](guides/钉钉机器人集成指南.md) |
| Slack | [Slack 集成指南](guides/Slack集成指南.md) |

---

## 第三阶段：进阶（系统能力提升）

### ⚙️ 配置与技能

| 文档 | 说明 |
|------|------|
| [自定义技能开发](advanced/skill-development.md) | 编写你自己的 Skill |
| [插件开发入门](advanced/custom-plugins.md) | Plugin API 基础 |
| [插件开发进阶](advanced/custom-plugins-advanced.md) | 复杂插件模式 |
| [OAuth 鉴权集成](advanced/oauth-integration.md) | 接入第三方 OAuth |
| [RAG 知识库](advanced/rag-knowledge-base.md) | 给 Bot 加私有知识库 |

### 🤖 多智能体

| 文档 | 说明 |
|------|------|
| [多 Agent 基础](advanced/multi-agent.md) | Agent 间通信与协作 |
| [多 Agent 进阶](advanced/multi-agent-collaboration.md) | 复杂任务编排 |
| [Agent 路由策略](advanced/agent-routing.md) | 按意图分发请求 |
| [多模型路由](advanced/multi-model-routing.md) | 不同任务用不同模型 |

### 📡 多渠道

| 文档 | 说明 |
|------|------|
| [多渠道基础](advanced/multi-channel.md) | 同时接入多个平台 |
| [多渠道进阶](advanced/multi-channel-advanced.md) | 渠道级权限与路由 |

### ⏰ 自动化

| 文档 | 说明 |
|------|------|
| [定时任务（Cron）](advanced/cron-jobs.md) | 定时触发、周期任务 |
| [CI/CD 自动部署](advanced/cicd-deployment.md) | GitHub Actions 集成 |

---

## 第四阶段：专家（生产级部署）

### 🚀 部署方案

| 文档 | 说明 |
|------|------|
| [远程部署指南](guides/远程部署指南.md) | 云服务器/VPS/Docker |
| [高可用部署](advanced/ha-deployment.md) | 多实例 + 负载均衡 |
| [Kubernetes 部署](advanced/kubernetes-deployment.md) | K8s 生产环境 |

### 🔒 安全与权限

| 文档 | 说明 |
|------|------|
| [RBAC 权限系统](advanced/rbac-permission-system.md) | 角色与权限管理 |
| [安全加固](FAQ/07-安全加固.md) | 常见安全实践 |

### 📊 监控与性能

| 文档 | 说明 |
|------|------|
| [监控与告警系统](guides/监控与告警系统搭建.md) | Prometheus + Grafana |
| [OpenTelemetry 集成](advanced/opentelemetry.md) | 链路追踪与指标 |
| [性能调优](advanced/performance-tuning.md) | 吞吐量与延迟优化 |
| [数据持久化](advanced/data-persistence.md) | Redis / PostgreSQL |

---

## 📖 参考资料

### 速查表

| 文档 | 说明 |
|------|------|
| [OpenClaw 命令速查](cheatsheets/openclaw-commands-cheatsheet.md) | CLI 常用命令 |
| [飞书 API 速查](cheatsheets/feishu-api-cheatsheet.md) | 飞书常用接口 |

### 飞书集成详解

| 文档 | 说明 |
|------|------|
| [日历（快速上手）](feishu-integration/basic/calendar-quickstart.md) | 对话式日程管理 |
| [日历（API 详解）](feishu-integration/basic/calendar-api.md) | 完整 API 参考 |
| [多维表格（快速上手）](feishu-integration/basic/bitable-quickstart.md) | 对话式数据操作 |
| [多维表格（API 详解）](feishu-integration/basic/bitable-api.md) | 完整 API 参考 |
| [云文档（快速上手）](feishu-integration/basic/doc-quickstart.md) | 对话式文档操作 |
| [云文档（API 详解）](feishu-integration/basic/doc-api.md) | 完整 API 参考 |
| [任务（快速上手）](feishu-integration/basic/task-quickstart.md) | 对话式任务管理 |
| [任务（API 详解）](feishu-integration/basic/task-api.md) | 完整 API 参考 |

### FAQ

| 文档 | 说明 |
|------|------|
| [安装问题](FAQ/01-安装问题.md) | 安装失败、依赖问题 |
| [配置问题](FAQ/02-配置问题.md) | config.json 常见错误 |
| [渠道连接](FAQ/03-渠道连接.md) | Webhook、Bot Token 问题 |
| [AI 模型](FAQ/04-AI%20模型.md) | 模型选择、API Key 问题 |
| [工具使用](FAQ/05-工具使用.md) | Skill 调用、工具报错 |
| [性能优化](FAQ/06-性能优化.md) | 响应慢、内存问题 |
| [故障排查](FAQ/09-故障排查.md) | 通用排查流程 |
| [升级迁移](FAQ/10-升级迁移.md) | 版本升级注意事项 |

---

## 🤝 参与贡献

- [贡献指南](../CONTRIBUTING.md)
- [提交 Issue](https://github.com/rookie1989/claw-picker/issues)
- [示例代码库](../examples/)

---

_最后更新：2026-03-30_
