# 🦞 Claw-Picker

> OpenClaw 用户指南 - 从入门到精通

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 简介

Claw-Picker 是一个帮助开发者更好地使用 OpenClaw 的文档和示例仓库。无论你是第一次接触 OpenClaw，还是想要深入掌握高级用法，这里都能找到你需要的资源。

**OpenClaw 是什么？**

OpenClaw 是一个自托管的多通道网关，将你的聊天应用（WhatsApp、Telegram、Discord、iMessage 等）连接到 AI 编码助手。你可以在任何地方通过消息与 AI 助手交互，同时保持对数据的完全控制。

## 🎯 仓库目标

- 📚 提供系统的 OpenClaw 学习路径（入门 → 进阶 → 高级）
- 🔧 提供实用的示例配置和模板
- 🏗️ 帮助用户建立自己的 OpenClaw 工作流和网页
- 🤝 建立活跃的 OpenClaw 用户社区

## 📁 仓库结构

```
claw-picker/
├── README.md              # 本文件
├── docs/                  # 文档目录
│   ├── getting-started/   # 入门指南
│   │   ├── installation.md
│   │   ├── quickstart.md
│   │   └── first-bot.md
│   ├── advanced/          # 进阶教程
│   │   ├── multi-channel.md
│   │   ├── custom-plugins.md
│   │   └── agent-routing.md
│   ├── examples/          # 示例文档
│   └── templates/         # 模板配置
├── examples/              # 代码示例
├── templates/             # 配置文件模板
└── faq/                   # 常见问题
```

## 🚀 快速开始

### 1. 安装 OpenClaw

```bash
npm install -g openclaw
```

### 2. 初始化网关

```bash
openclaw onboard
```

### 3. 连接你的第一个聊天应用

按照向导完成 WhatsApp/Telegram/Discord 的配置。

### 4. 开始使用

发送消息给你的机器人，开始与 AI 助手对话！

## 📚 文档导航

### 🌱 入门指南
- [安装指南](docs/getting-started/installation.md) - 详细安装步骤
- [快速开始](docs/getting-started/quickstart.md) - 5 分钟上手
- [创建第一个机器人](docs/getting-started/first-bot.md)
- [配置文件速查](docs/入门指南/03-配置文件速查手册.md)

### 🚀 场景化指南
- [个人助理搭建指南](docs/guides/个人助理搭建指南.md) - 30 分钟打造个人 AI 助理
- [团队 Bot 搭建指南](docs/guides/团队 Bot 搭建指南.md) - 小团队 AI 协作方案
- [客服机器人搭建指南](docs/guides/客服机器人搭建指南.md) - 7x24 小时智能客服
- [远程部署指南](docs/guides/远程部署指南.md) - 云服务器/Docker 部署
- [企业微信集成指南](docs/guides/企业微信集成指南.md) - 企业微信群机器人/应用接入 ⭐ NEW
- [Slack 集成指南](docs/guides/Slack集成指南.md) - Slack Bot + Slash Commands ⭐ NEW
- [钉钉机器人集成指南](docs/guides/钉钉机器人集成指南.md) - 钉钉群机器人/企业应用 ⭐ NEW

