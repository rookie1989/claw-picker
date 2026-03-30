# 🏗️ API 网关高可用部署指南

**难度**: ⭐⭐⭐⭐⭐  
**预计时间**: 2-4 小时  
**前置知识**: Linux 运维、Docker、Nginx、基本网络知识

---

## 🎯 本文目标

- ✅ 理解 OpenClaw 高可用架构设计
- ✅ 配置 Nginx 反向代理与负载均衡
- ✅ 使用 Docker Compose 编排多节点部署
- ✅ 配置健康检查与自动故障转移
- ✅ 实现零停机滚动更新
- ✅ 配置 SSL/TLS 证书自动续期

---

## 🏛️ 架构概览

```
                    ┌─────────────────────────────┐
                    │         负载均衡层            │
                    │   Nginx / Traefik / Caddy    │
                    │      (SSL 终止 + 路由)        │
                    └──────────┬──────────────────┘
                               │
              ┌────────────────┼─────────────────┐
              │                │                 │
              ↓                ↓                 ↓
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │  OpenClaw    │  │  OpenClaw    │  │  OpenClaw    │
    │  Node 1      │  │  Node 2      │  │  Node 3      │
    │  :3001       │  │  :3002       │  │  :3003       │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
                   ┌─────────┴─────────┐
                   │   共享存储层        │
                   │  Redis (会话)      │
                   │  PostgreSQL (数据) │
                   └───────────────────┘
```

---

## 📦 方案一：Docker Compose 多节点

### 1. 目录结构

```bash
mkdir -p /opt/openclaw/{config,data,logs,nginx,certs}
cd /opt/openclaw
```

```
/opt/openclaw/
├── docker-compose.yml
├── docker-compose.prod.yml
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
│       └── openclaw.conf
├── config/
│   ├── openclaw.base.json
│   ├── openclaw.node1.json
│   └── openclaw.node2.json
├── certs/           # SSL 证书
└── data/
    ├── redis/
    └── postgres/
```

### 2. docker-compose.yml

```yaml
version: '3.8'

services:
  # Redis（会话共享）
  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - ./data/redis:/data
    command: redis-server --appendonly yes --requirepass "${REDIS_PASSWORD}"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - openclaw-net

  # PostgreSQL（持久化存储）
  postgres:
    image: postgres:15-alpine
    restart: always
    environment:
      POSTGRES_DB: openclaw
      POSTGRES_USER: openclaw
      POSTGRES_PASSWORD: "${POSTGRES_PASSWORD}"
    volumes:
      - ./data/postgres:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U openclaw"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - openclaw-net

  # OpenClaw Node 1
  openclaw-1:
    image: openclaw/openclaw:latest
    restart: always
    environment:
      - NODE_ID=node-1
      - REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
      - DATABASE_URL=postgresql://openclaw:${POSTGRES_PASSWORD}@postgres/openclaw
      - OPENCLAW_CONFIG=/config/openclaw.json
      - PORT=3000
    volumes:
      - ./config/openclaw.base.json:/config/openclaw.json:ro
      - ./logs/node1:/app/logs
    depends_on:
      redis:
        condition: service_healthy
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    networks:
      - openclaw-net
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.openclaw.rule=Host(`your-domain.com`)"

  # OpenClaw Node 2（同配置）
  openclaw-2:
    extends:
      service: openclaw-1
    environment:
      - NODE_ID=node-2
    volumes:
      - ./logs/node2:/app/logs

  # OpenClaw Node 3（同配置）
  openclaw-3:
    extends:
      service: openclaw-1
    environment:
      - NODE_ID=node-3
    volumes:
      - ./logs/node3:/app/logs

  # Nginx 负载均衡
  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - openclaw-1
      - openclaw-2
      - openclaw-3
    networks:
      - openclaw-net

networks:
  openclaw-net:
    driver: bridge
```

### 3. Nginx 负载均衡配置

```nginx
# /opt/openclaw/nginx/conf.d/openclaw.conf

upstream openclaw_backend {
    # 负载均衡算法：least_conn（最少连接，推荐）
    least_conn;
    
    # 后端节点
    server openclaw-1:3000 weight=1 max_fails=3 fail_timeout=30s;
    server openclaw-2:3000 weight=1 max_fails=3 fail_timeout=30s;
    server openclaw-3:3000 weight=1 max_fails=3 fail_timeout=30s;
    
    # 连接保持（对长连接/WebSocket 重要）
    keepalive 32;
}

server {
    listen 80;
    server_name your-domain.com;
    
    # 强制跳转 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书
    ssl_certificate     /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;
    
    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    
    # HSTS（仅在确认配置无误后启用）
    # add_header Strict-Transport-Security "max-age=63072000" always;
    
    # 普通 HTTP 请求
    location / {
        proxy_pass http://openclaw_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置（AI 请求可能较慢）
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
        proxy_send_timeout 30s;
    }
    
    # WebSocket 支持（Stream 模式需要）
    location /ws {
        proxy_pass http://openclaw_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;  # WebSocket 连接保持 1 小时
    }
    
    # 健康检查端点（不记录日志）
    location /health {
        proxy_pass http://openclaw_backend;
        access_log off;
    }
}
```

---

## 🔄 零停机滚动更新

### 更新脚本

