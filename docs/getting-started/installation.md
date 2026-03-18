# 安装指南

本文档详细介绍 OpenClaw 的安装步骤，适用于 macOS、Linux 和 Windows（WSL）。

## 系统要求

### 最低要求
- **Node.js**: v22.16+ (推荐 v24)
- **npm**: v9+
- **内存**: 至少 512MB 可用内存
- **磁盘**: 至少 100MB 可用空间

### 推荐配置
- **Node.js**: v24.x (最新 LTS)
- **内存**: 1GB+ 可用内存
- **操作系统**: macOS 12+, Ubuntu 20.04+, Debian 11+

## 安装步骤

### 1. 安装 Node.js

#### macOS
```bash
# 使用 Homebrew（推荐）
brew install node@24

# 或使用官方安装包
# 访问 https://nodejs.org 下载 pkg 安装包
```

#### Linux (Ubuntu/Debian)
```bash
# 使用 NodeSource 仓库
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

#### Windows (WSL)
```bash
# 在 WSL 中执行
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. 安装 OpenClaw

```bash
# 全局安装 OpenClaw
npm install -g openclaw

# 验证安装
openclaw --version
```

### 3. 初始化配置

```bash
# 运行初始化向导
openclaw onboard
```

向导会引导你完成：
- ✅ 选择 AI 模型提供商（OpenAI、Anthropic、Perplexity 等）
- ✅ 配置 API 密钥
- ✅ 选择要连接的聊天应用
- ✅ 设置网关端口和主机

### 4. 启动网关

```bash
# 启动 OpenClaw 网关
openclaw gateway start

# 查看网关状态
openclaw gateway status
```

## 验证安装

### 检查网关状态
```bash
openclaw gateway status
```

预期输出：
```
Gateway is running
PID: 12345
Port: 3000
Channels: 0
```

### 访问 Web 控制台

在浏览器中打开：`http://localhost:3000`

你应该能看到 OpenClaw 控制界面。

## 常见问题

### 问题 1: npm 权限错误

**错误信息**: `EACCES: permission denied`

**解决方案**:
```bash
# 方案 1: 使用 npm 配置（推荐）
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# 方案 2: 使用 sudo（不推荐）
sudo npm install -g openclaw
```

### 问题 2: Node.js 版本过低

**错误信息**: `Unsupported Node.js version`

**解决方案**:
```bash
# 使用 nvm 管理 Node.js 版本
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 24
nvm use 24
nvm alias default 24
```

### 问题 3: 端口被占用

**错误信息**: `Port 3000 is already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 终止进程或使用其他端口
openclaw gateway start --port 3001
```

### 问题 4: 网关启动失败

**排查步骤**:
```bash
# 1. 查看详细日志
openclaw gateway logs

# 2. 检查配置文件
cat ~/.openclaw/config.json

# 3. 重新初始化
openclaw onboard --force
```

## 下一步

安装完成后，继续学习：
- [快速开始](quickstart.md) - 5 分钟上手指南
- [创建第一个机器人](first-bot.md) - 配置你的第一个聊天机器人

## 参考资源

- [官方安装文档](https://docs.openclaw.ai/start/getting-started)
- [故障排查指南](https://docs.openclaw.ai/debug)
- [社区支持](https://github.com/openclaw/openclaw/discussions)
