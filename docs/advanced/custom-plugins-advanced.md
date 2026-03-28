# 🧩 自定义插件开发教程

从零开始创建 OpenClaw 插件。

## 🎯 学习目标

完成本教程后，你将能够：
- ✅ 理解插件架构
- ✅ 创建自定义插件
- ✅ 发布和分享插件

## 📋 前置要求

- Node.js 基础
- 理解 JavaScript/TypeScript
- 已安装 OpenClaw

## 🚀 步骤 1：理解插件架构

### 插件类型

OpenClaw 支持两种插件：

1. **通道插件**：连接聊天应用（Telegram、Discord 等）
2. **功能插件**：提供额外功能（天气、GitHub 等）

### 插件结构

```
my-plugin/
├── package.json
├── src/
│   └── index.js
└── README.md
```

## 📝 步骤 2：创建插件

### 2.1 初始化项目

```bash
mkdir openclaw-plugin-example
cd openclaw-plugin-example
npm init -y
```

### 2.2 编写 package.json

```json
{
  "name": "@openclaw/plugin-example",
  "version": "1.0.0",
  "description": "OpenClaw 示例插件",
  "main": "src/index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": ["openclaw", "plugin"],
  "license": "MIT"
}
```

### 2.3 编写插件代码

**src/index.js**：
```javascript
class ExamplePlugin {
  constructor(config) {
    this.config = config;
    this.name = 'example';
  }

  // 插件初始化
  async initialize() {
    console.log('[ExamplePlugin] 初始化完成');
  }

  // 处理消息
  async handleMessage(context) {
    const { message, channel } = context;
    
    // 示例：回复特定关键词
    if (message.includes('你好')) {
      return {
        text: `你好！我是 ${this.name} 插件`,
        channel
      };
    }
    
    return null; // 不处理
  }

  // 插件卸载
  async shutdown() {
    console.log('[ExamplePlugin] 已关闭');
  }
}

module.exports = ExamplePlugin;
```

## 🔧 步骤 3：测试插件

### 3.1 本地安装

```bash
npm link
```

### 3.2 配置 OpenClaw

```json
{
  "plugins": {
    "entries": ["example"]
  },
  "example": {
    "option1": "value1"
  }
}
```

### 3.3 重启网关

```bash
openclaw gateway restart
```

### 3.4 查看日志

```bash
openclaw logs --grep example
```

## 📦 步骤 4：发布插件

### 4.1 准备发布

**完善 README.md**：
```markdown
# @openclaw/plugin-example

OpenClaw 示例插件

## 安装

```bash
npm install -g @openclaw/plugin-example
```

## 配置

```json
{
  "plugins": {
    "entries": ["example"]
  }
}
```

## 使用

发送"你好"测试插件。

## 许可证

MIT
```

### 4.2 发布到 npm

```bash
# 登录 npm
npm login

# 发布
npm publish --access public
```

### 4.3 发布到 GitHub

```bash
git init
git add .
git commit -m "Initial release"
git remote add origin https://github.com/yourname/openclaw-plugin-example.git
git push -u origin main
```

## 🎯 步骤 5：进阶功能

### 5.1 通道插件示例

```javascript
class TelegramPlugin {
  constructor(config) {
    this.config = config;
    this.token = config.token;
    this.name = 'telegram';
  }

  async initialize() {
    // 连接 Telegram API
    this.bot = new TelegramBot(this.token, {polling: true});
    
    // 监听消息
    this.bot.on('message', async (msg) => {
      const context = {
        channel: 'telegram',
        user: msg.from.id,
        message: msg.text,
        reply: (text) => this.bot.sendMessage(msg.chat.id, text)
      };
      
      await this.handleMessage(context);
    });
  }

  async handleMessage(context) {
    // 处理消息逻辑
    const response = await this.process(context.message);
    if (response) {
      await context.reply(response);
    }
  }

  async process(message) {
    // 自定义处理逻辑
    return `收到：${message}`;
  }

  async shutdown() {
    this.bot.stopPolling();
  }
}

module.exports = TelegramPlugin;
```

