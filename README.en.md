# OpenClaw — Multi-Channel AI Gateway

<div align="center">

[中文文档](README.md) · **English** · [Discord](https://discord.gg/openclaw) · [Issues](https://github.com/rookie1989/claw-picker/issues)

</div>

> Route any message — from any platform — to any AI model. In minutes.

**OpenClaw** is an open-source, multi-channel AI gateway that lets you connect WeChat, Feishu (Lark), DingTalk, Slack, Discord, Telegram, and more to GPT-4o, Claude, Gemini, or any OpenAI-compatible model — all from a single configuration file.

---

## ✨ Why OpenClaw?

| Challenge | Without OpenClaw | With OpenClaw |
|-----------|-----------------|---------------|
| Multiple platforms | Separate bots for each | One gateway, all platforms |
| Multiple AI models | Hardcoded per app | Switch models in config |
| Cost control | No visibility | Per-channel budget limits |
| Rate limiting | Build it yourself | Built-in queue & throttle |
| Failover | Manual | Automatic model fallback |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Docker
- At least one AI API key (OpenAI, Anthropic, etc.)
- A messaging platform bot token

### Option 1: Docker (Recommended)

```bash
docker run -d \
  -p 3000:3000 \
  -e OPENAI_API_KEY=sk-xxxx \
  -v $(pwd)/config.yaml:/app/config.yaml \
  openclaw/openclaw:latest
```

### Option 2: npm

```bash
npm install -g openclaw
openclaw init          # Interactive setup wizard
openclaw start         # Start the gateway
```

### Option 3: Build from source

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
cp config.example.yaml config.yaml
npm start
```

### Verify it's running

```bash
curl http://localhost:3000/health
# {"status":"ok","channels":3,"uptime":42}
```

---

## ⚙️ Configuration

```yaml
# config.yaml — minimal example
server:
  port: 3000
  secret: "change-me-in-production"

models:
  - name: gpt4o
    provider: openai
    model: gpt-4o
    api_key: ${OPENAI_API_KEY}

  - name: claude
    provider: anthropic
    model: claude-3-5-sonnet-20241022
    api_key: ${ANTHROPIC_API_KEY}

channels:
  - name: feishu-assistant
    platform: feishu
    model: gpt4o
    system_prompt: "You are a helpful assistant."
    rate_limit: 60/min

  - name: slack-bot
    platform: slack
    model: claude
    system_prompt: "You are a concise Slack bot."
    fallback_model: gpt4o    # Auto-fallback if claude is down
```

---

## 🌐 Supported Platforms

| Platform | Status | Auth Type |
|----------|--------|-----------|
| Feishu (Lark) | ✅ Full | Webhook + Long-poll |
| WeChat Official Account | ✅ Full | Token Validation |
| WeChat Work (WeCom) | ✅ Full | Webhook + App |
| DingTalk | ✅ Full | Stream API |
| Slack | ✅ Full | OAuth + Webhook |
| Telegram | ✅ Full | Bot API |
| Discord | ✅ Full | Bot Token |
| GitHub | ✅ Full | App Webhook |
| Notion | ✅ Full | Integration Token |
| REST API | ✅ Full | Bearer Token |
| Email | 🔧 Beta | SMTP/IMAP |

---

## 🤖 Supported AI Models

| Provider | Models |
|----------|--------|
| OpenAI | GPT-4o, GPT-4o-mini, GPT-3.5-turbo, o1, o3 |
| Anthropic | Claude 3.5 Sonnet, Claude 3 Opus/Haiku |
| Google | Gemini 1.5 Pro/Flash, Gemini 2.0 |
| Mistral | Mistral Large, Mixtral 8x7B |
| Ollama | Any local model (Llama, Qwen, etc.) |
| Azure OpenAI | All Azure-deployed models |
| Any OpenAI-compatible | Groq, Together AI, Perplexity, etc. |

---

## 📚 Documentation

### Getting Started
- [Installation Guide](docs/getting-started/installation.md) — All installation methods
- [Quick Start Tutorial](docs/getting-started/quick-start.md) — Up in 5 minutes
- [Configuration Reference](docs/getting-started/configuration.md) — All config options
- [First Integration](docs/getting-started/first-integration.md) — Connect your first platform

### Platform Guides
- [Feishu / Lark Deep Integration](docs/feishu-integration/) — Messages, cards, file handling
- [WeChat Official Account](docs/guides/微信公众号集成指南.md) *(Chinese)*
- [WeCom (Enterprise WeChat)](docs/guides/企业微信集成指南.md) *(Chinese)*
- [DingTalk Integration](docs/guides/钉钉集成指南.md) *(Chinese)*
- [Slack Integration](docs/guides/Slack集成指南.md)
- [GitHub Webhook Integration](docs/guides/GitHub集成指南.md)

### Advanced Topics
- [Multi-Agent Collaboration](docs/advanced/multi-agent.md) — Orchestrate multiple AI agents
- [Performance Tuning](docs/advanced/performance-tuning.md) — Caching, pooling, queuing
- [OAuth 2.0 Integration](docs/advanced/oauth-integration.md) — SSO with GitHub/Google/Feishu
- [CI/CD Deployment](docs/advanced/cicd-deployment.md) — GitHub Actions pipeline
- [High Availability](docs/advanced/ha-deployment.md) — Multi-node, zero-downtime
- [Data Persistence & Backup](docs/advanced/data-persistence.md) — PostgreSQL, PITR

### FAQ
- [Installation Issues](docs/FAQ/01-安装问题.md)
- [Configuration Issues](docs/FAQ/02-配置问题.md)
- [Troubleshooting](docs/FAQ/09-故障排查.md)
- [Upgrade & Migration](docs/FAQ/10-升级迁移.md)

---

## 💡 Examples

```
examples/
├── feishu/         Feishu bot with card messages
├── wecom/          WeCom group bot + App bot
├── dingtalk/       DingTalk Stream mode bot
├── slack/          Slack Bolt framework bot
├── github/         GitHub PR & issue assistant
├── notion/         Notion AI summarizer & Q&A
├── database/       PostgreSQL session storage
├── cron/           Scheduled AI reports
└── skills/         Custom skill development
```

Browse all examples → [examples/](examples/)

---

## 🔌 REST API

OpenClaw exposes a unified REST API compatible with the OpenAI format:

```bash
# Send a message
curl -X POST http://localhost:3000/api/v1/chat \
  -H "Authorization: Bearer your-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "feishu-assistant",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'

# List channels
curl http://localhost:3000/api/v1/channels \
  -H "Authorization: Bearer your-secret"

# Health & metrics
curl http://localhost:3000/metrics
```

---

## 🛡️ Security

- All API keys stored as environment variables (never in config files)
- Per-channel rate limiting (prevents abuse)
- HMAC signature validation for all platform webhooks
- Optional IP allowlist
- Audit logging for all AI requests

See [Security Best Practices](docs/guides/安全加固最佳实践.md) *(Chinese)*

---

## 🤝 Contributing

We welcome contributions! Here's how:

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Write code + tests
4. Run tests: `npm test`
5. Submit a PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

---

## 📊 Repository Stats

- 📁 Files: **100+**
- 📝 Documentation pages: **110+**
- 💻 Code examples: **35+**
- ⭐ Last updated: 2026-03-30

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Made with ❤️ by the OpenClaw community
</div>
