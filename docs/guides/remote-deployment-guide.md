# 🌍 远程部署指南 - 云服务器/Docker

将 OpenClaw 部署到云服务器，实现 24/7 在线和远程访问。

## 🎯 部署方案对比

| 方案 | 难度 | 成本 | 适用场景 |
|------|------|------|----------|
| 本地部署 | ⭐ | 免费 | 个人测试 |
| 云服务器 | ⭐⭐ | ¥50-200/月 | 生产环境 |
| Docker 部署 | ⭐⭐⭐ | ¥50-200/月 | 多服务管理 |
| Kubernetes | ⭐⭐⭐⭐ | ¥200+/月 | 大规模部署 |

## 🚀 方案一：云服务器部署（推荐）

### 1.1 选择云服务商

**国内推荐**：
- 阿里云 ECS
- 腾讯云 CVM
- 华为云 ECS

**海外推荐**：
- AWS EC2
- DigitalOcean Droplet
- Vultr VPS

### 1.2 服务器配置建议

| 用途 | CPU | 内存 | 硬盘 | 带宽 |
|------|-----|------|------|------|
| 个人使用 | 2 核 | 2GB | 40GB | 3Mbps |
| 小团队 | 4 核 | 4GB | 80GB | 5Mbps |
| 企业使用 | 8 核 | 8GB | 160GB | 10Mbps |

### 1.3 系统要求

- **操作系统**：Ubuntu 20.04+ / CentOS 7+ / Debian 10+
- **Node.js**：18+ 
- **内存**：最低 2GB，推荐 4GB+
- **存储**：最低 20GB 可用空间

### 1.4 安装步骤

**SSH 连接服务器**：
```bash
ssh root@your-server-ip
```

**更新系统**：
```bash
apt update && apt upgrade -y
```

**安装 Node.js**：
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
```

**验证安装**：
```bash
node --version
npm --version
```

**安装 OpenClaw**：
```bash
npm install -g openclaw
```

**初始化配置**：
```bash
openclaw onboard
```

**配置防火墙**：
```bash
# Ubuntu
ufw allow 3000/tcp
ufw enable

# CentOS
firewall-cmd --permanent --add-port=3000/tcp
firewall-cmd --reload
```

**启动服务**：
```bash
openclaw gateway start
```

**设置开机自启**：
```bash
# 创建 systemd 服务
cat > /etc/systemd/system/openclaw.service <<EOF
[Unit]
Description=OpenClaw Gateway
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/openclaw gateway start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# 启用服务
systemctl daemon-reload
systemctl enable openclaw
systemctl start openclaw
```

**验证服务**：
```bash
systemctl status openclaw
curl http://localhost:3000
```

## 🐳 方案二：Docker 部署

### 2.1 安装 Docker

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | bash

# 启动 Docker
systemctl start docker
systemctl enable docker

# 验证安装
docker --version
docker-compose --version
```

### 2.2 创建 Docker 配置

**docker-compose.yml**：
```yaml
version: '3.8'

services:
  openclaw:
    image: openclaw/gateway:latest
    container_name: openclaw
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - ./config:/root/.openclaw
      - ./logs:/root/.openclaw/logs
      - ./data:/root/.openclaw/data
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
    networks:
      - openclaw-net

networks:
  openclaw-net:
    driver: bridge
```

### 2.3 启动服务

```bash
# 创建目录
mkdir -p config logs data

# 启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 2.4 管理容器

```bash
# 查看状态
docker ps

# 重启容器
docker-compose restart

# 进入容器
docker exec -it openclaw bash

# 更新镜像
docker-compose pull
docker-compose up -d
```

## 🔐 安全加固

### 配置 HTTPS

**使用 Nginx 反向代理**：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**申请 SSL 证书**：
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d your-domain.com
```

### 配置防火墙

```bash
# 只开放必要端口
ufw allow 22/tcp    # SSH
ufw allow 443/tcp   # HTTPS
ufw deny 3000/tcp   # 内部访问

# 启用防火墙
ufw enable
```

### 配置 Fail2Ban

```bash
apt install fail2ban -y

cat > /etc/fail2ban/jail.local <<EOF
[sshd]
enabled = true
bantime = 3600
maxretry = 5
EOF

systemctl restart fail2ban
```

## 📊 监控与日志

### 系统监控

```bash
# 安装监控工具
apt install htop iotop nethogs -y

# 查看资源使用
htop

# 查看网络流量
nethogs
```

### 日志管理

```bash
# 查看 OpenClaw 日志
journalctl -u openclaw -f

# 日志轮转
cat > /etc/logrotate.d/openclaw <<EOF
/root/.openclaw/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    notifempty
    create 0640 root root
}
EOF
```

### 告警配置

```json
{
  "monitoring": {
    "enabled": true,
    "alerts": {
      "cpu_threshold": 80,
      "memory_threshold": 80,
      "disk_threshold": 90
    },
    "notify": {
      "channel": "feishu",
      "chat_id": "oc_xxx"
    }
  }
}
```

## 🔄 备份与恢复

### 数据备份

```bash
# 创建备份脚本
cat > /usr/local/bin/openclaw-backup <<EOF
#!/bin/bash
BACKUP_DIR="/backup/openclaw"
DATE=\$(date +%Y%m%d_%H%M%S)

mkdir -p \$BACKUP_DIR
tar -czf \$BACKUP_DIR/config_\$DATE.tar.gz /root/.openclaw/config
tar -czf \$BACKUP_DIR/data_\$DATE.tar.gz /root/.openclaw/data

# 保留最近 7 天备份
find \$BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/openclaw-backup
```

### 定时备份

```bash
# 添加 cron 任务
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /usr/local/bin/openclaw-backup
```

### 数据恢复

```bash
# 停止服务
systemctl stop openclaw

# 恢复数据
tar -xzf config_20260328.tar.gz -C /

# 启动服务
systemctl start openclaw
```

## 🐛 常见问题

### Q: 服务无法启动？

**A:** 
```bash
# 查看日志
journalctl -u openclaw -n 50

# 检查端口占用
lsof -i :3000

# 检查配置
openclaw config validate
```

### Q: 远程无法访问？

**A:** 
```bash
# 检查防火墙
ufw status

# 检查安全组（云服务器）
# 阿里云：控制台 → 安全组 → 添加规则
# 腾讯云：控制台 → 安全组 → 放行端口
```

### Q: 内存不足？

**A:** 
```bash
# 添加 swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Q: 如何升级 OpenClaw？

**A:** 
```bash
# 备份配置
openclaw-backup

# 更新
npm update -g openclaw

# 重启
systemctl restart openclaw
```

## 📚 相关资源

- [OpenClaw 官方文档](https://docs.openclaw.ai)
- [Docker 文档](https://docs.docker.com/)
- [Nginx 配置指南](https://nginx.org/en/docs/)

## 💡 下一步

- [ ] 配置 HTTPS
- [ ] 设置监控告警
- [ ] 配置自动备份
- [ ] 优化性能参数

---

_最后更新：2026-03-28_
