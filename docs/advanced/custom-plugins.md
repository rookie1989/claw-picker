# 自定义插件开发指南

本教程介绍如何为 OpenClaw 开发自定义插件，扩展 AI 助手的功能。

## 什么是插件？

插件是 OpenClaw 的扩展机制，允许你：
- 🔧 添加新的工具（Tools）
- 🔌 集成第三方服务
- 📦 封装复杂功能
- 🎨 自定义 AI 行为

## 插件架构

```
┌─────────────────┐
│   OpenClaw      │
│    Gateway      │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Plugin  │
    │ System  │
    └────┬────┘
         │
    ┌────┴─────────────────┐
    │  Your Custom Plugin  │
    ├──────────────────────┤
    │  - Tools             │
    │  - Commands          │
    │  - Handlers          │
    │  - Config            │
    └──────────────────────┘
```

## 快速开始

### Step 1: 创建插件目录结构

```bash
# 创建插件目录
mkdir -p ~/openclaw-plugins/my-custom-plugin
cd ~/openclaw-plugins/my-custom-plugin

# 初始化项目
npm init -y

# 创建基本结构
mkdir -p src tools config
```

推荐结构：
```
my-custom-plugin/
├── package.json
├── src/
│   ├── index.js        # 插件入口
│   └── plugin.js       # 插件主逻辑
├── tools/
│   ├── weather.js      # 天气工具
│   └── notify.js       # 通知工具
├── config/
│   └── default.json    # 默认配置
└── README.md
```

### Step 2: 编写插件入口

创建 `src/index.js`：

```javascript
/**
 * My Custom Plugin for OpenClaw
 * @description 自定义插件示例
 */

module.exports = {
  name: 'my-custom-plugin',
  version: '1.0.0',
  description: '我的自定义 OpenClaw 插件',
  
  // 插件初始化
  async init(config) {
    console.log('[MyPlugin] Initializing...');
    this.config = config;
    
    // 注册工具
    this.registerTools();
    
    console.log('[MyPlugin] Initialized successfully');
  },
  
  // 注册工具
  registerTools() {
    const { registerTool } = require('openclaw');
    
    // 注册天气查询工具
    registerTool({
      name: 'get_weather',
      description: '查询指定城市的天气',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '城市名称'
          }
        },
        required: ['city']
      },
      execute: async (params) => {
        return await this.getWeather(params.city);
      }
    });
    
    // 注册通知工具
    registerTool({
      name: 'send_notification',
      description: '发送通知消息',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: '通知内容'
          },
          priority: {
            type: 'string',
            enum: ['low', 'normal', 'high'],
            description: '优先级'
          }
        },
        required: ['message']
      },
      execute: async (params) => {
        return await this.sendNotification(params.message, params.priority);
      }
    });
  },
  
  // 天气查询实现
  async getWeather(city) {
    // TODO: 实现天气 API 调用
    return {
      city: city,
      temperature: '25°C',
      condition: '晴朗',
      humidity: '60%'
    };
  },
  
  // 通知发送实现
  async sendNotification(message, priority = 'normal') {
    // TODO: 实现通知发送逻辑
    console.log(`[${priority.toUpperCase()}] ${message}`);
    return { success: true, message: '通知已发送' };
  },
  
  // 插件清理
  async destroy() {
    console.log('[MyPlugin] Cleaning up...');
  }
};
```

### Step 3: 配置插件

创建 `config/default.json`：

```json
{
  "enabled": true,
  "apiKey": "",
  "endpoints": {
    "weather": "https://api.weather.com",
    "notify": "https://api.notify.com"
  },
  "settings": {
    "cacheTimeout": 300,
    "retryAttempts": 3
  }
}
```

### Step 4: 安装插件

```bash
# 方法 1: 本地链接
cd ~/openclaw-plugins/my-custom-plugin
npm link

# 方法 2: 复制到插件目录
cp -r ~/openclaw-plugins/my-custom-plugin ~/.openclaw/plugins/

# 方法 3: 通过配置文件
# 编辑 ~/.openclaw/config.json
```

编辑 `~/.openclaw/config.json`：

```json
{
  "plugins": {
    "entries": [
      {
        "name": "my-custom-plugin",
        "path": "/Users/yourname/openclaw-plugins/my-custom-plugin",
        "enabled": true,
        "config": {
          "apiKey": "your-api-key"
        }
      }
    ]
  }
}
```

### Step 5: 重启并测试

```bash
# 重启网关
openclaw gateway restart

# 查看插件状态
openclaw plugins list

# 查看日志确认加载成功
openclaw gateway logs | grep MyPlugin
```

### Step 6: 使用新工具

在聊天中发送：

```
查询北京的天气
```

AI 应该调用你的 `get_weather` 工具并返回结果。

## 进阶开发

### 1. 使用 TypeScript

创建 `src/index.ts`：

