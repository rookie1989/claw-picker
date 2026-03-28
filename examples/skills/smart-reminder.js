// 智能提醒技能 - 增强版
// 支持多种提醒方式和条件触发

const fs = require('fs').promises;
const path = require('path');

// 存储路径
const DATA_PATH = path.join(__dirname, '../../data/reminders.json');

// 提醒管理器
class ReminderManager {
  constructor() {
    this.reminders = [];
    this.load();
  }

  // 加载数据
  async load() {
    try {
      const data = await fs.readFile(DATA_PATH, 'utf8');
      this.reminders = JSON.parse(data);
    } catch (e) {
      this.reminders = [];
    }
  }

  // 保存数据
  async save() {
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(this.reminders, null, 2));
  }

  // 创建提醒
  async create(options) {
    const reminder = {
      id: this.generateId(),
      userId: options.userId,
      text: options.text,
      time: options.time,
      type: options.type || 'once', // once, daily, weekly
      channel: options.channel,
      completed: false,
      createdAt: new Date().toISOString()
    };
    
    this.reminders.push(reminder);
    await this.save();
    
    return reminder;
  }

  // 删除提醒
  async delete(id) {
    const index = this.reminders.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reminders.splice(index, 1);
      await this.save();
      return true;
    }
    return false;
  }

  // 获取待发送提醒
  getDueReminders() {
    const now = new Date();
    return this.reminders.filter(r => {
      if (r.completed) return false;
      const reminderTime = new Date(r.time);
      return reminderTime <= now;
    });
  }

  // 标记完成
  async complete(id) {
    const reminder = this.reminders.find(r => r.id === id);
    if (reminder) {
      reminder.completed = true;
      
      // 如果是重复提醒，创建下一个
      if (reminder.type === 'daily') {
        const nextTime = new Date(reminder.time);
        nextTime.setDate(nextTime.getDate() + 1);
        await this.create({
          userId: reminder.userId,
          text: reminder.text,
          time: nextTime.toISOString(),
          type: 'daily',
          channel: reminder.channel
        });
      } else if (reminder.type === 'weekly') {
        const nextTime = new Date(reminder.time);
        nextTime.setDate(nextTime.getDate() + 7);
        await this.create({
          userId: reminder.userId,
          text: reminder.text,
          time: nextTime.toISOString(),
          type: 'weekly',
          channel: reminder.channel
        });
      }
      
      await this.save();
      return true;
    }
    return false;
  }

  // 生成 ID
  generateId() {
    return `r_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 列出所有提醒
  list(userId = null) {
    if (userId) {
      return this.reminders.filter(r => r.userId === userId && !r.completed);
    }
    return this.reminders.filter(r => !r.completed);
  }
}

// OpenClaw 技能接口
module.exports = {
  name: 'smart-reminder',
  
  execute: async (context, params) => {
    const manager = new ReminderManager();
    const message = context.message;
    
    // 创建提醒
    if (message.includes('提醒我') || message.includes('记得')) {
      const parsed = parseReminder(message);
      if (parsed) {
        const reminder = await manager.create({
          userId: context.user.id,
          text: parsed.text,
          time: parsed.time.toISOString(),
          channel: context.channel
        });
        
        return `
✅ 已设置提醒

📝 ${parsed.text}
⏰ ${formatTime(parsed.time)}
🔔 ID: ${reminder.id}
        `.trim();
      }
    }
    
    // 查看提醒
    if (message.includes('我的提醒') || message.includes('提醒列表')) {
      const reminders = manager.list(context.user.id);
      if (reminders.length === 0) {
        return '暂无待处理提醒';
      }
      
      return `
📋 你的提醒（${reminders.length}个）

${reminders.map(r => `⏰ ${r.text} - ${formatTime(new Date(r.time))}`).join('\n')}
      `.trim();
    }
    
    // 删除提醒
    if (message.includes('删除提醒')) {
      const match = message.match(/删除提醒 (\w+)/);
      if (match) {
        const deleted = await manager.delete(match[1]);
        return deleted ? '✅ 已删除' : '❌ 未找到';
      }
    }
    
    return '🔔 提醒助手：说"提醒我 [内容] [时间]"来创建提醒';
  }
};

// 解析提醒内容
function parseReminder(message) {
  // 简单解析，实际应使用更复杂的 NLP
  const patterns = [
    /提醒我 (.+?) (明天|后天|\d+ 点|下午 \d+ 点)/,
    /记得 (.+?) (明天|后天|\d+ 点)/
  ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) {
      return {
        text: match[1],
        time: parseDate(match[2])
      };
    }
  }
  
  return null;
}

// 解析日期
function parseDate(text) {
  const date = new Date();
  
  if (text.includes('明天')) {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  } else if (text.includes('后天')) {
    date.setDate(date.getDate() + 2);
    date.setHours(9, 0, 0, 0);
  } else {
    const hourMatch = text.match(/(\d+) 点/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      date.setHours(hour, 0, 0, 0);
    } else {
      date.setHours(9, 0, 0, 0);
    }
  }
  
  return date;
}

// 格式化时间
function formatTime(date) {
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
