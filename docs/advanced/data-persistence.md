# 数据持久化与备份策略

> 为 OpenClaw 的对话历史、配置数据和用户信息建立完整的备份与恢复机制，确保数据安全和业务连续性。

## 📋 目录

- [数据分类与存储方案](#数据分类与存储方案)
- [SQLite 本地部署备份](#sqlite-本地部署备份)
- [PostgreSQL 生产环境备份](#postgresql-生产环境备份)
- [自动备份脚本](#自动备份脚本)
- [云存储同步](#云存储同步)
- [数据恢复流程](#数据恢复流程)
- [备份监控与告警](#备份监控与告警)
- [数据迁移](#数据迁移)

---

## 数据分类与存储方案

### OpenClaw 数据类型

| 数据类型 | 存储位置 | 重要性 | 备份频率 |
|---------|---------|-------|---------|
| 对话历史 | 数据库 | ⭐⭐⭐⭐ | 每日 |
| 用户配置 | 数据库 + 配置文件 | ⭐⭐⭐⭐⭐ | 每次变更 |
| AI 配置 | YAML 文件 | ⭐⭐⭐⭐⭐ | Git 托管 |
| 插件数据 | 数据库 | ⭐⭐⭐ | 每日 |
| 日志文件 | 文件系统 | ⭐⭐ | 每周归档 |
| 上传文件/媒体 | 对象存储 | ⭐⭐⭐ | 实时同步 |

### 推荐存储架构

```
本地（主）                云端（备）
┌─────────────┐          ┌─────────────────┐
│ PostgreSQL  │ ──同步──> │ 腾讯云 COS/OSS  │
│ /data/      │          │ (加密存储)       │
└─────────────┘          └─────────────────┘
       │
       ├── 每日全量备份
       ├── 每小时增量备份（WAL）
       └── 实时流式复制（主从）
```

---

## SQLite 本地部署备份

适合个人/小团队本地部署：

```bash
#!/bin/bash
# scripts/backup-sqlite.sh

BACKUP_DIR="/opt/openclaw/backups"
DB_FILE="/opt/openclaw/data/openclaw.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/openclaw_${DATE}.db"

mkdir -p "$BACKUP_DIR"

# SQLite 热备份（无需停服）
sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"

# 压缩
gzip "$BACKUP_FILE"
echo "✅ SQLite 备份完成: ${BACKUP_FILE}.gz"

# 清理 30 天前的备份
find "$BACKUP_DIR" -name "*.db.gz" -mtime +30 -delete
echo "🧹 已清理旧备份"
```

```bash
# 设置每日自动备份 (crontab -e)
0 2 * * * /opt/openclaw/scripts/backup-sqlite.sh >> /var/log/openclaw-backup.log 2>&1
```

---

## PostgreSQL 生产环境备份

### 方案一：pg_dump 逻辑备份

```bash
#!/bin/bash
# scripts/backup-postgres.sh

set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-openclaw}"
DB_USER="${DB_USER:-openclaw}"
BACKUP_DIR="/opt/openclaw/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "📦 开始 PostgreSQL 备份..."

# 全量逻辑备份（自定义格式，支持并行恢复）
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --format=custom \
  --compress=9 \
  --file="$BACKUP_DIR/openclaw_${DATE}.dump"

BACKUP_SIZE=$(du -sh "$BACKUP_DIR/openclaw_${DATE}.dump" | cut -f1)
echo "✅ 备份完成，大小: $BACKUP_SIZE"

# 上传到对象存储
if [ -n "${OSS_BUCKET:-}" ]; then
  ossutil cp "$BACKUP_DIR/openclaw_${DATE}.dump" \
    "oss://$OSS_BUCKET/backups/postgres/openclaw_${DATE}.dump"
  echo "☁️ 已上传到 OSS"
fi

# 本地保留最近 7 天
find "$BACKUP_DIR" -name "*.dump" -mtime +7 -delete
```

### 方案二：WAL 归档（持续增量备份）

```yaml
# postgresql.conf - WAL 归档配置
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /opt/wal-archive/%f && cp %p /opt/wal-archive/%f'
archive_timeout = 300   # 每 5 分钟归档一次（即使 WAL 未满）
```

```bash
# 使用 pg_basebackup 做基础备份
pg_basebackup \
  -h localhost \
  -U replication_user \
  -D /opt/openclaw/base-backup \
  --format=tar \
  --gzip \
  --wal-method=stream \
  --checkpoint=fast \
  --progress
```

---

## 自动备份脚本

### 完整备份管理脚本

```bash
#!/bin/bash
# scripts/backup-manager.sh - 统一备份入口

ACTION=${1:-backup}  # backup / restore / list / test

case $ACTION in
  backup)
    echo "=== OpenClaw 自动备份 $(date) ==="
    
    # 1. 数据库备份
    bash /opt/openclaw/scripts/backup-postgres.sh
    
    # 2. 配置文件备份
    tar -czf "/opt/openclaw/backups/config_$(date +%Y%m%d).tar.gz" \
      /opt/openclaw/openclaw.config.yaml \
      /opt/openclaw/.env \
      /opt/openclaw/plugins/
    
    # 3. 上传媒体文件增量备份
    if command -v rclone &>/dev/null; then
      rclone sync /opt/openclaw/uploads cos:your-bucket/uploads \
        --exclude "*.tmp" \
        --log-level INFO
    fi
    
    echo "=== 备份完成 ==="
    ;;
    
  list)
    echo "本地备份列表："
    ls -lh /opt/openclaw/backups/postgres/ 2>/dev/null | tail -20
    echo "---"
    echo "云端备份："
    ossutil ls oss://your-bucket/backups/ 2>/dev/null | tail -10
    ;;
    
  test)
    echo "🧪 测试最新备份可用性..."
    LATEST=$(ls -t /opt/openclaw/backups/postgres/*.dump 2>/dev/null | head -1)
    if [ -z "$LATEST" ]; then
      echo "❌ 没有找到备份文件"
      exit 1
    fi
    
    # 在测试数据库中恢复验证
    PGPASSWORD="$DB_PASSWORD" pg_restore \
      --list "$LATEST" > /dev/null 2>&1 && \
      echo "✅ 备份文件完整可用: $LATEST" || \
      echo "❌ 备份文件损坏: $LATEST"
    ;;
esac
```

### Crontab 配置

```bash
# crontab -e
# 每天凌晨 2 点全量备份
0 2 * * * /opt/openclaw/scripts/backup-manager.sh backup >> /var/log/openclaw-backup.log 2>&1

# 每周日测试备份可用性
0 3 * * 0 /opt/openclaw/scripts/backup-manager.sh test >> /var/log/openclaw-backup.log 2>&1

# 每月 1 日清理超过 90 天的云端备份
0 4 1 * * ossutil rm oss://your-bucket/backups/postgres/ --recursive --include "*$(date -d '90 days ago' +%Y%m)*" 2>/dev/null
```

---

## 云存储同步

### 腾讯云 COS 配置

```bash
# 安装 COSCMD
pip install coscmd

# 配置
coscmd config -a YOUR_SECRET_ID -s YOUR_SECRET_KEY -b your-bucket -r ap-beijing

# 上传备份
coscmd upload /opt/openclaw/backups/postgres/ /backups/postgres/ -r

# 同步（只上传新文件和变更文件）
coscmd sync /opt/openclaw/backups/ /backups/
```

### rclone 多云存储（推荐）

```bash
# 安装
curl https://rclone.org/install.sh | sudo bash

# 配置（互动式）
rclone config

# 加密备份上传（rclone 内置加密）
rclone copy /opt/openclaw/backups/ \
  "crypt-remote:backups/" \
  --transfers 4 \
  --log-level INFO
```

---

## 数据恢复流程

### 场景一：恢复全量备份

```bash
#!/bin/bash
# scripts/restore.sh

BACKUP_FILE=$1  # 传入备份文件路径

if [ -z "$BACKUP_FILE" ]; then
  echo "用法: $0 <backup_file>"
  echo "示例: $0 /opt/openclaw/backups/postgres/openclaw_20260330_020000.dump"
  exit 1
fi

echo "⚠️  即将恢复备份: $BACKUP_FILE"
echo "⚠️  这将覆盖当前数据库！"
read -p "确认继续？(yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "已取消"
  exit 0
fi

# 停止 OpenClaw
systemctl stop openclaw

# 恢复数据库
echo "📥 恢复数据库..."
PGPASSWORD="$DB_PASSWORD" pg_restore \
  -h "$DB_HOST" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --clean \
  --if-exists \
  --jobs 4 \
  "$BACKUP_FILE"

# 重启服务
systemctl start openclaw
echo "✅ 恢复完成，服务已重启"

# 验证
sleep 5
curl -sf http://localhost:3000/health && echo "✅ 服务健康" || echo "❌ 服务异常"
```

### 场景二：PITR 时间点恢复（WAL 恢复）

```bash
# 恢复到指定时间点（如：昨天 14:30）
cat > /etc/postgresql/recovery.conf << EOF
restore_command = 'cp /opt/wal-archive/%f %p'
recovery_target_time = '2026-03-29 14:30:00'
recovery_target_action = promote
EOF

# 重启 PostgreSQL 开始恢复
systemctl restart postgresql
```

---

## 备份监控与告警

```javascript
// scripts/check-backup.js - 备份健康检查
const fs = require('fs');
const path = require('path');

const BACKUP_DIR = '/opt/openclaw/backups/postgres';
const MAX_AGE_HOURS = 25;  // 超过 25 小时没有新备份则告警

async function checkBackupHealth() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.endsWith('.dump'))
    .map(f => ({
      name: f,
      mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime,
      size: fs.statSync(path.join(BACKUP_DIR, f)).size
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    await alert('❌ 备份目录为空，请检查备份脚本是否正常运行');
    return;
  }

  const latest = files[0];
  const ageHours = (Date.now() - latest.mtime.getTime()) / (1000 * 3600);

  if (ageHours > MAX_AGE_HOURS) {
    await alert(`⚠️ 最新备份已超过 ${Math.round(ageHours)} 小时未更新！\n文件: ${latest.name}`);
  }

  if (latest.size < 1024) {  // 小于 1KB，可能是空备份
    await alert(`⚠️ 备份文件异常小（${latest.size} bytes），可能备份失败`);
  }

  console.log(`✅ 备份正常：${latest.name}（${Math.round(ageHours)}h 前，${(latest.size/1024/1024).toFixed(1)}MB）`);
}

async function alert(message) {
  // 发送企业微信/飞书告警
  const fetch = require('node-fetch');
  await fetch(process.env.ALERT_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ msgtype: 'text', text: { content: message } })
  });
}

checkBackupHealth();
```

---

## 数据迁移

### 从旧版本迁移

```bash
# 查看当前数据库版本
openclaw db version

# 执行迁移
openclaw db migrate

# 回滚（如有问题）
openclaw db migrate:rollback
```

### 跨服务器迁移

```bash
# 旧服务器：导出
pg_dump -Fc openclaw_db > openclaw_migration.dump

# 传输（scp 或 rsync）
rsync -avz --progress openclaw_migration.dump new-server:/tmp/

# 新服务器：导入
pg_restore -d openclaw_db /tmp/openclaw_migration.dump
```

---

## 相关文档

- [高可用部署](./ha-deployment.md)
- [CI/CD 自动化部署](./cicd-deployment.md)
- [监控与告警](../guides/监控与告警系统搭建.md)
- [FAQ 09：故障排查](../FAQ/09-故障排查.md)
