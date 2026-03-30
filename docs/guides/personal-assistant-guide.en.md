# 🧑‍💼 Personal AI Assistant — Complete Setup Guide

**Scenario**: Build your own 24/7 AI assistant on Telegram / WhatsApp / Discord / Slack  
**Estimated Time**: 45 minutes  
**Difficulty**: ⭐⭐☆☆☆  
**Prerequisites**: Node.js 18+, OpenClaw installed

---

## 🎯 What You'll Build

A personal AI assistant that can:

| Capability | Example |
|-----------|---------|
| 📝 Writing & Editing | "Draft a follow-up email for today's meeting" |
| 🔍 Research & Summary | "Summarize this article: [URL]" |
| 📅 Schedule Management | "What's on my calendar this week?" |
| ✅ Task Tracking | "Add 'Review PR #42' to my todo list" |
| 🌐 Real-time Information | "What's the current Bitcoin price?" |
| 🔁 Workflow Automation | "Every morning, send me a brief news digest" |

By the end of this guide, you'll have a production-ready assistant running on your favorite messaging platform.

---

## 📋 Prerequisites

### System Requirements

```
Node.js  >= 18.0.0
npm      >= 9.0.0
Memory   >= 512 MB
```

Check your versions:

```bash
node --version   # Should output v18.x.x or higher
npm --version    # Should output 9.x.x or higher
```

### Accounts You'll Need

- [ ] **OpenClaw** — installed and running ([Installation Guide](../getting-started/quickstart.md))
- [ ] **At least one** messaging platform account (Telegram / WhatsApp / Discord / Slack)
- [ ] **One AI provider** API key (OpenAI / Anthropic / Google / Azure)

---

## 🚀 Step 1: Initial Setup

### 1.1 Create Project Directory

```bash
mkdir my-ai-assistant
cd my-ai-assistant
npm init -y
npm install node-fetch dotenv
```

### 1.2 Configure Environment

Create a `.env` file:

```bash
# OpenClaw Gateway
OPENCLAW_URL=http://localhost:3000
OPENCLAW_API_KEY=your-openclaw-api-key

# Primary AI Provider (choose one)
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_API_KEY=AIza...

# Your preferred channel (fill in the one you use)
TELEGRAM_BOT_TOKEN=
DISCORD_BOT_TOKEN=
SLACK_BOT_TOKEN=
SLACK_APP_TOKEN=
```

### 1.3 Verify OpenClaw Connection

```bash
curl http://localhost:3000/health
# Expected: {"status":"ok","version":"x.x.x"}
```

---

## 📱 Step 2: Choose Your Platform

Pick the platform you use most. Each section is self-contained.

---

### Option A: Telegram (Recommended for Beginners)

**Why Telegram?** Fast setup, rich formatting support, works on all devices.

#### A1. Create Your Bot

1. Open Telegram → search for `@BotFather`
2. Send `/newbot`
3. Choose a name: `My AI Assistant`
4. Choose a username: `myai_assistant_bot` (must end in `bot`)
5. Copy the token: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

#### A2. Get Your Chat ID

1. Send any message to your new bot
2. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Find `"chat":{"id":123456789}` — that's your chat ID

Add to `.env`:
```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=123456789
```

#### A3. Create `telegram-assistant.js`

