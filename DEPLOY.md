# 🚀 GitHub Pages 部署指南

本文档说明如何将 claw-picker 部署到 GitHub Pages。

---

## ✅ 已完成的工作

以下配置已自动完成：

- ✅ GitHub Actions 工作流已创建 (`.github/workflows/deploy.yml`)
- ✅ 网站首页已创建 (`index.html`)
- ✅ 代码已推送到 main 分支

---

## 📋 需要手动配置的步骤

### 步骤 1: 打开仓库设置

1. 访问 https://github.com/rookie1989/claw-picker
2. 点击 **Settings**（设置）标签

### 步骤 2: 启用 GitHub Pages

1. 在左侧菜单中找到 **Pages**
2. 在 **Source** 部分：
   - 选择 **GitHub Actions**（推荐）
   
   或者（传统方式）：
   - Deploy from a branch
   - Branch: `main`
   - Folder: `/ (root)`

3. 点击 **Save**

### 步骤 3: 等待部署

1. 切换到 **Actions** 标签
2. 你会看到 "Deploy to GitHub Pages" 工作流正在运行
3. 等待绿色勾选标记出现（大约 1-2 分钟）

### 步骤 4: 访问网站

部署成功后，你的网站将在以下地址可用：

```
https://rookie1989.github.io/claw-picker/
```

---

## 🔧 自定义域名（可选）

如果你想使用自己的域名：

### 步骤 1: 添加 CNAME 文件

在仓库根目录创建 `CNAME` 文件，内容为你的域名：

```
docs.openclaw101.dev
```

### 步骤 2: 配置 DNS

在你的域名提供商处添加 CNAME 记录：

```
类型：CNAME
名称：docs (或 @)
值：rookie1989.github.io
```

### 步骤 3: 在 GitHub 中配置

1. 进入 Settings → Pages
2. 在 **Custom domain** 中输入你的域名
3. 点击 **Save**

---

## 📊 部署工作流说明

### 触发条件

- 推送到 main 分支
- 手动触发（workflow_dispatch）

### 部署内容

- 整个仓库（Markdown 文档、示例代码等）

### 部署位置

GitHub Pages 服务器

---

## 🐛 故障排查

### 问题 1: 部署失败

**检查：**
1. 查看 Actions 标签中的错误日志
2. 确认 `.github/workflows/deploy.yml` 语法正确
3. 确认仓库是公开的（或 Pages 设置为公开）

### 问题 2: 404 错误

**解决方案：**
1. 等待 2-5 分钟（部署需要时间）
2. 检查 URL 是否正确
3. 确认 index.html 在根目录

### 问题 3: 样式不显示

**检查：**
1. 确认 index.html 中的 CSS 路径正确
2. 检查浏览器控制台错误
3. 清除浏览器缓存

---

## 📝 更新网站

每次推送到 main 分支时，网站会自动更新：

```bash
# 修改文件后
git add .
git commit -m "docs: 更新内容"
git push origin main
```

GitHub Actions 会自动重新部署。

---

## 🎯 下一步建议

### 内容优化

- [ ] 将 Markdown 转换为 HTML（或使用静态网站生成器）
- [ ] 添加搜索功能
- [ ] 添加深色模式
- [ ] 优化移动端体验

### 功能增强

- [ ] 添加评论系统（如 Giscus）
- [ ] 添加访问统计
- [ ] 添加 RSS 订阅
- [ ] 添加 PWA 支持

### 工具推荐

如果想更专业的文档网站，可以考虑：

- **VitePress** - 快速、现代
- **Docusaurus** - 功能丰富
- **MkDocs** - 简单易用
- **Docsify** - 无需构建

---

## 📞 需要帮助？

- 📖 [GitHub Pages 官方文档](https://docs.github.com/en/pages)
- 🐛 [提交 Issue](https://github.com/rookie1989/claw-picker/issues)
- 💬 [社区讨论](https://github.com/openclaw/openclaw/discussions)

---

**最后更新**: 2026-03-19  
**维护者**: claw-picker 团队
