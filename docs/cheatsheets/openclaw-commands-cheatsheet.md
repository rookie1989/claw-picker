# ⚡ OpenClaw 常用命令速查表

快速查找 OpenClaw 常用命令和配置片段。

## 🚀 基础命令

### 安装与初始化

```bash
# 安装 OpenClaw
npm install -g openclaw

# 初始化配置（交互式向导）
openclaw onboard

# 查看版本
openclaw --version

# 查看帮助
openclaw --help
```

### 网关管理

```bash
# 启动网关
openclaw gateway start

# 停止网关
openclaw gateway stop

# 重启网关
openclaw gateway restart

# 查看状态
openclaw gateway status

# 查看日志
openclaw gateway logs
```

### 会话管理

```bash
# 创建新会话（清空上下文）
/new

# 重置当前会话
/reset

# 查看会话列表
/sessions

# 查看会话状态
/status
```

## 🔧 配置命令

### 配置管理

```bash
# 编辑配置文件
openclaw config edit

# 查看配置
openclaw config get

# 验证配置
openclaw config validate

# 应用配置（需重启）
openclaw config apply
```

### 常用配置片段

**多通道配置** (`~/.openclaw/config.json`):
```json
{
  "plugins": {
    "entries": [
      "telegram",
      "whatsapp",
      "discord"
    ]
  }
}
```

**模型配置**:
```json
{
  "model": {
    "default": "qwen3.5-plus",
    "fallback": "qwen3.5-lite"
  }
}
```

**技能配置**:
```json
{
  "skills": {
    "entries": [
      "weather",
      "github",
      "feishu-bitable"
    ]
  }
}
```

## 🤖 Agent 命令

### 子 Agent 管理

```bash
# 查看子 Agent 列表
/subagents

# 终止子 Agent
/kill <agent-id>

# 调整子 Agent 方向
/steer <agent-id> <新指令>
```

### 会话派生

```bash
# 派生子 Agent（后台运行）
/spawn <任务描述>

# 派生 ACP 会话（编码任务）
/acp <编码任务>

# 等待子 Agent 完成
/yield
```

## 📅 Cron 定时任务

### 命令

```bash
# 查看定时任务列表
/cron list

# 添加定时任务
/cron add <任务>

# 运行定时任务
/cron run <job-id>

# 删除定时任务
/cron remove <job-id>
```

### Cron 表达式示例

```
# 每天早上 9 点
0 9 * * *

# 每 30 分钟
*/30 * * * *

# 每周一 10 点
0 10 * * 1

# 每天 10:00 和 18:00
0 10,18 * * *
```

## 📦 技能管理

### 命令

```bash
# 列出可用技能
/skills list

# 启用技能
/skills enable <skill-name>

# 禁用技能
/skills disable <skill-name>

# 查看技能文档
/skills doc <skill-name>
```

### 内置技能列表

| 技能 | 功能 |
|------|------|
| `weather` | 天气查询 |
| `github` | GitHub 操作 |
| `gh-issues` | Issue 自动处理 |
| `feishu-bitable` | 飞书多维表格 |
| `feishu-calendar` | 飞书日历 |
| `feishu-task` | 飞书任务 |
| `feishu-create-doc` | 飞书文档创建 |
| `coding-agent` | 编码助手 |
| `apple-notes` | Apple 笔记 |
| `apple-reminders` | Apple 提醒 |
| `1password` | 1Password 集成 |
| `healthcheck` | 安全检查 |

## 🔍 调试命令

```bash
# 查看系统状态
openclaw status

# 查看内存使用
openclaw memory

# 查看网络连接
openclaw network

# 测试消息发送
/message test

# 查看日志级别
openclaw logs --level debug
```

## 💡 快捷键

| 快捷键 | 功能 |
|--------|------|
| `/new` | 新会话 |
| `/reset` | 重置会话 |
| `/status` | 查看状态 |
| `/help` | 帮助 |
| `/quit` | 退出 |

## 📮 更多资源

- [完整文档](https://docs.openclaw.ai)
- [GitHub 仓库](https://github.com/openclaw/openclaw)
- [社区讨论](https://discord.com/invite/clawd)