### 🎓 进阶教程
- [多通道配置](docs/advanced/multi-channel.md)
- [自定义插件开发](docs/advanced/custom-plugins.md)
- [智能体路由策略](docs/advanced/agent-routing.md)
- [技能开发教程](docs/advanced/skill-development.md) ⭐ NEW
- [多智能体协作](docs/advanced/multi-agent-collaboration.md) ⭐ NEW
- [API 网关高可用部署](docs/advanced/ha-deployment.md) - Docker 多节点/Nginx 负载均衡 ⭐ NEW
- [OAuth 2.0 鉴权集成](docs/advanced/oauth-integration.md) - GitHub/Google/飞书/企微 SSO ⭐ NEW
- [CI/CD 自动化部署](docs/advanced/cicd-deployment.md) - GitHub Actions 全流水线 ⭐ NEW
- [数据持久化与备份](docs/advanced/data-persistence.md) - SQLite/PostgreSQL/PITR ⭐ NEW
- [性能调优专题](docs/advanced/performance-tuning.md) - 缓存/连接池/限流/熔断 ⭐ NEW
- [多智能体协作](docs/advanced/multi-agent.md) - Pipeline/并行/动态路由编排 ⭐ NEW
- [OpenTelemetry 分布式追踪](docs/advanced/opentelemetry.md) - 全链路可观测性/Jaeger/Grafana Tempo ⭐ NEW
- [多模型智能路由](docs/advanced/multi-model-routing.md) - 按类型/成本/延迟自动选模型（节省 85% 费用）⭐ NEW
- [企业级 RBAC 权限系统](docs/advanced/rbac-permission-system.md) - 多租户/角色/配额/审计完整方案 ⭐ NEW
- [RAG 知识库集成](docs/advanced/rag-knowledge-base.md) - 向量搜索 + Pinecone/Chroma + 混合检索 ⭐ NEW
- [Kubernetes 生产部署](docs/advanced/kubernetes-deployment.md) - HPA + Rolling Update + 多区域高可用 ⭐ NEW

### 🔧 运维指南
- [监控与告警系统搭建](docs/guides/监控与告警系统搭建.md) - Prometheus + Grafana + AlertManager ⭐ NEW
- [微信公众号集成指南](docs/guides/微信公众号集成指南.md) - 服务号双向对话/模板消息 ⭐ NEW
- [小程序 & H5 集成指南](docs/guides/小程序H5集成指南.md) - 微信小程序/移动 H5 AI 接入 ⭐ NEW
- [微信支付集成指南](docs/guides/微信支付集成指南.md) - JSAPI/Native/H5 支付 + AI 智能收款 ⭐ NEW
- [故障排查 Runbook](docs/guides/故障排查Runbook.md) - 10 大故障场景完整排查手册 ⭐ NEW
- [个人 AI 助理搭建指南（英文）](docs/guides/personal-assistant-guide.en.md) - Telegram/WhatsApp/Discord/Slack ⭐ NEW
- [团队 Bot 部署指南（英文）](docs/guides/team-bot-guide.en.md) - Slack/Teams/Feishu/WeCom 多平台 ⭐ NEW

### 📖 图文教程
- [📖 安装教程](docs/tutorials/01-安装教程.md) - 完整安装步骤，10-15 分钟
- [⚡ 5 分钟快速上手](docs/tutorials/02-5 分钟快速上手.md) - 快速体验流程
- [📋 配置文件速查](docs/入门指南/03-配置文件速查手册.md) - 配置项详解

### 💻 示例代码
- [飞书集成示例](examples/feishu/) - 多维表格/日历/任务/文档
- [GitHub 集成示例](examples/github/) - Issue 处理/PR 审查 ⭐ NEW
- [Notion 集成示例](examples/notion/) - AI 摘要/知识库问答/消息同步 ⭐ NEW
- [定时任务示例](examples/cron/) - 日报/周报自动生成
- [技能示例](examples/skills/) - 天气查询/智能提醒 ⭐ NEW
- [数据库同步示例](examples/database/) ⭐ NEW
- [企业微信示例](examples/wecom/) - 群机器人/消息推送/告警通知 ⭐ NEW
- [Slack 示例](examples/slack/) - Block Kit/Slash Commands/周报 ⭐ NEW
- [钉钉示例](examples/dingtalk/) - Stream 模式/多轮对话/定时播报 ⭐ NEW

### 📖 飞书深度集成
- [基础集成](docs/feishu-integration/basic/) - 多维表格/日历/任务/文档
- [实战工作流](docs/feishu-integration/workflows/README.md) - 晨间简报/会议纪要/周报

