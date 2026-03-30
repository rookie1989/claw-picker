/**
 * 钉钉机器人集成示例
 * 
 * 功能：
 * 1. Stream 模式接收消息（无需公网 IP）
 * 2. 支持文本/Markdown/卡片消息
 * 3. 智能对话 + 签名验证
 * 4. 定时播报（日报/周报）
 */

const DingtalkStream = require('@open-dingtalk/dingtalk-stream');
const { OpenClaw } = require('@openclaw/core');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// ===== 配置 =====
const config = {
  clientId: process.env.DINGTALK_CLIENT_ID,
  clientSecret: process.env.DINGTALK_CLIENT_SECRET,
  appKey: process.env.DINGTALK_APP_KEY,
  appSecret: process.env.DINGTALK_APP_SECRET,
};

// ===== OpenClaw 初始化 =====
const claw = new OpenClaw({
  aiModel: process.env.AI_MODEL || 'gpt-4o',
  apiKey: process.env.OPENAI_API_KEY,
});

// ===== 用户会话管理 =====
const sessions = new Map();

function getSession(userId) {
  if (!sessions.has(userId)) {
    sessions.set(userId, { history: [], createdAt: Date.now() });
  }
  return sessions.get(userId);
}

// ===== 消息发送工具函数 =====

/**
 * 获取企业内部应用 access_token
 */
let tokenCache = { token: '', expiresAt: 0 };
async function getAccessToken() {
  if (Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const res = await axios.post('https://api.dingtalk.com/v1.0/oauth2/accessToken', {
    appKey: config.appKey,
    appSecret: config.appSecret,
  });

  tokenCache = {
    token: res.data.accessToken,
    expiresAt: Date.now() + (res.data.expireIn - 300) * 1000,
  };

  return tokenCache.token;
}

/**
 * 发送消息到群聊（Webhook 方式）
 */
async function sendGroupMessage(webhookUrl, secret, content, msgType = 'text') {
  const timestamp = Date.now();
  const sign = generateWebhookSign(secret, timestamp);

  const url = `${webhookUrl}&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;

  const payload =
    msgType === 'markdown'
      ? {
          msgtype: 'markdown',
          markdown: { title: 'OpenClaw 通知', text: content },
          at: { isAtAll: false },
        }
      : {
          msgtype: 'text',
          text: { content },
          at: { isAtAll: false },
        };

  await axios.post(url, payload);
}

/**
 * 生成 Webhook 签名
 */
function generateWebhookSign(secret, timestamp) {
  const str = `${timestamp}\n${secret}`;
  return crypto.createHmac('sha256', secret).update(str).digest('base64');
}

/**
 * 通过机器人回复用户消息（Stream 模式使用）
 */
async function replyToUser(replyToken, content, useMarkdown = false) {
  const token = await getAccessToken();

  const message = useMarkdown
    ? { msgtype: 'markdown', markdown: { title: 'AI 助手', text: content } }
    : { msgtype: 'text', text: { content } };

  await axios.post(
    'https://api.dingtalk.com/v1.0/robot/groupMessages/query',
    { robotCode: config.clientId, ...message },
    {
      headers: {
        'x-acs-dingtalk-access-token': token,
        'Content-Type': 'application/json',
      },
    }
  );
}

// ===== Stream 模式主逻辑 =====

async function startStream() {
  const streamClient = new DingtalkStream.DWClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  // 注册消息处理器
  streamClient.registerCallbackListener(
    DingtalkStream.TOPIC_ROBOT,
    async (res) => {
      const { headers, data } = res;

      try {
        const msgBody = JSON.parse(data);
        const { senderStaffId, text, msgtype, robotCode } = msgBody;

        console.log(`📨 收到消息 from ${senderStaffId}: ${JSON.stringify(msgBody)}`);

        // 只处理文本消息
        if (msgtype !== 'text') {
          console.log('忽略非文本消息类型:', msgtype);
          return;
        }

        const userInput = text?.content?.trim() || '';
        if (!userInput) return;

        // 快捷命令
        if (userInput === '/help' || userInput === '帮助') {
          await sendReply(headers, robotCode, senderStaffId, buildHelpText());
          return;
        }

        if (userInput === '/clear' || userInput === '清除历史') {
          sessions.delete(senderStaffId);
          await sendReply(headers, robotCode, senderStaffId, '✅ 对话历史已清除');
          return;
        }

        // AI 对话
        const session = getSession(senderStaffId);

        const aiReply = await claw.chat({
          userId: senderStaffId,
          content: userInput,
          history: session.history.slice(-20), // 保留最近 10 轮
        });

        // 更新历史
        session.history.push(
          { role: 'user', content: userInput },
          { role: 'assistant', content: aiReply }
        );

        await sendReply(headers, robotCode, senderStaffId, aiReply);
      } catch (err) {
        console.error('处理消息失败:', err);
      }
    }
  );

  // 启动连接
  await streamClient.start();
  console.log('🚀 钉钉 Stream 模式已启动，等待消息...');
}

/**
 * 通过 Stream 回调回复消息
 */
async function sendReply(headers, robotCode, userId, content) {
  // 判断是否需要 Markdown（有换行或特殊格式时使用）
  const useMarkdown = content.includes('\n') || content.includes('**') || content.includes('#');

  const token = await getAccessToken();
  const payload = {
    robotCode,
    userIds: [userId],
    ...(useMarkdown
      ? { msgParam: JSON.stringify({ title: 'AI 回复', text: content }), msgKey: 'sampleMarkdown' }
      : { msgParam: JSON.stringify({ content }), msgKey: 'sampleText' }),
  };

  await axios.post(
    'https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend',
    payload,
    { headers: { 'x-acs-dingtalk-access-token': token } }
  );
}

// ===== 定时播报 =====

const schedule = require('node-schedule');

/**
 * 每天早上 9:00 发送日报摘要
 */
schedule.scheduleJob('0 9 * * 1-5', async () => {
  console.log('📅 发送每日播报...');

  const summary = await claw.summarize({
    prompt: '生成今天的 AI 工作建议和关键提醒，Markdown 格式，简洁实用',
  });

  const webhookUrl = process.env.DINGTALK_GROUP_WEBHOOK;
  const webhookSecret = process.env.DINGTALK_GROUP_SECRET;

  if (webhookUrl && webhookSecret) {
    const message =
      `## 🌅 每日播报 - ${new Date().toLocaleDateString('zh-CN')}\n\n` +
      summary +
      '\n\n---\n*Powered by OpenClaw*';

    await sendGroupMessage(webhookUrl, webhookSecret, message, 'markdown');
    console.log('✅ 每日播报已发送');
  }
});

// ===== 工具函数 =====

function buildHelpText() {
  return `🤖 **OpenClaw 钉钉助手**

**使用方法：**
直接发送任何消息，AI 会智能回复

**快捷命令：**
- \`/help\` 显示此帮助
- \`/clear\` 清除对话历史

**功能：**
✅ 多轮对话（记忆上下文）
✅ 文档起草
✅ 代码审查
✅ 问题解答

*Powered by OpenClaw × GPT-4o*`;
}

// ===== 启动 =====
startStream().catch((err) => {
  console.error('❌ 启动失败:', err);
  process.exit(1);
});
