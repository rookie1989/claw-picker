# 🛠️ 技能开发实战教程

从零开始创建你的第一个 OpenClaw 技能。

## 🎯 学习目标

完成本教程后，你将能够：
- ✅ 理解技能的基本结构
- ✅ 创建自定义技能
- ✅ 调用外部 API
- ✅ 处理用户输入
- ✅ 发布和分享技能

## 📋 前置要求

- 已安装 OpenClaw
- 基础 JavaScript 知识
- 一个 API 密钥（本教程使用免费天气 API）

## 🚀 步骤 1：理解技能结构

技能由两个文件组成：

```
my-skill/
├── SKILL.md      # 技能描述和触发条件
└── skill.js      # 技能逻辑（可选）
```

### SKILL.md 结构

```markdown
# 技能名称

技能描述...

**当以下情况时使用此技能**：
(1) 触发条件 1
(2) 触发条件 2
```

### skill.js 结构

```javascript
module.exports = {
  name: 'my-skill',
  execute: async (context, params) => {
    // 你的逻辑
    return '结果';
  }
};
```

## 📝 步骤 2：创建天气查询技能

### 2.1 创建目录

```bash
mkdir -p ~/.openclaw/skills/weather-query
cd ~/.openclaw/skills/weather-query
```

### 2.2 编写 SKILL.md

```markdown
# weather-query

查询任意城市当前天气。

**当以下情况时使用此技能**：
(1) 用户提到"天气"、"气温"、"下雨"
(2) 用户询问某个城市的天气情况
(3) 用户说"今天天气怎么样"
```

### 2.3 编写 skill.js

```javascript
const https = require('https');

module.exports = {
  name: 'weather-query',
  
  execute: async (context, params) => {
    // 1. 从消息中提取城市名
    const city = extractCity(context.message);
    
    if (!city) {
      return '❌ 请告诉我要查询哪个城市的天气，例如："北京天气"';
    }
    
    // 2. 调用天气 API
    const weather = await getWeather(city);
    
    // 3. 格式化返回
    return formatWeather(city, weather);
  }
};

// 提取城市名（简单实现）
function extractCity(message) {
  // 实际应用中可以使用 NLP 库
  const cities = ['北京', '上海', '广州', '深圳', '杭州'];
  for (const city of cities) {
    if (message.includes(city)) {
      return city;
    }
  }
  return null;
}

// 调用天气 API
function getWeather(city) {
  return new Promise((resolve, reject) => {
    const url = `https://wttr.in/${city}?format=j1`;
    
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            temp: json.current_condition[0].temp_C,
            desc: json.current_condition[0].weatherDesc[0].value,
            humidity: json.current_condition[0].humidity,
            wind: json.current_condition[0].windspeedKmph
          });
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 格式化天气信息
function formatWeather(city, weather) {
  return `
🌤️ ${city} 天气

🌡️ 温度：${weather.temp}°C
💧 湿度：${weather.humidity}%
💨 风速：${weather.wind} km/h
📝 状况：${weather.desc}
  `.trim();
}
```

### 2.4 测试技能

```bash
# 重启网关
openclaw gateway restart

# 发送测试消息
/message 北京天气
```

预期回复：
```
🌤️ 北京 天气

🌡️ 温度：15°C
💧 湿度：45%
💨 风速：12 km/h
📝 状况：晴
```

## 🎯 步骤 3：创建智能提醒技能

### 3.1 创建目录

```bash
mkdir -p ~/.openclaw/skills/smart-reminder
```

### 3.2 编写 SKILL.md

```markdown
# smart-reminder

创建定时提醒或条件提醒。

**当以下情况时使用此技能**：
(1) 用户说"提醒我..."
(2) 用户说"记得..."
(3) 用户设置定时任务
```

### 3.3 编写 skill.js

```javascript
module.exports = {
  name: 'smart-reminder',
  
  execute: async (context, params) => {
    const message = context.message;
    
    // 1. 解析提醒内容
    const { text, time } = parseReminder(message);
    
    if (!text || !time) {
      return '❌ 请告诉我提醒内容和时间，例如："提醒我明天下午 3 点开会"';
    }
    
    // 2. 创建定时任务
    const jobId = await createCronJob(time, text);
    
    // 3. 确认创建
    return `
✅ 已设置提醒

📝 内容：${text}
⏰ 时间：${formatTime(time)}
🔔 到时我会提醒你
    `.trim();
  }
};

// 解析提醒（简化版）
function parseReminder(message) {
  // 实际应用中需要使用日期解析库
  const match = message.match(/提醒我 (.+?) (.+)/);
  if (match) {
    return {
      text: match[1],
      time: parseDate(match[2])
    };
  }
  return { text: null, time: null };
}

