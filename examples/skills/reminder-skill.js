/**
 * 智能提醒技能
 * 
 * 功能：
 * - 创建提醒（支持自然语言）
 * - 查看待提醒列表
 * - 取消提醒
 * - 重复提醒（每天/每周/每月）
 * - 提醒历史记录
 * 
 * 使用方式：
 * 提醒我明天上午 10 点开会
 * 每天下午 5 点提醒我写日报
 * 查看我的提醒
 * 取消提醒 1
 */

const cron = require('node-cron');
const Database = require('better-sqlite3');

// 配置
const config = {
  dbPath: process.env.REMINDER_DB_PATH || './reminders.db',
  timezone: process.env.TIMEZONE || 'Asia/Shanghai'
};

// 初始化数据库
const db = new Database(config.dbPath);
db.exec(`
  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduledTime INTEGER NOT NULL,
    cronExpression TEXT,
    isRepeating BOOLEAN DEFAULT 0,
    isActive BOOLEAN DEFAULT 1,
    createdAt INTEGER DEFAULT (strftime('%s', 'now')),
    completedAt INTEGER,
    notifiedAt INTEGER
  )
`);

// 定时任务检查
let cronJobs = {};

/**
 * 主处理函数
 */
async function handleReminder(message, context) {
  const intent = classifyIntent(message.text);
  
  switch (intent) {
    case 'create':
      return await createReminder(message.text, context);
    
    case 'list':
      return await listReminders(context);
    
    case 'cancel':
      return await cancelReminder(message.text, context);
    
    case 'history':
      return await getHistory(context);
    
    default:
      return {
        text: `⏰ 智能提醒助手

可用命令：
• 提醒我 [时间] [事项] - 创建提醒
• 每天/每周 [时间] [事项] - 重复提醒
• 查看提醒 - 查看待提醒列表
• 取消提醒 [编号] - 取消提醒
• 提醒历史 - 查看历史记录

示例：
• 提醒我明天上午 10 点开会
• 每天下午 5 点提醒我写日报
• 每周一上午 9 点提醒我开例会`
      };
  }
}

/**
 * 分类意图
 */
function classifyIntent(text) {
  const createPatterns = [/提醒 (我 | 我一下)?/, /记得/, /别忘了/];
  const listPatterns = [/查看 (我的)?提醒/, /有 (什么 | 哪些) 提醒/, /提醒列表/];
  const cancelPatterns = [/取消 (提醒)?/, /删除 (提醒)?/];
  const historyPatterns = [/提醒历史/, /历史 (记录)?/, /完成 (的)?提醒/];
  
  if (createPatterns.some(p => p.test(text))) return 'create';
  if (listPatterns.some(p => p.test(text))) return 'list';
  if (cancelPatterns.some(p => p.test(text))) return 'cancel';
  if (historyPatterns.some(p => p.test(text))) return 'history';
  
  return 'unknown';
}

/**
 * 创建提醒
 */
