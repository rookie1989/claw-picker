# 🔌 技能开发教程

**难度**: ⭐⭐⭐⭐☆  
**预计时间**: 2-3 小时  
**前置知识**: JavaScript 基础、OpenClaw 使用经验

---

## 🎯 学习目标

完成本教程后，你将能够：

- ✅ 理解 OpenClaw 技能架构
- ✅ 创建自定义技能
- ✅ 集成第三方 API
- ✅ 调试和测试技能
- ✅ 发布和分享技能

---

## 📚 技能基础

### 什么是技能？

技能是 OpenClaw 的扩展功能模块，允许你：

- 调用外部 API（天气、股票、新闻等）
- 执行特定任务（提醒、定时、自动化等）
- 集成第三方服务（Notion、GitHub、Slack 等）
- 处理特定领域问题（代码审查、文档生成等）

### 技能架构

```
┌─────────────┐
│  用户消息   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  意图识别   │──→ 是否匹配技能？
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
  是       否
   │       │
   ↓       ↓
┌─────┐  ┌──────┐
│技能 │  │通用  │
│处理 │  │AI 回复│
└─────┘  └──────┘
```

---

## 🛠️ 第一个技能：天气查询

### 步骤 1：创建技能文件

```bash
# 创建技能目录
mkdir -p ~/openclaw/skills
cd ~/openclaw/skills

# 创建天气技能文件
nano weather-skill.js
```

### 步骤 2：编写技能代码

```javascript
/**
 * 天气查询技能
 * 触发词：/天气、/weather
 * 功能：查询指定城市的天气
 */

const axios = require('axios');

module.exports = {
  // 技能名称
  name: 'weather',
  
  // 触发词（支持多个）
  triggers: ['/天气', '/weather', '今天天气', '天气怎么样'],
  
  // 技能描述（帮助用户了解功能）
  description: '查询指定城市的天气信息',
  
  // 使用示例
  examples: [
    '/天气 北京',
    '/weather Shanghai',
    '今天天气怎么样？'
  ],
  
  // 技能处理函数
  handler: async (message, context) => {
    try {
      // 1. 提取城市名称
      const city = extractCity(message.text);
      
      if (!city) {
        return {
          text: '请提供城市名称，例如：\n/天气 北京\n/天气 Shanghai'
        };
      }
      
      // 2. 调用天气 API
      const weather = await getWeather(city);
      
      // 3. 格式化回复
      const reply = formatWeatherReply(city, weather);
      
      return { text: reply };
      
    } catch (error) {
      console.error('天气查询失败:', error);
      return {
        text: '抱歉，天气查询失败，请稍后再试。😅'
      };
    }
  }
};

/**
 * 从消息中提取城市名称
 */
function extractCity(text) {
  // 简单实现：提取触发词后的内容
  const patterns = [
    /\/天气\s*(.+)/i,
    /\/weather\s*(.+)/i,
    /天气\s*(.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * 调用天气 API
 */
async function getWeather(city) {
  // 使用免费的天气 API（示例）
  // 实际使用时请替换为你的 API
  const apiKey = process.env.WEATHER_API_KEY;
  const url = `https://api.weather.com/v1/current?city=${city}&key=${apiKey}`;
  
  const response = await axios.get(url);
  return response.data;
}

/**
 * 格式化天气回复
 */
function formatWeatherReply(city, weather) {
  return `🌤️ ${city} 天气

📊 当前天气：
• 温度：${weather.temperature}°C
• 体感：${weather.feelsLike}°C
• 天气：${weather.condition}
• 湿度：${weather.humidity}%
• 风力：${weather.windSpeed} km/h

📅 更新时间：${new Date().toLocaleString('zh-CN')}`;
}
```

### 步骤 3：配置技能

在 OpenClaw 配置文件中注册技能：

```json
{
  "skills": {
    "enabled": true,
    "paths": [
      "~/openclaw/skills/weather-skill.js"
    ],
    "config": {
      "weather": {
        "apiKey": "your_api_key"
      }
    }
  }
}
```

### 步骤 4：测试技能

```bash
# 重启 OpenClaw
openclaw restart

# 在聊天中测试
/天气 北京
```

---

## 🔌 进阶技能：GitHub PR 审查

### 完整示例

```javascript
/**
 * GitHub PR 审查技能
 * 触发词：/review、/审查 PR
 * 功能：自动审查 GitHub Pull Request
 */

const axios = require('axios');

module.exports = {
  name: 'github-pr-review',
  
  triggers: ['/review', '/审查 PR', '/pr review'],
  
  description: '审查 GitHub Pull Request，提供改进建议',
  
  examples: [
    '/review https://github.com/owner/repo/pull/123',
    '/审查 PR 123'
  ],
  
  handler: async (message, context) => {
    try {
      // 1. 提取 PR 信息
      const prInfo = extractPRInfo(message.text);
      
      if (!prInfo) {
        return {
          text: '请提供 PR 链接或编号，例如：\n/review https://github.com/owner/repo/pull/123'
        };
      }
      
      // 2. 获取 PR 详情
      const pr = await getPRDetails(prInfo.owner, prInfo.repo, prInfo.number);
      
      // 3. 获取 PR 变更
      const files = await getPRFiles(prInfo.owner, prInfo.repo, prInfo.number);
      
      // 4. 调用 AI 审查
      const review = await reviewWithAI(pr, files);
      
      // 5. 发送审查结果
      return { text: review };
      
    } catch (error) {
      console.error('PR 审查失败:', error);
      return {
        text: '抱歉，PR 审查失败，请检查：\n1. PR 链接是否正确\n2. GitHub Token 是否有效\n3. 仓库是否可访问'
      };
    }
  }
};

