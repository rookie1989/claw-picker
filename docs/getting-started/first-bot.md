# 创建第一个机器人

本教程将指导你配置和自定义你的第一个 OpenClaw AI 助手。

## 目标

完成本教程后，你将：
- ✅ 理解 OpenClaw 机器人的工作原理
- ✅ 能够自定义 AI 助手的行为和响应风格
- ✅ 配置专属的工作空间和工具集
- ✅ 掌握基础的调试技巧

## 理解架构

```
聊天应用 (WhatsApp/Telegram/Discord)
        ↓
   OpenClaw Gateway
        ↓
   AI 模型 (Pi Agent)
        ↓
   工具集 (文件/浏览器/搜索等)
```

## Step 1: 配置 AI 助手人格

### 创建自定义系统提示

编辑配置文件 `~/.openclaw/config.json`：

```json
{
  "agent": {
    "systemPrompt": "你是一个专业、友好的 AI 助手。你的特点是：\n\n1. 回答简洁明了，直击要点\n2. 遇到复杂问题会分步骤解释\n3. 主动询问澄清模糊的需求\n4. 提供实用的建议和示例\n\n你的专长领域：\n- 编程开发（Python, JavaScript, Go）\n- 系统运维（Linux, Docker, Kubernetes）\n- 数据分析与可视化\n\n始终保持专业和耐心的态度。"
  }
}
```

### 应用配置

```bash
# 重启网关使配置生效
openclaw gateway restart
```

### 测试新配置

发送消息：
```
介绍一下你自己
```

预期响应应该体现你配置的风格和专长。

## Step 2: 配置工作空间

### 设置默认工作目录

```bash
# 创建工作空间
mkdir -p ~/openclaw-workspace

# 配置默认工作空间
openclaw config workspace ~/openclaw-workspace
```

### 创建工作空间结构

```bash
cd ~/openclaw-workspace
mkdir -p projects scripts configs notes
```

推荐结构：
```
openclaw-workspace/
├── projects/      # 项目代码
├── scripts/       # 常用脚本
├── configs/       # 配置文件
└── notes/         # 笔记文档
```

## Step 3: 启用工具集

### 查看可用工具

```bash
openclaw tools list
```

常见工具：
- `read` - 读取文件
- `write` - 写入文件
- `edit` - 编辑文件
- `exec` - 执行命令
- `web_search` - 网络搜索
- `browser` - 浏览器控制
- `feishu_*` - 飞书集成

### 启用/禁用工具

编辑 `~/.openclaw/config.json`：

```json
{
  "tools": {
    "enabled": [
      "read",
      "write",
      "edit",
      "exec",
      "web_search",
      "feishu_search_user",
      "feishu_calendar_event"
    ],
    "disabled": [
      "browser"  # 如不需要浏览器功能可禁用
    ]
  }
}
```

## Step 4: 测试机器人功能

### 测试 1: 文件操作

发送消息：
```
在我的工作空间创建一个待办事项文件，列出今天的 5 项任务
```

AI 应该：
1. 创建文件 `~/openclaw-workspace/notes/todo-today.md`
2. 写入合理的待办事项
3. 回复确认信息

### 测试 2: 代码生成

发送消息：
```
用 Python 写一个脚本，批量重命名当前目录下的所有 .txt 文件为 .md
```

AI 应该：
1. 生成 Python 脚本
2. 保存到 `~/openclaw-workspace/scripts/rename_txt_to_md.py`
3. 解释脚本用法

### 测试 3: 信息搜索

发送消息：
```
搜索 OpenClaw 最新的功能更新
```

AI 应该：
1. 使用 web_search 工具
2. 整理搜索结果
3. 提供结构化摘要

### 测试 4: 日程管理（如配置飞书）

发送消息：
```
明天上午 10 点安排一个团队会议，1 小时
```

AI 应该：
1. 调用飞书日历 API
2. 创建日程
3. 返回会议链接

## Step 5: 调试技巧

### 查看会话日志

```bash
# 查看最近的会话
openclaw sessions list

# 查看特定会话详情
openclaw sessions get SESSION_ID

# 查看实时日志
openclaw gateway logs --follow
```

### 问题排查

**问题**: 机器人没有响应

**排查步骤**:
1. 检查网关状态：`openclaw gateway status`
2. 查看通道连接：`openclaw config channel list`
3. 检查 API 配额：登录模型提供商控制台

**问题**: 工具调用失败

**排查步骤**:
1. 查看错误日志：`openclaw gateway logs | grep ERROR`
2. 验证工具配置：`openclaw tools check`
3. 检查权限设置

### 启用详细日志

编辑 `~/.openclaw/config.json`：

```json
{
  "logging": {
    "level": "debug",
    "format": "json"
  }
}
```

## 最佳实践

### 1. 定期备份配置

```bash
# 备份配置
cp -r ~/.openclaw ~/backups/openclaw-$(date +%Y%m%d)
```

### 2. 版本控制工作空间

```bash
cd ~/openclaw-workspace
git init
git add .
git commit -m "Initial workspace setup"
```

### 3. 监控资源使用

```bash
# 查看网关资源使用
ps aux | grep openclaw
```

### 4. 保持更新

```bash
# 定期更新 OpenClaw
npm update -g openclaw
```

## 进阶学习

完成本教程后，你可以：

1. **[多通道配置](../advanced/multi-channel.md)** - 连接多个聊天平台
2. **[自定义插件](../advanced/custom-plugins.md)** - 开发专属工具
3. **[智能体路由](../advanced/agent-routing.md)** - 配置多 AI 助手协作

## 参考资源

- [OpenClaw 配置参考](https://docs.openclaw.ai/reference/config)
- [工具使用指南](https://docs.openclaw.ai/tools/)
- [社区示例](https://github.com/openclaw/openclaw/discussions)

---

**下一步**: 尝试配置 [多通道支持](../advanced/multi-channel.md)，让你的机器人在多个平台同时工作！
