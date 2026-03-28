# 🎬 视频教程脚本 - GitHub Issue 自动处理

**时长**：12 分钟
**难度**：⭐⭐⭐⭐
**目标观众**：开源项目维护者、GitHub 重度用户

---

## 🎞️ 视频结构

### 开场（30 秒）

**画面**：GitHub 首页 + Issue 列表

**台词**：
> "作为开源项目维护者，你是不是经常被 Issue 淹没？
> 
> 每天都要手动分类、分配、回复...
> 
> 今天，我来教你用 OpenClaw 自动处理 GitHub Issue！
> 
> 让你从繁琐的工作中解放出来。
> 
> 开始吧！"

---

### 第一部分：效果演示（2 分钟）

**画面**：Issue 自动处理演示

#### 演示 1：自动分类

```
新 Issue 创建：
"登录后页面崩溃，错误 500"

自动添加标签：
🐛 bug
🔴 high priority

自动回复：
🤖 感谢反馈！我们会尽快检查。
```

#### 演示 2：自动分配

```
Issue 包含"文档"关键词
→ 自动分配给 documentation-team
```

#### 演示 3：Bug 自动修复

```
检测到简单 bug
→ 创建修复分支
→ 生成修复代码
→ 提交 PR
→ 通知维护者
```

**旁白**：
> "看到了吗？从 Issue 创建到处理，全程自动化。
> 
> 接下来，看看如何配置。"

---

### 第二部分：配置步骤（6 分钟）

#### 步骤 1：准备 GitHub Token（1 分钟）

**画面**：GitHub Settings 录屏

**操作步骤**：
1. GitHub Settings → Developer settings
2. Personal access tokens → Generate new token
3. 选择权限：repo, write:discussion
4. 复制 Token

**旁白**：
> "Token 是你的身份凭证，一定要保管好。
> 
> 建议设置过期时间，定期更新。"

#### 步骤 2：配置 OpenClaw（2 分钟）

**画面**：配置文件编辑

**配置示例**：
```json
{
  "env": {
    "GITHUB_TOKEN": "ghp_xxx"
  },
  "skills": {
    "entries": ["gh-issues"]
  }
}
```

**旁白**：
> "把 Token 放入环境变量，然后在技能中启用 gh-issues。"

#### 步骤 3：配置自动分类规则（2 分钟）

**画面**：规则配置文件

**配置示例**：
```javascript
const rules = {
  labels: {
    'bug': ['error', 'fail', 'broken', 'crash'],
    'feature': ['add', 'new', 'enhance'],
    'documentation': ['doc', 'readme', 'typo'],
    'question': ['how', 'what', 'help']
  },
  assignees: {
    'docs': 'documentation-team',
    'api': 'backend-team',
    'ui': 'frontend-team'
  }
};
```

**旁白**：
> "定义关键词规则，系统会自动匹配。
> 
> 你可以根据项目特点自定义规则。"

#### 步骤 4：设置 Webhook（1 分钟）

**画面**：GitHub Webhook 配置

**操作步骤**：
1. GitHub 仓库 → Settings → Webhooks
2. Add webhook
3. Payload URL: https://your-domain.com/github
4. 选择事件：Issues, Pull Request

**旁白**：
> "配置 Webhook 后，新 Issue 会实时触发处理。
> 
> 也可以用定时轮询，每 5 分钟检查一次。"

---

### 第三部分：高级用法（3 分钟）

#### 用法 1：多仓库管理

```javascript
const repos = [
  'rookie1989/claw-picker',
  'rookie1989/openclaw-plugins'
];

repos.forEach(repo => {
  monitorIssues(repo);
});
```

#### 用法 2：自定义工作流

```javascript
async function onBugReport(issue) {
  // 1. 创建工单
  await createTicket(issue);
  
  // 2. 通知负责人
  await notifyAssignee(issue);
  
  // 3. 添加到看板
  await addToBoard(issue);
}
```

#### 用法 3：PR 自动审查

```javascript
async function reviewPR(pr) {
  // 检查代码风格
  const styleCheck = await checkStyle(pr);
  
  // 检查测试覆盖
  const coverage = await checkCoverage(pr);
  
  // 生成审查意见
  return { styleCheck, coverage };
}
```

**旁白**：
> "这些高级用法可以让你完全定制自动化流程。
> 
> 发挥创意，打造最适合你的工作流。"

---

### 总结与下集预告（30 秒）

**画面**：主持人出镜

**台词**：
> "今天我们一起学习了：
> - GitHub Issue 自动分类
> - 自动分配负责人
> - PR 自动审查
> 
> 下一集，我们会教大家如何开发自定义技能。
> 
> 让你的 OpenClaw 无所不能！
> 
> 别忘了点赞订阅，我们下期见！"

---

## 📋 拍摄清单

- [ ] GitHub 界面录屏
- [ ] 配置编辑录屏
- [ ] 自动化演示
- [ ] 主持人出镜
- [ ] 代码高亮显示

## 🎵 BGM 建议

- 开场：科技感、节奏感
- 演示部分：轻快、专注
- 总结：积极、向上

## 📝 备注

- 准备测试仓库
- 创建示例 Issue
- 确保 Token 权限正确
- 录屏 1080p

---

_脚本版本：1.0_
_最后更新：2026-03-28_
