# 智能体路由策略

本教程介绍如何配置多 AI 助手协作，实现智能消息路由和任务分发。

## 什么是智能体路由？

智能体路由允许你：
- 🤖 配置多个 AI 助手（不同模型/角色）
- 🎯 根据消息内容自动路由到合适的助手
- ⚙️ 为不同任务分配专用助手
- 🔄 实现助手间的协作和交接

## 使用场景

### 场景 1: 角色分离

```
技术问题 → 技术专家助手
写作任务 → 文案助手
日程安排 → 助理助手
代码审查 → 资深工程师助手
```

### 场景 2: 模型优化

```
简单问答 → 快速模型 (GPT-3.5)
复杂推理 → 强大模型 (GPT-4/Claude-3)
代码生成 → 代码专用模型 (Codex)
搜索任务 → 联网模型 (Perplexity)
```

### 场景 3: 团队协作

```
开发人员 → 开发助手
产品经理 → 产品助手
设计师   → 设计助手
运营人员 → 运营助手
```

## 架构设计

```
                    用户消息
                       │
                       ↓
              ┌────────────────┐
              │  Router Agent  │
              │  (路由决策)    │
              └───────┬────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ↓             ↓             ↓
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Tech    │  │  Writing │  │  Admin   │
  │  Agent   │  │  Agent   │  │  Agent   │
  └──────────┘  └──────────┘  └──────────┘
```

## 配置步骤

### Step 1: 定义多个 AI 助手

编辑 `~/.openclaw/config.json`：

```json
{
  "agents": {
    "default": {
      "model": "gpt-4",
      "systemPrompt": "你是一个通用的 AI 助手。"
    },
    "tech-expert": {
      "model": "claude-3-opus",
      "systemPrompt": "你是一位资深技术专家，擅长：\n- 系统架构设计\n- 代码审查和优化\n- 技术难题排查\n- 性能优化\n\n请用专业的技术术语回答，提供具体的代码示例。",
      "tools": ["read", "write", "edit", "exec", "github"]
    },
    "writing-assistant": {
      "model": "gpt-4",
      "systemPrompt": "你是一位专业的文案写手，擅长：\n- 文章写作和编辑\n- 邮件撰写\n- 报告整理\n- 内容优化\n\n请用优雅流畅的文字，注意语气和风格。",
      "tools": ["read", "write", "web_search"]
    },
    "admin-assistant": {
      "model": "gpt-3.5-turbo",
      "systemPrompt": "你是一位高效的行政助理，擅长：\n- 日程管理\n- 会议安排\n- 任务跟踪\n- 信息整理\n\n请简洁明了，注重效率。",
      "tools": ["feishu_calendar_event", "feishu_task_task", "feishu_search_user"]
    }
  }
}
```

### Step 2: 配置路由规则

```json
{
  "routing": {
    "enabled": true,
    "strategy": "content-based",
    "rules": [
      {
        "name": "技术相关",
        "agent": "tech-expert",
        "conditions": {
          "keywords": ["代码", "bug", "错误", "部署", "API", "数据库", "服务器", "docker", "kubernetes"],
          "patterns": ["如何.*代码", ".*报错", ".*异常", "debug", "fix"]
        },
        "priority": 1
      },
      {
        "name": "写作相关",
        "agent": "writing-assistant",
        "conditions": {
          "keywords": ["写", "文章", "报告", "邮件", "文案", "编辑", "润色", "翻译"],
          "patterns": ["帮我写.*", "修改.*", "优化.*文案"]
        },
        "priority": 2
      },
      {
        "name": "日程管理",
        "agent": "admin-assistant",
        "conditions": {
          "keywords": ["会议", "日程", "安排", "提醒", "任务", "待办"],
          "patterns": ["安排.*会议", "创建.*任务", "提醒我.*"]
        },
        "priority": 3
      }
    ],
    "fallback": "default"
  }
}
```

### Step 3: 配置路由决策器

创建自定义路由逻辑 `~/.openclaw/plugins/custom-router.js`：

```javascript
/**
 * 自定义路由决策器
 */

class CustomRouter {
  constructor(config) {
    this.config = config;
    this.rules = config.routing.rules || [];
  }

  /**
   * 根据消息内容决定使用哪个 AI 助手
   * @param {Object} message - 消息对象
   * @returns {String} - AI 助手名称
   */
  async route(message) {
    const content = message.content.toLowerCase();
    
    // 检查是否指定了助手
    const agentMatch = content.match(/@(\S+)/);
    if (agentMatch) {
      const agentName = agentMatch[1];
      if (this.config.agents[agentName]) {
        return agentName;
      }
    }
    
    // 基于规则匹配
    for (const rule of this.rules) {
      const score = this.calculateScore(content, rule.conditions);
      if (score >= rule.threshold || 0.6) {
        console.log(`[Router] 匹配规则: ${rule.name}, 使用助手：${rule.agent}`);
        return rule.agent;
      }
    }
    
    // 使用默认助手
    console.log('[Router] 未匹配规则，使用默认助手');
    return 'default';
  }

  /**
   * 计算消息与规则的匹配度
   */
  calculateScore(content, conditions) {
    let score = 0;
    
    // 关键词匹配
    if (conditions.keywords) {
      for (const keyword of conditions.keywords) {
        if (content.includes(keyword.toLowerCase())) {
          score += 0.2;
        }
      }
    }
    
    // 正则匹配
    if (conditions.patterns) {
      for (const pattern of conditions.patterns) {
        if (new RegExp(pattern).test(content)) {
          score += 0.3;
        }
      }
    }
    
    return Math.min(score, 1.0);
  }
}

module.exports = CustomRouter;
```