/**
 * 提取 PR 信息
 */
function extractPRInfo(text) {
  // 匹配 GitHub PR 链接
  const urlPattern = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
  const match = text.match(urlPattern);
  
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      number: match[3]
    };
  }
  
  return null;
}

/**
 * 获取 PR 详情
 */
async function getPRDetails(owner, repo, number) {
  const token = process.env.GITHUB_TOKEN;
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
  
  const response = await axios.get(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  return response.data;
}

/**
 * 获取 PR 变更文件
 */
async function getPRFiles(owner, repo, number) {
  const token = process.env.GITHUB_TOKEN;
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`;
  
  const response = await axios.get(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  return response.data;
}

/**
 * 调用 AI 进行审查
 */
async function reviewWithAI(pr, files) {
  // 构建审查提示
  const prompt = `请审查以下 Pull Request：

## PR 信息
- 标题：${pr.title}
- 描述：${pr.body}
- 变更文件数：${files.length}

## 文件变更
${files.map(f => `### ${f.filename}\n\`\`\`${f.patch}\n\`\`\``).join('\n')}

请从以下角度审查：
1. 代码质量
2. 潜在 Bug
3. 性能问题
4. 代码规范
5. 改进建议

请提供具体的审查意见。`;

  // 调用 AI 服务
  const review = await callAI(prompt);
  
  return `🔍 PR 审查报告

📋 ${pr.title}

${review}

---
💡 提示：以上为 AI 审查结果，请结合实际情况判断。`;
}

/**
 * 调用 AI 服务（使用 OpenClaw 内置方法）
 */
async function callAI(prompt) {
  // 这里调用 OpenClaw 的 AI 接口
  // 实际实现取决于 OpenClaw 的 API
  const response = await context.ai.complete(prompt);
  return response.text;
}
```

---

## 🎨 技能模板

### 模板 1：API 调用型

```javascript
module.exports = {
  name: 'api-skill',
  triggers: ['/command'],
  description: '调用第三方 API',
  
  handler: async (message, context) => {
    // 1. 验证参数
    const params = validateParams(message.text);
    if (!params) {
      return { text: '参数错误，请检查用法' };
    }
    
    // 2. 调用 API
    const result = await callAPI(params);
    
    // 3. 格式化回复
    return { text: formatReply(result) };
  }
};
```

### 模板 2：定时任务型

```javascript
const cron = require('node-cron');

module.exports = {
  name: 'scheduled-skill',
  triggers: ['/schedule'],
  
  handler: async (message, context) => {
    // 创建定时任务
    cron.schedule('0 9 * * *', async () => {
      // 每天 9 点执行
      await doSomething();
    });
    
    return { text: '定时任务已创建！' };
  }
};
```

### 模板 3：数据处理型

```javascript
module.exports = {
  name: 'data-skill',
  triggers: ['/process'],
  
  handler: async (message, context) => {
    // 1. 获取数据
    const data = await fetchData();
    
    // 2. 处理数据
    const processed = processData(data);
    
    // 3. 存储结果
    await storeResult(processed);
    
    return { text: '数据处理完成！' };
  }
};
```

---

## 🧪 调试和测试

### 本地测试

```javascript
// test/weather-skill.test.js
const weatherSkill = require('../weather-skill');

describe('Weather Skill', () => {
  test('应正确提取城市名称', () => {
    const message = { text: '/天气 北京' };
    const city = extractCity(message.text);
    expect(city).toBe('北京');
  });
  
  test('应返回正确的天气格式', () => {
    const weather = {
      temperature: 25,
      condition: '晴'
    };
    const reply = formatWeatherReply('北京', weather);
    expect(reply).toContain('北京');
    expect(reply).toContain('25');
  });
});
```

### 日志调试

```javascript
handler: async (message, context) => {
  console.log('[Weather Skill] 收到消息:', message.text);
  console.log('[Weather Skill] 上下文:', context);
  
  try {
    // ...
  } catch (error) {
    console.error('[Weather Skill] 错误:', error);
    throw error;
  }
}
```

---

## 📦 发布技能

### 1. 打包技能

```bash
# 创建技能包
mkdir weather-skill-package
cp weather-skill.js weather-skill-package/
cp README.md weather-skill-package/
cp package.json weather-skill-package/

# 压缩
zip -r weather-skill.zip weather-skill-package/
```

### 2. 编写文档

```markdown
# Weather Skill

## 安装
```bash
npm install weather-skill
```

## 用法
/天气 北京

## 配置
需要 WEATHER_API_KEY 环境变量
```

### 3. 发布到 npm（可选）

```bash
npm publish
```

---

## 🎓 最佳实践

### 代码规范

- ✅ 使用清晰的函数命名
- ✅ 添加详细的注释
- ✅ 处理所有可能的错误
- ✅ 遵循 JavaScript 代码规范

### 性能优化

- ✅ 缓存常用数据
- ✅ 异步处理耗时操作
- ✅ 限制 API 调用频率
- ✅ 合理使用超时

### 安全建议

- ✅ 不硬编码敏感信息
- ✅ 验证所有输入
- ✅ 限制权限范围
- ✅ 记录审计日志

---

## 📚 参考资源

- [OpenClaw 插件开发文档](./custom-plugins.md)
- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)
- [Axios 使用指南](https://axios-http.com/)
- [GitHub API 文档](https://docs.github.com/en/rest)

---

**祝你开发顺利！** 🦞