```javascript
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ALLOWED_CHAT_ID = parseInt(process.env.TELEGRAM_CHAT_ID);

// Conversation memory (in-memory, per session)
const conversations = new Map();

// Helper: call OpenClaw
async function askAI(userId, message) {
  const history = conversations.get(userId) || [];
  history.push({ role: 'user', content: message });

  const response = await fetch(`${process.env.OPENCLAW_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a helpful personal assistant. Today is ${new Date().toDateString()}.
Be concise, friendly, and proactive. When giving lists, use bullet points.
For code, always use markdown code blocks with the language specified.`
        },
        ...history
      ],
      max_tokens: 1000
    })
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;

  history.push({ role: 'assistant', content: reply });

  // Keep last 20 turns to avoid token overflow
  if (history.length > 40) history.splice(0, 2);
  conversations.set(userId, history);

  return reply;
}

// Security: only respond to your own chat
bot.on('message', async (msg) => {
  if (msg.chat.id !== ALLOWED_CHAT_ID) {
    bot.sendMessage(msg.chat.id, '⛔ Unauthorized');
    return;
  }

  const userId = msg.from.id.toString();
  const text = msg.text;

  // Handle commands
  if (text === '/start') {
    bot.sendMessage(msg.chat.id, `👋 Hi! I'm your personal AI assistant.\n\nI can help you with:\n• Writing & editing\n• Research & summarization\n• Task management\n• Q&A on any topic\n\nJust send me a message to get started!`);
    return;
  }

  if (text === '/clear') {
    conversations.delete(userId);
    bot.sendMessage(msg.chat.id, '🗑️ Conversation cleared. Starting fresh!');
    return;
  }

  if (text === '/help') {
    bot.sendMessage(msg.chat.id, `**Commands:**\n/start - Introduction\n/clear - Clear conversation history\n/help - Show this message\n\n**Tips:**\n• I remember our conversation context\n• Send a URL and ask me to summarize it\n• Ask me to write, translate, or explain anything`);
    return;
  }

  // Show typing indicator
  bot.sendChatAction(msg.chat.id, 'typing');

  try {
    const reply = await askAI(userId, text);
    // Telegram supports Markdown
    bot.sendMessage(msg.chat.id, reply, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error:', error);
    bot.sendMessage(msg.chat.id, '❌ Something went wrong. Please try again.');
  }
});

console.log('🤖 Telegram bot is running...');
```

Install dependencies and run:

```bash
npm install node-telegram-bot-api
node telegram-assistant.js
```

---

### Option B: WhatsApp (via WhatsApp Business API)

**Why WhatsApp?** Largest global user base, familiar interface.

> **Note**: Requires a Meta Developer account and a verified phone number.

#### B1. Meta Developer Setup

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app → select **Business** type
3. Add **WhatsApp** product
4. Under WhatsApp → API Setup, note:
   - **Phone Number ID**
   - **WhatsApp Business Account ID**
5. Generate a **Permanent Token** (System User)

```bash
WHATSAPP_TOKEN=EAAxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890
WHATSAPP_VERIFY_TOKEN=my_secure_verify_token_123
```

#### B2. Create `whatsapp-assistant.js`

```javascript
require('dotenv').config();
const express = require('express');
const app = express();
app.use(express.json());

const conversations = new Map();

// Webhook verification (Meta requirement)
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive messages
app.post('/webhook', async (req, res) => {
  const body = req.body;
  res.sendStatus(200); // Acknowledge immediately

  const entry = body.entry?.[0]?.changes?.[0]?.value;
  if (!entry?.messages) return;

  const message = entry.messages[0];
  if (message.type !== 'text') return; // Handle text only for now

  const from = message.from; // Sender's phone number
  const text = message.text.body;

  const reply = await askAI(from, text);
  await sendWhatsAppMessage(from, reply);
});