### ❓ 常见问题
- [安装问题](docs/FAQ/01-安装问题.md)
- [配置问题](docs/FAQ/02-配置问题.md)
- [渠道连接](docs/FAQ/03-渠道连接.md)
- [AI 模型](docs/FAQ/04-AI 模型.md)
- [性能优化](docs/FAQ/06-性能优化.md)
- [安全加固](docs/FAQ/07-安全加固.md)
- [故障排查](docs/FAQ/09-故障排查.md) ⭐ NEW
- [升级迁移](docs/FAQ/10-升级迁移.md) ⭐ NEW
- [渠道连接](docs/FAQ/03-渠道连接.md)
- [AI 模型](docs/FAQ/04-AI 模型.md)
- [工具使用](docs/FAQ/05-工具使用.md)
- [性能优化](docs/FAQ/06-性能优化.md)
- [安全加固](docs/FAQ/07-安全加固.md)

### 📋 社区建设
- [贡献指南](CONTRIBUTING.md)
- [代码规范](.github/ISSUE_TEMPLATE/)
- [Issue 模板](.github/ISSUE_TEMPLATE/)
- [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)

## 🌟 特色功能

- ✅ **多通道支持**: WhatsApp, Telegram, Discord, iMessage, 飞书, 企业微信, Slack, 钉钉等
- ✅ **自托管**: 运行在你的设备上，数据完全可控
- ✅ **插件系统**: 可扩展的插件架构
- ✅ **多智能体路由**: 支持多个 AI 助手同时工作
- ✅ **Web 控制台**: 浏览器管理界面
- ✅ **移动端支持**: iOS/Android 节点配对
- ✅ **飞书深度集成**: 多维表格/日历/任务/文档
- ✅ **企业微信集成**: 群机器人/自建应用/消息卡片
- ✅ **Slack 集成**: Block Kit/Slash Commands/交互式卡片
- ✅ **钉钉集成**: 群机器人/Stream 模式/工作通知
- ✅ **高可用部署**: 多节点/负载均衡/零停机更新
- ✅ **监控告警**: Prometheus + Grafana + AlertManager
- ✅ **分布式追踪**: OpenTelemetry + Jaeger/Grafana Tempo 全链路可观测
- ✅ **微信支付**: JSAPI/Native/H5 支付 + AI 智能收款助手
- ✅ **故障 Runbook**: 10 大故障场景完整排查手册
- ✅ **智能路由**: 多模型动态路由，按任务类型/成本/延迟自动择优（节省 85%）
- ✅ **RBAC 权限**: 多租户/角色/配额/审计全套企业权限管控
- ✅ **RAG 知识库**: 向量搜索 + 混合检索，让 AI 真正懂你的业务
- ✅ **K8s 部署**: HPA 自动扩缩容 + Rolling Update 零宕机升级
- ✅ **丰富示例**: 40+ 实用示例代码
- ✅ **场景化指南**: 个人/团队/客服/企业多种场景（含英文版）

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！

### 贡献方式

- 📚 改进文档（错别字、翻译、内容补充）
- 💡 新增教程和示例
- 🐛 报告 Bug
- ✨ 提出新功能建议
- 🔧 提交代码修复

### 贡献流程

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的修改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

详细指南请查看 [贡献指南](CONTRIBUTING.md)。

## 📄 许可证

采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📊 仓库统计

- 📁 文件数量：160+
- 📝 文档页数：185+
- 💻 示例代码：40+
- ⭐ 最近更新：2026-03-30 12:20

## 📝 更新日志

### 2026-03-30 阶段九（持续更新中）

**12:20 本次更新**：
- 📁 新增文件：4
- 📝 新增文档：4 篇（均为深度长文）
- 🎬 新增视频脚本：第 10 集
- 🌐 新增英文文档：Team Bot Guide for Organizations
- 🔄 Git 提交：第 24 次

**本次新增内容**：

✅ **英文企业级 Bot 指南**
- `docs/guides/team-bot-guide.en.md` — Slack/Teams/Feishu/WeCom 四平台完整代码 + 统一路由 + RBAC + 管理后台 + Docker Compose 生产部署

✅ **视频脚本**
- 第 10 集：RBAC 权限实战（26 分钟脚本，7 张表 Schema + 权限中间件 + 配额管理 + 审计日志 + CLI 工具）