```typescript
import { Tool, PluginContext } from 'openclaw-types';

interface WeatherResponse {
  city: string;
  temperature: string;
  condition: string;
  humidity: string;
}

interface MyPluginConfig {
  apiKey: string;
  endpoints: {
    weather: string;
    notify: string;
  };
}

export class MyCustomPlugin {
  private config: MyPluginConfig;
  
  async init(config: MyPluginConfig): Promise<void> {
    this.config = config;
    this.registerTools();
  }
  
  private registerTools(): void {
    const weatherTool: Tool = {
      name: 'get_weather',
      description: '查询指定城市的天气',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string' }
        },
        required: ['city']
      },
      execute: async (params: { city: string }): Promise<WeatherResponse> => {
        return await this.getWeather(params.city);
      }
    };
    
    // 注册工具...
  }
  
  private async getWeather(city: string): Promise<WeatherResponse> {
    // 实现逻辑
  }
}
```

### 2. 集成第三方 API

示例：集成 GitHub API

```javascript
// tools/github.js
const axios = require('axios');

module.exports = {
  name: 'github_tools',
  
  tools: [
    {
      name: 'get_repo_info',
      description: '获取 GitHub 仓库信息',
      parameters: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' }
        },
        required: ['owner', 'repo']
      },
      execute: async (params) => {
        const response = await axios.get(
          `https://api.github.com/repos/${params.owner}/${params.repo}`,
          {
            headers: {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`
            }
          }
        );
        return response.data;
      }
    },
    {
      name: 'create_issue',
      description: '创建 GitHub Issue',
      parameters: {
        type: 'object',
        properties: {
          owner: { type: 'string' },
          repo: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' }
        },
        required: ['owner', 'repo', 'title']
      },
      execute: async (params) => {
        const response = await axios.post(
          `https://api.github.com/repos/${params.owner}/${params.repo}/issues`,
          {
            title: params.title,
            body: params.body || ''
          },
          {
            headers: {
              'Authorization': `token ${process.env.GITHUB_TOKEN}`
            }
          }
        );
        return response.data;
      }
    }
  ]
};
```

### 3. 添加自定义命令

```javascript
// 在插件中添加命令处理
module.exports = {
  // ... 其他代码
  
  commands: [
    {
      name: '/weather',
      description: '查询天气',
      usage: '/weather <city>',
      handler: async (context, args) => {
        const city = args.join(' ');
        if (!city) {
          return '请提供城市名称，例如：/weather 北京';
        }
        const weather = await this.getWeather(city);
        return `🌤️ ${city} 天气：${weather.temperature}, ${weather.condition}`;
      }
    }
  ]
};
```

### 4. 事件监听

```javascript
module.exports = {
  // ... 其他代码
  
  events: {
    // 监听消息事件
    'message:received': async (message) => {
      console.log('收到消息:', message.content);
    },
    
    // 监听工具调用
    'tool:called': async (toolName, params) => {
      console.log(`工具 ${toolName} 被调用，参数:`, params);
    },
    
    // 监听错误
    'error': async (error) => {
      console.error('插件错误:', error);
    }
  }
};
```

## 调试技巧

### 1. 启用调试模式

```json
{
  "logging": {
    "level": "debug",
    "plugins": ["my-custom-plugin"]
  }
}
```

### 2. 使用日志

```javascript
const debug = require('debug')('my-plugin');

debug('初始化插件');
debug('调用工具，参数:', params);
```

### 3. 热重载

```bash
# 安装 nodemon
npm install -g nodemon

# 开发模式运行
nodemon --watch src --exec 'openclaw gateway restart'
```

## 发布插件

### 1. 准备发布

```bash
# 更新 package.json
{
  "name": "@yourname/openclaw-weather-plugin",
  "version": "1.0.0",
  "description": "OpenClaw 天气查询插件",
  "main": "src/index.js",
  "keywords": ["openclaw", "plugin", "weather"],
  "author": "Your Name",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourname/openclaw-weather-plugin"
  }
}
```

### 2. 发布到 npm

```bash
# 登录 npm
npm login

# 发布
npm publish --access public
```

### 3. 用户安装

```bash
# 用户通过 npm 安装
npm install -g @yourname/openclaw-weather-plugin
```

## 最佳实践

### 1. 错误处理

```javascript
async execute(params) {
  try {
    return await this.doSomething(params);
  } catch (error) {
    console.error('工具执行失败:', error);
    return {
      error: true,
      message: `操作失败：${error.message}`
    };
  }
}
```

### 2. 缓存机制

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

async getWeather(city) {
  const cached = cache.get(city);
  if (cached) {
    return cached;
  }
  
  const weather = await fetchWeather(city);
  cache.set(city, weather);
  return weather;
}
```

### 3. 配置验证

```javascript
const Joi = require('joi');

const configSchema = Joi.object({
  apiKey: Joi.string().required(),
  endpoints: Joi.object({
    weather: Joi.string().uri().required(),
    notify: Joi.string().uri().required()
  })
});

async init(config) {
  const { error, value } = configSchema.validate(config);
  if (error) {
    throw new Error(`配置验证失败：${error.message}`);
  }
  this.config = value;
}
```

## 示例插件

查看完整示例：
- [examples/weather-plugin/](../../examples/weather-plugin/)
- [examples/github-tools/](../../examples/github-tools/)
- [examples/notify-service/](../../examples/notify-service/)

## 参考资源

- [OpenClaw 插件 API](https://docs.openclaw.ai/plugins/api)
- [工具开发指南](https://docs.openclaw.ai/tools/development)
- [插件示例仓库](https://github.com/openclaw/plugins)

---

**下一步**: 查看 [示例配置](../../examples/) 获取完整代码示例！
