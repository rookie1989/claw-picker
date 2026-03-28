# 📊 飞书多维表格集成指南

完整教程：如何在 OpenClaw 中集成飞书多维表格（Bitable）。

## 🎯 功能概览

- ✅ 查询表格/记录
- ✅ 创建/修改/删除记录
- ✅ 批量操作
- ✅ 高级筛选
- ✅ 视图管理

## 📋 前置要求

1. 已安装 OpenClaw
2. 已创建飞书企业自建应用
3. 已获取用户授权
4. 已创建多维表格

## 🔧 配置步骤

### 1. 飞书应用配置

访问 [飞书开放平台](https://open.feishu.cn/)：

1. 创建企业自建应用
2. 添加权限：
   - 多维表格权限（只读/读写）
   - 用户信息权限
3. 获取 App ID 和 App Secret
4. 配置重定向 URL（OAuth）

### 2. 获取用户 Token

**OAuth 授权**或**手动获取**（见日历集成指南）

### 3. OpenClaw 配置

编辑 `~/.openclaw/config.json`：

```json
{
  "plugins": {
    "feishu": {
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "userToken": "u-xxx"
    }
  },
  "skills": {
    "entries": ["feishu-bitable"]
  }
}
```

### 4. 重启网关

```bash
openclaw gateway restart
```

## 💬 使用示例

### 查询表格

```
查看项目跟踪表格
```

回复：
```
📊 项目跟踪表

字段：
- 项目名称（文本）
- 负责人（人员）
- 状态（单选：进行中/已完成/已暂停）
- 截止日期（日期）
- 进度（数字）

记录数：15
```

### 查询记录

```
查看进行中的项目
```

回复：
```
📋 进行中的项目（5 个）

| 项目名称 | 负责人 | 截止日期 | 进度 |
|----------|--------|----------|------|
| 官网改版 | 张三 | 03-30 | 80% |
| API 优化 | 李四 | 04-05 | 60% |
| ... |
```

### 创建记录

```
添加一个新项目：移动端重构，负责人王五，截止 4 月 15 日
```

回复：
```
✅ 已创建记录

📝 移动端重构
👤 负责人：王五
📅 截止：2026-04-15
📊 状态：进行中
🔗 https://feishu.cn/bitable/xxx
```

### 更新记录

```
把官网改版的状态改为已完成
```

回复：
```
✅ 已更新

官网改版 → 已完成
```

### 批量操作

```
把所有已完成的项目进度改为 100%
```

回复：
```
✅ 批量更新完成

已更新 3 条记录：
- 项目 A → 100%
- 项目 B → 100%
- 项目 C → 100%
```

## 📐 字段类型支持

| 类型 | 说明 | 示例值 |
|------|------|--------|
| 文本 | 普通文本 | `"张三"` |
| 数字 | 数值 | `100` |
| 单选 | 单个选项 | `"进行中"` |
| 多选 | 多个选项 | `["选项 A", "选项 B"]` |
| 日期 | 日期时间 | `1703275200000` |
| 复选框 | 布尔值 | `true` |
| 人员 | 用户 ID | `[{"id": "ou_xxx"}]` |
| 附件 | 文件 Token | `[{"file_token": "xxx"}]` |

## 🔍 高级筛选

### 条件筛选

```
查看截止日期在本周的项目
```

筛选条件：
```json
{
  "conjunction": "and",
  "conditions": [
    {
      "field_name": "截止日期",
      "operator": "isGreaterEqual",
      "value": [monday_timestamp]
    },
    {
      "field_name": "截止日期",
      "operator": "isLess",
      "value": [next_monday_timestamp]
    }
  ]
}
```

### 多条件组合

```
查看张三负责的、进度低于 50% 的项目
```

```json
{
  "conjunction": "and",
  "conditions": [
    {"field_name": "负责人", "operator": "is", "value": ["ou_xxx"]},
    {"field_name": "进度", "operator": "isLess", "value": [50]}
  ]
}
```

## 🛠️ 高级用法

### 1. 批量创建

```javascript
await bitable.batchCreate({
  records: [
    {fields: {name: "项目 A", status: "进行中"}},
    {fields: {name: "项目 B", status: "进行中"}},
    {fields: {name: "项目 C", status: "进行中"}}
  ]
});
```

### 2. 视图切换

```
切换到看板视图
```

```javascript
await bitable.view.switch('kanban');
```

### 3. 字段管理

```
添加一个新字段：优先级（单选）
```

```javascript
await bitable.field.create({
  field_name: "优先级",
  type: 3, // 单选
  property: {
    options: [
      {name: "高", color: "red"},
      {name: "中", color: "yellow"},
      {name: "低", color: "green"}
    ]
  }
});
```

### 4. 数据导出

```
导出所有项目数据
```

```javascript
const records = await bitable.list();
const csv = convertToCSV(records);
```

## 🐛 常见问题

### Q: 提示"表格不存在"？

**A:** 确认：
1. 表格 Token 是否正确
2. 是否有访问权限
3. 表格是否被删除

### Q: 批量操作失败？

**A:** 注意：
1. 单次最多 500 条记录
2. 字段类型必须匹配
3. 必填字段不能为空

### Q: 人员字段如何填写？

**A:** 使用 open_id：
```json
{"fields": {"负责人": [{"id": "ou_xxx"}]}}
```

## 📚 相关资源

- [飞书多维表格 API](https://open.feishu.cn/document/ukTMukTMukTM/uAjMw4CM2YjL3YTN)
- [OpenClaw 飞书技能](../../skills/feishu-bitable/SKILL.md)
- [示例代码](../../examples/feishu/README.md)

## 💡 实战场景

### 项目跟踪

自动同步 GitHub Issue：
```javascript
const issues = await github.listIssues();
await bitable.batchCreate({
  records: issues.map(issue => ({
    fields: {
      title: issue.title,
      status: issue.state,
      url: issue.html_url
    }
  }))
});
```

### 进度报表

自动生成周报：
```javascript
const completed = await bitable.list({
  filter: {status: "已完成"}
});
generateWeeklyReport(completed);
```

### 提醒系统

截止日期提醒：
```javascript
const dueSoon = await bitable.list({
  filter: {
    due_date: {before: tomorrow},
    status: {not: "已完成"}
  }
});
sendReminders(dueSoon);
```

---

_最后更新：2026-03-28_
