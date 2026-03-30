/**
 * 企业微信集成示例 - 群机器人消息推送
 * 
 * 功能：
 * - 发送文本/Markdown/卡片消息
 * - @指定成员
 * - 定时日报推送
 * 
 * 依赖：axios, node-cron
 * 使用：node wecom-bot.js
 */

const axios = require('axios');
const cron = require('node-cron');
const crypto = require('crypto');

// ============================
// 配置（使用环境变量）
// ============================
const config = {
  webhookUrl: process.env.WECOM_WEBHOOK_URL,
  secret: process.env.WECOM_SECRET,  // 加签 secret（可选）
};

// ============================
// 签名生成（加签模式需要）
// ============================
function generateSign(secret) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const stringToSign = `${timestamp}\n${secret}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(stringToSign, 'utf8');
  const sign = encodeURIComponent(hmac.digest('base64'));
  return { timestamp, sign };
}

// ============================
// 发送消息核心函数
// ============================
async function sendMessage(payload) {
  let url = config.webhookUrl;
  
  // 如果配置了 secret，添加签名参数
  if (config.secret) {
    const { timestamp, sign } = generateSign(config.secret);
    url += `&timestamp=${timestamp}&sign=${sign}`;
  }
  
  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.data.errcode !== 0) {
      throw new Error(`企业微信 API 错误: ${response.data.errmsg}`);
    }
    
    console.log('✅ 消息发送成功');
    return response.data;
  } catch (error) {
    console.error('❌ 消息发送失败:', error.message);
    throw error;
  }
}

// ============================
// 发送文本消息
// ============================
async function sendText(content, options = {}) {
  return sendMessage({
    msgtype: 'text',
    text: {
      content,
      mentioned_list: options.mentionList || [],
      mentioned_mobile_list: options.mentionMobiles || [],
    }
  });
}

// ============================
// 发送 Markdown 消息
// ============================
async function sendMarkdown(content) {
  return sendMessage({
    msgtype: 'markdown',
    markdown: { content }
  });
}

// ============================
// 发送图文消息（news）
// ============================
async function sendNews(articles) {
  return sendMessage({
    msgtype: 'news',
    news: { articles }
  });
}

// ============================
// 发送模板卡片（任务审批场景）
// ============================
async function sendTaskCard({ title, description, actionUrl, cancelUrl }) {
  return sendMessage({
    msgtype: 'template_card',
    template_card: {
      card_type: 'text_notice',
      source: {
        icon_url: 'https://wework.qpic.cn/wwpic/252813_jOfDHtcISzuodLa_1629280209/0',
        desc: 'OpenClaw AI 助手',
      },
      main_title: {
        title,
        desc: description
      },
      card_action: {
        type: 1,
        url: actionUrl
      },
      task_id: `task-${Date.now()}`,
      action_menu: {
        desc: '请选择操作',
        action_list: [
          { text: '立即处理', key: 'handle' },
          { text: '稍后提醒', key: 'remind' },
          { text: '忽略', key: 'ignore' }
        ]
      }
    }
  });
}

// ============================
// 每日工作日报（自动化示例）
// ============================
function startDailyReport() {
  // 每天工作日早上 9:00 发送
  cron.schedule('0 9 * * 1-5', async () => {
    const date = new Date();
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDay = weekDays[date.getDay()];
    const dateStr = date.toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    
    const content = `## 🌅 早安提醒 | ${dateStr}（周${weekDay}）

> 由 OpenClaw AI 助手自动发送

**今日重点事项：**
- [ ] 检查昨日未完成任务
- [ ] 确认今日会议安排  
- [ ] 处理待审批事项

**快捷操作：**
- 向机器人发送 \`/ai 你的问题\` 即可咨询 AI
- 发送 \`/standup\` 生成站会报告
- 发送 \`/summary\` 总结今日工作

---
_由 [OpenClaw](https://github.com/rookie1989/claw-picker) 自动生成_`;
    
    try {
      await sendMarkdown(content);
      console.log(`[${new Date().toISOString()}] 日报发送成功`);
    } catch (error) {
      console.error('[日报] 发送失败:', error);
    }
  });
  
  console.log('📅 日报定时任务已启动（每天工作日 9:00）');
}

// ============================
// 项目进度通知
// ============================
async function notifyProjectUpdate({ projectName, progress, milestone, nextStep }) {
  const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));
  
  return sendMarkdown(`## 📊 项目进度更新

**项目：** ${projectName}
**进度：** \`${progressBar}\` ${progress}%
**里程碑：** ${milestone}
**下一步：** ${nextStep}

---
_更新时间：${new Date().toLocaleString('zh-CN')}_`);
}

// ============================
// 告警通知
// ============================
async function sendAlert({ level, title, detail, oncallUser }) {
  const levelConfig = {
    critical: { emoji: '🔴', prefix: '【紧急】', mention: true },
    warning: { emoji: '⚠️', prefix: '【警告】', mention: false },
    info: { emoji: 'ℹ️', prefix: '【通知】', mention: false }
  };
  
  const { emoji, prefix, mention } = levelConfig[level] || levelConfig.info;
  
  const content = `${emoji} **${prefix}${title}**

> ${detail}

**处理负责人：** @${oncallUser}
**发生时间：** ${new Date().toLocaleString('zh-CN')}

请及时处理！`;
  
  const options = mention && oncallUser
    ? { mentionList: [oncallUser] }
    : {};
  
  if (level === 'critical') {
    // 严重告警发文本并@相关人
    return sendText(`${emoji} ${prefix}${title}\n\n${detail}\n\n请 @${oncallUser} 立即处理！`, options);
  } else {
    return sendMarkdown(content);
  }
}

// ============================
// 示例运行
// ============================
async function runExamples() {
  console.log('🦞 企业微信集成示例 - OpenClaw\n');
  
  // 示例 1：发送文本消息
  console.log('1. 发送文本消息...');
  await sendText('Hello! 这是来自 OpenClaw 的测试消息 🦞');
  
  // 延迟 1s 避免限速
  await new Promise(r => setTimeout(r, 1000));
  
  // 示例 2：发送 Markdown
  console.log('2. 发送 Markdown 消息...');
  await sendMarkdown(`## OpenClaw 功能演示

**支持的消息类型：**
- ✅ 文本消息
- ✅ Markdown 消息  
- ✅ 图文链接
- ✅ 模板卡片

> 更多功能请查看 [使用文档](https://github.com/rookie1989/claw-picker)`);
  
  await new Promise(r => setTimeout(r, 1000));
  
  // 示例 3：项目进度通知
  console.log('3. 发送项目进度通知...');
  await notifyProjectUpdate({
    projectName: 'OpenClaw 集成项目',
    progress: 75,
    milestone: '完成企业微信集成',
    nextStep: '开始 Slack 集成开发'
  });
  
  console.log('\n✅ 所有示例发送完毕！');
}

// ============================
// 导出 & 入口
// ============================
module.exports = {
  sendText,
  sendMarkdown,
  sendNews,
  sendTaskCard,
  sendAlert,
  notifyProjectUpdate,
  startDailyReport
};

// 直接运行时执行示例
if (require.main === module) {
  if (!config.webhookUrl) {
    console.error('❌ 请设置环境变量 WECOM_WEBHOOK_URL');
    console.error('export WECOM_WEBHOOK_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=YOUR_KEY"');
    process.exit(1);
  }
  
  runExamples().catch(console.error);
}
