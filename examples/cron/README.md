# 📝 定时任务示例

本目录提供 Cron 定时任务的完整示例代码。

## 📁 示例列表

| 示例 | 功能 | 难度 | 文件 |
|------|------|------|------|
| 日报生成器 | 每日自动汇总 | ⭐⭐ | `daily-report.js` |
| 周报生成器 | 每周自动汇总 | ⭐⭐ | `weekly-report.js` ⭐ NEW |
| 健康检查 | 定期服务检查 | ⭐⭐ | `health-check.js` ⭐ NEW |

## 🚀 快速开始

### 1. 配置定时任务

在 `~/.openclaw/config.json` 中添加：

```json
{
  "cron": {
    "jobs": [
      {
        "name": "日报生成",
        "schedule": {
          "kind": "cron",
          "expr": "0 18 * * *"
        },
        "payload": {
          "kind": "agentTurn",
          "message": "生成今日工作报告"
        }
      }
    ]
  }
}
```

### 2. 运行示例

```bash
node examples/cron/daily-report.js
```

## 💡 使用场景

### 日报生成
- 汇总当日完成任务
- 统计代码提交
- 生成工作摘要

### 周报生成
- 汇总本周工作
- 生成统计数据
- 发送给相关人员

### 健康检查
- 检查服务状态
- 发送告警通知
- 生成健康报告

## 📚 相关资源

- [Cron 定时任务教程](../../docs/advanced/cron-jobs.md)
- [配置文件速查](../../docs/入门指南/03-配置文件速查手册.md)

## 📮 反馈

遇到问题？提交 [Issue](https://github.com/rookie1989/claw-picker/issues)

---

_最后更新：2026-03-28_
