# 飞书多维表格集成教程

> 使用 OpenClaw 操作飞书多维表格，实现自动化数据管理

## 概述

本教程将教你如何使用 OpenClaw 调用飞书多维表格 API，实现：
- 创建和管理多维表格应用
- 增删改查记录（行数据）
- 管理字段（列）和视图
- 批量导入和更新数据

## 前置准备

### 1. 获取飞书 API 凭证

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 `App ID` 和 `App Secret`
4. 配置权限：
   - 多维表格权限：`bitable:app`、`bitable:table`、`bitable:record`
   - 联系人权限：`contact:user`（如需操作用户字段）

### 2. 配置 OpenClaw

在 OpenClaw 配置文件中添加飞书插件配置：

```yaml
plugins:
  feishu:
    app_id: cli_xxxxxxxxxxxxx
    app_secret: xxxxxxxxxxxxxxx
    # 可选：配置默认的多维表格 token
    default_bitable_token: bascnxxxxxxxxxxxx
```

## 基础操作

### 创建多维表格应用

```javascript
// examples/feishu/create-bitable.js
const { feishu_bitable_app } = require('@openclaw/feishu');

async function createBitable() {
  const result = await feishu_bitable_app({
    action: 'create',
    name: '项目管理表',
    is_advanced: true  // 开启高级权限
  });
  
  console.log('创建成功:', result);
  console.log('App Token:', result.app_token);
  return result.app_token;
}

createBitable();
```

### 创建数据表

```javascript
// examples/feishu/create-table.js
const { feishu_bitable_app_table } = require('@openclaw/feishu');

async function createTable(appToken) {
  const result = await feishu_bitable_app_table({
    action: 'create',
    app_token: appToken,
    table: {
      name: '任务列表',
      // 创建时直接定义字段
      fields: [
        {
          field_name: '任务名称',
          type: 1  // 1=文本
        },
        {
          field_name: '负责人',
          type: 11  // 11=人员
        },
        {
          field_name: '截止日期',
          type: 5  // 5=日期
        },
        {
          field_name: '优先级',
          type: 3,  // 3=单选
          property: {
            options: [
              { name: '高', color: 'red' },
              { name: '中', color: 'yellow' },
              { name: '低', color: 'green' }
            ]
          }
        },
        {
          field_name: '状态',
          type: 3,  // 3=单选
          property: {
            options: [
              { name: '未开始', color: 'gray' },
              { name: '进行中', color: 'blue' },
              { name: '已完成', color: 'green' }
            ]
          }
        }
      ]
    }
  });
  
  console.log('表创建成功:', result);
  return result.table_id;
}

createTable('bascnxxxxxxxxxxxx');
```

### 添加记录

#### 单条创建

```javascript
// examples/feishu/create-record.js
const { feishu_bitable_app_table_record } = require('@openclaw/feishu');

async function createRecord(appToken, tableId) {
  const result = await feishu_bitable_app_table_record({
    action: 'create',
    app_token: appToken,
    table_id: tableId,
    fields: {
      '任务名称': '完成项目文档',
      '负责人': [{ id: 'ou_xxxxxxxxxxxxx' }],  // 用户 open_id
      '截止日期': Date.now(),  // 毫秒时间戳
      '优先级': '高',
      '状态': '进行中'
    }
  });
  
  console.log('记录创建成功:', result);
  return result.record_id;
}

createRecord('bascnxxxxxxxxxxxx', 'tblxxxxxxxxxxxx');
```

#### 批量创建

```javascript
// examples/feishu/batch-create-records.js
const { feishu_bitable_app_table_record } = require('@openclaw/feishu');

async function batchCreateRecords(appToken, tableId) {
  const records = [
    {
      fields: {
        '任务名称': '需求分析',
        '优先级': '高',
        '状态': '已完成'
      }
    },
    {
      fields: {
        '任务名称': '系统设计',
        '优先级': '高',
        '状态': '进行中'
      }
    },
    {
      fields: {
        '任务名称': '编码实现',
        '优先级': '中',
        '状态': '未开始'
      }
    },
    {
      fields: {
        '任务名称': '测试验证',
        '优先级': '中',
        '状态': '未开始'
      }
    }
  ];
  
  const result = await feishu_bitable_app_table_record({
    action: 'batch_create',
    app_token: appToken,
    table_id: tableId,
    records: records
  });
  
  console.log(`批量创建 ${result.records.length} 条记录`);
  return result.records;
}

batchCreateRecords('bascnxxxxxxxxxxxx', 'tblxxxxxxxxxxxx');
```

### 查询记录

#### 基础查询

