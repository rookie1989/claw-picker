# 🤖 多智能体协作教程

**难度**: ⭐⭐⭐⭐⭐  
**预计时间**: 3-4 小时  
**前置知识**: OpenClaw 基础、技能开发经验

---

## 🎯 学习目标

完成本教程后，你将能够：

- ✅ 理解多智能体架构
- ✅ 配置智能体路由
- ✅ 实现智能体协作
- ✅ 优化协作效率
- ✅ 监控和调试

---

## 📚 多智能体基础

### 为什么需要多智能体？

单个 AI 模型的局限性：

- ❌ 通用模型不够专业
- ❌ 大模型成本高
- ❌ 无法同时处理多任务
- ❌ 缺少领域知识

多智能体的优势：

- ✅ 专业模型处理专业问题
- ✅ 小模型处理简单任务（省钱）
- ✅ 并行处理多个任务
- ✅ 各司其职，效率更高

### 架构模式

#### 模式 1：路由分发

```
┌─────────────┐
│   用户消息   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  路由智能体  │──→ 分析问题类型
└──────┬──────┘
       │
   ┌───┼───┐
   │   │   │
   ↓   ↓   ↓
┌───┐┌───┐┌───┐
│代码││文档││数据│
│智能体│智能体│智能体│
└───┘└───┘└───┘
```

#### 模式 2：流水线协作

```
用户 → 理解 → 规划 → 执行 → 审查 → 回复
       ↓      ↓      ↓      ↓
     智能体 A 智能体 B 智能体 C 智能体 D
```

#### 模式 3：投票决策

```
         ┌─ 智能体 A ─┐
用户 →   ├─ 智能体 B ─┤ → 投票 → 最佳回复
         └─ 智能体 C ─┘
```

---

## 🛠️ 配置多智能体系统

### 步骤 1：定义智能体角色

```json
{
  "agents": {
    "router": {
      "name": "路由智能体",
      "model": "Qwen2.5-7B-Instruct",
      "systemPrompt": "你是一个智能路由，负责分析用户问题并分发给合适的专家智能体。",
      "temperature": 0.3
    },
    "coder": {
      "name": "代码专家",
      "model": "deepseek-coder-33b",
      "systemPrompt": "你是资深软件工程师，擅长代码编写、审查和调试。",
      "temperature": 0.2
    },
    "writer": {
      "name": "文档专家",
      "model": "Qwen2.5-72B-Instruct",
      "systemPrompt": "你是专业文档工程师，擅长技术写作和文档润色。",
      "temperature": 0.7
    },
    "analyst": {
      "name": "数据分析师",
      "model": "Qwen2.5-72B-Instruct",
      "systemPrompt": "你是数据分析师，擅长数据分析、图表解读和洞察提取。",
      "temperature": 0.5
    }
  }
}
```

### 步骤 2：配置路由规则

```json
{
  "routing": {
    "strategy": "intent-based",
    "rules": [
      {
        "intent": "code",
        "keywords": ["代码", "编程", "bug", "调试", "函数", "类"],
        "agent": "coder"
      },
      {
        "intent": "writing",
        "keywords": ["写文章", "文档", "报告", "邮件", "润色"],
        "agent": "writer"
      },
      {
        "intent": "analysis",
        "keywords": ["分析", "数据", "图表", "趋势", "统计"],
        "agent": "analyst"
      }
    ],
    "default": "writer"
  }
}
```

### 步骤 3：实现路由逻辑

```javascript
// plugins/smart-router.js
module.exports = {
  name: 'smart-router',
  
  handler: async (message, context) => {
    // 1. 调用路由智能体分析问题
    const routing = await context.agents.router.complete({
      prompt: `分析以下问题，判断应该由哪个专家处理：

用户问题：${message.text}

可选专家：
- coder: 代码相关问题
- writer: 文档写作相关问题
- analyst: 数据分析相关问题

请只返回专家名称（coder/writer/analyst）。`
    });
    
    const agentName = routing.text.trim().toLowerCase();
    
    // 2. 路由到对应智能体
    const agent = context.agents[agentName];
    
    if (!agent) {
      return { text: '抱歉，无法识别问题类型。' };
    }
    
    // 3. 专家智能体处理
    const response = await agent.complete({
      prompt: message.text
    });
    
    return { 
      text: response.text,
      metadata: {
        handledBy: agentName
      }
    };
  }
};
```

---

## 🔄 实现智能体协作

### 场景 1：代码审查流水线