```bash
#!/bin/bash
# /opt/openclaw/scripts/rolling-update.sh

set -e

NODES=("openclaw-1" "openclaw-2" "openclaw-3")
WAIT_TIME=30  # 等待新节点就绪的时间（秒）

echo "🚀 开始滚动更新..."

# 拉取最新镜像
docker-compose pull openclaw-1

for NODE in "${NODES[@]}"; do
    echo ""
    echo "📦 更新节点: $NODE"
    
    # 1. 停止旧节点
    docker-compose stop "$NODE"
    
    # 2. 启动新节点
    docker-compose up -d "$NODE"
    
    # 3. 等待健康检查通过
    echo "⏳ 等待 $NODE 就绪..."
    for i in $(seq 1 $WAIT_TIME); do
        if docker-compose exec -T "$NODE" curl -sf http://localhost:3000/health > /dev/null 2>&1; then
            echo "✅ $NODE 已就绪（${i}s）"
            break
        fi
        sleep 1
        if [ $i -eq $WAIT_TIME ]; then
            echo "❌ $NODE 启动超时，回滚..."
            docker-compose stop "$NODE"
            # 回滚逻辑...
            exit 1
        fi
    done
    
    echo "✅ $NODE 更新完成"
    
    # 4. 等待一段时间再更新下一个节点
    if [ "$NODE" != "${NODES[-1]}" ]; then
        echo "⏳ 等待 10s 后更新下一个节点..."
        sleep 10
    fi
done

echo ""
echo "🎉 滚动更新完成！所有节点已更新。"

# 显示当前状态
docker-compose ps
```

```bash
# 赋予执行权限并运行
chmod +x /opt/openclaw/scripts/rolling-update.sh
./scripts/rolling-update.sh
```

---

## 📊 健康检查与监控

### 健康检查端点

OpenClaw 提供内置健康检查端点：

```bash
# 基础健康检查
curl https://your-domain.com/health

# 详细状态（需要管理员 token）
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://your-domain.com/health/detail
```

响应示例：
```json
{
  "status": "healthy",
  "node": "node-1",
  "uptime": 3600,
  "channels": {
    "wecom": "connected",
    "slack": "connected",
    "telegram": "connected"
  },
  "queue": {
    "pending": 0,
    "processing": 2
  },
  "memory": {
    "used": "256MB",
    "total": "1GB"
  }
}
```

### Prometheus 监控配置

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'openclaw'
    static_configs:
      - targets:
          - 'openclaw-1:3000'
          - 'openclaw-2:3000'
          - 'openclaw-3:3000'
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana 告警规则

```yaml
# grafana-alerts.yml
groups:
  - name: openclaw
    rules:
      - alert: OpenClawNodeDown
        expr: up{job="openclaw"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "OpenClaw 节点 {{ $labels.instance }} 下线"
          
      - alert: OpenClawHighLatency
        expr: openclaw_request_duration_seconds{quantile="0.99"} > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "AI 响应延迟过高"
```

---

## 🔒 SSL 证书自动续期

### 使用 Certbot（Let's Encrypt）

```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx -y

# 申请证书（停止 Nginx）
certbot certonly --standalone -d your-domain.com

# 或使用 Nginx 插件（不停服）
certbot --nginx -d your-domain.com

# 自动续期（证书 60 天过期，30 天前自动续期）
crontab -e
# 添加：
0 3 * * * certbot renew --quiet && nginx -s reload
```

### 使用 Caddy（推荐，自动 HTTPS）

```
# Caddyfile
your-domain.com {
    reverse_proxy openclaw-1:3000 openclaw-2:3000 openclaw-3:3000 {
        lb_policy least_conn
        health_uri /health
        health_interval 30s
    }
    
    # 自动 HTTPS，无需手动配置证书！
}
```

```bash
# 启动 Caddy
docker run -d \
  -p 80:80 -p 443:443 \
  -v ./Caddyfile:/etc/caddy/Caddyfile \
  -v caddy_data:/data \
  caddy:latest
```

---

## 🚨 故障排查

### 快速诊断命令

```bash
# 查看所有节点状态
docker-compose ps

# 实时查看日志
docker-compose logs -f --tail=100 openclaw-1

# 检查节点健康状态
for i in 1 2 3; do
  echo "Node $i: $(curl -sf http://localhost:300$i/health | jq .status)"
done

# 检查 Nginx 负载均衡状态
nginx -t && nginx -s reload

# 查看请求分发情况
tail -f /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c
```

### 常见故障及处理

| 故障现象 | 可能原因 | 处理方法 |
|----------|----------|----------|
| 部分请求 502 | 某个节点崩溃 | `docker-compose restart openclaw-N` |
| 响应延迟高 | AI API 限速 | 检查 AI 服务配额 |
| WebSocket 断开 | 超时配置不当 | 调大 `proxy_read_timeout` |
| 消息重复处理 | Redis 会话问题 | 检查 Redis 连接和 key 过期策略 |
| 内存持续增长 | 内存泄漏 | 设置 `--max-old-space-size` |

---

## 📈 性能调优

```json
// openclaw.base.json 性能相关配置
{
  "performance": {
    "worker_threads": 4,
    "request_queue_size": 100,
    "ai_request_timeout": 60000,
    "ai_max_retries": 3,
    "redis_connection_pool": 10,
    "rate_limit": {
      "enabled": true,
      "max_requests_per_minute": 60,
      "per": "user"
    }
  },
  "cache": {
    "enabled": true,
    "ttl": 300,
    "max_size": 1000
  }
}
```

---

## 📚 相关文档

- [远程部署指南](./远程部署指南.md) - 基础部署入门
- [性能优化进阶](../FAQ/08-性能优化进阶.md) - 性能调优
- [安全加固](../FAQ/07-安全加固.md) - 安全配置
- [监控与告警系统搭建](./监控与告警系统搭建.md) - 配套监控方案

---

**🏗️ 高可用部署完成！你的 OpenClaw 现在可以 7x24 小时稳定运行了！** 🦞
