# 飞书集成示例代码

> 完整的飞书 API 使用示例，可直接运行或作为参考

## 示例列表

### 1. 多维表格示例

**[bitable-project-tracker.js](./bitable-project-tracker.js)** - 项目任务追踪

功能：
- ✅ 创建项目追踪多维表格
- ✅ 定义字段结构（文本、人员、日期、单选等）
- ✅ 批量创建任务记录
- ✅ 查询任务统计
- ✅ 筛选高优先级任务

运行：
```bash
node examples/feishu/bitable-project-tracker.js
```

### 2. 日历示例

**[calendar-meeting-scheduler.js](./calendar-meeting-scheduler.js)** - 智能会议安排

功能：
- ✅ 搜索用户 open_id
- ✅ 查询参会人忙闲状态
- ✅ 自动寻找最佳会议时间
- ✅ 创建会议日程
- ✅ 添加参会人
- ✅ 支持重复会议

运行：
```bash
node examples/feishu/calendar-meeting-scheduler.js
```

### 3. 任务示例

**[task-project-manager.js](./task-project-manager.js)** - 项目任务管理

功能：
- ✅ 创建任务清单
- ✅ 创建项目任务结构（主任务 + 子任务）
- ✅ 添加任务评论
- ✅ 查询任务列表
- ✅ 完成任务
- ✅ 任务统计

运行：
```bash
node examples/feishu/task-project-manager.js
```

### 4. 文档示例

**[doc-weekly-report.js](./doc-weekly-report.js)** - 自动周报生成

功能：
- ✅ 查询本周完成任务
- ✅ 查询本周会议
- ✅ 查询进行中任务
- ✅ 生成周报 Markdown 内容
- ✅ 创建周报文档
- ✅ 发送周报通知（可选）

运行：
```bash
node examples/feishu/doc-weekly-report.js
```

## 配置说明

### 1. 安装依赖

```bash
npm install @openclaw/feishu
```

### 2. 配置飞书凭证

在运行示例前，需要配置飞书 API 凭证：

```javascript
// 方式 1：修改示例文件中的 CONFIG
const CONFIG = {
  userOpenId: 'ou_xxxxxxxxxxxxx',  // 你的 open_id
  // ...
};

// 方式 2：使用环境变量
process.env.FEISHU_APP_ID = 'cli_xxxxxxxxxxxxx';
process.env.FEISHU_APP_SECRET = 'xxxxxxxxxxxxx';
```

### 3. 获取用户 open_id

```bash
# 方法 1：通过飞书搜索
node -e "
const { feishu_search_user } = require('@openclaw/feishu');
feishu_search_user({ query: '你的姓名' })
  .then(r => console.log(r.users[0].open_id));
"

# 方法 2：获取当前用户
node -e "
const { feishu_get_user } = require('@openclaw/feishu');
feishu_get_user()
  .then(r => console.log(r.user.open_id));
"
```

## 代码结构

每个示例文件都包含：

1. **配置部分** - 替换为你的实际配置
2. **功能函数** - 可复用的功能模块
3. **主函数** - 完整的业务流程
4. **使用示例** - 直接运行的示例代码

## 最佳实践

### 1. 错误处理

```javascript
try {
  const result = await feishu_task_task({ ... });
} catch (error) {
  if (error.code === 429) {
    // 限流，等待后重试
    await sleep(1000);
    return retry();
  } else if (error.code === 403) {
    // 权限不足
    console.error('请检查 API 权限配置');
  } else {
    throw error;
  }
}
```

### 2. 批量操作

```javascript
// ✅ 推荐：批量创建
await feishu_bitable_app_table_record({
  action: 'batch_create',
  records: items.map(i => ({ fields: i }))
});

// ❌ 避免：逐条创建
for (const item of items) {
  await feishu_bitable_app_table_record({
    action: 'create',
    fields: item
  });
}
```

### 3. 分页查询

```javascript
async function listAllRecords(appToken, tableId) {
  const allRecords = [];
  let pageToken = null;
  
  do {
    const result = await feishu_bitable_app_table_record({
      action: 'list',
      app_token: appToken,
      table_id: tableId,
      page_size: 500,
      page_token: pageToken
    });
    
    allRecords.push(...result.records);
    pageToken = result.page_token;
  } while (pageToken);
  
  return allRecords;
}
```

## 相关文档

- 📖 [飞书多维表格集成教程](../../docs/feishu-integration/basic/bitable-integration.md)
- 📖 [飞书日历集成教程](../../docs/feishu-integration/basic/calendar-integration.md)
- 📖 [飞书任务集成教程](../../docs/feishu-integration/basic/task-integration.md)
- 📖 [飞书文档集成教程](../../docs/feishu-integration/basic/doc-integration.md)
- 📖 [飞书 API 速查手册](../../docs/cheatsheets/feishu-api-cheatsheet.md)

## 常见问题

### Q: 如何调试？

**A:** 开启调试日志：

```javascript
process.env.DEBUG = 'feishu:*';
```

### Q: 触发限流怎么办？

**A:** 
1. 使用批量操作减少 API 调用
2. 添加延迟：`await sleep(100)`
3. 实现重试机制

### Q: 如何获取用户 open_id？

**A:** 
- 使用 `feishu_search_user` 搜索姓名/手机号/邮箱
- 从消息上下文的 `SenderId` 获取
- 使用 `feishu_get_user` 获取当前用户

## 贡献

欢迎提交更多示例代码！

- 📝 示例代码应包含完整注释
- 📝 提供清晰的使用说明
- 📝 包含错误处理
- 📝 遵循最佳实践