async function askAI(userId, message) {
  const history = conversations.get(userId) || [];
  history.push({ role: 'user', content: message });

  const response = await fetch(`${process.env.OPENCLAW_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful personal assistant. Be concise and friendly.' },
        ...history
      ]
    })
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;

  history.push({ role: 'assistant', content: reply });
  if (history.length > 20) history.splice(0, 2);
  conversations.set(userId, history);

  return reply;
}

async function sendWhatsAppMessage(to, text) {
  await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text }
      })
    }
  );
}

app.listen(3001, () => console.log('🟢 WhatsApp webhook listening on :3001'));
```

#### B3. Expose Webhook with ngrok (Development)

```bash
npm install -g ngrok
ngrok http 3001
# Copy the https URL, e.g., https://abc123.ngrok.io
```

Register webhook in Meta Developer Console:
- Webhook URL: `https://abc123.ngrok.io/webhook`
- Verify token: `my_secure_verify_token_123`
- Subscribe to: `messages`

---

### Option C: Discord

**Why Discord?** Best for community/server-based assistants, rich slash commands.

#### C1. Create Discord Application

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application** → name it "AI Assistant"
3. Go to **Bot** → click **Add Bot**
4. Under **Privileged Gateway Intents**, enable:
   - ✅ Message Content Intent
5. Copy the **Bot Token**
6. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Read Message History`
7. Visit the generated URL to invite bot to your server

```bash
DISCORD_BOT_TOKEN=MTxxxxxxxx.Gxxxxx.xxxxxxxx
DISCORD_GUILD_ID=your_server_id  # Right-click server → Copy ID
```

#### C2. Create `discord-assistant.js`

```javascript
require('dotenv').config();
const { Client, GatewayIntentBits, Events } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

const conversations = new Map();
const COMMAND_PREFIX = '!ai ';

client.once(Events.ClientReady, () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const isDM = message.channel.type === 1; // DM channel
  const isMentioned = message.mentions.has(client.user);
  const hasPrefix = message.content.startsWith(COMMAND_PREFIX);

  if (!isDM && !isMentioned && !hasPrefix) return;

  let userMessage = message.content;
  if (isMentioned) userMessage = userMessage.replace(`<@${client.user.id}>`, '').trim();
  if (hasPrefix) userMessage = userMessage.slice(COMMAND_PREFIX.length).trim();

  if (!userMessage) {
    message.reply('How can I help you? Just ask me anything!');
    return;
  }

  // Show "typing..."
  message.channel.sendTyping();

  const userId = message.author.id;
  const history = conversations.get(userId) || [];
  history.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch(`${process.env.OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a helpful AI assistant in a Discord server. 
Format responses with Discord markdown (use **bold**, \`code\`, and \`\`\`language\`\`\` code blocks).
Keep responses under 1800 characters when possible.`
          },
          ...history
        ],
        max_tokens: 800
      })
    });

    const data = await response.json();
    const reply = data.choices[0].message.content;

    history.push({ role: 'assistant', content: reply });
    if (history.length > 20) history.splice(0, 2);
    conversations.set(userId, history);

    // Discord has 2000 char limit — split if needed
    if (reply.length > 1900) {
      const chunks = reply.match(/[\s\S]{1,1900}/g);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      message.reply(reply);
    }

  } catch (error) {
    console.error(error);
    message.reply('❌ Something went wrong. Please try again.');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
```

```bash
npm install discord.js
node discord-assistant.js
```

---

### Option D: Slack (App)

**Why Slack?** Best for professional/workplace use, deep integration with tools.

#### D1. Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From Scratch**
3. Under **OAuth & Permissions**, add Bot Token Scopes:
   - `chat:write`, `im:history`, `im:write`, `app_mentions:read`
4. Enable **Socket Mode** (Settings → Socket Mode)
5. Under **Event Subscriptions** → Subscribe to bot events:
   - `message.im` (Direct Messages)
   - `app_mention` (Mentions in channels)
6. Install app to your workspace

```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-level-token
```

#### D2. Create `slack-assistant.js`

```javascript
require('dotenv').config();
const { App } = require('@slack/bolt');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

const conversations = new Map();

async function askAI(userId, message, systemPrompt = '') {
  const history = conversations.get(userId) || [];
  history.push({ role: 'user', content: message });

  const response = await fetch(`${process.env.OPENCLAW_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful workplace AI assistant. Be professional, concise, and use Slack markdown formatting (*bold*, `code`, ```code blocks```).'
        },
        ...history
      ],
      max_tokens: 1000
    })
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;

  history.push({ role: 'assistant', content: reply });
  if (history.length > 20) history.splice(0, 2);
  conversations.set(userId, history);

  return reply;
}

// Handle DMs
app.message(async ({ message, say }) => {
  if (message.subtype || !message.text) return;
  if (message.channel_type !== 'im') return;

  try {
    const reply = await askAI(message.user, message.text);
    await say({ text: reply, thread_ts: message.ts });
  } catch (error) {
    await say('❌ Error processing your request. Please try again.');
  }
});

// Handle @mentions in channels
app.event('app_mention', async ({ event, say }) => {
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  try {
    const reply = await askAI(event.user, text);
    await say({
      text: reply,
      thread_ts: event.ts  // Reply in thread
    });
  } catch (error) {
    await say({ text: '❌ Something went wrong.', thread_ts: event.ts });
  }
});

(async () => {
  await app.start();
  console.log('⚡ Slack AI assistant is running!');
})();
```

```bash
npm install @slack/bolt
node slack-assistant.js
```

---

## 🧠 Step 3: Add Skills to Your Assistant

Skills transform a basic chatbot into a powerful assistant. Add these capabilities progressively.

### Skill 1: Web Search Integration

```javascript
// skills/web-search.js
const SEARCH_API_KEY = process.env.SERP_API_KEY; // serpapi.com

async function webSearch(query) {
  const url = `https://serpapi.com/search?q=${encodeURIComponent(query)}&api_key=${SEARCH_API_KEY}&num=3`;
  const res = await fetch(url);
  const data = await res.json();

  return data.organic_results
    ?.slice(0, 3)
    .map(r => `**${r.title}**\n${r.snippet}\n${r.link}`)
    .join('\n\n') || 'No results found.';
}

module.exports = { webSearch };
```

### Skill 2: URL Summarizer

```javascript
// skills/url-summarizer.js
async function summarizeURL(url, apiKey, gatewayUrl) {
  // Fetch page content
  const pageRes = await fetch(`https://r.jina.ai/${url}`);  // Jina Reader API
  const content = await pageRes.text();

  // Summarize with AI
  const aiRes = await fetch(`${gatewayUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',   // Use cheaper model for summarization
      messages: [
        { role: 'system', content: 'Summarize the following article in 3-5 bullet points. Be concise.' },
        { role: 'user', content: content.substring(0, 8000) }
      ],
      max_tokens: 400
    })
  });

  const data = await aiRes.json();
  return data.choices[0].message.content;
}

module.exports = { summarizeURL };
```

### Skill 3: Reminders (Cron-based)

```javascript
// skills/reminders.js
const cron = require('node-cron');

const reminders = [];

function addReminder(cronExpression, message, sendFn) {
  const job = cron.schedule(cronExpression, () => {
    sendFn(`⏰ Reminder: ${message}`);
  });

  reminders.push({ message, job });
  return `✅ Reminder set: "${message}"`;
}

// Example: Every weekday at 9 AM
// addReminder('0 9 * * 1-5', 'Time for standup!', bot.sendMessage.bind(bot, chatId));

module.exports = { addReminder, reminders };
```

---

## 🔄 Step 4: Routing Logic (Advanced)

For power users: route different requests to different AI models.

```javascript
// smart-router.js
function selectModel(userMessage) {
  const lower = userMessage.toLowerCase();

  // Code tasks → most capable model
  if (lower.includes('code') || lower.includes('debug') || lower.includes('function') ||
      lower.includes('script') || lower.includes('error') || lower.includes('bug')) {
    return { model: 'gpt-4o', reason: 'Code task' };
  }

  // Simple Q&A → fast, cheap model
  if (lower.length < 100 &&
      (lower.includes('what is') || lower.includes('who is') || lower.includes('when'))) {
    return { model: 'gpt-4o-mini', reason: 'Simple query' };
  }

  // Long analysis → high context model
  if (lower.length > 500 || lower.includes('analyze') || lower.includes('compare')) {
    return { model: 'claude-3-opus-20240229', reason: 'Complex analysis' };
  }

  // Default
  return { model: 'gpt-4o', reason: 'Default' };
}

module.exports = { selectModel };
```

Integrate into your message handler:

```javascript
const { selectModel } = require('./smart-router');

async function askAI(userId, message) {
  const { model, reason } = selectModel(message);
  console.log(`[Router] Using ${model} — ${reason}`);

  // ... rest of your fetch call using the selected model
}
```

---

## 🚀 Step 5: Production Deployment

### Run as a Background Service (PM2)

```bash
# Install PM2
npm install -g pm2

# Start your bot
pm2 start telegram-assistant.js --name "ai-assistant"

# Auto-restart on server reboot
pm2 startup
pm2 save

# Monitor
pm2 status
pm2 logs ai-assistant
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .

ENV NODE_ENV=production

CMD ["node", "telegram-assistant.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  ai-assistant:
    build: .
    restart: unless-stopped
    env_file: .env
    environment:
      - NODE_ENV=production
    networks:
      - openclaw_network

networks:
  openclaw_network:
    external: true
```

```bash
docker-compose up -d
docker-compose logs -f ai-assistant
```

---

## 🛡️ Step 6: Security Hardening

### Rate Limiting (Prevent Abuse)

```javascript
// rate-limiter.js
const limits = new Map();

function checkRateLimit(userId, maxRequests = 20, windowMinutes = 1) {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;

  const userLimits = limits.get(userId) || { count: 0, resetAt: now + windowMs };

  if (now > userLimits.resetAt) {
    // Window expired — reset
    userLimits.count = 0;
    userLimits.resetAt = now + windowMs;
  }

  userLimits.count++;
  limits.set(userId, userLimits);

  if (userLimits.count > maxRequests) {
    const waitSeconds = Math.ceil((userLimits.resetAt - now) / 1000);
    return { allowed: false, message: `Rate limit exceeded. Please wait ${waitSeconds}s.` };
  }

  return { allowed: true };
}

module.exports = { checkRateLimit };
```

### Input Sanitization

```javascript
function sanitizeInput(text) {
  // Remove potential injection attempts
  const cleaned = text
    .replace(/\[INST\]|\[\/INST\]/g, '')  // LLaMA injection
    .replace(/<\|im_start\|>|<\|im_end\|>/g, '')  // Mistral injection
    .replace(/Human:|Assistant:/g, '')  // Role spoofing
    .trim();

  // Limit length
  return cleaned.substring(0, 4000);
}
```

---

## 🧪 Testing Your Assistant

### Manual Test Checklist

```
□ Basic Q&A: "What is the capital of France?"
□ Code request: "Write a Python function to reverse a string"
□ Context memory: Ask a follow-up question referencing previous answer
□ URL summary: "Summarize https://example.com/article"
□ Rate limiting: Send 25 messages rapidly
□ Error handling: Temporarily stop OpenClaw and send a message
□ /clear command: Verify conversation history is cleared
□ Long response: "Write a 1000-word essay on climate change"
```

### Load Test

```bash
# Quick load test with curl
for i in {1..10}; do
  curl -s -X POST http://localhost:3000/v1/chat/completions \
    -H "Authorization: Bearer $OPENCLAW_API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hello"}]}' &
done
wait
echo "All requests completed"
```

---

## 🔧 Troubleshooting

| Problem | Symptom | Solution |
|---------|---------|----------|
| Bot doesn't respond | No reply to messages | Check token in `.env`, verify bot is running with `pm2 status` |
| "Unauthorized" error | 403 from OpenClaw | Verify `OPENCLAW_API_KEY` matches your config |
| Slow responses | >5s per message | Enable response caching in OpenClaw, or use `gpt-4o-mini` |
| Memory growing | RAM usage increases | Add `conversations.clear()` every 24h with a cron job |
| Context lost | Bot forgets conversation | Check `conversations.get(userId)` — ensure userId is consistent |
| Token limit hit | API error `context_length_exceeded` | Reduce history size (change `40` to `10` in splice logic) |
| Webhook not working | WhatsApp/Slack no events | Check firewall, ensure webhook URL is HTTPS, re-verify in console |

---

## 📈 What's Next?

You now have a fully functional personal AI assistant. Here are some ideas to take it further:

| Enhancement | Difficulty | Guide |
|------------|-----------|-------|
| Add voice message support | ⭐⭐⭐ | Use Whisper API for speech-to-text |
| Connect to your calendar | ⭐⭐⭐ | Google Calendar API integration |
| Multi-language support | ⭐⭐ | Detect language and respond accordingly |
| Custom knowledge base | ⭐⭐⭐⭐ | RAG with vector database (Pinecone/Chroma) |
| Analytics dashboard | ⭐⭐⭐ | Track usage with OpenTelemetry |
| Team sharing | ⭐⭐⭐ | See [Team Bot Guide](team-bot-guide.md) |

---

## 📚 Related Documentation

- [OpenClaw Quick Start](../getting-started/quickstart.md)
- [OpenClaw Quick Start (中文)](../getting-started/quickstart.md)
- [Team Bot Guide](team-bot-guide.md)
- [Advanced Routing](../advanced/agent-routing.md)
- [OpenTelemetry Observability](../advanced/opentelemetry.md)
- [Performance Tuning](../advanced/performance-tuning.md)

---

*Need help? Open an issue on [GitHub](https://github.com/rookie1989/claw-picker) or join our community.*
