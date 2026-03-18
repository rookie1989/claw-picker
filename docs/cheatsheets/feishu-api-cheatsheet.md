# 飞书 API 速查手册

> 快速查阅飞书 API 调用方式和参数

## 多维表格 API

### 创建应用
```javascript
feishu_bitable_app({
  action: 'create',
  name: '应用名称',
  is_advanced: true
})
```

### 创建数据表
```javascript
feishu_bitable_app_table({
  action: 'create',
  app_token: 'bascnxxx',
  table: {
    name: '表名',
    fields: [
      { field_name: '字段名', type: 1 }  // 1=文本
    ]
  }
})
```

### 创建记录
```javascript
// 单条
feishu_bitable_app_table_record({
  action: 'create',
  app_token: 'bascnxxx',
  table_id: 'tblxxx',
  fields: { '字段名': '值' }
})

// 批量
feishu_bitable_app_table_record({
  action: 'batch_create',
  app_token: 'bascnxxx',
  table_id: 'tblxxx',
  records: [{ fields: {} }, { fields: {} }]
})
```

### 查询记录
```javascript
feishu_bitable_app_table_record({
  action: 'list',
  app_token: 'bascnxxx',
  table_id: 'tblxxx',
  filter: {
    conjunction: 'and',
    conditions: [
      { field_name: '字段', operator: 'is', value: ['值'] }
    ]
  },
  page_size: 500
})
```

### 字段类型
| 代码 | 类型 | 代码 | 类型 |
|-----|------|-----|------|
| 1 | 文本 | 11 | 人员 |
| 2 | 数字 | 13 | 电话 |
| 3 | 单选 | 15 | 超链接 |
| 4 | 多选 | 17 | 附件 |
| 5 | 日期 | 1001 | 创建时间 |
| 7 | 复选框 | 1002 | 修改时间 |

---

## 日历 API

### 创建日程
```javascript
feishu_calendar_event({
  action: 'create',
  user_open_id: 'ou_xxx',  // 必填
  summary: '标题',
  start_time: '2026-03-20T14:00:00+08:00',
  end_time: '2026-03-20T15:00:00+08:00',
  attendees: [{ type: 'user', id: 'ou_xxx' }],
  reminders: [{ minutes: 15 }],
  vchat: { vc_type: 'vc' }
})
```

### 查询日程
```javascript
feishu_calendar_event({
  action: 'list',
  user_open_id: 'ou_xxx',
  start_time: '2026-03-18T00:00:00+08:00',
  end_time: '2026-03-25T23:59:59+08:00'
})
```

### 忙闲查询
```javascript
feishu_calendar_freebusy({
  action: 'list',
  time_min: '2026-03-20T09:00:00+08:00',
  time_max: '2026-03-20T18:00:00+08:00',
  user_ids: ['ou_xxx', 'ou_yyy']  // 最多 10 人
})
```

### 重复日程 RRULE
```javascript
// 每天重复
recurrence: 'FREQ=DAILY;INTERVAL=1'

// 每周重复（每周五）
recurrence: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=FR'

// 每月重复（每月 1 号）
recurrence: 'FREQ=MONTHLY;INTERVAL=1;BYMONTHDAY=1'
```

---

## 任务 API

### 创建任务
```javascript
feishu_task_task({
  action: 'create',
  current_user_id: 'ou_xxx',  // 强烈建议
  summary: '任务标题',
  description: '任务描述',
  start: { timestamp: '2026-03-18T09:00:00+08:00', is_all_day: false },
  due: { timestamp: '2026-03-20T18:00:00+08:00', is_all_day: false },
  members: [
    { id: 'ou_xxx', role: 'assignee' },  // 负责人
    { id: 'ou_yyy', role: 'follower' }   // 关注人
  ]
})
```

### 完成任务
```javascript
feishu_task_task({
  action: 'patch',
  task_guid: 'tascnxxx',
  completed_at: new Date().toISOString()  // 或 '0' 反完成
})
```

