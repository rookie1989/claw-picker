# CI/CD 自动化部署

> 为 OpenClaw 搭建完整的持续集成和持续部署流水线，实现代码提交后自动测试、构建镜像、滚动发布，做到真正的零停机自动化运维。

## 📋 目录

- [架构概览](#架构概览)
- [GitHub Actions 流水线](#github-actions-流水线)
- [Docker 镜像构建](#docker-镜像构建)
- [自动化测试](#自动化测试)
- [多环境部署策略](#多环境部署策略)
- [滚动发布与回滚](#滚动发布与回滚)
- [密钥管理](#密钥管理)
- [通知集成](#通知集成)

---

## 架构概览

```
代码提交
    │
    ▼
GitHub Actions 触发
    │
    ├── 代码检查（Lint + TypeCheck）
    ├── 单元测试（Jest）
    ├── 集成测试
    │
    ▼（测试通过）
构建 Docker 镜像 → 推送到 Registry
    │
    ├── develop 分支 → 部署到测试环境（自动）
    └── main 分支   → 部署到生产环境（需审批）
                            │
                            ├── 健康检查
                            ├── 流量切换（蓝绿部署）
                            └── 通知（飞书/企业微信）
```

---

## GitHub Actions 流水线

### 主流水线配置

```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # ==================== 代码检查 ====================
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run typecheck

      - name: Unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

  # ==================== 构建镜像 ====================
  build-image:
    needs: lint-and-test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
      image-digest: ${{ steps.build.outputs.digest }}

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}

      - name: Build and push
        id: build
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # ==================== 部署测试环境 ====================
  deploy-staging:
    needs: build-image
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    environment: staging

    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.STAGING_USER }}
          key: ${{ secrets.STAGING_SSH_KEY }}
          script: |
            cd /opt/openclaw-staging
            export IMAGE_TAG=${{ needs.build-image.outputs.image-tag }}
            docker compose pull
            docker compose up -d --no-deps --scale app=2
            sleep 10
            docker compose ps

  # ==================== 部署生产环境（需审批）====================
  deploy-production:
    needs: build-image
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment:
      name: production
      url: https://your-domain.com

    steps:
      - name: Deploy to production
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USER }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /opt/openclaw
            ./scripts/rolling-deploy.sh ${{ needs.build-image.outputs.image-tag }}

      - name: Health check
        run: |
          for i in {1..12}; do
            HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://your-domain.com/health)
            if [ "$HTTP_STATUS" == "200" ]; then
              echo "✅ 健康检查通过"
              exit 0
            fi
            echo "等待服务就绪... ($i/12)"
            sleep 10
          done
          echo "❌ 健康检查失败"
          exit 1

      - name: Notify deployment
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          channel-id: 'deployments'
          slack-message: |
            ${{ job.status == 'success' && '✅' || '❌' }} 生产部署 ${{ job.status }}
            分支: ${{ github.ref_name }}
            提交: ${{ github.sha }}
            提交者: ${{ github.actor }}
        env:
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
```

---

## Docker 镜像构建

### 多阶段 Dockerfile

```dockerfile
# Dockerfile

# ===== 阶段 1：依赖安装 =====
FROM node:20-alpine AS deps
WORKDIR /app

# 只复制依赖文件，利用层缓存
COPY package*.json ./
RUN npm ci --only=production

# ===== 阶段 2：构建 =====
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci  # 包含 devDependencies

COPY . .
RUN npm run build

# ===== 阶段 3：运行时（最小化镜像）=====
FROM node:20-alpine AS runner
WORKDIR /app

# 安全加固
RUN addgroup -g 1001 -S openclaw && \
    adduser -S openclaw -u 1001 -G openclaw

# 只复制必要文件
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json .

# 运行时配置
ENV NODE_ENV=production
ENV PORT=3000

USER openclaw
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### .dockerignore

```dockerignore
node_modules
.git
.env*
*.md
coverage/
.nyc_output/
logs/
docs/
tests/
```

---

## 自动化测试

### 测试配置

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  testMatch: [
    '**/__tests__/**/*.js',
    '**/*.test.js'
  ]
};
```

```javascript
// tests/integration/channel.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Channel API', () => {
  test('GET /api/channels 返回频道列表', async () => {
    const res = await request(app)
      .get('/api/channels')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .expect(200);

    expect(res.body).toHaveProperty('channels');
    expect(Array.isArray(res.body.channels)).toBe(true);
  });

  test('POST /api/channels 创建新频道', async () => {
    const res = await request(app)
      .post('/api/channels')
      .set('Authorization', `Bearer ${TEST_TOKEN}`)
      .send({ name: 'test-channel', type: 'wechat_mp' })
      .expect(201);

    expect(res.body.channel.name).toBe('test-channel');
  });
});
```

---

## 多环境部署策略

### 环境矩阵

```yaml
# .github/workflows/deploy.yml
strategy:
  matrix:
    environment: [staging, production]
    include:
      - environment: staging
        host_secret: STAGING_HOST
        auto_deploy: true
        approval_required: false
      - environment: production
        host_secret: PROD_HOST
        auto_deploy: false
        approval_required: true
```

### 环境配置文件管理

```bash
# 目录结构
config/
  base.yaml        # 通用配置
  staging.yaml     # 测试环境覆盖
  production.yaml  # 生产环境覆盖
```

```yaml
# config/production.yaml
server:
  workers: 4
  max_connections: 1000

logging:
  level: warn
  format: json

cache:
  ttl: 3600
  max_size: 10000

rate_limit:
  window: 60
  max_requests: 100
```

---

## 滚动发布与回滚

### 滚动部署脚本

```bash
#!/bin/bash
# scripts/rolling-deploy.sh

set -euo pipefail

IMAGE_TAG=$1
COMPOSE_FILE="/opt/openclaw/docker-compose.yml"
HEALTHCHECK_URL="http://localhost:3000/health"
MAX_WAIT=120

echo "🚀 开始滚动部署: $IMAGE_TAG"

# 记录当前版本（用于回滚）
CURRENT_TAG=$(docker compose -f $COMPOSE_FILE images -q app | head -1)
echo "当前版本: $CURRENT_TAG"
echo "$CURRENT_TAG" > /opt/openclaw/.last-good-tag

# 更新镜像标签
sed -i "s|image: .*openclaw.*|image: $IMAGE_TAG|g" $COMPOSE_FILE

# 拉取新镜像
docker compose -f $COMPOSE_FILE pull app

# 滚动更新（先扩容，再缩减）
echo "扩容到 4 个实例..."
docker compose -f $COMPOSE_FILE up -d --scale app=4 --no-recreate

# 等待新实例健康
echo "等待新实例就绪..."
sleep 20

HEALTHY=0
for i in $(seq 1 $((MAX_WAIT/5))); do
  HTTP_STATUS=$(curl -sf -o /dev/null -w "%{http_code}" $HEALTHCHECK_URL || echo "000")
  if [ "$HTTP_STATUS" == "200" ]; then
    HEALTHY=1
    break
  fi
  echo "  健康检查 $i: HTTP $HTTP_STATUS"
  sleep 5
done

if [ $HEALTHY -eq 0 ]; then
  echo "❌ 健康检查失败，开始回滚..."
  bash /opt/openclaw/scripts/rollback.sh
  exit 1
fi

# 缩减回 2 个实例
echo "✅ 新版本健康，缩减到 2 实例..."
docker compose -f $COMPOSE_FILE up -d --scale app=2

echo "✅ 部署完成: $IMAGE_TAG"
```

### 回滚脚本

```bash
#!/bin/bash
# scripts/rollback.sh

set -euo pipefail

LAST_GOOD_TAG=$(cat /opt/openclaw/.last-good-tag 2>/dev/null || echo "")

if [ -z "$LAST_GOOD_TAG" ]; then
  echo "❌ 无法找到上一个稳定版本"
  exit 1
fi

echo "🔄 回滚到: $LAST_GOOD_TAG"

COMPOSE_FILE="/opt/openclaw/docker-compose.yml"
sed -i "s|image: .*openclaw.*|image: $LAST_GOOD_TAG|g" $COMPOSE_FILE

docker compose -f $COMPOSE_FILE up -d --scale app=2

echo "✅ 回滚完成"

# 发送告警通知
curl -X POST "${ALERT_WEBHOOK}" \
  -H 'Content-Type: application/json' \
  -d "{\"text\": \"⚠️ OpenClaw 已自动回滚到 ${LAST_GOOD_TAG}，请检查部署日志\"}"
```

---

## 密钥管理

### GitHub Secrets 配置清单

```markdown
## Repository Secrets（仓库级别）
- CODECOV_TOKEN：代码覆盖率上传

## Environment Secrets（环境级别）

### staging 环境
- STAGING_HOST：测试服务器 IP
- STAGING_USER：SSH 用户名
- STAGING_SSH_KEY：SSH 私钥

### production 环境
- PROD_HOST：生产服务器 IP
- PROD_USER：SSH 用户名
- PROD_SSH_KEY：SSH 私钥（独立密钥，不与 staging 共用）
- ALERT_WEBHOOK：部署通知 Webhook
```

### 使用 GitHub OIDC（推荐，无需保存密钥）

```yaml
# 使用 OIDC 而不是 SSH Key 部署到云服务
- name: Configure AWS credentials
  uses: aws-actions/configure-aws-credentials@v4
  with:
    role-to-assume: arn:aws:iam::123456789:role/github-actions-role
    aws-region: cn-north-1
```

---

## 通知集成

### 飞书部署通知

```yaml
# .github/workflows/notify.yml（复用 step）
- name: 飞书通知
  if: always()
  run: |
    STATUS="${{ job.status }}"
    ICON=$([ "$STATUS" == "success" ] && echo "✅" || echo "❌")
    
    curl -X POST "${{ secrets.FEISHU_WEBHOOK }}" \
      -H 'Content-Type: application/json' \
      -d '{
        "msg_type": "interactive",
        "card": {
          "header": {
            "title": { "tag": "plain_text", "content": "'"$ICON"' 部署通知" },
            "template": "'"$([ "$STATUS" == "success" ] && echo "green" || echo "red")"'"
          },
          "elements": [{
            "tag": "div",
            "text": {
              "tag": "lark_md",
              "content": "**环境**: 生产\n**分支**: ${{ github.ref_name }}\n**提交**: ${{ github.sha }}\n**操作者**: ${{ github.actor }}\n**状态**: '"$STATUS"'"
            }
          }]
        }
      }'
```

---

## 相关文档

- [高可用部署](./ha-deployment.md)
- [监控与告警](../guides/监控与告警系统搭建.md)
- [OAuth 鉴权集成](./oauth-integration.md)
