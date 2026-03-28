# 📋 飞书 API 速查表 - 扩展版

快速查找飞书常用 API 和代码片段。

## 🔑 认证方式

### User Access Token（推荐）

```javascript
// OAuth 授权获取
const token = await getAccessToken(code);

// 使用 token 调用 API
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### Tenant Access Token

```javascript
// 应用级 token（无需用户授权）
const token = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
  method: 'POST',
  body: JSON.stringify({
    app_id: 'cli_xxx',
    app_secret: 'xxx'
  })
});
```

## 📊 多维表格（Bitable）

### 获取表格列表

```javascript
GET https://open.feishu.cn/open-apis/bitable/v1/apps
```

### 查询记录

```javascript
GET https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records

// 带筛选
?filter={"conjunction":"and","conditions":[{"field_name":"状态","operator":"is","value":["进行中"]}]}
```

### 创建记录

```javascript
POST https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records

{
  "fields": {
    "姓名": "张三",
    "部门": "技术部",
    "入职日期": 1703275200000
  }
}
```

### 更新记录

```javascript
PUT https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/{record_id}

{
  "fields": {
    "状态": "已完成"
  }
}
```

### 字段类型对照

| 类型 | 值类型 | 示例 |
|------|--------|------|
| 文本 (1) | string | `"张三"` |
| 数字 (2) | number | `100` |
| 单选 (3) | string | `"选项 A"` |
| 多选 (4) | string[] | `["选项 A", "选项 B"]` |
| 日期 (5) | number | `1703275200000` (毫秒时间戳) |
| 复选框 (7) | boolean | `true` |
| 人员 (11) | [{id}] | `[{"id": "ou_xxx"}]` |
| 附件 (17) | [{file_token}] | `[{"file_token": "xxx"}]` |

## 📅 日历（Calendar）

### 查询日程

```javascript
GET https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events

// 时间范围
?time_min=2026-03-28T00:00:00+08:00&time_max=2026-03-28T23:59:59+08:00
```

### 创建日程

```javascript
POST https://open.feishu.cn/open-apis/calendar/v4/calendars/{calendar_id}/events

{
  "summary": "团队站会",
  "start_time": "2026-03-28T09:30:00+08:00",
  "end_time": "2026-03-28T10:00:00+08:00",
  "attendees": [
    {"type": "user", "id": "ou_xxx"}
  ],
  "reminders": [
    {"minutes": 15}
  ]
}
```

### 查询忙闲

```javascript
POST https://open.feishu.cn/open-apis/calendar/v4/freebusy/list

{
  "time_min": "2026-03-28T00:00:00+08:00",
  "time_max": "2026-03-28T23:59:59+08:00",
  "user_ids": ["ou_xxx1", "ou_xxx2"]
}
```

## ✅ 任务（Task）

### 创建任务

```javascript
POST https://open.feishu.cn/open-apis/task/v1/tasks

{
  "summary": "完成项目报告",
  "due": {
    "timestamp": "2026-03-30T18:00:00+08:00"
  },
  "members": [
    {"id": "ou_xxx", "role": "assignee"}
  ]
}
```

### 查询任务

```javascript
GET https://open.feishu.cn/open-apis/task/v1/tasks

// 筛选
?completed=false&order_by=due&desc=true
```

### 更新任务

```javascript
PATCH https://open.feishu.cn/open-apis/task/v1/tasks/{task_guid}

{
  "completed": true,
  "completed_at": "2026-03-28T10:00:00+08:00"
}
```

## 📄 云文档（Doc）

### 创建文档

```javascript
POST https://open.feishu.cn/open-apis/docx/v1/documents

{
  "title": "周报",
  "folder_token": "fld_xxx"
}
```

### 获取内容

```javascript
GET https://open.feishu.cn/open-apis/docx/v1/documents/{document_id}/raw_content
```

### 更新内容

```javascript
POST https://open.feishu.cn/open-apis/docx/v1/documents/{document_id}/blocks/{block_id}/children

{
  "blocks": [
    {
      "block_type": "text",
      "text": {
        "elements": [
          {"text_run": {"content": "新内容"}}
        ]
      }
    }
  ]
}
```

## 👥 用户与群组

### 搜索用户

```javascript
GET https://open.feishu.cn/open-apis/contact/v3/users/batch_get_id

// 按邮箱
{
  "emails": ["zhangsan@example.com"],
  "user_id_type": "open_id"
}
```

### 获取用户信息

```javascript
GET https://open.feishu.cn/open-apis/contact/v3/users/{user_id}

?user_id_type=open_id
```

### 搜索群组

```javascript
GET https://open.feishu.cn/open-apis/im/v1/chats

?query=技术部&page_size=20
```

### 发送消息

```javascript
POST https://open.feishu.cn/open-apis/im/v1/messages

{
  "receive_id": "ou_xxx",
  "msg_type": "text",
  "content": "{\"text\":\"你好\"}"
}
```

## 🔍 搜索

### 搜索文档

```javascript
POST https://open.feishu.cn/open-apis/drive/v1/search

{
  "query": "项目报告",
  "doc_types": ["DOC", "SHEET"],
  "page_size": 20
}
```

### 搜索消息

```javascript
GET https://open.feishu.cn/open-apis/im/v1/messages/search

?query=关键词&sender_id=ou_xxx
```

## 📝 常用代码片段

### 完整 API 调用示例

```javascript
async function feishuAPI(endpoint, method = 'GET', body = null) {
  const token = await getAccessToken();
  
  const response = await fetch(`https://open.feishu.cn${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

// 使用
const events = await feishuAPI('/open-apis/calendar/v4/calendars/primary/events');
```

### 错误处理

```javascript
try {
  const result = await feishuAPI('/endpoint', 'POST', data);
} catch (error) {
  if (error.code === 99991663) {
    console.error('票据过期，请重新授权');
  } else if (error.code === 99991661) {
    console.error('权限不足');
  } else {
    console.error(`API 错误：${error.message}`);
  }
}
```

### 分页处理

```javascript
async function fetchAll(endpoint) {
  const all = [];
  let pageToken = null;
  
  do {
    const url = pageToken 
      ? `${endpoint}?page_token=${pageToken}`
      : endpoint;
    
    const result = await feishuAPI(url);
    all.push(...result.data.items);
    pageToken = result.data.page_token;
  } while (pageToken);
  
  return all;
}
```

## 📮 更多资源

- [飞书开放平台](https://open.feishu.cn/)
- [API 文档](https://open.feishu.cn/document/)
- [OpenClaw 飞书技能](../../skills/feishu-bitable/SKILL.md)

---

_最后更新：2026-03-28_