// 创建定时任务
async function createCronJob(time, text) {
  // 调用 OpenClaw cron API
  const response = await fetch('/api/cron/add', {
    method: 'POST',
    body: JSON.stringify({
      schedule: { kind: 'at', at: time.toISOString() },
      payload: { kind: 'systemEvent', text: `⏰ 提醒：${text}` }
    })
  });
  const data = await response.json();
  return data.jobId;
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

// 解析日期（简化版）
function parseDate(text) {
  const date = new Date();
  if (text.includes('明天')) {
    date.setDate(date.getDate() + 1);
  }
  // 更多解析逻辑...
  return date;
}
```

## 🔧 步骤 4：技能调试技巧

### 4.1 添加日志

```javascript
console.log('[weather-query] 收到消息:', context.message);
console.log('[weather-query] 提取城市:', city);
```

查看日志：
```bash
openclaw logs --grep "weather-query"
```

### 4.2 错误处理

```javascript
try {
  const result = await api.call();
  return result;
} catch (error) {
  console.error('[weather-query] 错误:', error);
  return `❌ 查询失败：${error.message}`;
}
```

### 4.3 测试边界情况

```javascript
// 空输入
if (!city) {
  return '请提供城市名';
}

// 无效输入
if (!isValidCity(city)) {
  return '无效的城市名';
}

// API 失败
if (!response.ok) {
  return '天气服务暂时不可用';
}
```

## 🚀 步骤 5：高级技巧

### 5.1 使用外部库

```javascript
const axios = require('axios');
const moment = require('moment');

module.exports = {
  execute: async (context) => {
    const response = await axios.get('https://api.example.com');
    const date = moment().format('YYYY-MM-DD');
    return `今天是 ${date}`;
  }
};
```

### 5.2 访问文件系统

```javascript
const fs = require('fs').promises;

module.exports = {
  execute: async (context) => {
    const content = await fs.readFile('/path/to/file.txt', 'utf8');
    return `文件内容：${content}`;
  }
};
```

### 5.3 调用其他技能

```javascript
module.exports = {
  execute: async (context) => {
    // 先查询天气
    const weather = await skills.execute('weather-query', context);
    
    // 根据天气建议
    if (weather.includes('雨')) {
      return `${weather}\n\n💡 建议：记得带伞！`;
    }
    return weather;
  }
};
```

### 5.4 多轮对话

```javascript
module.exports = {
  execute: async (context, params) => {
    const state = context.session.state || {};
    
    if (!state.city) {
      // 第一次：询问城市
      context.session.state = { step: 'waiting_city' };
      return '请问要查询哪个城市的天气？';
    }
    
    // 第二次：查询天气
    const weather = await getWeather(state.city);
    context.session.state = {}; // 清空状态
    return formatWeather(state.city, weather);
  }
};
```

## 📦 步骤 6：发布技能

### 6.1 整理代码

```bash
# 创建 Git 仓库
cd ~/.openclaw/skills/weather-query
git init
git add .
git commit -m "Initial commit"
```

### 6.2 上传到 GitHub

```bash
git remote add origin https://github.com/yourname/openclaw-weather-query.git
git push -u origin main
```

### 6.3 编写 README

```markdown
# OpenClaw 天气查询技能

查询任意城市当前天气。

## 安装

```bash
git clone https://github.com/yourname/openclaw-weather-query.git
mv openclaw-weather-query ~/.openclaw/skills/weather-query
openclaw gateway restart
```

## 使用

```
北京天气
上海今天下雨吗？
```

## 许可证

MIT
```

## 💡 技能创意

不知道做什么技能？试试这些：

| 技能 | 难度 | 描述 |
|------|------|------|
| 邮件摘要 | ⭐⭐ | 自动汇总未读邮件 |
| 股票查询 | ⭐⭐ | 实时股价查询 |
| 新闻推送 | ⭐⭐ | 每日热点新闻 |
| 翻译助手 | ⭐⭐ | 多语言翻译 |
| 记账助手 | ⭐⭐⭐ | 语音记账 + 统计 |
| 健身教练 | ⭐⭐⭐ | 定制健身计划 |
| 学习提醒 | ⭐⭐ | 背单词/学习提醒 |
| 美食推荐 | ⭐⭐⭐ | 附近餐厅推荐 |

## 📚 更多资源

- [技能示例代码](../../examples/skills/README.md)
- [官方技能列表](https://github.com/openclaw/openclaw/tree/main/skills)
- [技能创建工具](../../skills/skill-creator/SKILL.md)

## 🎓 下一步

- [ ] 完善天气技能（支持更多城市）
- [ ] 添加缓存机制
- [ ] 支持语音输入
- [ ] 发布到社区

---

_最后更新：2026-03-28_