```javascript
// plugins/code-review-pipeline.js
module.exports = {
  name: 'code-review-pipeline',
  
  triggers: ['/review-code'],
  
  handler: async (message, context) => {
    const code = extractCode(message.text);
    
    // 步骤 1: 语法检查
    const syntaxCheck = await context.agents.coder.complete({
      prompt: `检查以下代码的语法错误：\n\`\`\`\n${code}\n\`\`\``
    });
    
    if (syntaxCheck.text.includes('错误')) {
      return { text: `❌ 语法检查未通过：\n${syntaxCheck.text}` };
    }
    
    // 步骤 2: 代码质量审查
    const qualityReview = await context.agents.coder.complete({
      prompt: `审查以下代码的质量，包括：
1. 代码规范
2. 潜在 Bug
3. 性能问题
4. 改进建议

代码：\n\`\`\`\n${code}\n\`\`\``
    });
    
    // 步骤 3: 生成审查报告
    const report = await context.agents.writer.complete({
      prompt: `根据以下审查意见，生成一份专业的代码审查报告：
${qualityReview.text}`
    });
    
    return { text: report.text };
  }
};
```

### 场景 2：文档生成协作

```javascript
// plugins/doc-generation.js
module.exports = {
  name: 'doc-generation',
  
  triggers: ['/generate-doc'],
  
  handler: async (message, context) => {
    const topic = extractTopic(message.text);
    
    // 步骤 1: 收集信息（分析师）
    const research = await context.agents.analyst.complete({
      prompt: `调研以下主题，收集关键信息：
- 核心概念
- 主要功能
- 使用场景
- 最佳实践

主题：${topic}`
    });
    
    // 步骤 2: 编写大纲（作家）
    const outline = await context.agents.writer.complete({
      prompt: `根据以下信息，编写文档大纲：
${research.text}`
    });
    
    // 步骤 3: 撰写内容（作家）
    const content = await context.agents.writer.complete({
      prompt: `根据以下大纲，撰写完整的文档：
${outline.text}`
    });
    
    // 步骤 4: 审查润色（作家）
    const polished = await context.agents.writer.complete({
      prompt: `审查并润色以下文档，确保：
- 语言流畅
- 逻辑清晰
- 格式规范
- 示例准确

文档：\n${content.text}`
    });
    
    return { text: polished.text };
  }
};
```

### 场景 3：问题诊断协作

```javascript
// plugins/troubleshoot.js
module.exports = {
  name: 'troubleshoot',
  
  triggers: ['/diagnose', '/诊断'],
  
  handler: async (message, context) => {
    const problem = message.text;
    
    // 步骤 1: 理解问题（路由智能体）
    const understanding = await context.agents.router.complete({
      prompt: `理解以下问题，提取关键信息：
- 问题现象
- 环境信息
- 错误信息
- 已尝试的解决方案

问题：${problem}`
    });
    
    // 步骤 2: 分析原因（代码专家）
    const analysis = await context.agents.coder.complete({
      prompt: `分析以下问题的可能原因：
${understanding.text}`
    });
    
    // 步骤 3: 提供解决方案（代码专家）
    const solution = await context.agents.coder.complete({
      prompt: `基于以下分析，提供详细的解决方案：
${analysis.text}`
    });
    
    // 步骤 4: 生成诊断报告（作家）
    const report = await context.agents.writer.complete({
      prompt: `将以下诊断过程整理成专业报告：
${solution.text}`
    });
    
    return { text: report.text };
  }
};
```

---

## ⚡ 优化协作效率

### 1. 缓存策略

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 }); // 5 分钟缓存

module.exports = {
  handler: async (message, context) => {
    // 检查缓存
    const cached = cache.get(message.text);
    if (cached) {
      return { text: cached };
    }
    
    // 执行智能体协作
    const response = await collaborate(message, context);
    
    // 存入缓存
    cache.set(message.text, response.text);
    
    return response;
  }
};
```

### 2. 并行处理

```javascript
module.exports = {
  handler: async (message, context) => {
    // 并行调用多个智能体
    const [result1, result2, result3] = await Promise.all([
      context.agents.coder.complete({ prompt: message.text }),
      context.agents.writer.complete({ prompt: message.text }),
      context.agents.analyst.complete({ prompt: message.text })
    ]);
    
    // 投票选择最佳结果
    const best = vote([result1, result2, result3]);
    
    return { text: best.text };
  }
};
```

### 3. 超时控制

```javascript
module.exports = {
  handler: async (message, context) => {
    const timeout = 10000; // 10 秒超时
    
    try {
      const response = await Promise.race([
        context.agents.coder.complete({ prompt: message.text }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), timeout)
        )
      ]);
      
      return { text: response.text };
    } catch (error) {
      return { text: '抱歉，处理超时，请稍后再试。' };
    }
  }
};
```

---

## 📊 监控和调试

### 1. 日志记录

```javascript
const fs = require('fs');

function logCollaboration(data) {
  const log = {
    timestamp: new Date().toISOString(),
    message: data.message,
    agents: data.agents,
    results: data.results,
    duration: data.duration
  };
  
  fs.appendFileSync(
    'collaboration.log',
    JSON.stringify(log) + '\n'
  );
}
```

### 2. 性能指标

```javascript
const metrics = {
  totalRequests: 0,
  avgDuration: 0,
  agentUsage: {},
  errorRate: 0
};

function recordMetrics(data) {
  metrics.totalRequests++;
  metrics.avgDuration = (metrics.avgDuration * (metrics.totalRequests - 1) + data.duration) / metrics.totalRequests;
  
  data.agents.forEach(agent => {
    metrics.agentUsage[agent] = (metrics.agentUsage[agent] || 0) + 1;
  });
}
```

### 3. 调试模式

```javascript
const DEBUG = process.env.DEBUG === 'true';

module.exports = {
  handler: async (message, context) => {
    if (DEBUG) {
      console.log('[DEBUG] 收到消息:', message.text);
    }
    
    const response = await collaborate(message, context);
    
    if (DEBUG) {
      console.log('[DEBUG] 回复:', response.text);
      console.log('[DEBUG] 元数据:', response.metadata);
    }
    
    return response;
  }
};
```

---

## 🎓 最佳实践

### 设计原则

1. **单一职责**: 每个智能体专注一个领域
2. **明确接口**: 智能体之间通过标准接口通信
3. **容错设计**: 单个智能体失败不影响整体
4. **可观测性**: 记录日志和指标

### 成本控制

1. **智能路由**: 简单问题用小模型
2. **结果缓存**: 避免重复计算
3. **批量处理**: 合并相似请求
4. **限流策略**: 防止滥用

### 质量保障

1. **多轮审查**: 重要输出多次审查
2. **投票机制**: 多个智能体投票决策
3. **人工审核**: 关键场景人工介入
4. **持续优化**: 根据反馈调整策略

---

## 📚 参考资源

- [智能体路由配置](./agent-routing.md)
- [技能开发教程](./skill-development.md)
- [性能优化指南](../FAQ/06-性能优化.md)

---

**祝你协作愉快！** 🦞