✅ **进阶教程**
- RAG 知识库集成（文档解析/递归分块/混合检索/Pinecone+Chroma/Prompt 工程/增量更新/效果评估）
- Kubernetes 生产部署（多阶段镜像/HPA 自动扩缩/Rolling Update/Canary 发布/多区域高可用）

### 2026-03-30 阶段八

**11:52 更新（第 23 次提交）**：
- 英文个人助理指南 + 视频9微信支付 + 多模型路由 + RBAC权限系统

### 2026-03-30 阶段七

**11:25 更新（第 22 次提交）**：
- 新增文档：5 篇（英文入门 + 视频脚本8 + 微信支付 + OTel + 故障Runbook）

**本次新增内容**：

✅ **英文版入门指南**
- `docs/getting-started/quickstart.en.md` — 完整英文快速上手（含 Telegram/WhatsApp/Discord/Slack 四大渠道）

✅ **视频脚本**
- 第 8 集：性能调优实战（22 分钟脚本，展示延迟从 8s→1.2s 的全过程）

✅ **支付集成**
- 微信支付集成指南（JSAPI/Native/H5 三种支付方式 + AI 智能收款 Skill 完整代码）

✅ **可观测性**
- OpenTelemetry 分布式追踪集成（全链路埋点 + Jaeger/Tempo + 采样策略 + 实战案例）

✅ **运维手册**
- 故障排查 Runbook（10 大故障场景，每个场景含诊断命令/根因分析/修复步骤/预防措施）

### 2026-03-30 阶段六

**11:03 更新（第 21 次提交）**：
- Notion 完整示例（notion-sync.js）
- 🔄 Git 提交：第 21 次

**本次新增内容**：

✅ **示例代码**
- Notion 深度集成（批量 AI 摘要/知识库问答/消息→Notion/每日报告推送）

✅ **进阶教程**
- 性能调优专题（AI 缓存/连接池/异步队列/限流/熔断降级）
- 多智能体协作（Pipeline/并行/动态路由 + 内容创作/客服/代码审查实战）

✅ **视频脚本**
- 第 7 集：多智能体协作实战（20 分钟完整脚本）

✅ **国际化**
- README.en.md 英文版完整文档

✅ **场景化指南**
- 小程序 & H5 集成指南（微信小程序/云函数/流式响应/微信登录）

### 2026-03-30 阶段五

**10:33 更新（第 20 次提交）**：
- 微信公众号集成指南、OAuth 2.0 鉴权、CI/CD 自动化、数据持久化
- FAQ 09 故障排查、FAQ 10 升级迁移
- 视频脚本第 6 集：企业微信集成实战
- examples/dingtalk/ 钉钉完整示例

### 2026-03-28 阶段二 + 阶段三（✅ 100% 完成）

**21:00 最终统计**：
- 📁 文件：65+
- 📝 文档：75+
- 💻 示例：20+
- 🔄 Git 提交：18 次
- 🎬 视频脚本：5/5 集

**今日完成**（按类别）：

✅ **入门指南**（5/5，100%）
✅ **进阶教程**（8/8，100%）
✅ **飞书集成**（4/4，100%）
✅ **场景化指南**（10/10，100%）
✅ **FAQ**（15/15，100%）
✅ **示例代码**（20+ 个，100%）
✅ **速查表**（2/2，100%）
✅ **视频教程脚本**（5/5 集，100%）

**总体完成度：100%** 🎉🎊

### 2026-03-19 基础架构完成
- ✅ GitHub Pages 部署完成
- ✅ 文档结构优化
- ✅ 运营日报流程建立

## 🔗 相关链接

- [OpenClaw 官方文档](https://docs.openclaw.ai)
- [OpenClaw GitHub 仓库](https://github.com/openclaw/openclaw)
- [社区讨论](https://github.com/openclaw/openclaw/discussions)

## 📮 联系方式

- 问题反馈：提交 [Issue](https://github.com/rookie1989/claw-picker/issues)
- 功能建议：提交 [Feature Request](https://github.com/rookie1989/claw-picker/issues)

---

<p align="center">Made with 🦞 by the OpenClaw Community</p>
