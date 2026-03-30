# Kubernetes 生产部署方案 — HPA + Rolling Update + 全站高可用

> **难度**：⭐⭐⭐⭐  
> **前置**：Docker 基础、OpenClaw 远程部署  
> **目标**：将 OpenClaw 以云原生方式部署到 Kubernetes，实现自动扩缩容、零宕机升级、多区域容灾

---

## 目录

1. [为什么选 Kubernetes](#1-为什么选-kubernetes)
2. [集群规划与准备](#2-集群规划与准备)
3. [容器镜像构建](#3-容器镜像构建)
4. [核心 K8s 资源配置](#4-核心-k8s-资源配置)
5. [HPA 水平自动扩缩容](#5-hpa-水平自动扩缩容)
6. [Rolling Update 零宕机升级](#6-rolling-update-零宕机升级)
7. [Ingress 与 TLS 配置](#7-ingress-与-tls-配置)
8. [持久化存储（Redis & DB）](#8-持久化存储redis--db)
9. [监控与告警集成](#9-监控与告警集成)
10. [多区域高可用架构](#10-多区域高可用架构)
11. [常用运维命令速查](#11-常用运维命令速查)

---

## 1. 为什么选 Kubernetes

| 能力 | Docker Compose | Kubernetes |
|------|---------------|------------|
| 自动重启 | ✅ | ✅ |
| 水平扩缩容 | 手动 | **自动（HPA）** |
| 零宕机升级 | ❌ | **✅ Rolling Update** |
| 健康检查 | 基础 | **深度（Readiness + Liveness）** |
| 多节点高可用 | ❌ | **✅** |
| 资源配额管理 | ❌ | **✅ Namespace + ResourceQuota** |
| 密钥管理 | 明文 .env | **Secret 加密** |
| 服务发现 | 手动 | **自动 DNS** |

**结论**：生产环境流量大、需要高可用，选 K8s；个人项目/内部工具，Docker Compose 够用。

---

## 2. 集群规划与准备

### 2.1 推荐节点规格（腾讯云 TKE / 阿里云 ACK）

| 角色 | 数量 | 配置 | 用途 |
|------|------|------|------|
| 控制平面 | 3（托管） | 托管免运维 | API Server / etcd |
| 应用节点 | 3～6 | 4c8g | OpenClaw Pod |
| 监控节点 | 1 | 4c16g | Prometheus + Grafana |

### 2.2 本地开发集群（minikube）

```bash
# 安装 minikube
brew install minikube
minikube start --cpus 4 --memory 8192 --driver docker

# 安装 kubectl
brew install kubectl

# 验证
kubectl cluster-info
kubectl get nodes
```

### 2.3 Namespace 规划

```bash
# 创建命名空间
kubectl create namespace openclaw-prod
kubectl create namespace openclaw-staging
kubectl create namespace monitoring

# 设置默认 namespace
kubectl config set-context --current --namespace=openclaw-prod
```

---

## 3. 容器镜像构建

### 3.1 Dockerfile（多阶段构建）

```dockerfile
# Dockerfile
# ─── Stage 1: Builder ────────────────────────────────────
FROM node:18-alpine AS builder

WORKDIR /app

# 只复制依赖文件，利用 Docker 层缓存
COPY package*.json ./
RUN npm ci --only=production

# ─── Stage 2: Runtime ────────────────────────────────────
FROM node:18-alpine AS runtime

# 安全：不用 root 用户运行
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S -u 1001 -G nodejs nodeuser

WORKDIR /app

# 从 builder 复制依赖
COPY --from=builder --chown=nodeuser:nodejs /app/node_modules ./node_modules

# 复制应用代码
COPY --chown=nodeuser:nodejs . .

USER nodeuser

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "src/index.js"]
```

### 3.2 构建并推送镜像

```bash
# 构建
docker build -t your-registry.io/openclaw/gateway:v1.2.0 .
docker build -t your-registry.io/openclaw/gateway:latest .

# 推送
docker push your-registry.io/openclaw/gateway:v1.2.0
docker push your-registry.io/openclaw/gateway:latest

# 验证镜像大小（应 < 200MB）
docker image inspect your-registry.io/openclaw/gateway:v1.2.0 --format='{{.Size}}' | \
  awk '{printf "%.1f MB\n", $1/1024/1024}'
```

---

## 4. 核心 K8s 资源配置

### 4.1 ConfigMap（非敏感配置）

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: openclaw-config
  namespace: openclaw-prod
data:
  NODE_ENV: "production"
  PORT: "3000"
  REDIS_URL: "redis://redis-service:6379"
  LOG_LEVEL: "info"
  MAX_TOKENS: "4096"
  RATE_LIMIT_WINDOW: "60"
```

### 4.2 Secret（敏感凭证）

```bash
# 创建 Secret（base64 编码自动处理）
kubectl create secret generic openclaw-secrets \
  --from-literal=OPENCLAW_API_KEY="your_api_key_here" \
  --from-literal=OPENCLAW_ENDPOINT="https://api.openclaw.ai/v1" \
  --from-literal=REDIS_PASSWORD="your_redis_password" \
  --from-literal=JWT_SECRET="your_jwt_secret_min_32_chars" \
  --from-literal=ADMIN_SECRET="your_admin_secret" \
  --namespace=openclaw-prod
```

### 4.3 Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openclaw-gateway
  namespace: openclaw-prod
  labels:
    app: openclaw-gateway
    version: v1.2.0
spec:
  replicas: 3
  selector:
    matchLabels:
      app: openclaw-gateway
  
  # Rolling Update 策略
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1    # 最多 1 个 Pod 不可用
      maxSurge: 1          # 最多额外启动 1 个 Pod
  
  template:
    metadata:
      labels:
        app: openclaw-gateway
        version: v1.2.0
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3000"
        prometheus.io/path: "/metrics"
    
    spec:
      # 调度：不同节点分散部署
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: openclaw-gateway
      
      terminationGracePeriodSeconds: 30
      
      containers:
        - name: openclaw-gateway
          image: your-registry.io/openclaw/gateway:v1.2.0
          imagePullPolicy: Always
          
          ports:
            - containerPort: 3000
              protocol: TCP
          
          # 环境变量：从 ConfigMap 和 Secret 注入
          envFrom:
            - configMapRef:
                name: openclaw-config
            - secretRef:
                name: openclaw-secrets
          
          # 资源配额
          resources:
            requests:
              cpu: "250m"      # 0.25 核
              memory: "256Mi"
            limits:
              cpu: "1000m"     # 1 核
              memory: "512Mi"
          
          # 就绪探针：Pod 加入 Service 的条件
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
            failureThreshold: 3
          
          # 存活探针：触发重启的条件
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 30
            failureThreshold: 3
          
          # 启动探针：给慢启动应用更多时间
          startupProbe:
            httpGet:
              path: /health
              port: 3000
            failureThreshold: 10
            periodSeconds: 5
```

### 4.4 Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: openclaw-service
  namespace: openclaw-prod
spec:
  selector:
    app: openclaw-gateway
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 3000
  type: ClusterIP  # 内部访问，通过 Ingress 暴露外部
```

---

## 5. HPA 水平自动扩缩容

### 5.1 安装 Metrics Server（minikube 已内置）

```bash
# 云环境需手动安装
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# 验证
kubectl top nodes
kubectl top pods
```

### 5.2 HPA 配置（CPU + 自定义指标）

```yaml
# k8s/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: openclaw-hpa
  namespace: openclaw-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: openclaw-gateway
  
  minReplicas: 2    # 最少保持 2 个副本（高可用）
  maxReplicas: 20   # 最多扩到 20 个
  
  metrics:
    # 1. CPU 使用率（基础指标）
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70   # CPU > 70% 触发扩容
    
    # 2. 内存使用率
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
    
    # 3. 自定义指标：QPS（需要 Prometheus Adapter）
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"   # 每个 Pod 平均 100 QPS 时扩容
  
  behavior:
    # 扩容策略：激进（快速响应流量突增）
    scaleUp:
      stabilizationWindowSeconds: 60    # 60s 观察窗口
      policies:
        - type: Pods
          value: 3          # 每次最多加 3 个 Pod
          periodSeconds: 60
        - type: Percent
          value: 100        # 或直接翻倍
          periodSeconds: 60
      selectPolicy: Max     # 取最大值
    
    # 缩容策略：保守（防止频繁伸缩）
    scaleDown:
      stabilizationWindowSeconds: 300   # 5 分钟观察窗口，防抖
      policies:
        - type: Pods
          value: 1          # 每次最多减 1 个 Pod
          periodSeconds: 120
```

### 5.3 验证 HPA

```bash
# 查看 HPA 状态
kubectl get hpa openclaw-hpa -w

# 模拟压力测试，观察扩容
kubectl run stress-test --image=busybox --rm -it -- sh
# 在容器内：
# while true; do wget -qO- http://openclaw-service/health; done

# 预期输出：
# NAME            REFERENCE                         TARGETS         MINPODS  MAXPODS  REPLICAS
# openclaw-hpa    Deployment/openclaw-gateway        75%/70%         2        20       4
```

---

## 6. Rolling Update 零宕机升级

### 6.1 升级流程

```bash
# 方式一：直接更新镜像（推荐）
kubectl set image deployment/openclaw-gateway \
  openclaw-gateway=your-registry.io/openclaw/gateway:v1.3.0 \
  --namespace=openclaw-prod

# 方式二：修改 YAML 后 apply
kubectl apply -f k8s/deployment.yaml

# 实时监控滚动更新进度
kubectl rollout status deployment/openclaw-gateway --watch
```

### 6.2 金丝雀发布（Canary Release）

```yaml
# k8s/deployment-canary.yaml
# 先把 5% 的流量打到新版本
apiVersion: apps/v1
kind: Deployment
metadata:
  name: openclaw-gateway-canary
  namespace: openclaw-prod
spec:
  replicas: 1   # 总共 20 个 Pod，1 个走新版 = 5%
  selector:
    matchLabels:
      app: openclaw-gateway    # 与主 Deployment 共享 Service
      track: canary
  template:
    metadata:
      labels:
        app: openclaw-gateway
        track: canary
    spec:
      containers:
        - name: openclaw-gateway
          image: your-registry.io/openclaw/gateway:v1.3.0-rc1
          # ... 其他配置同主 Deployment
```

```bash
# 应用金丝雀
kubectl apply -f k8s/deployment-canary.yaml

# 观察金丝雀指标（10分钟）
kubectl logs -l track=canary --tail=100 -f

# 指标正常：全量升级
kubectl set image deployment/openclaw-gateway \
  openclaw-gateway=your-registry.io/openclaw/gateway:v1.3.0-rc1

# 出问题：立即回滚
kubectl delete deployment openclaw-gateway-canary
```

### 6.3 回滚

```bash
# 查看版本历史（默认保留 10 个）
kubectl rollout history deployment/openclaw-gateway

# 回滚到上一版本
kubectl rollout undo deployment/openclaw-gateway

# 回滚到指定版本
kubectl rollout undo deployment/openclaw-gateway --to-revision=3

# 验证回滚完成
kubectl rollout status deployment/openclaw-gateway
```

---

## 7. Ingress 与 TLS 配置

### 7.1 安装 Ingress Controller（Nginx）

```bash
# 腾讯云 TKE 可通过控制台一键安装
# 自建集群：
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

### 7.2 Ingress 资源

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: openclaw-ingress
  namespace: openclaw-prod
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
    nginx.ingress.kubernetes.io/rate-limit: "100"    # 每秒 100 请求
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.your-domain.com
      secretName: openclaw-tls
  rules:
    - host: api.your-domain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: openclaw-service
                port:
                  number: 80
```

### 7.3 自动 TLS（Let's Encrypt）

```bash
# 安装 cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# 创建 ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your@email.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

---

## 8. 持久化存储（Redis & DB）

### 8.1 Redis StatefulSet

```yaml
# k8s/redis.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis
  namespace: openclaw-prod
spec:
  serviceName: redis-headless
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
        - name: redis
          image: redis:7-alpine
          command:
            - redis-server
            - --save 60 1
            - --loglevel warning
            - --requirepass $(REDIS_PASSWORD)
          env:
            - name: REDIS_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: openclaw-secrets
                  key: REDIS_PASSWORD
          resources:
            requests:
              cpu: "100m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          volumeMounts:
            - name: redis-data
              mountPath: /data
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi
        storageClassName: ssd  # 使用 SSD 存储类
---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: openclaw-prod
spec:
  selector:
    app: redis
  ports:
    - port: 6379
      targetPort: 6379
  type: ClusterIP
```

---

## 9. 监控与告警集成

### 9.1 Prometheus + Grafana（Helm 快速安装）

```bash
# 安装 kube-prometheus-stack
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install monitoring prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace \
  --set grafana.adminPassword=your_secure_password \
  --set prometheus.prometheusSpec.retention=15d

# 访问 Grafana
kubectl port-forward -n monitoring svc/monitoring-grafana 3000:80
# 打开 http://localhost:3000，账号 admin / your_secure_password
```

### 9.2 应用暴露 Prometheus 指标

```javascript
// src/metrics.js（在应用中集成）
const client = require('prom-client');

// 注册默认指标（CPU、内存、GC 等）
client.collectDefaultMetrics({ prefix: 'openclaw_' });

// 自定义指标
const httpRequestDuration = new client.Histogram({
  name: 'openclaw_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

const activeConnections = new client.Gauge({
  name: 'openclaw_active_connections',
  help: 'Number of active WebSocket connections',
});

const llmCallsTotal = new client.Counter({
  name: 'openclaw_llm_calls_total',
  help: 'Total LLM API calls',
  labelNames: ['model', 'status'],
});

// Metrics 端点
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

module.exports = { httpRequestDuration, activeConnections, llmCallsTotal };
```

---

## 10. 多区域高可用架构

### 10.1 架构图

```
                        全局负载均衡（DNS / CDN）
                               │
               ┌───────────────┴────────────────┐
               │                                │
        ┌──────▼──────┐                  ┌──────▼──────┐
        │  华东 1 区   │                  │  华南 1 区   │
        │  K8s Cluster│                  │  K8s Cluster│
        │  3 节点      │                  │  3 节点      │
        └──────┬──────┘                  └──────┬──────┘
               │                                │
        ┌──────▼──────┐                  ┌──────▼──────┐
        │  Redis（主） │◄────────────────►│  Redis（从） │
        └─────────────┘  Replication     └─────────────┘
               │                                │
        ┌──────▼──────────────────────────▼──────┐
        │           MySQL（主从同步）              │
        └─────────────────────────────────────────┘
```

### 10.2 跨区域流量切换（健康检查 + 故障转移）

```yaml
# 腾讯云 CLB 健康检查配置（示意）
healthCheck:
  enabled: true
  protocol: HTTP
  path: /health
  interval: 5s
  timeout: 3s
  healthyThreshold: 2
  unhealthyThreshold: 3

# 故障转移：华东 1 区不健康时，100% 流量切到华南 1 区
failover:
  enabled: true
  primaryRegion: ap-shanghai
  backupRegion: ap-guangzhou
```

---

## 11. 常用运维命令速查

```bash
# ─── Pod 管理 ─────────────────────────────────────────
kubectl get pods -n openclaw-prod -o wide          # 查看 Pod 列表
kubectl describe pod <pod-name>                    # Pod 详情
kubectl logs <pod-name> --tail=100 -f              # 实时日志
kubectl exec -it <pod-name> -- sh                  # 进入容器

# ─── Deployment 管理 ──────────────────────────────────
kubectl get deployment openclaw-gateway            # 查看 Deployment
kubectl scale deployment openclaw-gateway --replicas=5  # 手动扩缩容
kubectl rollout restart deployment/openclaw-gateway    # 滚动重启

# ─── 资源使用 ─────────────────────────────────────────
kubectl top pods -n openclaw-prod                  # Pod CPU/内存
kubectl top nodes                                  # 节点资源

# ─── 故障排查 ─────────────────────────────────────────
kubectl get events -n openclaw-prod --sort-by='.lastTimestamp'  # 事件日志
kubectl describe hpa openclaw-hpa                  # HPA 状态
kubectl get endpoints openclaw-service             # 服务端点

# ─── 快速清理（测试环境）─────────────────────────────
kubectl delete namespace openclaw-staging          # 删除整个 namespace
```

---

> 📖 **相关文档**：
> - [高可用部署指南](../guides/远程部署指南.md)
> - [监控与告警系统](../guides/监控与告警系统搭建.md)
> - [性能调优专题](performance-tuning.md)
>
> 💻 **完整配置文件**：`examples/kubernetes/`
