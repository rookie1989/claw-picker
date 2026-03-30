# Quick Start — Get OpenClaw Running in 5 Minutes

> **Goal:** By the end of this guide you will have OpenClaw connected to at least one chat channel and exchanging real messages with an AI model.

---

## Prerequisites

Before you begin, make sure you have:

| Requirement | Details |
|-------------|---------|
| **OpenClaw installed** | See [Installation Guide](installation.en.md) |
| **AI model API key** | OpenAI / Anthropic / Google Gemini / any OpenAI-compatible provider |
| **A supported chat app** | WhatsApp, Telegram, Discord, Slack, WeChat Work, or DingTalk |
| **Node.js ≥ 18** | `node --version` should print `v18.x` or higher |

---

## Step 1 — Run the Onboarding Wizard (≈ 1 min)

```bash
openclaw onboard
```

The interactive wizard walks you through four questions:

```
? Select your AI provider:
  ❯ OpenAI
    Anthropic
    Google Gemini
    Azure OpenAI
    Custom (OpenAI-compatible)

? Enter your API key: sk-••••••••••••••••

? Select a model:
  ❯ gpt-4o
    gpt-4o-mini
    claude-3-5-sonnet
    gemini-1.5-pro

? Which channel would you like to connect first?
  ❯ Telegram  (recommended for beginners)
    WhatsApp
    Discord
    Slack
    Skip (configure manually later)
```

> **Tip:** You can always re-run `openclaw onboard` or edit `~/.openclaw/config.yaml` to change these settings later.

---

## Step 2 — Connect Your Chat Channel (≈ 2 min)

### Option A — Telegram (Easiest)

1. Open Telegram and search for **`@BotFather`**.
2. Send `/newbot` and follow the prompts to create a bot. Copy the **Bot Token**.
3. Register the token with OpenClaw:

   ```bash
   openclaw config channel telegram --token YOUR_BOT_TOKEN
   ```

4. Start the gateway:

   ```bash
   openclaw gateway start
   ```

5. Send your bot a message in Telegram. You should get a reply within 2 seconds. ✅

---

### Option B — WhatsApp

1. Start the gateway:

   ```bash
   openclaw gateway start
   ```

2. A QR code appears in your terminal. Scan it with **WhatsApp → Linked Devices → Link a Device**.

3. After scanning you will see:

   ```
   ✓ WhatsApp connected successfully  (device: My MacBook)
   ```

4. Send a message to yourself (Saved Messages) or ask a friend to text you. ✅

---

### Option C — Discord

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications) and create a new application.
2. Under **Bot**, click **Add Bot** and copy the **Bot Token**.
3. Under **OAuth2 → URL Generator**, tick `bot` + `Send Messages` + `Read Message History`, copy the invite URL, and add the bot to your server.
4. Configure OpenClaw:

   ```bash
   openclaw config channel discord \
     --token YOUR_BOT_TOKEN \
     --guild YOUR_GUILD_ID
   ```

5. Mention the bot in any channel: `@YourBot hello`. ✅

---

### Option D — Slack

1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps).
2. Enable **Socket Mode** and generate an **App-Level Token** (`connections:write`).
3. Add **Bot Token Scopes**: `chat:write`, `app_mentions:read`, `channels:history`.
4. Install the app to your workspace and copy the **Bot User OAuth Token**.
5. Configure OpenClaw:

   ```bash
   openclaw config channel slack \
     --bot-token xoxb-YOUR-BOT-TOKEN \
     --app-token xapp-YOUR-APP-TOKEN
   ```

> **Note:** OpenClaw stores the token value internally. Do not hard-code tokens in source files.

---

## Step 3 — Send Your First Message (≈ 1 min)

In your connected chat app, send:

```
Hello, OpenClaw!
```

Expected response:

```
Hi there! I'm your OpenClaw AI assistant, powered by gpt-4o.

I can help you with:
  • Writing and debugging code
  • Answering technical questions
  • Summarizing documents
  • Managing tasks and reminders
  • Web search and research

What can I do for you today?
```

---

## Step 4 — Try the Built-in Commands (≈ 1 min)

These commands work in every connected channel:

| Command | What it does |
|---------|-------------|
| `/help` | Show all available commands |
| `/tools` | List active tools/plugins |
| `/model gpt-4o-mini` | Switch AI model on the fly |
| `/clear` | Clear conversation history |
| `/task Buy milk by tomorrow 9 AM` | Create a reminder |
| `/search OpenClaw routing config` | Search the docs |
| `/stats` | Show token usage and cost estimate |

---

## Step 5 — Open the Web Console (Optional)

Visit [http://localhost:3000](http://localhost:3000) in your browser to access the dashboard:

- **Sessions** — view all active conversations
- **Logs** — real-time gateway logs with filter and search
- **Config** — edit channel and model settings with a UI
- **Plugins** — install/uninstall skills and integrations
- **Cost Monitor** — track API spending by channel and model

---

## Useful Gateway Commands

```bash
# Check gateway health
openclaw gateway status

# View last 50 log lines
openclaw gateway logs --tail 50

# Watch logs in real time
openclaw gateway logs --follow

# Restart the gateway (applies config changes)
openclaw gateway restart

# Stop the gateway
openclaw gateway stop
```

---

## What's Next?

You are up and running! Here are the recommended paths forward:

### I want to customize my AI assistant
→ [Create Your First Bot](first-bot.en.md) — system prompts, personas, and skill sets

### I want to connect multiple channels
→ [Multi-Channel Configuration](../advanced/multi-channel.md) — unified routing across WhatsApp + Slack + Discord

### I want to connect enterprise platforms
→ [WeChat Work Integration](../guides/wecom-integration.md)  
→ [DingTalk Integration](../guides/dingtalk-integration.md)  
→ [Feishu / Lark Integration](../feishu-integration/README.md)

### I want to build custom workflows
→ [Plugin Development Guide](../advanced/plugin-development.md)  
→ [Multi-Agent Collaboration](../advanced/multi-agent.md)

### I want to go to production
→ [High-Availability Deployment](../advanced/high-availability.md)  
→ [Performance Tuning](../advanced/performance-tuning.md)

---

## Troubleshooting Quick Fixes

| Symptom | Most Likely Cause | Fix |
|---------|------------------|-----|
| Bot does not respond | Gateway not running | `openclaw gateway start` |
| `Invalid API key` error | Wrong key or extra spaces | Re-run `openclaw onboard` |
| QR code expires (WhatsApp) | Took > 60 seconds to scan | Restart gateway and scan immediately |
| Telegram bot offline | Webhook conflict | `openclaw config channel telegram --reset-webhook` |
| High latency (> 5 s) | Slow model or no connection pool | See [Performance Tuning](../advanced/performance-tuning.md) |

For more detailed troubleshooting, see [FAQ — Troubleshooting](../FAQ/09-troubleshooting.md).

---

## Getting Help

- 📖 **Docs**: [docs.openclaw.dev](https://docs.openclaw.dev)
- 💬 **Community**: [github.com/openclaw/openclaw/discussions](https://github.com/openclaw/openclaw/discussions)
- 🐛 **Bug Reports**: [github.com/openclaw/openclaw/issues](https://github.com/openclaw/openclaw/issues)
- 📧 **Enterprise Support**: support@openclaw.dev

---

*Last updated: 2026-03-30 · OpenClaw v2.x*
