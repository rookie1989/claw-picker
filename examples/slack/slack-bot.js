/**
 * Slack 集成示例 - Bot 消息发送与交互
 * 
 * 功能：
 * - 发送富文本 Block Kit 消息
 * - 处理 Slash Commands
 * - 发送交互式卡片
 * - 定时周报推送
 * 
 * 依赖：@slack/web-api, @slack/bolt, node-cron
 * 使用：node slack-bot.js
 */

const { WebClient } = require('@slack/web-api');
const { App } = require('@slack/bolt');
const cron = require('node-cron');

// ============================
// 初始化 Slack 客户端
// ============================
const client = new WebClient(process.env.SLACK_BOT_TOKEN);

// 初始化 Bolt App（处理交互）
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,  // 使用 Socket Mode，无需公网 IP
  appToken: process.env.SLACK_APP_TOKEN,  // xapp- 开头
});

// ============================
// 基础消息发送
// ============================
async function sendText(channel, text) {
  return client.chat.postMessage({ channel, text });
}

// ============================
// Block Kit 富文本消息
// ============================
async function sendBlock(channel, blocks, text = '新消息') {
  return client.chat.postMessage({ channel, blocks, text });
}

// ============================
// 发送 AI 对话卡片
// ============================
async function sendAIReply({ channel, thread_ts, question, answer, model }) {
  const blocks = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*❓ 问题：*\n${question}`
      }
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🤖 AI 回答：*\n${answer}`
      }
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `🧠 模型：${model || 'GPT-4'} | ⏱️ ${new Date().toLocaleString('zh-CN')} | 由 <https://github.com/rookie1989/claw-picker|OpenClaw> 提供支持`
        }
      ]
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '👍 有帮助', emoji: true },
          style: 'primary',
          action_id: 'feedback_positive',
          value: 'positive'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '👎 需改进', emoji: true },
          action_id: 'feedback_negative',
          value: 'negative'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '🔄 重新生成', emoji: true },
          action_id: 'regenerate',
          value: question
        }
      ]
    }
  ];
  
  return client.chat.postMessage({
    channel,
    thread_ts,  // 在同一线程中回复
    blocks,
    text: `AI 回答: ${answer.substring(0, 100)}...`
  });
}

// ============================
// 发送工作周报
// ============================
async function sendWeeklyReport(channel) {
  const weekStart = getWeekStart();
  const weekEnd = new Date();
  
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📊 本周工作报告',
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*📅 统计周期：*\n${weekStart.toLocaleDateString('zh-CN')} - ${weekEnd.toLocaleDateString('zh-CN')}`
        },
        {
          type: 'mrkdwn',
          text: `*🤖 AI 助手使用：*\n本周处理了 ${Math.floor(Math.random() * 200 + 100)} 条消息`
        }
      ]
    },
    { type: 'divider' },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*📌 本周亮点：*\n• ✅ 完成 Q1 目标的 85%\n• ✅ 新增 3 个集成渠道\n• ✅ 响应时间优化 40%\n• ✅ 用户满意度提升至 4.8/5.0`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*🎯 下周计划：*\n• [ ] 完成钉钉集成开发\n• [ ] 发布 v2.0 版本\n• [ ] 开展用户培训`
      }
    },
    { type: 'divider' },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: '📊 查看详细报告', emoji: true },
          style: 'primary',
          url: 'https://your-dashboard.com/weekly'
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: '💬 添加评论', emoji: true },
          action_id: 'add_comment'
        }
      ]
    },
    {
      type: 'context',
      elements: [{
        type: 'mrkdwn',
        text: '🤖 由 <https://github.com/rookie1989/claw-picker|OpenClaw> 自动生成'
      }]
    }
  ];
  
  return sendBlock(channel, blocks, '本周工作报告已生成');
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff));
}

// ============================
// 处理 @ 提及（app_mention）
// ============================
app.event('app_mention', async ({ event, say }) => {
  const { text, user, ts, channel } = event;
  
  // 移除 @ 机器人的部分，获取纯文本
  const cleanText = text.replace(/<@[A-Z0-9]+>/g, '').trim();
  
  if (!cleanText) {
    await say({
      thread_ts: ts,
      text: `👋 Hi <@${user}>！有什么我可以帮你的吗？\n\n试试这些命令：\n• \`/ai 你的问题\` - AI 对话\n• \`/summarize\` - 总结最近消息\n• \`/standup\` - 生成站会报告`
    });
    return;
  }
  
  // 发送思考中提示
  const thinkingMsg = await app.client.chat.postMessage({
    channel,
    thread_ts: ts,
    text: '🤔 思考中...'
  });
  
  try {
    // 这里调用 OpenClaw AI
    const answer = await callOpenClawAI(cleanText);
    
    // 删除思考中消息
    await app.client.chat.delete({
      channel,
      ts: thinkingMsg.ts
    });
    
    // 发送 AI 回答卡片
    await sendAIReply({
      channel,
      thread_ts: ts,
      question: cleanText,
      answer,
      model: 'GPT-4'
    });
  } catch (error) {
    await app.client.chat.update({
      channel,
      ts: thinkingMsg.ts,
      text: `❌ 抱歉，处理失败了：${error.message}`
    });
  }
});

