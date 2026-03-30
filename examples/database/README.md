# 数据库同步示例

通过 OpenClaw 实现数据库监控、查询和同步通知。

## 包含文件

| 文件 | 功能 |
|------|------|
| `db-sync.js` | 多数据库同步机器人（MySQL / PostgreSQL / MongoDB / SQLite） |

## 支持能力

- **数据查询**：自然语言查询数据库，自动转为 SQL
- **变更通知**：数据变更时主动推送告警
- **定时同步**：按计划同步不同数据源
- **统计报表**：一句话生成数据报表

## 快速使用

```bash
# 安装依赖
npm install mysql2 pg mongodb better-sqlite3

# 配置数据库连接
export DB_TYPE=mysql
export DB_HOST=localhost
export DB_NAME=mydb
export DB_USER=root
export DB_PASS=yourpassword
```

在聊天中使用：

```
/db-query 查询本月销售额前 10 的商品
/db-stats 生成今日数据报表
/db-sync 立即同步数据
```

## 定时同步配置

```json
{
  "cron": {
    "jobs": [
      {
        "name": "数据库日报",
        "schedule": { "kind": "cron", "cron": "0 9 * * 1-5" },
        "payload": {
          "kind": "agentTurn",
          "message": "查询昨日数据库关键指标并生成报告"
        }
      }
    ]
  }
}
```

## 相关文档

- [数据持久化指南](../../docs/advanced/data-persistence.md)
- [定时任务（Cron）](../../docs/advanced/cron-jobs.md)

---

_最后更新：2026-03-30_