```javascript
// examples/feishu/list-records.js
const { feishu_bitable_app_table_record } = require('@openclaw/feishu');

async function listRecords(appToken, tableId) {
  const result = await feishu_bitable_app_table_record({
    action: 'list',
    app_token: appToken,
    table_id: tableId,
    page_size: 50,  // 每页最多 500 条
    automatic_fields: true  // 返回创建时间等自动字段
  });
  
  console.log(`共 ${result.total} 条记录`);
  result.records.forEach(record => {
    console.log(`- ${record.fields['任务名称']}: ${record.fields['状态']}`);
  });
  
  return result.records;
}

listRecords('bascnxxxxxxxxxxxx', 'tblxxxxxxxxxxxx');
```

#### 条件筛选

```javascript
// examples/feishu/filter-records.js
const { feishu_bitable_app_table_record } = require('@openclaw/feishu');

async function filterRecords(appToken, tableId) {
  const result = await feishu_bitable_app_table_record({
    action: 'list',
    app_token: appToken,
    table_id: tableId,
    filter: {
      conjunction: 'and',
      conditions: [
        {
          field_name: '状态',
          operator: 'is',
          value: ['进行中']
        },
        {
          field_name: '优先级',
          operator: 'is',
          value: ['高']
        }
      ]
    },
    sort: [
      {
        field_name: '截止日期',
        desc: false  // 升序
      }
    ]
  });
  
  console.log(`找到 ${result.records.length} 条记录`);
  return result.records;
}

filterRecords('bascnxxxxxxxxxxxx', 'tblxxxxxxxxxxxx');
```

### 更新记录

```javascript
// examples/feishu/update-record.js
const { feishu_bitable_app_table_record } = require('@openclaw/feishu');

async function updateRecord(appToken, tableId, recordId) {
  const result = await feishu_bitable_app_table_record({
    action: 'update',
    app_token: appToken,
    table_id: tableId,
    record_id: recordId,
    fields: {
      '状态': '已完成',
      '优先级': '低'
    }
  });
  
  console.log('记录更新成功:', result);
  return result;
}

updateRecord('bascnxxxxxxxxxxxx', 'tblxxxxxxxxxxxx', 'recxxxxxxxxxxxx');
```

### 删除记录

```javascript
// examples/feishu/delete-record.js
const { feishu_bitable_app_table_record } = require('@openclaw/feishu');

async function deleteRecord(appToken, tableId, recordId) {
  const result = await feishu_bitable_app_table_record({
    action: 'delete',
    app_token: appToken,
    table_id: tableId,
    record_id: recordId
  });
  
  console.log('记录删除成功:', result);
  return result;
}

deleteRecord('bascnxxxxxxxxxxxx', 'tblxxxxxxxxxxxx', 'recxxxxxxxxxxxx');
```

## 字段管理

### 创建字段

```javascript
// examples/feishu/create-field.js
const { feishu_bitable_app_table_field } = require('@openclaw/feishu');

async function createField(appToken, tableId) {
  const result = await feishu_bitable_app_table_field({
    action: 'create',
    app_token: appToken,
    table_id: tableId,
    field_name: '备注',
    type: 1  // 1=文本
  });
  
  console.log('字段创建成功:', result);
  return result.field_id;
}

createField('bascnxxxxxxxxxxxx', 'tblxxxxxxxxxxxx');
```

### 常用字段类型

| 类型代码 | 字段类型 | 说明 |
|---------|---------|------|
| 1 | 文本 | 单行文本 |
| 2 | 数字 | 支持小数、整数 |
| 3 | 单选 | 下拉单选 |
| 4 | 多选 | 下拉多选 |
| 5 | 日期 | 日期时间 |
| 7 | 复选框 | 是/否 |
| 11 | 人员 | 飞书用户 |
| 13 | 电话 | 电话号码 |
| 15 | 超链接 | URL 链接 |
| 17 | 附件 | 文件上传 |
| 1001 | 创建时间 | 自动记录 |
| 1002 | 修改时间 | 自动记录 |

## 视图管理

### 创建视图

```javascript
// examples/feishu/create-view.js
const { feishu_bitable_app_table_view } = require('@openclaw/feishu');

async function createView(appToken, tableId) {
  const result = await feishu_bitable_app_table_view({
    action: 'create',
    app_token: appToken,
    table_id: tableId,
    view_name: '看板视图',
    view_type: 'kanban'  // grid/kanban/gallery/gantt/form
  });
  
  console.log('视图创建成功:', result);
  return result.view_id;
}

createView('bascnxxxxxxxxxxxx', 'tblxxxxxxxxxxxx');
```

## 实战案例

### 案例 1：项目任务追踪

