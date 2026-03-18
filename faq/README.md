# 常见问题解答 (FAQ)

本文档收集了 OpenClaw 使用过程中的常见问题和解决方案。

## 目录

- [安装问题](#安装问题)
- [配置问题](#配置问题)
- [通道连接](#通道连接)
- [AI 助手](#ai-助手)
- [工具使用](#工具使用)
- [性能优化](#性能优化)
- [安全相关](#安全相关)

---

## 安装问题

### Q1: npm install 报错 "EACCES: permission denied"

**问题**: 安装 OpenClaw 时遇到权限错误

**解决方案**:

```bash
# 方案 1: 配置 npm 全局目录（推荐）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
npm install -g openclaw

# 方案 2: 使用 nvm 管理 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 24
nvm use 24
npm install -g openclaw
```

### Q2: Node.js 版本不兼容

**问题**: 提示 "Unsupported Node.js version"

**解决方案**:

```bash
# 检查当前版本
node --version

# 升级到推荐版本（v24）
nvm install 24
nvm use 24
nvm alias default 24

# 或者使用官方安装包
# 访问 https://nodejs.org 下载最新版本
```

### Q3: 网关启动失败

**问题**: `openclaw gateway start` 后网关无法启动

**排查步骤**:

```bash
# 1. 查看详细错误
openclaw gateway logs

# 2. 检查端口占用
lsof -i :3000

# 3. 验证配置文件
cat ~/.openclaw/config.json

# 4. 重新初始化
openclaw onboard --force
```

**常见原因**:
- 端口被占用 → 修改配置中的 port
- API 密钥无效 → 检查并更新密钥
- 配置文件语法错误 → 使用 JSON 验证工具检查

---

## 配置问题

### Q4: 如何修改配置？

**方法 1: 编辑配置文件**

```bash
# 编辑配置
vim ~/.openclaw/config.json

# 重启网关
openclaw gateway restart
```

**方法 2: 使用 CLI**

```bash
# 查看当前配置
openclaw config get

# 修改配置
openclaw config set agent.model gpt-4

# 重启生效
openclaw gateway restart
```

### Q5: 环境变量如何使用？

**在配置中使用环境变量**:

```json
{
  "agent": {
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

**设置环境变量**:

```bash
# 临时设置
export OPENAI_API_KEY="your-key-here"

# 永久设置（添加到 ~/.bashrc 或 ~/.zshrc）
echo 'export OPENAI_API_KEY="your-key-here"' >> ~/.bashrc
source ~/.bashrc
```

### Q6: 配置修改后不生效？

**原因**: 网关未重启

**解决**:

```bash
# 重启网关
openclaw gateway restart

# 验证配置
openclaw config get

# 查看日志确认
openclaw gateway logs | grep "Config loaded"
```

---

## 通道连接

### Q7: WhatsApp 二维码扫描后仍显示未连接

**可能原因**:
1. 网络问题
2. WhatsApp 会话过期
3. 防火墙阻止

**解决方案**:

```bash
# 1. 检查网络连接
ping web.whatsapp.com

# 2. 清除会话重新连接
rm -rf ~/.openclaw/whatsapp-session
openclaw gateway restart

# 3. 检查防火墙
sudo ufw status
# 如需开放端口
sudo ufw allow 3000
```

### Q8: Telegram 机器人无响应

**排查步骤**:

```bash
# 1. 验证 Bot Token
curl -X POST https://api.telegram.org/botYOUR_TOKEN/getMe

# 2. 检查通道配置
openclaw config channel telegram get

# 3. 查看日志
openclaw gateway logs | grep telegram
```

**常见问题**:
- Token 错误 → 从 @BotFather 重新获取
- 机器人被禁用 → 在 @BotFather 中启用
- 网络问题 → 检查代理设置

### Q9: Discord 机器人无法加入服务器

**解决方案**:

1. **生成邀请链接**:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=0&scope=bot
   ```

2. **检查权限**:
   - 确保你有管理员权限
   - 服务器未禁用机器人加入

3. **验证配置**:
   ```bash
   openclaw config channel discord get
   ```

---

## AI 助手

### Q10: AI 响应很慢

**可能原因**:
1. 网络延迟
2. 模型负载高
3. 消息过长

**优化方案**:

```json
{
  "agent": {
    "model": "gpt-3.5-turbo",
    "maxTokens": 2000
  },
  "request": {
    "timeout": 30000
  }
}
```

**其他建议**:
- 使用更快的模型
- 减少上下文长度
- 检查网络连接
- 使用国内 API 代理

### Q11: AI 回答质量不佳

**改进方法**:

1. **优化系统提示词**:
   ```json
   {
     "agent": {
       "systemPrompt": "你是一个专业助手，回答要简洁明了..."
     }
   }
   ```

2. **调整温度参数**:
   ```json
   {
     "agent": {
       "temperature": 0.7
     }
   }
   ```
   - 低温度 (0.3-0.5): 更确定、保守
   - 中温度 (0.6-0.8): 平衡
   - 高温度 (0.9-1.0): 更创意、随机

3. **提供更多上下文**:
   - 在消息中包含背景信息
   - 使用清晰的指令

### Q12: 如何切换 AI 模型？

**方法**:

```bash
# 编辑配置
vim ~/.openclaw/config.json

# 修改模型配置
{
  "agent": {
    "model": "claude-3-opus",
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}"
  }
}

# 重启
openclaw gateway restart
```

**可用模型**:
- OpenAI: gpt-4, gpt-3.5-turbo
- Anthropic: claude-3-opus, claude-3-sonnet
- Perplexity: perplexity-large
- 自定义：通过 API 接入

---

## 工具使用

### Q13: 工具调用失败

**排查步骤**:

```bash
# 1. 查看工具列表
openclaw tools list

# 2. 检查工具配置
openclaw tools config get TOOL_NAME

# 3. 查看错误日志
openclaw gateway logs | grep "Tool error"
```

**常见错误**:
- 权限不足 → 检查工具权限配置
- API 密钥缺失 → 添加相应密钥
- 参数错误 → 检查参数格式

### Q14: 文件读写工具无法使用

**问题**: AI 无法读取或写入文件

**解决方案**:

```json
{
  "tools": {
    "enabled": ["read", "write", "edit"],
    "config": {
      "exec": {
        "workingDirectory": "/Users/yourname/openclaw-workspace",
        "allowedCommands": ["ls", "cat", "grep"]
      }
    }
  },
  "workspace": {
    "path": "/Users/yourname/openclaw-workspace"
  }
}
```

**注意**:
- 确保工作目录存在
- 检查文件权限
- 避免访问敏感目录

### Q15: 网络搜索工具不工作

**排查**:

```bash
# 1. 检查 API 密钥
echo $BRAVE_SEARCH_API_KEY

# 2. 测试 API
curl -H "X-Subscription-Token: $BRAVE_SEARCH_API_KEY" \
  "https://api.search.brave.com/res/v1/web/search?q=test"

# 3. 查看工具配置
openclaw tools config get web_search
```

---

## 性能优化

### Q16: 网关占用内存过高

**优化方案**:

```json
{
  "session": {
    "pruning": {
      "enabled": true,
      "maxAge": "7d",
      "maxSessions": 50
    }
  },
  "cache": {
    "enabled": true,
    "maxSize": 1000
  }
}
```

**其他建议**:
- 定期清理旧会话
- 限制并发会话数
- 启用会话压缩

### Q17: 响应延迟高

**优化方案**:

1. **使用更快的模型**:
   ```json
   {
     "agent": {
       "model": "gpt-3.5-turbo"
     }
   }
   ```

2. **减少上下文**:
   ```json
   {
     "session": {
       "contextLength": 10
     }
   }
   ```

3. **启用缓存**:
   ```json
   {
     "cache": {
       "enabled": true
     }
   }
   ```

4. **网络优化**:
   - 使用 CDN 或代理
   - 选择就近的 API 端点

---

## 安全相关

### Q18: 如何保护 API 密钥？

**最佳实践**:

1. **使用环境变量**:
   ```bash
   export OPENAI_API_KEY="your-key"
   ```

2. **配置文件引用**:
   ```json
   {
     "agent": {
       "apiKey": "${OPENAI_API_KEY}"
     }
   }
   ```

3. **限制文件权限**:
   ```bash
   chmod 600 ~/.openclaw/config.json
   ```

4. **定期轮换密钥**:
   - 每 3-6 个月更新一次
   - 使用密钥管理服务

### Q19: 如何限制用户访问？

**配置访问控制**:

```json
{
  "security": {
    "enableAuth": true,
    "allowedUsers": ["user1", "user2"],
    "allowedChannels": ["channel1", "channel2"],
    "rateLimit": {
      "enabled": true,
      "requests": 100,
      "window": "1h"
    }
  }
}
```

### Q20: 数据是否安全？

**OpenClaw 安全措施**:

- ✅ 数据本地存储
- ✅ 传输加密 (HTTPS)
- ✅ 会话隔离
- ✅ 访问控制
- ✅ 日志审计

**建议**:
- 定期备份配置
- 启用 HTTPS
- 监控异常访问
- 更新到最新版本

---

## 其他问题

### Q21: 如何备份和恢复配置？

**备份**:

```bash
# 备份配置
cp -r ~/.openclaw ~/backups/openclaw-$(date +%Y%m%d)

# 或使用 git
cd ~/.openclaw
git init
git add .
git commit -m "Backup $(date)"
```

**恢复**:

```bash
# 恢复配置
cp -r ~/backups/openclaw-20260318 ~/.openclaw

# 重启网关
openclaw gateway restart
```

### Q22: 如何查看使用统计？

```bash
# 查看会话统计
openclaw sessions stats

# 查看工具使用
openclaw tools stats

# 查看 API 调用
openclaw metrics api
```

### Q23: 遇到问题如何求助？

**获取帮助的途径**:

1. **查看文档**:
   - [官方文档](https://docs.openclaw.ai)
   - [本仓库文档](../docs/)

2. **查看日志**:
   ```bash
   openclaw gateway logs --tail 100
   ```

3. **社区支持**:
   - [GitHub Issues](https://github.com/openclaw/openclaw/issues)
   - [GitHub Discussions](https://github.com/openclaw/openclaw/discussions)

4. **提交 Bug**:
   ```bash
   # 收集诊断信息
   openclaw doctor
   
   # 提交 Issue 时附上诊断报告
   ```

---

## 快速索引

| 问题类型 | 常见问题 | 解决方案 |
|----------|----------|----------|
| 安装 | 权限错误 | 配置 npm 全局目录 |
| 配置 | 修改不生效 | 重启网关 |
| WhatsApp | 连接失败 | 清除会话重连 |
| Telegram | 无响应 | 验证 Bot Token |
| AI | 响应慢 | 切换更快模型 |
| 工具 | 调用失败 | 检查权限和配置 |
| 性能 | 内存高 | 启用会话清理 |
| 安全 | 密钥保护 | 使用环境变量 |

---

**提示**: 遇到问题先查看日志 `openclaw gateway logs`，大部分问题都能从日志中找到线索！
