# 🐙 GitHub Issue 自动处理实战

使用 OpenClaw 自动监控、分类、修复 GitHub Issue。

## 🎯 效果预览

### 自动监控

```bash
# 监控仓库 Issue
/gh-issues rookie1989/claw-picker --label bug --watch
```

### 自动分类

新 Issue 创建时自动：
- 🔍 分析内容
- 🏷️ 添加标签（bug/feature/question）
- 👤 分配负责人
- 💬 自动回复

### 自动修复

检测到 bug 时：
1. 创建修复分支
2. 生成修复代码
3. 提交 PR
4. 通知相关人员

## 🚀 快速开始

### 1. 配置 GitHub Token

```bash
export GITHUB_TOKEN=ghp_xxx
```

或在 `~/.openclaw/config.json` 中添加：

```json
{
  "env": {
    "GITHUB_TOKEN": "ghp_xxx"
  }
}
```

### 2. 使用 gh-issues 技能

```bash
# 查看 bug 类 Issue
/gh-issues rookie1989/claw-picker --label bug

# 监控并自动处理
/gh-issues rookie1989/claw-picker --label bug --watch

# 限制数量
/gh-issues rookie1989/claw-picker --limit 5
```

## 📋 完整参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--label` | 按标签筛选 | `--label bug` |
| `--limit` | 限制数量 | `--limit 10` |
| `--milestone` | 按里程碑筛选 | `--milestone v1.0` |
| `--assignee` | 按负责人筛选 | `--assignee @me` |
| `--fork` | 指定 fork 仓库 | `--fork user/repo` |
| `--watch` | 持续监控 | `--watch` |
| `--interval` | 轮询间隔（分钟） | `--interval 5` |
| `--reviews-only` | 只处理 PR 审查 | `--reviews-only` |
| `--cron` | 定时任务模式 | `--cron` |
| `--dry-run` | 空跑模式 | `--dry-run` |
| `--model` | 指定 AI 模型 | `--model qwen3.5-plus` |
| `--notify-channel` | 通知渠道 | `--notify-channel -100xxx` |

## 🔧 配置示例

### 基础配置

```json
{
  "skills": {
    "entries": ["gh-issues", "github"]
  },
  "env": {
    "GITHUB_TOKEN": "ghp_xxx"
  }
}
```

### 定时监控

```json
{
  "cron": {
    "jobs": [
      {
        "name": "GitHub Issue 检查",
        "schedule": {
          "kind": "cron",
          "expr": "0 */2 * * *"
        },
        "payload": {
          "kind": "agentTurn",
          "message": "/gh-issues rookie1989/claw-picker --label bug"
        }
      }
    ]
  }
}
```

### 多渠道通知

```json
{
  "gh-issues": {
    "notify": {
      "telegram": "-100xxx",
      "discord": "channel_id",
      "feishu": "chat_id"
    }
  }
}
```

## 💡 实战场景

### 场景 1：Bug 自动修复

```bash
# 监控 bug 类 Issue
/gh-issues rookie1989/claw-picker --label bug --watch --interval 10
```

流程：
1. 检测新 bug Issue
2. 分析错误信息
3. 定位问题代码
4. 生成修复方案
5. 创建 PR
6. 通知维护者

### 场景 2：PR 自动审查

```bash
# 审查 PR
/gh-issues rookie1989/claw-picker --reviews-only --watch
```

审查内容：
- ✅ 代码风格
- ✅ 测试覆盖率
- ✅ 文档更新
- ✅ 破坏性变更
- ✅ 性能影响

### 场景 3：Issue 自动分类

```javascript
// 自定义分类规则
const rules = {
  labels: {
    'bug': ['error', 'fail', 'broken', 'crash'],
    'feature': ['add', 'new', 'enhance', 'request'],
    'question': ['how', 'what', 'why', 'help']
  },
  assignees: {
    'docs': 'documentation-team',
    'api': 'backend-team',
    'ui': 'frontend-team'
  }
};
```

### 场景 4：多仓库管理

```bash
# 同时监控多个仓库
/gh-issues rookie1989/claw-picker --watch &
/gh-issues rookie1989/openclaw-plugins --watch &
```

## 📊 输出示例

### Issue 摘要

```
🐙 GitHub Issue 摘要

📊 统计
- 新增：3
- 进行中：5
- 已关闭：12

🔴 Bug（2）
- #45 登录失败
- #43 页面崩溃

✨ Feature（1）
- #44 添加深色模式
```

### PR 审查意见

```
🔍 PR #42 审查意见

✅ 优点
- 代码风格一致
- 测试覆盖完整

⚠️ 建议
- 添加文档注释
- 考虑边界情况

📝 变更
- 修改：3 文件
- 新增：150 行
- 删除：20 行
```

## 🛠️ 高级用法

### 1. 自定义工作流

```javascript
// workflows/custom.js
module.exports = {
  onIssue: async (issue) => {
    if (isBug(issue)) {
      await createFixBranch(issue);
      await notifyTeam(issue);
    }
  },
  
  onPR: async (pr) => {
    const review = await analyzePR(pr);
    await postComment(pr, review);
  }
};
```

### 2. 集成 CI/CD

```yaml
# .github/workflows/auto-fix.yml
name: Auto Fix
on:
  issues:
    types: [labeled]
jobs:
  fix:
    if: github.event.label.name == 'bug'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: node scripts/auto-fix.js
```

### 3. 自定义通知模板

```javascript
const notifyTemplate = (issue) => `
🔴 新 Bug 报告

#${issue.number} ${issue.title}

👤 报告者：${issue.user.login}
⏰ 时间：${issue.created_at}
🔗 链接：${issue.html_url}

📝 描述
${issue.body}
`;
```

## 🐛 常见问题

### Q: 权限不足？

**A:** 确保 Token 有以下权限：
- `repo`（私有仓库）
- `public_repo`（公开仓库）
- `write:discussion`（评论）

### Q: 速率限制？

**A:** GitHub API 限制：
- 未认证：60 次/小时
- 已认证：5000 次/小时

解决方案：
```json
{
  "gh-issues": {
    "rateLimit": {
      "requests": 100,
      "window": 3600
    }
  }
}
```

### Q: 如何停止监控？

**A:** 
```bash
# 找到进程 ID
ps aux | grep gh-issues

# 终止进程
kill <PID>
```

## 📚 相关资源

- [gh-issues 技能文档](../../skills/gh-issues/SKILL.md)
- [GitHub API 文档](https://docs.github.com/en/rest)
- [GitHub Actions 教程](https://docs.github.com/en/actions)

## 💡 下一步

- [ ] 配置定时监控
- [ ] 自定义分类规则
- [ ] 集成团队通知
- [ ] 设置自动修复流程

---

_最后更新：2026-03-28_