```javascript
// examples/feishu/project-tracker.js
const { feishu_bitable_app, feishu_bitable_app_table, feishu_bitable_app_table_record } = require('@openclaw/feishu');

async function setupProjectTracker(projectName, tasks) {
  // 1. 创建多维表格
  const bitable = await feishu_bitable_app({
    action: 'create',
    name: `${projectName} - 项目追踪`
  });
  
  // 2. 创建任务表
  const table = await feishu_bitable_app_table({
    action: 'create',
    app_token: bitable.app_token,
    table: {
      name: '任务清单',
      fields: [
        { field_name: '任务名称', type: 1 },
        { field_name: '描述', type: 1 },
        { field_name: '负责人', type: 11 },
        { field_name: '开始日期', type: 5 },
        { field_name: '截止日期', type: 5 },
        { 
          field_name: '优先级', 
          type: 3,
          property: {
            options: [
              { name: 'P0-紧急', color: 'red' },
              { name: 'P1-重要', color: 'orange' },
              { name: 'P2-普通', color: 'blue' }
            ]
          }
        },
        { 
          field_name: '状态', 
          type: 3,
          property: {
            options: [
              { name: '待办', color: 'gray' },
              { name: '进行中', color: 'blue' },
              { name: '已完成', color: 'green' }
            ]
          }
        },
        { field_name: '完成百分比', type: 2 }
      ]
    }
  });
  
  // 3. 批量创建任务
  const records = tasks.map(task => ({
    fields: {
      '任务名称': task.name,
      '描述': task.description || '',
      '负责人': task.assignee ? [{ id: task.assignee }] : [],
      '开始日期': task.startDate ? new Date(task.startDate).getTime() : null,
      '截止日期': task.dueDate ? new Date(task.dueDate).getTime() : null,
      '优先级': task.priority || 'P2-普通',
      '状态': task.status || '待办',
      '完成百分比': task.progress || 0
    }
  }));
  
  await feishu_bitable_app_table_record({
    action: 'batch_create',
    app_token: bitable.app_token,
    table_id: table.table_id,
    records: records
  });
  
  console.log(`项目追踪表创建完成：${bitable.name}`);
  console.log(`共创建 ${records.length} 个任务`);
  
  return {
    app_token: bitable.app_token,
    table_id: table.table_id
  };
}

// 使用示例
setupProjectTracker('OpenClaw 文档项目', [
  { name: '编写入门教程', priority: 'P0-紧急', dueDate: '2026-03-20' },
  { name: '创建示例代码', priority: 'P1-重要', dueDate: '2026-03-22' },
  { name: '录制视频教程', priority: 'P2-普通', dueDate: '2026-03-25' }
]);
```

### 案例 2：晨间简报数据收集

```javascript
// examples/feishu/daily-standup.js
const { feishu_bitable_app_table_record } = require('@openclaw/feishu');

async function submitDailyStandup(appToken, tableId, standup) {
  const result = await feishu_bitable_app_table_record({
    action: 'create',
    app_token: appToken,
    table_id: tableId,
    fields: {
      '日期': Date.now(),
      '姓名': standup.name,
      '昨天完成': standup.yesterday,
      '今天计划': standup.today,
      '遇到阻碍': standup.blockers || '无'
    }
  });
  
  return result;
}

// 使用示例
submitDailyStandup('bascnxxxxxxxxxxxx', 'tblxxxxxxxxxxxx', {
  name: '张三',
  yesterday: '完成飞书集成教程编写',
  today: '创建实战工作流模板',
  blockers: '需要确认 API 权限配置'
});
```

## 最佳实践

### 1. 批量操作优先

```javascript
// ❌ 避免：逐条创建
for (const task of tasks) {
  await feishu_bitable_app_table_record({
    action: 'create',
    // ...
  });
}

// ✅ 推荐：批量创建
await feishu_bitable_app_table_record({
  action: 'batch_create',
  records: tasks.map(task => ({ fields: task }))
});
```

### 2. 错误处理

```javascript
async function safeCreateRecord(appToken, tableId, fields) {
  try {
    const result = await feishu_bitable_app_table_record({
      action: 'create',
      app_token: appToken,
      table_id: tableId,
      fields
    });
    return result;
  } catch (error) {
    if (error.code === 429) {
      // 触发限流，等待后重试
      await sleep(1000);
      return safeCreateRecord(appToken, tableId, fields);
    }
    throw error;
  }
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

## 相关资源

- [飞书多维表格 API 文档](https://open.feishu.cn/document/ukTMukTMukTM/uEjNwUjLxYDM14SM2ATN)
- [OpenClaw 飞书插件源码](https://github.com/openclaw/openclaw)
- [示例代码仓库](https://github.com/rookie1989/claw-picker/tree/main/examples/feishu)

## 下一步

- 📅 学习 [飞书日历集成](./calendar-integration.md)
- ✅ 学习 [飞书任务集成](./task-integration.md)
- 📄 学习 [飞书文档集成](./doc-integration.md)
- 🔧 查看 [完整工作流模板](../workflows/)
