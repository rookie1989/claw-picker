# 📋 飞书集成示例

本目录提供飞书（Feishu/Lark）深度集成的完整示例代码。

## 📁 示例列表

| 示例 | 功能 | 难度 | 文件 |
|------|------|------|------|
| 多维表格项目跟踪器 | 自动创建/更新项目记录 | ⭐⭐ | `bitable-project-tracker.js` |
| 日历会议调度器 | 智能安排会议时间 | ⭐⭐⭐ | `calendar-meeting-scheduler.js` |
| 文档周报生成器 | 自动生成周报文档 | ⭐⭐ | `doc-weekly-report.js` |
| 任务项目管理器 | 创建/分配/跟踪任务 | ⭐⭐ | `task-project-manager.js` |

## 🚀 快速开始

### 1. 配置飞书应用

在飞书开放平台创建应用，获取以下权限：
- 多维表格
- 日历
- 任务
- 云文档

### 2. 安装依赖

```bash
npm install @openclaw/lark
```

### 3. 配置凭证

在 `~/.openclaw/config.json` 中添加：

```json
{
  "plugins": {
    "feishu": {
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "userToken": "u-xxx"
    }
  }
}
```

### 4. 运行示例

```bash
node examples/feishu/bitable-project-tracker.js
```

## 📖 详细文档

- [飞书基础集成指南](../../docs/feishu-integration/basic/README.md)
- [实战工作流](../../docs/feishu-integration/workflows/README.md)
- [飞书 API 速查表](../../docs/cheatsheets/feishu-api-cheatsheet.md)

## 💡 使用场景

### 项目管理
- 自动同步 GitHub Issue 到飞书多维表格
- 每日站会自动生成任务更新
- 项目进度可视化看板

### 会议管理
- 根据参会人忙闲自动安排会议
- 会议纪要自动生成并分发
- 会议提醒和跟进任务创建

### 文档协作
- 周报/月报自动生成
- 文档评论自动回复
- 知识库自动归档

## 🔧 自定义

每个示例都包含详细的注释，你可以根据需求修改：
- API 调用参数
- 触发条件
- 数据格式
- 通知渠道

## ❓ 常见问题

**Q: 如何获取 userToken？**  
A: 使用 OAuth 授权流程，或通过飞书开放平台的"用户身份凭证"获取。

**Q: 示例代码报错 "permission denied"？**  
A: 检查飞书应用是否开通了相应 API 权限，并确保用户已授权。

**Q: 如何调试？**  
A: 在代码开头添加 `console.log()` 输出，或查看 `~/.openclaw/logs/` 日志文件。

## 📮 反馈

遇到问题？提交 [Issue](https://github.com/rookie1989/claw-picker/issues)