### 创建任务清单
```javascript
feishu_task_tasklist({
  action: 'create',
  name: '清单名称',
  members: [{ id: 'ou_xxx', role: 'editor' }]
})
```

### 创建子任务
```javascript
feishu_task_subtask({
  action: 'create',
  task_guid: 'tascnxxx',
  summary: '子任务标题',
  due: { timestamp: '2026-03-20T18:00:00+08:00', is_all_day: false }
})
```

### 添加评论
```javascript
feishu_task_comment({
  action: 'create',
  task_guid: 'tascnxxx',
  content: '评论内容'
})
```

---

## 文档 API

### 创建文档
```javascript
feishu_create_doc({
  title: '文档标题',
  markdown: '# 标题\n\n内容',
  folder_token: 'fld_xxx',  // 可选
  wiki_space: 'my_library'   // 可选
})
```

### 更新文档
```javascript
// 追加
feishu_update_doc({
  doc_id: 'docxxx',
  mode: 'append',
  markdown: '\n## 新增章节'
})

// 覆盖
feishu_update_doc({
  doc_id: 'docxxx',
  mode: 'overwrite',
  markdown: '# 新内容'
})

// 定位替换
feishu_update_doc({
  doc_id: 'docxxx',
  mode: 'replace_range',
  markdown: '新内容',
  selection_with_ellipsis: '旧内容开头...旧内容结尾'
})
```

### 添加评论
```javascript
feishu_doc_comments({
  action: 'create',
  file_token: 'docxxx',
  file_type: 'docx',
  elements: [
    { type: 'text', text: '评论内容' },
    { type: 'mention', open_id: 'ou_xxx', text: '@用户' }
  ]
})
```

### 搜索文档
```javascript
feishu_search_doc_wiki({
  action: 'search',
  query: '关键词',
  filter: {
    doc_types: ['DOC', 'DOCX'],
    creator_ids: ['ou_xxx'],
    sort_type: 'EDIT_TIME'
  }
})
```

---

## 常用运算符

### 筛选条件 operator
- `is` - 等于
- `isNot` - 不等于
- `contains` - 包含
- `doesNotContain` - 不包含
- `isEmpty` - 为空
- `isNotEmpty` - 不为空
- `isGreater` - 大于
- `isGreaterEqual` - 大于等于
- `isLess` - 小于
- `isLessEqual` - 小于等于

---

## 时间格式

所有时间使用 ISO 8601 / RFC 3339 格式，**必须包含时区**：

```javascript
// ✅ 正确
'2026-03-20T14:00:00+08:00'

// ❌ 错误
'2026-03-20T14:00:00'
```

日期字段（多维表格）使用毫秒时间戳：

```javascript
Date.now()  // 1742284800000
new Date('2026-03-20').getTime()
```

---

## 分页处理

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

---

## 错误码

| 错误码 | 说明 | 处理方式 |
|-------|------|---------|
| 400 | 请求参数错误 | 检查参数格式 |
| 401 | 未授权 | 检查 token |
| 403 | 权限不足 | 申请权限 |
| 404 | 资源不存在 | 检查 ID |
| 409 | 冲突（如时间冲突） | 调整参数 |
| 429 | 请求限流 | 等待后重试 |
| 500 | 服务器错误 | 稍后重试 |

---

## 最佳实践

### 1. 批量操作优先
```javascript
// ✅ 推荐
await feishu_bitable_app_table_record({
  action: 'batch_create',
  records: items.map(i => ({ fields: i }))
})

// ❌ 避免
for (const item of items) {
  await feishu_bitable_app_table_record({
    action: 'create',
    fields: item
  })
}
```

### 2. 错误处理
```javascript
try {
  const result = await feishu_task_task({ ... });
} catch (error) {
  if (error.code === 429) {
    await sleep(1000);
    // 重试
  } else {
    throw error;
  }
}
```

### 3. 必传参数
- 创建日程：`user_open_id`（否则用户看不到）
- 创建任务：`current_user_id`（确保创建者可编辑）
- 时间参数：必须包含时区 `+08:00`
