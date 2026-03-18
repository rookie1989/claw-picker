# 🤝 贡献指南

感谢你对 Claw-Picker 项目的兴趣！我们欢迎各种形式的贡献，包括但不限于：

- 📚 文档改进（错别字、翻译、内容补充）
- 💡 新增教程和示例
- 🐛 报告 Bug
- ✨ 提出新功能建议
- 🔧 提交代码修复

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)

## 行为准则

本项目采用 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。请保持友好、包容和专业的交流氛围。

## 如何贡献

### 1. 报告 Bug

如果你发现了 Bug，请创建一个 Issue 并包含以下信息：

- 清晰的标题和描述
- 复现步骤
- 预期行为和实际行为
- 环境信息（OpenClaw 版本、操作系统、Node.js 版本等）
- 相关日志或截图

### 2. 提出新功能

在创建新功能 Issue 前，请先：

- 搜索现有 Issue，避免重复
- 详细描述功能需求和使用场景
- 说明为什么这个功能重要

### 3. 提交代码

#### Fork 和克隆

```bash
# Fork 本仓库后克隆
git clone https://github.com/YOUR_USERNAME/claw-picker.git
cd claw-picker

# 添加上游仓库
git remote add upstream https://github.com/rookie1989/claw-picker.git
```

#### 创建分支

```bash
# 保持主分支最新
git checkout main
git pull upstream main

# 创建功能分支
git checkout -b feature/your-feature-name
```

#### 开发和测试

- 确保代码符合项目风格
- 添加必要的注释
- 更新相关文档
- 测试你的改动

#### 提交代码

```bash
git add .
git commit -m "type: description"
git push origin feature/your-feature-name
```

## 提交规范

我们采用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

### 类型（Type）

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式（不影响功能）
- `refactor`: 重构（既不是新功能也不是 Bug 修复）
- `test`: 测试相关
- `chore`: 构建过程或辅助工具变动

### 示例

```bash
feat: 新增飞书日历集成示例
fix: 修复配置文件解析错误
docs: 更新安装指南
refactor: 优化示例代码结构
```

## Pull Request 流程

1. **创建 PR**
   - 填写 PR 模板
   - 关联相关 Issue
   - 清晰描述改动内容

2. **代码审查**
   - 维护者会审查代码
   - 可能需要你进行修改
   - 保持沟通，及时响应反馈

3. **合并**
   - 审查通过后合并到主分支
   - 你的名字将出现在贡献者列表中

## 文档贡献

### 新增教程

1. 在 `docs/` 目录下创建相应的子目录
2. 使用 Markdown 格式编写
3. 包含清晰的步骤和示例代码
4. 在 README.md 中添加导航链接

### 新增示例代码

1. 在 `examples/` 目录下创建相应的子目录
2. 代码要有清晰的注释
3. 提供使用说明和配置示例
4. 确保代码可运行

## 常见问题

### Q: 我可以只修改文档吗？
A: 当然可以！文档改进同样重要。

### Q: 我的 PR 多久会被审查？
A: 通常在 1-3 个工作日内，请耐心等待。

### Q: 如何成为维护者？
A: 持续贡献高质量的代码和文档，我们会邀请你加入。

## 🎉 致谢

所有贡献者都将出现在 [贡献者列表](https://github.com/rookie1989/claw-picker/graphs/contributors) 中。

感谢你的贡献！🦞
