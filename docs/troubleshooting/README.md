# 🐛 故障排查指南

OpenClaw 常见问题诊断和解决方案。

## 🔍 诊断命令

### 基础检查

```bash
# 查看网关状态
openclaw gateway status

# 查看实时日志
openclaw gateway logs --follow

# 查看配置
openclaw config get

# 验证配置
openclaw config validate
```

### 深度诊断

```bash
# 查看插件列表
openclaw plugins list

# 查看技能列表
openclaw skills list

# 查看会话状态
/status

# 查看节点状态
/nodes status
```

## 📋 常见问题速查

### 网关无法启动

**症状：**
```
Error: Port 3000 is already in use
```

**解决方案：**
```bash
# 查找占用端口的进程
lsof -i :3000

# 杀死进程
kill -9 <PID>

# 或更改端口
openclaw config patch --path server.port --value 3001
```

### 消息无响应

**症状：** 发送消息后无回复

**排查步骤：**
1. 检查网关是否运行
2. 查看日志是否有错误
3. 验证 AI 模型配置
4. 检查网络连接

```bash
# 查看详细日志
openclaw logs --level debug --grep "message"

# 测试 AI 模型
/message 测试
```

### 技能不生效

**症状：** 技能命令无响应

**排查步骤：**
1. 确认技能已启用
2. 检查 SKILL.md 格式
3. 查看技能加载日志

```bash
# 列出已加载技能
openclaw skills list

# 查看技能日志
openclaw logs --grep "skill"
```

### OAuth 授权失败

**症状：**
```
Error: token_expired
Error: invalid_grant
```

**解决方案：**
```bash
# 撤销授权
/feishu_oauth revoke

# 重新授权
# 系统会自动发起授权流程
```

### 飞书 API 调用失败

**症状：**
```
Error: 99991663 - 票据过期
Error: 99991661 - 权限不足
```

**解决方案：**
1. 检查 Token 是否过期
2. 验证应用权限配置
3. 确认用户已授权

```json
// 检查配置
{
  "plugins": {
    "feishu": {
      "userToken": "u-xxx" // 确认有效
    }
  }
}
```

### 内存占用过高

**症状：** 系统变慢，响应延迟

**解决方案：**
```bash
# 查看内存使用
openclaw memory

# 清理旧会话
openclaw sessions cleanup

# 限制历史消息数
{
  "session": {
    "maxMessages": 50
  }
}
```

### 网络连接问题

**症状：**
```
Error: connect ETIMEDOUT
Error: getaddrinfo ENOTFOUND
```

**解决方案：**
```bash
# 测试网络
curl -I https://api.example.com

# 检查 DNS
nslookup api.example.com

# 使用代理
export HTTP_PROXY=http://proxy:port
```

## 🔧 修复命令

### 重置配置

```bash
# 备份配置
cp ~/.openclaw/config.json ~/.openclaw/config.json.backup

# 重新初始化
openclaw onboard
```

### 清理缓存

```bash
# 清理会话缓存
rm -rf ~/.openclaw/agents/main/sessions/*

# 清理日志
openclaw logs --clear
```

### 重新安装

```bash
# 卸载
npm uninstall -g openclaw

# 清理
rm -rf ~/.openclaw

# 重新安装
npm install -g openclaw

# 重新配置
openclaw onboard
```

## 📊 日志分析

### 查看错误日志

```bash
# 只看错误
openclaw logs --level error

# 搜索关键词
openclaw logs --grep "Error"

# 查看最近 100 行
openclaw logs --tail 100
```

### 导出日志

```bash
# 导出到文件
openclaw logs --output /tmp/openclaw.log

# 分析日志
cat /tmp/openclaw.log | grep "Error" | sort | uniq -c
```

## 📮 获取帮助

- [官方文档](https://docs.openclaw.ai)
- [GitHub Issues](https://github.com/openclaw/openclaw/issues)
- [社区讨论](https://discord.com/invite/clawd)

---

_最后更新：2026-03-28_
