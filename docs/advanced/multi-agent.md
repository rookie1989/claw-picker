# 多智能体协作

> 让多个 AI Agent 协同完成复杂任务——从角色分工到任务编排，从消息传递到结果聚合

## 目录

1. [多智能体架构概述](#一多智能体架构概述)
2. [角色设计与分工](#二角色设计与分工)
3. [Agent 间通信机制](#三agent-间通信机制)
4. [任务编排模式](#四任务编排模式)
5. [实战：内容创作流水线](#五实战内容创作流水线)
6. [实战：智能客服分层路由](#六实战智能客服分层路由)
7. [实战：代码审查多 Agent 系统](#七实战代码审查多-agent-系统)
8. [监控与调试](#八监控与调试)

---

## 一、多智能体架构概述

### 为什么需要多智能体？

单个 AI Agent 的局限：
- **上下文长度限制**：复杂任务超出单次对话上下文
- **专业化不足**：通用 Agent 在垂直领域效果不如专家 Agent
- **并行能力缺失**：顺序执行无法发挥多核 / 多 API 的并行优势
- **可靠性不足**：无校验机制，错误无法被发现和纠正

### OpenClaw 多 Agent 架构

```
用户请求
    │
    ▼
┌─────────────┐
│  Orchestrator │  任务调度 + 结果聚合
│   (协调者)   │
└──────┬──────┘
       │ 分发任务
  ┌────┼────┐
  ▼    ▼    ▼
┌───┐┌───┐┌───┐
│ A ││ B ││ C │  专家 Agent（并行执行）
└───┘└───┘└───┘
  搜索  写作  校验
```

OpenClaw 支持通过**多渠道**实现多 Agent：每个 Agent 对应一个渠道，使用不同的模型/提示词/温度参数。

---

## 二、角色设计与分工

### 2.1 常见 Agent 角色

| 角色 | 职责 | 推荐模型 | 温度 |
|------|------|---------|------|
| 🎯 Orchestrator | 理解需求、分解任务、协调其他 Agent | GPT-4o | 0.2 |
| 🔍 Researcher | 信息检索、数据收集、事实核查 | GPT-4o-mini | 0.1 |
| ✍️ Writer | 内容生成、文本润色、格式化 | GPT-4o | 0.7 |
| 🔬 Critic | 质量审查、逻辑校验、错误检测 | GPT-4o | 0.1 |
| 📊 Analyst | 数据分析、归纳总结、洞察提炼 | GPT-4o | 0.3 |
| 💻 Coder | 代码生成、技术实现、Debug | Claude-3.5-sonnet | 0.0 |
| 🌐 Translator | 多语言翻译、本地化 | GPT-4o-mini | 0.1 |

### 2.2 OpenClaw 渠道配置

```yaml
# openclaw-config.yaml - 多 Agent 渠道配置
channels:
  - name: orchestrator
    model: gpt-4o
    temperature: 0.2
    system_prompt: |
      你是一个任务协调专家。职责：
      1. 分析用户需求，拆解为子任务
      2. 分配给合适的专家 Agent
      3. 聚合结果，输出最终答案
      输出格式必须是 JSON：{"tasks": [...], "reasoning": "..."}

  - name: researcher
    model: gpt-4o-mini
    temperature: 0.1
    system_prompt: |
      你是一个信息研究专家。职责：
      1. 准确检索和整理信息
      2. 标注信息来源和可信度
      3. 识别并指出不确定内容
      保持客观，不添加个人观点。

  - name: writer
    model: gpt-4o
    temperature: 0.7
    system_prompt: |
      你是一个资深内容创作者。职责：
      1. 基于提供的素材创作高质量内容
      2. 确保逻辑流畅、语言生动
      3. 适配目标受众的阅读习惯

  - name: critic
    model: gpt-4o
    temperature: 0.1
    system_prompt: |
      你是一个严格的内容审查专家。职责：
      1. 检查逻辑错误和事实不准确
      2. 评估内容完整性和专业性
      3. 给出具体的改进建议
      输出格式：{"score": 1-10, "issues": [...], "suggestions": [...]}
```

---

## 三、Agent 间通信机制

### 3.1 基础通信框架

```javascript
// agents/agent-base.js
const axios = require('axios');

class Agent {
  constructor(name, channel, options = {}) {
    this.name = name;
    this.channel = channel;
    this.openclawUrl = options.url || process.env.OPENCLAW_URL;
    this.apiKey = options.apiKey || process.env.OPENCLAW_API_KEY;
    this.memory = [];          // 短期记忆（本任务上下文）
    this.maxMemory = options.maxMemory || 10;
  }

  // 向 OpenClaw 发送消息
  async think(prompt, systemOverride = null) {
    const messages = [];
    
    if (systemOverride) {
      messages.push({ role: 'system', content: systemOverride });
    }
    
    // 注入短期记忆
    if (this.memory.length > 0) {
      messages.push({
        role: 'system',
        content: `【任务上下文】\n${this.memory.join('\n')}`
      });
    }
    
    messages.push({ role: 'user', content: prompt });

    const res = await axios.post(
      `${this.openclawUrl}/api/v1/chat`,
      { channel: this.channel, messages },
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    );

    return res.data.choices[0].message.content.trim();
  }

  // 记忆管理
  remember(fact) {
    this.memory.push(fact);
    if (this.memory.length > this.maxMemory) {
      this.memory.shift(); // 超出限制时删除最旧的
    }
  }

  clearMemory() {
    this.memory = [];
  }

  toString() {
    return `[Agent:${this.name}]`;
  }
}

module.exports = Agent;
```

### 3.2 消息传递协议

```javascript
// agents/message-protocol.js

// 统一的 Agent 间消息格式
class AgentMessage {
  constructor(from, to, type, content, metadata = {}) {
    this.id = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    this.from = from;
    this.to = to;
    this.type = type;       // TASK | RESULT | ERROR | FEEDBACK | BROADCAST
    this.content = content;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }

  static task(from, to, taskDescription, context = {}) {
    return new AgentMessage(from, to, 'TASK', taskDescription, { context });
  }

  static result(from, to, result, taskId) {
    return new AgentMessage(from, to, 'RESULT', result, { taskId });
  }

  static error(from, to, error, taskId) {
    return new AgentMessage(from, to, 'ERROR', error, { taskId });
  }
}

// Agent 消息总线（发布/订阅）
class AgentBus {
  constructor() {
    this.subscribers = new Map();
    this.messageLog = [];
  }

  subscribe(agentName, handler) {
    if (!this.subscribers.has(agentName)) {
      this.subscribers.set(agentName, []);
    }
    this.subscribers.get(agentName).push(handler);
  }

  async publish(message) {
    this.messageLog.push(message);
    
    const handlers = this.subscribers.get(message.to) || [];
    await Promise.all(handlers.map(h => h(message)));
  }

  getMessageLog(agentName) {
    return this.messageLog.filter(
      m => m.from === agentName || m.to === agentName
    );
  }
}

const bus = new AgentBus();
module.exports = { AgentMessage, AgentBus, bus };
```

---

## 四、任务编排模式

### 4.1 顺序管道（Pipeline）

```
输入 → Agent A → Agent B → Agent C → 输出
```

```javascript
// orchestrators/pipeline.js
class Pipeline {
  constructor(agents) {
    this.agents = agents; // [agentA, agentB, agentC]
  }

  async run(input) {
    let current = input;
    const steps = [];

    for (const agent of this.agents) {
      console.log(`→ ${agent.name} 处理中...`);
      const result = await agent.think(current);
      steps.push({ agent: agent.name, input: current, output: result });
      current = result;
    }

    return { finalOutput: current, steps };
  }
}

// 使用示例：研究 → 写作 → 校验
const contentPipeline = new Pipeline([
  new Agent('researcher', 'researcher'),
  new Agent('writer', 'writer'),
  new Agent('critic', 'critic')
]);
```

### 4.2 并行扇出（Fan-out / Fan-in）

```
            ┌→ Agent A ─┐
输入 → 分发  ├→ Agent B ─┤→ 聚合 → 输出
            └→ Agent C ─┘
```

```javascript
// orchestrators/fanout.js
class FanOutOrchestrator {
  constructor(agents, aggregator) {
    this.agents = agents;
    this.aggregator = aggregator; // 聚合函数
  }

  async run(input) {
    // 并行分发
    const promises = this.agents.map(agent =>
      agent.think(input).then(result => ({ agent: agent.name, result }))
    );

    const results = await Promise.allSettled(promises);
    const successes = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    // 聚合结果
    return this.aggregator(successes);
  }
}

// 示例：多模型投票机制（提高准确性）
const votingOrchestrator = new FanOutOrchestrator(
  [
    new Agent('gpt4o-1', 'gpt4o-channel'),
    new Agent('gpt4o-2', 'gpt4o-channel'),
    new Agent('claude', 'claude-channel')
  ],
  (results) => {
    // 简单多数投票（适用于分类任务）
    const votes = {};
    for (const { result } of results) {
      votes[result] = (votes[result] || 0) + 1;
    }
    return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
  }
);
```

### 4.3 动态路由（Conditional Routing）

```javascript
// orchestrators/router.js
class RouterOrchestrator {
  constructor(routerAgent, agentMap) {
    this.router = routerAgent; // 负责分类路由的 Agent
    this.agentMap = agentMap;  // { 类别: Agent }
  }

  async run(input) {
    // 1. 路由判断
    const routeDecision = await this.router.think(
      `分析以下请求，判断应由哪个专家处理，只返回类别名称：${input}\n可选类别：${Object.keys(this.agentMap).join('、')}`
    );

    const targetAgent = this.agentMap[routeDecision.trim()];
    if (!targetAgent) {
      throw new Error(`未知路由类别：${routeDecision}`);
    }

    console.log(`🔀 路由到：${targetAgent.name}`);

    // 2. 转发给目标 Agent
    return targetAgent.think(input);
  }
}
```

---

## 五、实战：内容创作流水线

```javascript
// examples/content-pipeline.js
const Agent = require('./agent-base');

async function createContent(topic) {
  console.log(`\n🚀 开始内容创作：「${topic}」\n`);

  const researcher = new Agent('researcher', 'researcher');
  const writer = new Agent('writer', 'writer');
  const critic = new Agent('critic', 'critic');

  // Step 1: 研究员收集素材
  console.log('📚 Step 1: 研究员收集素材...');
  const research = await researcher.think(
    `请收集关于「${topic}」的核心信息：背景、现状、关键数据点、常见误解。以结构化列表形式输出。`
  );
  console.log('  研究完成:', research.slice(0, 100) + '...');

  // Step 2: 写作者基于素材创作
  console.log('\n✍️  Step 2: 写作者创作内容...');
  const draft = await writer.think(
    `基于以下研究素材，写一篇800字左右的科普文章，面向普通读者：\n\n${research}`
  );
  console.log('  初稿完成:', draft.slice(0, 100) + '...');

  // Step 3: 评审者审查质量
  console.log('\n🔬 Step 3: 评审者质量审查...');
  const review = await critic.think(
    `请审查以下文章的质量，给出评分（1-10分）和改进建议：\n\n${draft}`
  );

  // 解析评分
  let score = 7;
  const scoreMatch = review.match(/(\d+)\s*[\/分]/);
  if (scoreMatch) score = parseInt(scoreMatch[1]);

  console.log(`  评审得分：${score}/10`);

  // Step 4: 如果得分低于 8，让写作者改进
  let finalContent = draft;
  if (score < 8) {
    console.log('\n♻️  Step 4: 根据反馈优化...');
    finalContent = await writer.think(
      `请根据以下审查意见优化文章：\n\n【审查意见】\n${review}\n\n【原文】\n${draft}`
    );
    console.log('  优化完成！');
  }

  return {
    topic,
    research,
    draft,
    review,
    score,
    finalContent,
    optimized: score < 8
  };
}

// 运行示例
createContent('人工智能在医疗诊断中的应用').then(result => {
  console.log('\n\n=== 最终内容 ===');
  console.log(result.finalContent);
  console.log(`\n质量评分：${result.score}/10，是否经过优化：${result.optimized}`);
}).catch(console.error);
```

---

## 六、实战：智能客服分层路由

```javascript
// examples/customer-service-router.js
const Agent = require('./agent-base');
const { bus } = require('./message-protocol');

class CustomerServiceSystem {
  constructor() {
    // 前台接待（快速响应，低成本模型）
    this.receptionist = new Agent('receptionist', 'fast-channel');
    
    // 专家 Agent
    this.agents = {
      '技术支持': new Agent('tech-support', 'technical-channel'),
      '账单查询': new Agent('billing', 'billing-channel'),
      '投诉处理': new Agent('complaint', 'complaint-channel'),
      '通用咨询': new Agent('general', 'general-channel')
    };

    // 质检 Agent（对所有回复进行质量抽检）
    this.qaAgent = new Agent('qa-inspector', 'critic');
  }

  async handleRequest(userId, message) {
    const startTime = Date.now();
    
    // 1. 前台分类
    const category = await this.receptionist.think(
      `用户消息：「${message}」\n判断类别（只返回类别名）：技术支持、账单查询、投诉处理、通用咨询`
    );

    const targetAgent = this.agents[category.trim()] || this.agents['通用咨询'];
    console.log(`[${userId}] 路由到「${targetAgent.name}」`);

    // 2. 专家处理
    const response = await targetAgent.think(message);

    // 3. 随机 10% 进行质检（不阻塞主流程）
    if (Math.random() < 0.1) {
      this.qaAgent.think(`评估以下客服回复的质量（1-10分）：\n问题：${message}\n回复：${response}`)
        .then(qa => {
          const score = parseInt(qa.match(/\d+/)?.[0] || '7');
          console.log(`[QA] 用户 ${userId} 服务评分：${score}/10`);
          if (score < 6) {
            console.warn(`[QA] ⚠️ 低质量回复，需人工复查`);
          }
        });
    }

    return {
      userId,
      category: category.trim(),
      response,
      latency: Date.now() - startTime
    };
  }
}

const cs = new CustomerServiceSystem();

// 批量测试
const testMessages = [
  '我的账户无法登录，提示密码错误',
  '上个月的账单金额好像不对',
  '你们的服务太差了！我要投诉！',
  '请问你们支持哪些付款方式？'
];

(async () => {
  for (const msg of testMessages) {
    const result = await cs.handleRequest(`user_${Math.random().toString(36).slice(2, 6)}`, msg);
    console.log(`\n[${result.category}] 响应时间：${result.latency}ms\n回复：${result.response.slice(0, 80)}...`);
  }
})();
```

---

## 七、实战：代码审查多 Agent 系统

```javascript
// examples/code-review-agents.js
const Agent = require('./agent-base');

class CodeReviewSystem {
  constructor() {
    this.securityReviewer = new Agent('security', 'security-channel');
    this.performanceReviewer = new Agent('performance', 'performance-channel');
    this.styleReviewer = new Agent('style', 'style-channel');
    this.summarizer = new Agent('summarizer', 'orchestrator');
  }

  async review(code, language = 'JavaScript') {
    console.log(`\n🔍 开始多维度代码审查（${language}）...\n`);

    // 并行执行三个维度的审查
    const [security, performance, style] = await Promise.all([
      this.securityReviewer.think(
        `审查以下${language}代码的安全问题（SQL注入/XSS/CSRF/权限问题等），给出具体行号和修复建议：\n\`\`\`\n${code}\n\`\`\``
      ),
      this.performanceReviewer.think(
        `审查以下${language}代码的性能问题（N+1查询/内存泄漏/低效算法等），给出优化建议：\n\`\`\`\n${code}\n\`\`\``
      ),
      this.styleReviewer.think(
        `审查以下${language}代码的可读性和规范性（命名/注释/结构/最佳实践），给出改进建议：\n\`\`\`\n${code}\n\`\`\``
      )
    ]);

    // 汇总报告
    const summary = await this.summarizer.think(
      `综合以下三份代码审查报告，生成一份结构化的最终审查报告（含总体评分和优先级排序）：

【安全审查】
${security}

【性能审查】
${performance}

【规范审查】
${style}`
    );

    return { security, performance, style, summary };
  }
}

// 测试用代码
const testCode = `
async function getUserData(userId) {
  const query = "SELECT * FROM users WHERE id = " + userId;
  const results = await db.query(query);
  for (const user of results) {
    const orders = await db.query("SELECT * FROM orders WHERE user_id = " + user.id);
    user.orders = orders;
  }
  return results;
}
`;

const reviewer = new CodeReviewSystem();
reviewer.review(testCode).then(result => {
  console.log('\n=== 综合审查报告 ===');
  console.log(result.summary);
});
```

---

## 八、监控与调试

### 8.1 Agent 执行追踪

```javascript
// monitoring/agent-tracer.js
class AgentTracer {
  constructor() {
    this.traces = [];
  }

  wrap(agent) {
    const originalThink = agent.think.bind(agent);
    const tracer = this;

    agent.think = async function(prompt, systemOverride) {
      const traceId = `${agent.name}_${Date.now()}`;
      const start = Date.now();

      tracer.traces.push({
        id: traceId,
        agent: agent.name,
        channel: agent.channel,
        prompt: prompt.slice(0, 200),
        status: 'running',
        startTime: new Date().toISOString()
      });

      try {
        const result = await originalThink(prompt, systemOverride);
        const trace = tracer.traces.find(t => t.id === traceId);
        trace.status = 'success';
        trace.latency = Date.now() - start;
        trace.outputPreview = result.slice(0, 200);
        return result;
      } catch (err) {
        const trace = tracer.traces.find(t => t.id === traceId);
        trace.status = 'error';
        trace.error = err.message;
        trace.latency = Date.now() - start;
        throw err;
      }
    };

    return agent;
  }

  printReport() {
    console.log('\n=== Agent 执行报告 ===');
    for (const t of this.traces) {
      const statusIcon = t.status === 'success' ? '✅' : '❌';
      console.log(`${statusIcon} [${t.agent}] ${t.latency}ms - ${t.status}`);
      if (t.error) console.log(`   错误：${t.error}`);
    }
    const totalTime = this.traces.reduce((s, t) => s + (t.latency || 0), 0);
    const successRate = (this.traces.filter(t => t.status === 'success').length / this.traces.length * 100).toFixed(0);
    console.log(`\n总计：${this.traces.length} 次调用，总耗时 ${totalTime}ms，成功率 ${successRate}%`);
  }
}

module.exports = AgentTracer;
```

---

## 最佳实践总结

| 原则 | 说明 |
|------|------|
| **单一职责** | 每个 Agent 只做一件事，提示词简洁专注 |
| **结构化输出** | 要求 Agent 输出 JSON，便于下游处理 |
| **并行优先** | 无依赖的子任务并行执行，减少总延迟 |
| **降级设计** | 每个 Agent 都应有失败降级策略 |
| **上下文控制** | 只传递必要的上下文，避免 token 浪费 |
| **人工节点** | 高风险决策保留人工审核节点 |
| **全程追踪** | 记录每个 Agent 的输入输出，便于调试 |

---

## 相关资源

- [OpenClaw 快速入门](../getting-started/quick-start.md)
- [性能调优专题](performance-tuning.md)
- [CI/CD 自动化部署](cicd-deployment.md)
- [飞书深度集成](../feishu-integration/)
