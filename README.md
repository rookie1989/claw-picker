# 🦞 Claw-Picker

> OpenClaw 用户指南 · 从安装到生产

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## OpenClaw 是什么？

OpenClaw 是**自托管的多通道 AI 网关**，让你能在任何聊天应用（飞书/企业微信/钉钉/Slack/WhatsApp/Telegram）中与 AI 助手对话，同时数据完全自控。

本仓库提供完整的使用文档、示例代码和场景化指南。

---

## 🗺️ 快速导航

### 入门（10 分钟）

```bash
npm install -g openclaw && openclaw onboard
```

| 文档 | 说明 |
|------|------|
| [安装教程](docs/tutorials/01-安装教程.md) | 系统要求 + 安装步骤 |
| [5 分钟快速上手](docs/tutorials/02-5%20分钟快速上手.md) | 第一条 AI 消息 |
| [创建第一个 Bot](docs/getting-started/first-bot.md) | 跑通完整流程 |

### 实战（选择场景）

| 场景 | 文档 |
|------|------|
| 个人助理 | [搭建指南](docs/guides/个人助理搭建指南.md) |
| 团队协作 Bot | [搭建指南](docs/guides/团队%20Bot%20搭建指南.md) |
| 客服机器人 | [搭建指南](docs/guides/客服机器人搭建指南.md) |
| 飞书深度集成 | [集成指南](docs/feishu-integration/) |
| 企业微信 | [集成指南](docs/guides/企业微信集成指南.md) |
| 微信公众号 | [集成指南](docs/guides/微信公众号集成指南.md) |
| 钉钉 | [集成指南](docs/guides/钉钉机器人集成指南.md) |
| Slack | [集成指南](docs/guides/Slack集成指南.md) |

### 进阶 & 专家

| 主题 | 文档 |
|------|------|
| 自定义技能开发 | [skill-development.md](docs/advanced/skill-development.md) |
| RAG 知识库 | [rag-knowledge-base.md](docs/advanced/rag-knowledge-base.md) |
| 多 Agent 协作 | [multi-agent-collaboration.md](docs/advanced/multi-agent-collaboration.md) |
| 高可用部署 | [ha-deployment.md](docs/advanced/ha-deployment.md) |
| Kubernetes 部署 | [kubernetes-deployment.md](docs/advanced/kubernetes-deployment.md) |
| 监控与告警 | [监控与告警系统搭建.md](docs/guides/监控与告警系统搭建.md) |

📖 **完整文档索引** → [docs/INDEX.md](docs/INDEX.md)

---

## 核心能力

| 能力 | 说明 |
|------|------|
| 多通道接入 | 飞书/企微/钉钉/Slack/WhatsApp/Telegram/Discord |
| 自托管 | 本地/云服务器/Docker/Kubernetes 全场景支持 |
| 插件系统 | 可扩展的 Skill + Plugin 架构 |
| 多模型路由 | 按任务类型/成本/延迟自动选择 AI 模型 |
| 多 Agent | 支持多个 Agent 并行工作、智能路由 |
| RAG 知识库 | 向量搜索 + 混合检索，AI 懂你的业务 |
| 企业安全 | RBAC 权限 + OAuth + 审计日志 |
| 可观测性 | OpenTelemetry + Prometheus + Grafana |

---

## 示例代码

```
examples/
├── feishu/      # 多维表格 / 日历 / 任务 / 文档
├── github/      # Issue 处理 / PR 审查
├── notion/      # AI 摘要 / 知识库问答
├── wecom/       # 群机器人 / 消息推送
├── slack/       # Block Kit / Slash Commands
├── cron/        # 日报 / 周报自动生成
├── database/    # 数据库同步
└── skills/      # 天气查询 / 智能提醒
```

---

## 🤝 参与贡献

1. Fork 仓库 → 创建分支 → 提交 PR
2. 欢迎：文档改进、示例补充、Bug 报告、功能建议

详见 [贡献指南](CONTRIBUTING.md)

---

## 相关链接

- [OpenClaw 官方文档](https://docs.openclaw.ai)
- [提交 Issue](https://github.com/rookie1989/claw-picker/issues)
- [社区讨论](https://github.com/openclaw/openclaw/discussions)

---

<p align="center">MIT License · Made with 🦞 by the OpenClaw Community</p>