// ============================
// 处理 Slash Commands
// ============================

// /ai - AI 对话
app.command('/ai', async ({ command, ack, respond }) => {
  await ack();
  
  const { text, user_name } = command;
  
  if (!text) {
    await respond({
      response_type: 'ephemeral',
      text: '❓ 请提供问题，例如：`/ai 如何配置 OpenClaw？`'
    });
    return;
  }
  
  // 立即响应
  await respond({
    response_type: 'ephemeral',
    text: '🤔 AI 正在思考，请稍候...'
  });
  
  // 异步处理
  const answer = await callOpenClawAI(text);
  
  // 发送结果到频道（所有人可见）
  await app.client.chat.postMessage({
    channel: command.channel_id,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*<@${command.user_id}> 问：*\n${text}`
        }
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*AI 答：*\n${answer}`
        }
      }
    ],
    text: `AI 回复 @${user_name}: ${answer.substring(0, 100)}...`
  });
});

// /standup - 生成站会报告
app.command('/standup', async ({ command, ack, respond }) => {
  await ack();
  
  const { text } = command;
  
  // 解析格式：昨天xxx，今天xxx，阻碍xxx
  const standup = parseStandup(text);
  
  await respond({
    response_type: 'in_channel',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '📋 站会报告', emoji: true }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*👤 报告人：* <@${command.user_id}>`
          },
          {
            type: 'mrkdwn',
            text: `*📅 日期：* ${new Date().toLocaleDateString('zh-CN')}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*✅ 昨日完成：*\n${standup.yesterday || '未填写'}\n\n*🎯 今日计划：*\n${standup.today || '未填写'}\n\n*🚧 阻碍事项：*\n${standup.blockers || '无'}`
        }
      }
    ],
    text: `${command.user_name} 的站会报告`
  });
});

function parseStandup(text) {
  // 简单的解析逻辑
  const lines = text.split('\n');
  return {
    yesterday: lines[0] || text,
    today: lines[1] || '',
    blockers: lines[2] || '无'
  };
}

// ============================
// 处理按钮交互
// ============================
app.action('feedback_positive', async ({ action, ack, say }) => {
  await ack();
  await say('👍 感谢反馈！这对我改进很有帮助。');
});

app.action('feedback_negative', async ({ action, ack, respond }) => {
  await ack();
  await respond({
    text: '感谢反馈！能告诉我哪里需要改进吗？',
    replace_original: false
  });
});

// ============================
// 定时任务
// ============================
function startScheduledTasks() {
  // 每周五下午 5 点发送周报
  cron.schedule('0 17 * * 5', async () => {
    const channel = process.env.SLACK_REPORT_CHANNEL || '#general';
    await sendWeeklyReport(channel);
    console.log('[Cron] 周报已发送');
  });
  
  // 每天工作日早上 9:30 发送站会提醒
  cron.schedule('30 9 * * 1-5', async () => {
    const channel = process.env.SLACK_STANDUP_CHANNEL || '#standup';
    await sendText(channel, '🌅 站会时间到了！请使用 `/standup` 提交今日站会报告。');
  });
  
  console.log('⏰ 定时任务已启动');
}

// ============================
// 模拟 AI 调用（实际使用时替换）
// ============================
async function callOpenClawAI(text) {
  // TODO: 替换为实际的 OpenClaw AI 接口调用
  await new Promise(r => setTimeout(r, 500));  // 模拟 AI 延迟
  return `这是对"${text}"的 AI 回答。在实际部署中，这里会调用 OpenClaw 的 AI 接口返回真实答案。`;
}

// ============================
// 启动
// ============================
async function start() {
  // 启动 Bolt App
  await app.start(3000);
  console.log('⚡ Slack Bot 已启动！');
  
  // 启动定时任务
  startScheduledTasks();
  
  console.log('🦞 OpenClaw Slack 集成示例运行中...');
}

// 导出供外部使用
module.exports = {
  client,
  app,
  sendText,
  sendBlock,
  sendAIReply,
  sendWeeklyReport
};

// 直接运行
if (require.main === module) {
  if (!process.env.SLACK_BOT_TOKEN) {
    console.error('❌ 请设置 SLACK_BOT_TOKEN 环境变量');
    process.exit(1);
  }
  start().catch(console.error);
}
