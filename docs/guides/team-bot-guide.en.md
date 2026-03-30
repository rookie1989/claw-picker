# Team Bot for Organizations — Complete Integration Guide

> Deploy OpenClaw as a production-grade AI Bot across Slack, Microsoft Teams, Feishu, and WeCom with enterprise-level governance, routing, and observability.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Slack Workspace Bot](#3-slack-workspace-bot)
4. [Microsoft Teams Bot](#4-microsoft-teams-bot)
5. [Feishu (Lark) Enterprise Bot](#5-feishu-lark-enterprise-bot)
6. [WeCom (WeChat Work) Group Bot](#6-wecom-wechat-work-group-bot)
7. [Unified Message Router](#7-unified-message-router)
8. [Access Control & Rate Limiting](#8-access-control--rate-limiting)
9. [Conversation Memory per Channel](#9-conversation-memory-per-channel)
10. [Admin Dashboard](#10-admin-dashboard)
11. [Production Deployment](#11-production-deployment)
12. [Security Hardening](#12-security-hardening)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Team Members                          │
│  Slack │ MS Teams │ Feishu │ WeCom │ Web Chat           │
└────────┬───────────┬────────┬───────┬────────────────────┘
         │           │        │       │
         ▼           ▼        ▼       ▼
┌─────────────────────────────────────────────────────────┐
│              Unified Gateway (OpenClaw)                  │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Auth Layer │  │ Rate Limiter │  │  Router Engine │  │
│  └─────────────┘  └──────────────┘  └────────────────┘  │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Skill Dispatcher                       │ │
│  │  Code Review │ Doc Search │ Meeting Summary │ …     │ │
│  └─────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┼──────────────────────┐
         ▼                 ▼                       ▼
   ┌──────────┐    ┌──────────────┐         ┌──────────┐
   │ GPT-4o   │    │ Claude 3.5   │         │ Gemini   │
   │ (default)│    │ (long text)  │         │ (vision) │
   └──────────┘    └──────────────┘         └──────────┘
```

**Design Goals**:
- **Single deployment** serves all IM platforms
- **Stateful conversations** per user × channel
- **Role-based access** (admin / member / read-only)
- **Cost attribution** by team / department / project
- **Zero-downtime** blue-green deployments

---

## 2. Prerequisites

```bash
node -v   # >= 18.0
npm -v    # >= 9.0
redis-cli ping   # PONG (Redis 6+)

# Clone the repo
git clone https://github.com/rookie1989/claw-picker.git
cd claw-picker/examples/team-bot

# Install dependencies
npm install
```

**Environment template** — copy and fill in:

```bash
cp .env.example .env
```

```ini
# .env
OPENCLAW_API_KEY=your_openclaw_key
OPENCLAW_ENDPOINT=https://api.openclaw.ai/v1

# Slack
SLACK_BOT_TOKEN=xoxb-REPLACE_WITH_YOUR_TOKEN
SLACK_APP_TOKEN=xapp-REPLACE_WITH_YOUR_APP_TOKEN
SLACK_SIGNING_SECRET=abc123

# Microsoft Teams
TEAMS_APP_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
TEAMS_APP_PASSWORD=your_teams_password
TEAMS_TENANT_ID=your_tenant_id

# Feishu
FEISHU_APP_ID=cli_xxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
FEISHU_VERIFICATION_TOKEN=xxxxxxxxxxxxxxxx
FEISHU_ENCRYPT_KEY=xxxxxxxxxxxxxxxx

# WeCom
WECOM_CORP_ID=ww_xxxxxxxxxx
WECOM_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx
WECOM_AGENT_ID=1000002
WECOM_TOKEN=xxxxxxxxxxxxxxxx
WECOM_ENCODING_AES_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Redis
REDIS_URL=redis://localhost:6379

# Security
ADMIN_SECRET=your_secure_admin_secret
JWT_SECRET=your_jwt_secret_min_32_chars
```

---

## 3. Slack Workspace Bot

### 3.1 Create Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → From manifest
2. Paste the manifest below:

```yaml
# slack-manifest.yaml
display_information:
  name: OpenClaw Team Bot
  description: Your AI-powered team assistant
  background_color: "#1a1a2e"
features:
  app_home:
    home_tab_enabled: true
    messages_tab_enabled: true
  bot_user:
    display_name: OpenClaw
    always_online: true
  slash_commands:
    - command: /ai
      description: Ask OpenClaw anything
      usage_hint: "[your question]"
    - command: /ai-review
      description: Code review for pasted code
      usage_hint: "[paste code here]"
    - command: /ai-summarize
      description: Summarize last N messages
      usage_hint: "[number, default 20]"
oauth_config:
  scopes:
    bot:
      - channels:history
      - channels:read
      - chat:write
      - commands
      - groups:history
      - im:history
      - im:write
      - users:read
settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.im
      - message.channels
  interactivity:
    is_enabled: true
  socket_mode_enabled: true
  token_rotation_enabled: false
```

### 3.2 Slack Bot Handler

```javascript
// src/platforms/slack.js
const { App } = require('@slack/bolt');
const { createOpenClawClient } = require('../openclaw');
const { getConversation, saveConversation } = require('../memory');
const { checkRateLimit } = require('../ratelimit');

const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true,
});

const ocClient = createOpenClawClient();

// Handle @mentions and DMs
slackApp.event('app_mention', async ({ event, say, client }) => {
  const userId = event.user;
  const channelId = event.channel;
  const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

  // Rate limiting
  const limited = await checkRateLimit(`slack:${userId}`, 20, 60); // 20 req/min
  if (limited) {
    await say({ text: '⚠️ You\'re sending messages too fast. Please wait a moment.', thread_ts: event.ts });
    return;
  }

  // Show typing indicator
  await client.chat.postMessage({
    channel: channelId,
    text: '🤔 Thinking...',
    thread_ts: event.ts,
  }).then(async (r) => {
    const thinkingTs = r.ts;

    // Get conversation history
    const history = await getConversation(`slack:${userId}:${channelId}`, 10);

    // Call OpenClaw
    const response = await ocClient.chat({
      messages: [...history, { role: 'user', content: text }],
      stream: false,
    });

    const reply = response.choices[0].message.content;

    // Save history
    await saveConversation(`slack:${userId}:${channelId}`, [
      { role: 'user', content: text },
      { role: 'assistant', content: reply },
    ]);

    // Update with real response (delete thinking, post reply)
    await client.chat.delete({ channel: channelId, ts: thinkingTs });
    await client.chat.postMessage({
      channel: channelId,
      thread_ts: event.ts,
      blocks: formatSlackBlocks(reply),
      text: reply, // fallback
    });
  });
});

// /ai slash command
slackApp.command('/ai', async ({ command, ack, respond }) => {
  await ack();
  const { user_id, text, channel_id } = command;

  if (!text) {
    await respond('Usage: `/ai <your question>`\nExample: `/ai Explain async/await in JavaScript`');
    return;
  }

  const history = await getConversation(`slack:${user_id}:${channel_id}`, 8);
  const response = await ocClient.chat({
    messages: [...history, { role: 'user', content: text }],
  });
  const reply = response.choices[0].message.content;

  await saveConversation(`slack:${user_id}:${channel_id}`, [
    { role: 'user', content: text },
    { role: 'assistant', content: reply },
  ]);

  await respond({
    blocks: formatSlackBlocks(reply),
    text: reply,
    response_type: 'in_channel',
  });
});

// /ai-review slash command
slackApp.command('/ai-review', async ({ command, ack, respond }) => {
  await ack();
  const { text } = command;

  if (!text || text.length < 10) {
    await respond('Usage: `/ai-review [paste your code here]`');
    return;
  }

  const response = await ocClient.chat({
    messages: [{
      role: 'system',
      content: 'You are a senior code reviewer. Analyze the code for: bugs, security issues, performance, best practices, and readability. Format your response with clear sections.',
    }, {
      role: 'user',
      content: `Please review this code:\n\`\`\`\n${text}\n\`\`\``,
    }],
  });

  await respond({
    blocks: formatSlackBlocks(response.choices[0].message.content),
    text: response.choices[0].message.content,
  });
});

// /ai-summarize slash command
slackApp.command('/ai-summarize', async ({ command, ack, respond, client }) => {
  await ack();
  const limit = parseInt(command.text) || 20;
  const channelId = command.channel_id;

  // Fetch recent messages
  const history = await client.conversations.history({
    channel: channelId,
    limit: Math.min(limit, 50),
  });

  const messages = history.messages
    .filter(m => !m.bot_id && m.text)
    .map(m => `<@${m.user}>: ${m.text}`)
    .reverse()
    .join('\n');

  const response = await ocClient.chat({
    messages: [{
      role: 'system',
      content: 'You are a meeting summarizer. Create a concise, structured summary with key decisions, action items, and next steps.',
    }, {
      role: 'user',
      content: `Summarize these ${limit} messages:\n\n${messages}`,
    }],
  });

  await respond({
    blocks: formatSlackBlocks(`📋 **Summary of last ${limit} messages**\n\n${response.choices[0].message.content}`),
    text: response.choices[0].message.content,
    response_type: 'ephemeral', // Only visible to the requester
  });
});

// Format markdown for Slack Block Kit
function formatSlackBlocks(text) {
  // Split into sections (max 3000 chars each)
  const sections = [];
  const chunks = text.match(/.{1,2900}(\s|$)/gs) || [text];

  for (const chunk of chunks) {
    sections.push({
      type: 'section',
      text: { type: 'mrkdwn', text: chunk.trim() },
    });
  }

  return sections;
}

module.exports = { slackApp };
```

---

## 4. Microsoft Teams Bot

### 4.1 Azure Bot Registration

```bash
# 1. Install Azure CLI
npm install -g @azure/cli

# 2. Create Bot registration
az bot create \
  --resource-group myResourceGroup \
  --name OpenClawTeamsBot \
  --kind registration \
  --endpoint https://your-domain.com/api/teams/messages \
  --sku S1
```

### 4.2 Teams Bot Handler

```javascript
// src/platforms/teams.js
const { ActivityHandler, MessageFactory, TurnContext } = require('botbuilder');
const { createOpenClawClient } = require('../openclaw');
const { getConversation, saveConversation } = require('../memory');
const marked = require('marked');

class OpenClawTeamsBot extends ActivityHandler {
  constructor() {
    super();
    this.ocClient = createOpenClawClient();

    this.onMessage(async (context, next) => {
      const userId = context.activity.from.id;
      const conversationId = context.activity.conversation.id;
      const text = context.activity.text?.trim();

      if (!text) return;

      // Show typing indicator
      await context.sendActivity({ type: 'typing' });

      // Handle special commands
      if (text.startsWith('/')) {
        await this.handleCommand(context, text);
      } else {
        await this.handleChat(context, userId, conversationId, text);
      }

      await next();
    });

    this.onMembersAdded(async (context, next) => {
      for (const member of context.activity.membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity(MessageFactory.text(
            `👋 Hi! I'm **OpenClaw**, your AI assistant.\n\n` +
            `Here's what I can do:\n` +
            `- **Answer questions** — just type naturally\n` +
            `- **/review [code]** — code review\n` +
            `- **/summarize [n]** — summarize last N messages\n` +
            `- **/image [description]** — generate an image\n` +
            `- **/clear** — clear conversation history\n\n` +
            `Ready to help! 🚀`
          ));
        }
      }
      await next();
    });
  }

  async handleChat(context, userId, conversationId, text) {
    const sessionKey = `teams:${userId}:${conversationId}`;
    const history = await getConversation(sessionKey, 10);

    try {
      const response = await this.ocClient.chat({
        messages: [...history, { role: 'user', content: text }],
      });
      const reply = response.choices[0].message.content;

      await saveConversation(sessionKey, [
        { role: 'user', content: text },
        { role: 'assistant', content: reply },
      ]);

      // Convert markdown to Teams-compatible format
      await context.sendActivity(MessageFactory.text(reply));
    } catch (err) {
      await context.sendActivity('❌ Sorry, I encountered an error. Please try again.');
      console.error('[Teams Bot]', err);
    }
  }

  async handleCommand(context, text) {
    const [cmd, ...args] = text.slice(1).split(' ');

    switch (cmd.toLowerCase()) {
      case 'review':
        await this.handleCodeReview(context, args.join(' '));
        break;
      case 'summarize':
        await context.sendActivity('📋 Message summarization is available in channel context only.');
        break;
      case 'clear':
        const sessionKey = `teams:${context.activity.from.id}:${context.activity.conversation.id}`;
        const { deleteConversation } = require('../memory');
        await deleteConversation(sessionKey);
        await context.sendActivity('✅ Conversation history cleared.');
        break;
      default:
        await context.sendActivity(`❓ Unknown command: \`/${cmd}\`\nType \`/help\` for available commands.`);
    }
  }

  async handleCodeReview(context, code) {
    if (!code || code.length < 5) {
      await context.sendActivity('Usage: `/review [paste your code here]`');
      return;
    }

    const response = await this.ocClient.chat({
      messages: [{
        role: 'system',
        content: 'You are a senior engineer. Review code for bugs, security, performance, and readability. Be concise but thorough.',
      }, {
        role: 'user',
        content: `Review this code:\n\`\`\`\n${code}\n\`\`\``,
      }],
    });

    await context.sendActivity(MessageFactory.text(response.choices[0].message.content));
  }
}

module.exports = { OpenClawTeamsBot };
```

---

## 5. Feishu (Lark) Enterprise Bot

### 5.1 Create Feishu App

1. Go to [open.feishu.cn](https://open.feishu.cn) → **Create App**
2. Add permissions: `im:message`, `im:message:send_as_bot`, `im:chat`
3. Enable **Event Subscriptions** and add callback URL

### 5.2 Feishu Handler

```javascript
// src/platforms/feishu.js
const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const { createOpenClawClient } = require('../openclaw');
const { getConversation, saveConversation } = require('../memory');

const router = express.Router();
const ocClient = createOpenClawClient();

// Token cache
let feishuTokenCache = { token: null, expiry: 0 };

async function getFeishuToken() {
  if (feishuTokenCache.token && Date.now() < feishuTokenCache.expiry) {
    return feishuTokenCache.token;
  }
  const res = await axios.post('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    app_id: process.env.FEISHU_APP_ID,
    app_secret: process.env.FEISHU_APP_SECRET,
  });
  feishuTokenCache = {
    token: res.data.tenant_access_token,
    expiry: Date.now() + (res.data.expire - 60) * 1000,
  };
  return feishuTokenCache.token;
}

async function sendFeishuMessage(receiveId, content, receiveIdType = 'open_id') {
  const token = await getFeishuToken();
  await axios.post(
    `https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`,
    {
      receive_id: receiveId,
      msg_type: 'interactive',
      content: JSON.stringify(buildFeishuCard(content)),
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );
}

function buildFeishuCard(text) {
  return {
    schema: '2.0',
    body: {
      elements: [{
        tag: 'markdown',
        content: text,
      }],
    },
    header: {
      title: { tag: 'plain_text', content: 'OpenClaw AI' },
      template: 'blue',
    },
  };
}

// Verify Feishu request signature
function verifyFeishuSignature(timestamp, nonce, body, signature) {
  const key = process.env.FEISHU_ENCRYPT_KEY;
  const hash = crypto.createHash('sha256')
    .update(timestamp + nonce + key + body)
    .digest('hex');
  return hash === signature;
}

// Event callback
router.post('/feishu/callback', async (req, res) => {
  const { challenge, type, event } = req.body;

  // URL verification
  if (type === 'url_verification') {
    return res.json({ challenge });
  }

  res.json({ code: 0 });

  if (type !== 'event_callback') return;
  if (!event || event.type !== 'im.message.receive_v1') return;

  const msg = event.message;
  if (msg.message_type !== 'text') return;

  const content = JSON.parse(msg.content).text.replace(/@\S+/g, '').trim();
  const senderId = event.sender.sender_id.open_id;
  const chatId = msg.chat_id;

  const sessionKey = `feishu:${senderId}:${chatId}`;
  const history = await getConversation(sessionKey, 10);

  try {
    const response = await ocClient.chat({
      messages: [...history, { role: 'user', content }],
    });
    const reply = response.choices[0].message.content;

    await saveConversation(sessionKey, [
      { role: 'user', content },
      { role: 'assistant', content: reply },
    ]);

    await sendFeishuMessage(chatId, reply, 'chat_id');
  } catch (err) {
    await sendFeishuMessage(chatId, '❌ 处理失败，请稍后重试', 'chat_id');
    console.error('[Feishu Bot]', err);
  }
});

module.exports = { feishuRouter: router };
```

---

## 6. WeCom (WeChat Work) Group Bot

### 6.1 Create WeCom App

1. Go to [work.weixin.qq.com/wework_admin](https://work.weixin.qq.com/wework_admin) → **Apps** → **Create App**
2. Set **Message Receiving URL**: `https://your-domain.com/api/wecom/callback`
3. Enable **Receive Messages**

### 6.2 WeCom Handler

```javascript
// src/platforms/wecom.js
const express = require('express');
const crypto = require('crypto');
const xml2js = require('xml2js');
const axios = require('axios');
const { createOpenClawClient } = require('../openclaw');
const { getConversation, saveConversation } = require('../memory');

const router = express.Router();
const ocClient = createOpenClawClient();

// WeChat XML encrypt/decrypt utility
const WXBizMsgCrypt = require('./wx-crypt'); // standard Tencent lib
const crypt = new WXBizMsgCrypt(
  process.env.WECOM_TOKEN,
  process.env.WECOM_ENCODING_AES_KEY,
  process.env.WECOM_CORP_ID
);

let wecomTokenCache = { token: null, expiry: 0 };

async function getWecomToken() {
  if (wecomTokenCache.token && Date.now() < wecomTokenCache.expiry) {
    return wecomTokenCache.token;
  }
  const res = await axios.get(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${process.env.WECOM_CORP_ID}&corpsecret=${process.env.WECOM_SECRET}`
  );
  wecomTokenCache = {
    token: res.data.access_token,
    expiry: Date.now() + (res.data.expires_in - 60) * 1000,
  };
  return wecomTokenCache.token;
}

async function sendWecomMessage(toUser, content) {
  const token = await getWecomToken();
  await axios.post(
    `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`,
    {
      touser: toUser,
      msgtype: 'markdown',
      agentid: process.env.WECOM_AGENT_ID,
      markdown: { content },
    }
  );
}

// Signature verification (GET - for URL verify)
router.get('/wecom/callback', (req, res) => {
  const { msg_signature, timestamp, nonce, echostr } = req.query;
  const [errCode, sEchoStr] = crypt.VerifyURL(msg_signature, timestamp, nonce, echostr);
  if (errCode === 0) res.send(sEchoStr);
  else res.status(403).send('Verification failed');
});

// Receive messages (POST)
router.post('/wecom/callback', async (req, res) => {
  const { msg_signature, timestamp, nonce } = req.query;
  const xmlBody = req.body;

  // Decrypt
  const [errCode, sMsg] = crypt.DecryptMsg(msg_signature, timestamp, nonce, xmlBody.xml.Encrypt[0]);
  if (errCode !== 0) return res.send('success');

  const parsed = await xml2js.parseStringPromise(sMsg);
  const msg = parsed.xml;

  const msgType = msg.MsgType[0];
  const fromUser = msg.FromUserName[0];

  if (msgType !== 'text') return res.send('success');

  const content = msg.Content[0].trim();
  res.send('success'); // Respond immediately

  const sessionKey = `wecom:${fromUser}`;
  const history = await getConversation(sessionKey, 10);

  try {
    const response = await ocClient.chat({
      messages: [...history, { role: 'user', content }],
    });
    const reply = response.choices[0].message.content;

    await saveConversation(sessionKey, [
      { role: 'user', content },
      { role: 'assistant', content: reply },
    ]);

    await sendWecomMessage(fromUser, reply);
  } catch (err) {
    await sendWecomMessage(fromUser, '❌ 处理失败，请稍后重试');
    console.error('[WeCom Bot]', err);
  }
});

module.exports = { wecomRouter: router };
```

---

## 7. Unified Message Router

```javascript
// src/router.js
/**
 * Unified Skill Dispatcher
 * Routes user input to the appropriate handler based on intent detection.
 */

const ROUTES = [
  {
    name: 'code-review',
    patterns: [/review this|check (my )?code|code review|bug in/i],
    systemPrompt: 'You are a senior code reviewer. Identify bugs, security issues, and improvements.',
    model: 'gpt-4o',
  },
  {
    name: 'document-search',
    patterns: [/search (for|in)|find docs|look up|documentation/i],
    systemPrompt: 'You are a documentation expert. Help users find and understand technical documentation.',
    model: 'gpt-4o-mini',
  },
  {
    name: 'meeting-summary',
    patterns: [/summarize|summary|minutes|recap|what was discussed/i],
    systemPrompt: 'You are a meeting summarizer. Extract key decisions, action items, and owners.',
    model: 'gpt-4o-mini',
  },
  {
    name: 'translation',
    patterns: [/translate|翻译|traduction/i],
    systemPrompt: 'You are a professional translator. Translate accurately while preserving tone and meaning.',
    model: 'gpt-4o-mini',
  },
  {
    name: 'data-analysis',
    patterns: [/analyze|chart|graph|data|statistics|trend/i],
    systemPrompt: 'You are a data analyst. Interpret data and provide actionable insights.',
    model: 'gpt-4o',
  },
];

const DEFAULT_ROUTE = {
  name: 'general',
  systemPrompt: 'You are OpenClaw, a helpful AI assistant for enterprise teams. Be concise, accurate, and professional.',
  model: 'gpt-4o-mini',
};

function detectRoute(text) {
  for (const route of ROUTES) {
    if (route.patterns.some(p => p.test(text))) {
      return route;
    }
  }
  return DEFAULT_ROUTE;
}

async function dispatchMessage(ocClient, text, history = []) {
  const route = detectRoute(text);

  const messages = [
    { role: 'system', content: route.systemPrompt },
    ...history,
    { role: 'user', content: text },
  ];

  const response = await ocClient.chat({ messages, model: route.model });

  return {
    reply: response.choices[0].message.content,
    route: route.name,
    model: route.model,
    usage: response.usage,
  };
}

module.exports = { detectRoute, dispatchMessage };
```

---

## 8. Access Control & Rate Limiting

```javascript
// src/ratelimit.js
const redis = require('./redis');

/**
 * Sliding window rate limiter.
 * Returns true if the request is rate-limited (should be rejected).
 */
async function checkRateLimit(key, limit, windowSeconds) {
  const now = Date.now();
  const windowStart = now - windowSeconds * 1000;
  const redisKey = `rl:${key}`;

  const pipe = redis.pipeline();
  pipe.zremrangebyscore(redisKey, 0, windowStart);
  pipe.zadd(redisKey, now, `${now}-${Math.random()}`);
  pipe.zcard(redisKey);
  pipe.expire(redisKey, windowSeconds);
  const results = await pipe.exec();

  const count = results[2][1];
  return count > limit;
}

/**
 * Role-based rate limits (requests per minute)
 */
const ROLE_LIMITS = {
  admin: 200,
  premium: 60,
  member: 20,
  guest: 5,
};

async function checkUserRateLimit(userId, role = 'member') {
  const limit = ROLE_LIMITS[role] ?? ROLE_LIMITS.member;
  return checkRateLimit(`user:${userId}`, limit, 60);
}

/**
 * User role lookup (stored in Redis hash)
 */
async function getUserRole(userId, platform) {
  const role = await redis.hget(`roles:${platform}`, userId);
  return role || 'member';
}

async function setUserRole(userId, platform, role) {
  if (!Object.keys(ROLE_LIMITS).includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  await redis.hset(`roles:${platform}`, userId, role);
}

module.exports = { checkRateLimit, checkUserRateLimit, getUserRole, setUserRole };
```

---

## 9. Conversation Memory per Channel

```javascript
// src/memory.js
const redis = require('./redis');

const MAX_TURNS = 20;     // Max conversation turns
const TTL_SECONDS = 86400 * 7; // 7 days

/**
 * Retrieve last N turns of conversation history.
 */
async function getConversation(sessionKey, limit = 10) {
  const raw = await redis.get(`conv:${sessionKey}`);
  if (!raw) return [];
  const history = JSON.parse(raw);
  // Return last N messages (each turn = 2 messages: user + assistant)
  return history.slice(-limit * 2);
}

/**
 * Append new messages to conversation history.
 */
async function saveConversation(sessionKey, newMessages) {
  const raw = await redis.get(`conv:${sessionKey}`);
  const history = raw ? JSON.parse(raw) : [];

  history.push(...newMessages);

  // Trim to MAX_TURNS
  const trimmed = history.slice(-MAX_TURNS * 2);

  await redis.setex(`conv:${sessionKey}`, TTL_SECONDS, JSON.stringify(trimmed));
}

/**
 * Delete conversation history (e.g., on /clear command).
 */
async function deleteConversation(sessionKey) {
  await redis.del(`conv:${sessionKey}`);
}

/**
 * Get conversation stats for admin dashboard.
 */
async function getConversationStats(pattern = 'conv:*') {
  const keys = await redis.keys(pattern);
  const stats = { total: keys.length, byPlatform: {} };

  for (const key of keys) {
    const platform = key.split(':')[1];
    stats.byPlatform[platform] = (stats.byPlatform[platform] || 0) + 1;
  }

  return stats;
}

module.exports = { getConversation, saveConversation, deleteConversation, getConversationStats };
```

---

## 10. Admin Dashboard

```javascript
// src/admin.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { getConversationStats } = require('./memory');
const { setUserRole } = require('./ratelimit');
const redis = require('./redis');

const router = express.Router();

// Admin auth middleware
function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'admin') throw new Error('Forbidden');
    req.admin = decoded;
    next();
  } catch {
    res.status(403).json({ error: 'Forbidden' });
  }
}

// Login
router.post('/admin/login', (req, res) => {
  if (req.body.secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }
  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Dashboard stats
router.get('/admin/stats', adminAuth, async (req, res) => {
  const convStats = await getConversationStats();

  // Usage stats (from Redis counters)
  const [totalRequests, totalTokens] = await Promise.all([
    redis.get('stats:total_requests'),
    redis.get('stats:total_tokens'),
  ]);

  res.json({
    conversations: convStats,
    usage: {
      totalRequests: parseInt(totalRequests) || 0,
      totalTokens: parseInt(totalTokens) || 0,
    },
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Set user role
router.post('/admin/users/:userId/role', adminAuth, async (req, res) => {
  const { userId } = req.params;
  const { role, platform } = req.body;

  await setUserRole(userId, platform, role);
  res.json({ success: true, userId, role, platform });
});

// Clear user conversation
router.delete('/admin/conversations/:sessionKey', adminAuth, async (req, res) => {
  const { deleteConversation } = require('./memory');
  await deleteConversation(req.params.sessionKey);
  res.json({ success: true });
});

module.exports = { adminRouter: router };
```

---

## 11. Production Deployment

### 11.1 Main Entry Point

```javascript
// src/index.js
const express = require('express');
const { slackApp } = require('./platforms/slack');
const { OpenClawTeamsBot } = require('./platforms/teams');
const { feishuRouter } = require('./platforms/feishu');
const { wecomRouter } = require('./platforms/wecom');
const { adminRouter } = require('./admin');
const { BotFrameworkAdapter } = require('botbuilder');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Platforms
app.use('/api', feishuRouter);
app.use('/api', wecomRouter);
app.use('/api', adminRouter);

// Teams adapter
const adapter = new BotFrameworkAdapter({
  appId: process.env.TEAMS_APP_ID,
  appPassword: process.env.TEAMS_APP_PASSWORD,
});
const teamsBot = new OpenClawTeamsBot();
app.post('/api/teams/messages', (req, res) => {
  adapter.processActivity(req, res, async (context) => {
    await teamsBot.run(context);
  });
});

const PORT = process.env.PORT || 3000;

async function start() {
  // Start Slack Socket Mode
  await slackApp.start();
  console.log('✅ Slack Bot started (Socket Mode)');

  // Start HTTP server
  app.listen(PORT, () => {
    console.log(`✅ HTTP Server listening on :${PORT}`);
    console.log(`✅ Teams Bot endpoint: /api/teams/messages`);
    console.log(`✅ Feishu callback: /api/feishu/callback`);
    console.log(`✅ WeCom callback: /api/wecom/callback`);
    console.log(`✅ Admin dashboard: /api/admin/stats`);
  });
}

start().catch(console.error);
```

### 11.2 Docker Compose

```yaml
# docker-compose.yml
version: '3.9'

services:
  team-bot:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - .:/app
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    command: node src/index.js
    ports:
      - "3000:3000"
    depends_on:
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - team-bot
    restart: unless-stopped

volumes:
  redis_data:
```

### 11.3 Nginx Config

```nginx
# nginx.conf
events { worker_connections 1024; }

http {
  upstream team_bot {
    server team-bot:3000;
    keepalive 32;
  }

  server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
  }

  server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location /api/ {
      proxy_pass http://team_bot;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection 'upgrade';
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_read_timeout 60s;
    }
  }
}
```

### 11.4 PM2 Config

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'team-bot',
    script: 'src/index.js',
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV: 'production',
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }],
};
```

---

## 12. Security Hardening

### 12.1 Input Validation

```javascript
// src/security.js
const DOMPurify = require('isomorphic-dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const purify = DOMPurify(window);

const MAX_INPUT_LENGTH = 4000;
const BLOCKED_PATTERNS = [
  /ignore (all )?previous instructions/i,
  /you are now/i,
  /act as (a|an) (?!assistant)/i,
  /system prompt/i,
  /jailbreak/i,
];

function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';
  if (text.length > MAX_INPUT_LENGTH) {
    text = text.slice(0, MAX_INPUT_LENGTH) + '... [truncated]';
  }
  // Strip HTML
  text = purify.sanitize(text, { ALLOWED_TAGS: [] });
  // Check for prompt injection
  if (BLOCKED_PATTERNS.some(p => p.test(text))) {
    throw new Error('Input contains disallowed content');
  }
  return text;
}

function validateWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expected = 'sha256=' + hmac.digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

module.exports = { sanitizeInput, validateWebhookSignature };
```

### 12.2 Security Checklist

| Category | Check | Status |
|----------|-------|--------|
| **Credentials** | All secrets in `.env`, never hardcoded | ✅ Required |
| **HTTPS** | TLS 1.2+ enforced via Nginx | ✅ Required |
| **Input** | Sanitize + length-limit all user input | ✅ Required |
| **Rate Limiting** | Per-user sliding window | ✅ Required |
| **Webhook** | Verify signatures from all platforms | ✅ Required |
| **Admin** | JWT-protected admin routes | ✅ Required |
| **Prompt Injection** | Blocked pattern detection | ✅ Required |
| **Audit Log** | Log all admin actions | 🟡 Recommended |
| **Dependency** | `npm audit` in CI pipeline | 🟡 Recommended |
| **Secret Scan** | GitHub Secret Scanning enabled | 🟡 Recommended |

---

## Quick Start Summary

```bash
# 1. Clone & install
git clone https://github.com/rookie1989/claw-picker.git
cd claw-picker/examples/team-bot
npm install

# 2. Configure
cp .env.example .env
# Edit .env with your credentials

# 3. Start (development)
npm run dev

# 4. Deploy (production)
docker-compose up -d

# 5. Verify
curl https://your-domain.com/health
# → {"status":"ok","uptime":42.1}
```

---

> 📖 **Related Guides**:  
> - [Personal AI Assistant Guide](personal-assistant-guide.en.md)  
> - [Enterprise RBAC System](../advanced/rbac-permission-system.md)  
> - [Multi-Model Routing](../advanced/multi-model-routing.md)  
> - [Monitoring & Alerting](监控与告警系统搭建.md)