async function createReminder(text, context) {
  try {
    // 解析时间和内容
    const parsed = parseReminder(text);
    
    if (!parsed) {
      return {
        text: '抱歉，我没理解你的提醒设置。请尝试：
• 提醒我明天上午 10 点开会
• 每天下午 5 点提醒我写日报
• 下周一提醒我提交报告'
      };
    }
    
    const { time, message, isRepeating, cronExpr } = parsed;
    const userId = context.userId;
    
    // 保存到数据库
    const stmt = db.prepare(`
      INSERT INTO reminders (userId, message, scheduledTime, cronExpression, isRepeating)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(userId, message, time.getTime(), cronExpr, isRepeating ? 1 : 0);
    const reminderId = result.lastInsertRowid;
    
    // 设置定时任务
    if (isRepeating && cronExpr) {
      setupCronJob(reminderId, cronExpr, message, userId);
    } else {
      setupOneTimeJob(reminderId, time, message, userId);
    }
    
    // 返回确认
    return {
      text: `✅ 提醒已创建

📝 内容：${message}
⏰ 时间：${formatTime(time)}
${isRepeating ? '🔁 类型：重复提醒' : '🔔 类型：单次提醒'}
🆔 编号：${reminderId}

如需取消，请回复：取消提醒 ${reminderId}`
    };
  } catch (error) {
    console.error('[Reminder] 创建失败:', error);
    return {
      text: `抱歉，创建提醒失败：${error.message}`
    };
  }
}

/**
 * 解析提醒内容
 */
function parseReminder(text) {
  const now = new Date();
  
  // 重复提醒模式
  const repeatingPatterns = [
    {
      pattern: /每天 (上午 | 下午 | 晚上 | 凌晨)?(\d{1,2}) 点 (\d{1,2})?分/,
      handler: (match) => {
        const period = match[1] || '上午';
        const hour = parseInt(match[2]);
        const minute = parseInt(match[3] || '0');
        
        let h = hour;
        if (period === '下午' && h < 12) h += 12;
        if (period === '晚上' && h < 12) h += 12;
        if (period === '凌晨' && h >= 12) h -= 12;
        
        const cronExpr = `${minute} ${h} * * *`;
        const time = new Date();
        time.setHours(h, minute, 0, 0);
        
        return {
          time,
          message: extractMessage(text, match[0]),
          isRepeating: true,
          cronExpr
        };
      }
    },
    {
      pattern: /每周 (一 | 二 | 三 | 四 | 五 | 六 | 日)(上午 | 下午 | 晚上 | 凌晨)?(\d{1,2}) 点 (\d{1,2})?分/,
      handler: (match) => {
        const weekday = '一二三四五六日'.indexOf(match[1]) + 1;
        const period = match[2] || '上午';
        const hour = parseInt(match[3]);
        const minute = parseInt(match[4] || '0');
        
        let h = hour;
        if (period === '下午' && h < 12) h += 12;
        if (period === '晚上' && h < 12) h += 12;
        
        const cronExpr = `${minute} ${h} * * ${weekday}`;
        const time = new Date();
        time.setHours(h, minute, 0, 0);
        
        return {
          time,
          message: extractMessage(text, match[0]),
          isRepeating: true,
          cronExpr
        };
      }
    }
  ];
  
  // 检查重复提醒
  for (const { pattern, handler } of repeatingPatterns) {
    const match = text.match(pattern);
    if (match) {
      return handler(match);
    }
  }
  
  // 单次提醒模式
  const timeInfo = extractTime(text);
  if (timeInfo) {
    return {
      time: timeInfo.time,
      message: extractMessage(text, timeInfo.raw),
      isRepeating: false,
      cronExpr: null
    };
  }
  
  return null;
}

/**
 * 从文本中提取时间
 */
function extractTime(text) {
  const now = new Date();
  
  // 明天上午 10 点
  const tomorrowPattern = /明天 (上午 | 下午 | 晚上 | 凌晨)?(\d{1,2}) 点 (\d{1,2})?分/;
  const tomorrowMatch = text.match(tomorrowPattern);
  if (tomorrowMatch) {
    const time = new Date(now);
    time.setDate(time.getDate() + 1);
    setHours(time, tomorrowMatch[1], tomorrowMatch[2], tomorrowMatch[3]);
    return { time, raw: tomorrowMatch[0] };
  }
  
  // 今天下午 3 点
  const todayPattern = /今天 (上午 | 下午 | 晚上 | 凌晨)?(\d{1,2}) 点 (\d{1,2})?分/;
  const todayMatch = text.match(todayPattern);
  if (todayMatch) {
    const time = new Date(now);
    setHours(time, todayMatch[1], todayMatch[2], todayMatch[3]);
    if (time <= now) {
      time.setDate(time.getDate() + 1);
    }
    return { time, raw: todayMatch[0] };
  }
  
  // 1 小时后
  const hourLaterPattern = /(\d+) 小时 (后 | 之后)/;
  const hourLaterMatch = text.match(hourLaterPattern);
  if (hourLaterMatch) {
    const time = new Date(now);
    time.setHours(time.getHours() + parseInt(hourLaterMatch[1]));
    return { time, raw: hourLaterMatch[0] };
  }
  
  // 30 分钟后
  const minuteLaterPattern = /(\d+) 分钟 (后 | 之后)/;
  const minuteLaterMatch = text.match(minuteLaterPattern);
  if (minuteLaterMatch) {
    const time = new Date(now);
    time.setMinutes(time.getMinutes() + parseInt(minuteLaterMatch[1]));
    return { time, raw: minuteLaterMatch[0] };
  }
  
  return null;
}

/**
 * 设置时间
 */
function setHours(time, period, hour, minute) {
  let h = parseInt(hour);
  const m = parseInt(minute || '0');
  
  if (period === '下午' && h < 12) h += 12;
  if (period === '晚上' && h < 12) h += 12;
  if (period === '凌晨' && h >= 12) h -= 12;
  
  time.setHours(h, m, 0, 0);
}

/**
 * 提取提醒内容
 */
function extractMessage(text, timePattern) {
  // 移除时间相关词汇
  const cleaned = text
    .replace(timePattern, '')
    .replace(/提醒 (我 | 我一下)?/, '')
    .replace(/记得/, '')
    .replace(/别忘了/, '')
    .trim();
  
  return cleaned || '待办事项';
}

/**
 * 设置单次定时任务
 */
function setupOneTimeJob(id, time, message, userId) {
  const delay = time.getTime() - Date.now();
  
  if (delay <= 0) {
    // 时间已过，立即通知
    sendNotification(userId, message);
    return;
  }
  
  const timeout = setTimeout(async () => {
    await sendNotification(userId, message);
    
    // 标记为已完成
    db.prepare(`
      UPDATE reminders SET completedAt = strftime('%s', 'now'), notifiedAt = strftime('%s', 'now'), isActive = 0
      WHERE id = ?
    `).run(id);
  }, delay);
  
  cronJobs[id] = { type: 'timeout', ref: timeout };
}

/**
 * 设置重复定时任务
 */
function setupCronJob(id, cronExpr, message, userId) {
  const job = cron.schedule(cronExpr, async () => {
    await sendNotification(userId, message);
    
    // 记录通知时间
    db.prepare(`
      UPDATE reminders SET notifiedAt = strftime('%s', 'now')
      WHERE id = ?
    `).run(id);
  }, {
    timezone: config.timezone
  });
  
  cronJobs[id] = { type: 'cron', ref: job };
}

/**
 * 发送通知
 */
async function sendNotification(userId, message) {
  // 这里调用消息发送接口
  // 实际实现取决于 OpenClaw 的消息系统
  console.log(`[Reminder] 发送通知给 ${userId}: ${message}`);
  
  // 示例：通过 context 发送消息
  // await context.sendMessage(userId, `⏰ 提醒时间到！\n\n${message}`);
}

/**
 * 查看提醒列表
 */
async function listReminders(context) {
  try {
    const userId = context.userId;
    
    const reminders = db.prepare(`
      SELECT * FROM reminders
      WHERE userId = ? AND isActive = 1 AND (completedAt IS NULL OR completedAt = 0)
      ORDER BY scheduledTime ASC
    `).all(userId);
    
    if (reminders.length === 0) {
      return {
        text: '📋 你目前没有待提醒事项。\n\n需要我帮你创建一个吗？'
      };
    }
    
    const list = reminders.map((r, i) => {
      const time = formatTime(new Date(r.scheduledTime));
      const type = r.isRepeating ? '🔁' : '🔔';
      return `${i + 1}. ${type} [${time}] ${r.message}`;
    }).join('\n');
    
    return {
      text: `📋 待提醒列表（共${reminders.length}条）

${list}

💡 提示：回复「取消提醒 [编号]」取消提醒`
    };
  } catch (error) {
    console.error('[Reminder] 查询失败:', error);
    return {
      text: `抱歉，查询失败：${error.message}`
    };
  }
}

/**
 * 取消提醒
 */
async function cancelReminder(text, context) {
  try {
    // 提取提醒编号
    const idMatch = text.match(/(\d+)/);
    if (!idMatch) {
      return {
        text: '请提供提醒编号，例如：\n取消提醒 1\n\n查看提醒列表：查看提醒'
      };
    }
    
    const id = parseInt(idMatch[1]);
    const userId = context.userId;
    
    // 查询提醒
    const reminder = db.prepare(`
      SELECT * FROM reminders WHERE id = ? AND userId = ?
    `).get(id, userId);
    
    if (!reminder) {
      return {
        text: '未找到该提醒，请检查编号是否正确。'
      };
    }
    
    // 取消定时任务
    if (cronJobs[id]) {
      if (cronJobs[id].type === 'timeout') {
        clearTimeout(cronJobs[id].ref);
      } else {
        cronJobs[id].ref.stop();
      }
      delete cronJobs[id];
    }
    
    // 更新数据库
    db.prepare(`
      UPDATE reminders SET isActive = 0 WHERE id = ?
    `).run(id);
    
    return {
      text: `✅ 已取消提醒：${reminder.message}`
    };
  } catch (error) {
    console.error('[Reminder] 取消失败:', error);
    return {
      text: `抱歉，取消失败：${error.message}`
    };
  }
}

/**
 * 查看历史记录
 */
async function getHistory(context) {
  try {
    const userId = context.userId;
    
    const reminders = db.prepare(`
      SELECT * FROM reminders
      WHERE userId = ? AND (completedAt IS NOT NULL OR notifiedAt IS NOT NULL)
      ORDER BY notifiedAt DESC
      LIMIT 20
    `).all(userId);
    
    if (reminders.length === 0) {
      return {
        text: '📜 你目前没有提醒历史记录。'
      };
    }
    
    const list = reminders.map(r => {
      const time = formatTime(new Date(r.notifiedAt || r.completedAt * 1000));
      return `• [${time}] ${r.message}`;
    }).join('\n');
    
    return {
      text: `📜 提醒历史记录（最近 20 条）

${list}`
    };
  } catch (error) {
    console.error('[Reminder] 查询失败:', error);
    return {
      text: `抱歉，查询失败：${error.message}`
    };
  }
}

/**
 * 格式化时间
 */
function formatTime(date) {
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 导出模块
 */
module.exports = {
  name: 'reminder',
  triggers: ['提醒', '查看提醒', '取消提醒', '提醒历史'],
  description: '智能提醒助手',
  examples: [
    '提醒我明天上午 10 点开会',
    '每天下午 5 点提醒我写日报',
    '查看提醒',
    '取消提醒 1'
  ],
  handler: handleReminder
};