### Step 4: 集成路由到网关

编辑 `~/.openclaw/config.json`：

```json
{
  "routing": {
    "enabled": true,
    "router": {
      "type": "custom",
      "path": "~/.openclaw/plugins/custom-router.js",
      "config": {
        "confidenceThreshold": 0.6,
        "logDecisions": true
      }
    }
  }
}
```

### Step 5: 重启并测试

```bash
# 重启网关
openclaw gateway restart

# 查看路由日志
openclaw gateway logs | grep Router
```

## 测试示例

### 测试 1: 技术问题路由

发送消息：
```
我的代码报错了，TypeError: Cannot read property 'map' of undefined
```

预期：路由到 `tech-expert` 助手

### 测试 2: 写作任务路由

发送消息：
```
帮我写一封邮件，向客户解释项目延期的原因
```

预期：路由到 `writing-assistant` 助手

### 测试 3: 日程安排路由

发送消息：
```
明天下午 3 点安排一个产品评审会议，邀请产品团队
```

预期：路由到 `admin-assistant` 助手

### 测试 4: 手动指定助手

发送消息：
```
@tech-expert 帮我 review 这段代码
```

预期：强制使用 `tech-expert` 助手

## 高级配置

### 1. 基于上下文的动态路由

```json
{
  "routing": {
    "contextAware": true,
    "contextWindow": 10,
    "rules": [
      {
        "name": "连续技术对话",
        "agent": "tech-expert",
        "conditions": {
          "previousAgent": "tech-expert",
          "maxTurns": 5
        }
      }
    ]
  }
}
```

### 2. 多助手协作

```json
{
  "collaboration": {
    "enabled": true,
    "modes": {
      "handoff": {
        "enabled": true,
        "summary": true
      },
      "parallel": {
        "enabled": true,
        "maxAgents": 3,
        "mergeStrategy": "consensus"
      }
    }
  }
}
```

### 3. 性能优化

```json
{
  "routing": {
    "cache": {
      "enabled": true,
      "ttl": 300,
      "maxSize": 1000
    },
    "async": {
      "enabled": true,
      "timeout": 5000
    }
  }
}
```

## 监控与调试

### 1. 查看路由决策

```bash
# 启用详细日志
openclaw config set logging.level debug
openclaw config set logging.modules routing

# 查看实时日志
openclaw gateway logs --follow | grep -E "(Router|Agent)"
```

### 2. 路由统计

```javascript
// 在路由中添加统计
const stats = {
  totalRequests: 0,
  agentUsage: {},
  avgConfidence: 0
};

function recordDecision(agent, confidence) {
  stats.totalRequests++;
  stats.agentUsage[agent] = (stats.agentUsage[agent] || 0) + 1;
  // 更新平均置信度...
}
```

### 3. 性能指标

监控指标：
- 路由决策时间
- 各助手响应时间
- 路由准确率
- 用户满意度（如有反馈机制）

## 最佳实践

### 1. 规则设计原则

✅ 推荐：
- 规则具体明确
- 优先级清晰
- 有 fallback 机制
- 定期优化规则

❌ 避免：
- 规则过于宽泛
- 规则冲突
- 没有默认路由
- 规则过多影响性能

### 2. 助手配置

```json
{
  "agents": {
    "specialized": {
      "model": "最适合的模型",
      "systemPrompt": "明确的角色定义",
      "tools": ["必要的工具集"],
      "limits": {
        "maxTokens": 4000,
        "timeout": 30000
      }
    }
  }
}
```

### 3. 成本控制

```json
{
  "costManagement": {
    "enabled": true,
    "budgets": {
      "tech-expert": {
        "daily": 10,
        "monthly": 300
      },
      "default": {
        "daily": 5,
        "monthly": 150
      }
    },
    "alerts": {
      "threshold": 0.8,
      "notify": "admin"
    }
  }
}
```

## 故障排查

### 问题 1: 路由到错误的助手

**排查**:
```bash
# 查看路由日志
openclaw gateway logs | grep "Router.*decision"

# 检查规则匹配
# 添加调试输出到路由逻辑
```

**解决**: 调整规则优先级或关键词

### 问题 2: 路由延迟过高

**排查**:
```bash
# 监控路由时间
openclaw metrics routing

# 检查规则数量
# 优化复杂规则
```

**解决**: 
- 减少规则数量
- 简化匹配逻辑
- 启用缓存

### 问题 3: 助手切换频繁

**解决**:
```json
{
  "routing": {
    "stability": {
      "enabled": true,
      "minTurns": 3,
      "switchThreshold": 0.8
    }
  }
}
```

## 参考资源

- [OpenClaw 多智能体架构](https://docs.openclaw.ai/concepts/multi-agent)
- [路由配置参考](https://docs.openclaw.ai/reference/routing)
- [社区案例](https://github.com/openclaw/openclaw/discussions)

---

**下一步**: 查看 [示例配置](../../examples/) 获取完整的路由配置示例！
