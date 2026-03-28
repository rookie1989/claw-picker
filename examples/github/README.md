# 🐙 GitHub 集成示例

本目录提供 GitHub 集成的完整示例代码。

## 📁 示例列表

| 示例 | 功能 | 难度 | 文件 |
|------|------|------|------|
| Issue 自动处理器 | 自动分类/分配 Issue | ⭐⭐ | `issue-handler.js` |
| PR 自动审查员 | PR 代码审查 + 评论 | ⭐⭐⭐ | `pr-reviewer.js` |

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

### 2. 运行示例

```bash
node examples/github/issue-handler.js
```

## 📖 使用场景

### Issue 管理
- 自动标签分类（bug/feature/question）
- 根据内容分配负责人
- 重复 Issue 检测
- 自动回复常见问题

### PR 审查
- 代码风格检查
- 测试覆盖率验证
- 变更摘要生成
- 自动 @ 相关 Reviewer

### 工作流自动化
- Issue → 任务同步
- PR 合并 → 部署触发
- Release → 更新日志生成

## 🔧 配合 gh-issues 技能

OpenClaw 内置 `gh-issues` 技能，可直接使用：

```bash
# 监控 Issue 并自动修复
/gh-issues rookie1989/claw-picker --label bug --watch

# 每日检查
/gh-issues rookie1989/claw-picker --cron
```

详细文档：[gh-issues 技能](../../skills/gh-issues/SKILL.md)

## 💡 进阶用法

### 多仓库管理

```javascript
const repos = [
  'rookie1989/claw-picker',
  'rookie1989/openclaw-plugins'
];

repos.forEach(repo => {
  monitorIssues(repo);
});
```

### 自定义规则

```javascript
const rules = {
  labels: {
    'bug': ['error', 'fail', 'broken'],
    'feature': ['add', 'new', 'enhance']
  },
  assignees: {
    'docs': 'documentation-team',
    'api': 'backend-team'
  }
};
```

## 📮 反馈

遇到问题？提交 [Issue](https://github.com/rookie1989/claw-picker/issues)