### 5.2 功能插件示例

```javascript
class WeatherPlugin {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.name = 'weather';
  }

  async initialize() {
    console.log('[WeatherPlugin] 天气插件已加载');
  }

  async handleMessage(context) {
    const message = context.message.toLowerCase();
    
    // 检测天气查询意图
    if (message.includes('天气')) {
      const city = this.extractCity(message);
      if (city) {
        const weather = await this.getWeather(city);
        return {
          text: this.formatWeather(city, weather),
          channel: context.channel
        };
      }
    }
    
    return null;
  }

  extractCity(message) {
    const cities = ['北京', '上海', '广州'];
    for (const city of cities) {
      if (message.includes(city)) return city;
    }
    return null;
  }

  async getWeather(city) {
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${this.apiKey}`
    );
    return response.json();
  }

  formatWeather(city, data) {
    return `🌤️ ${city}\n温度：${data.main.temp}°C\n状况：${data.weather[0].description}`;
  }

  async shutdown() {
    console.log('[WeatherPlugin] 已关闭');
  }
}

module.exports = WeatherPlugin;
```

### 5.3 使用 TypeScript

```typescript
// src/index.ts
import { PluginContext, MessageResponse } from '@openclaw/types';

interface PluginConfig {
  apiKey: string;
  debug?: boolean;
}

class TypedPlugin {
  private config: PluginConfig;
  public name: string;

  constructor(config: PluginConfig) {
    this.config = config;
    this.name = 'typed-plugin';
  }

  async initialize(): Promise<void> {
    console.log('初始化完成');
  }

  async handleMessage(context: PluginContext): Promise<MessageResponse | null> {
    return {
      text: 'Hello',
      channel: context.channel
    };
  }

  async shutdown(): Promise<void> {
    console.log('已关闭');
  }
}

export default TypedPlugin;
```

## 🧪 步骤 6：测试

### 6.1 单元测试

```javascript
// test/plugin.test.js
const ExamplePlugin = require('../src');

describe('ExamplePlugin', () => {
  let plugin;

  beforeEach(() => {
    plugin = new ExamplePlugin({});
  });

  test('should initialize', async () => {
    await plugin.initialize();
    expect(plugin.name).toBe('example');
  });

  test('should handle message', async () => {
    const context = {
      message: '你好',
      channel: 'test'
    };
    
    const result = await plugin.handleMessage(context);
    expect(result.text).toContain('你好');
  });
});
```

### 6.2 运行测试

```bash
npm install --save-dev jest
```

**package.json**：
```json
{
  "scripts": {
    "test": "jest"
  }
}
```

```bash
npm test
```

## 📚 最佳实践

### 代码规范

```javascript
// ✅ 好的做法
class MyPlugin {
  constructor(config) {
    this.validateConfig(config);
  }

  async initialize() {
    // 异步初始化
  }

  validateConfig(config) {
    if (!config.apiKey) {
      throw new Error('Missing apiKey');
    }
  }
}

// ❌ 避免
function handle(msg) {
  // 全局函数
}
```

### 错误处理

```javascript
async function safeOperation() {
  try {
    await riskyOperation();
  } catch (error) {
    console.error('[Plugin] 错误:', error);
    throw error; // 或返回默认值
  }
}
```

### 日志记录

```javascript
const debug = require('debug')('my-plugin');

debug('调试信息');
console.log('普通日志');
console.error('错误日志');
```

## 📦 发布清单

- [ ] package.json 完整
- [ ] README.md 详细
- [ ] 代码测试通过
- [ ] 添加 LICENSE
- [ ] npm 发布
- [ ] GitHub 仓库
- [ ] 文档示例

## 📚 更多资源

- [OpenClaw 插件 API](https://docs.openclaw.ai/plugins)
- [npm 发布指南](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [插件示例仓库](https://github.com/openclaw/openclaw/tree/main/plugins)

---

_最后更新：2026-03-28_
