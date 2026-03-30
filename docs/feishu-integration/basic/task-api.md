# 飞书任务集成教程

> 使用 OpenClaw 管理飞书任务，实现自动化任务追踪

## 概述

本教程将教你如何使用 OpenClaw 调用飞书任务 API，实现：
- 创建和管理任务
- 管理任务清单
- 添加子任务和评论
- 设置负责人和截止时间
- 批量操作任务

## 前置准备

### 1. 获取飞书 API 凭证

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 `App ID` 和 `App Secret`
4. 配置权限：
   - 任务权限：`task:task`、`task:tasklist`

### 2. 配置 OpenClaw

在 OpenClaw 配置文件中添加飞书插件配置：

```yaml
plugins:
  feishu:
    app_id: cli_xxxxxxxxxxxxx
    app_secret: xxxxxxxxxxxxxxx
```

## 基础操作

### 创建任务

```javascript
// examples/feishu/create-task.js
const { feishu_task_task } = require('@openclaw/feishu');

async function createTask(userOpenId) {
  const result = await feishu_task_task({
    action: 'create',
    // 强烈建议：传入当前用户 open_id
    current_user_id: userOpenId,
    summary: '完成飞书集成教程编写',
    description: '包括多维表格、日历、任务、文档四个部分的教程',
    // 开始时间
    start: {
      timestamp: '2026-03-18T09:00:00+08:00',
      is_all_day: false
    },
    // 截止时间
    due: {
      timestamp: '2026-03-20T18:00:00+08:00',
      is_all_day: false
    },
    // 任务成员
    members: [
      { 
        id: 'ou_xxxxxxxxxxxxx', 
        role: 'assignee'  // 负责人
      },
      { 
        id: 'ou_yyyyyyyyyyyyy', 
        role: 'follower'  // 关注人
      }
    ],
    // 所属任务清单（可选）
    tasklists: [
      {
        tasklist_guid: 'tl_xxxxxxxxxxxxx'
      }
    ]
  });
  
  console.log('任务创建成功:', result);
  console.log('Task GUID:', result.task_guid);
  return result;
}

createTask('ou_xxxxxxxxxxxxx');
```

### 查询任务列表

```javascript
// examples/feishu/list-tasks.js
const { feishu_task_task } = require('@openclaw/feishu');

async function listTasks(userOpenId, completed = false) {
  const result = await feishu_task_task({
    action: 'list',
    current_user_id: userOpenId,
    completed: completed,  // true=已完成，false=未完成
    page_size: 50
  });
  
  console.log(`共 ${result.tasks.length} 个任务:`);
  result.tasks.forEach(task => {
    const status = task.completed ? '✅' : '⏳';
    console.log(`${status} ${task.summary} - 截止：${task.due?.timestamp || '无'}`);
  });
  
  return result.tasks;
}

listTasks('ou_xxxxxxxxxxxxx');
```

### 查询任务详情

```javascript
// examples/feishu/get-task.js
const { feishu_task_task } = require('@openclaw/feishu');

async function getTask(taskGuid) {
  const result = await feishu_task_task({
    action: 'get',
    task_guid: taskGuid
  });
  
  console.log('任务详情:', result);
  return result;
}

getTask('tascnxxxxxxxxxxxx');
```

### 更新任务

```javascript
// examples/feishu/update-task.js
const { feishu_task_task } = require('@openclaw/feishu');

async function updateTask(taskGuid) {
  const result = await feishu_task_task({
    action: 'patch',
    task_guid: taskGuid,
    summary: '完成飞书集成教程编写（已更新）',
    description: '教程已完成 80%，剩余视频教程脚本',
    due: {
      timestamp: '2026-03-21T18:00:00+08:00',
      is_all_day: false
    }
  });
  
  console.log('任务更新成功:', result);
  return result;
}

updateTask('tascnxxxxxxxxxxxx');
```

### 完成任务

```javascript
// examples/feishu/complete-task.js
const { feishu_task_task } = require('@openclaw/feishu');

async function completeTask(taskGuid) {
  const result = await feishu_task_task({
    action: 'patch',
    task_guid: taskGuid,
    // 设为已完成（三种方式）
    completed_at: new Date().toISOString()  // 方式 1：ISO 时间
    // completed_at: '0'  // 方式 2：反完成（设为未完成）
    // completed_at: String(Date.now())  // 方式 3：毫秒时间戳
  });
  
  console.log('任务已完成:', result);
  return result;
}

completeTask('tascnxxxxxxxxxxxx');
```

### 删除任务

```javascript
// examples/feishu/delete-task.js
const { feishu_task_task } = require('@openclaw/feishu');

async function deleteTask(taskGuid) {
  const result = await feishu_task_task({
    action: 'patch',
    task_guid: taskGuid,
    // 飞书任务 API 不支持直接删除，可以通过更新状态标记
    // 实际使用中建议通过完成任务来代替删除
    completed_at: new Date().toISOString()
  });
  
  console.log('任务已标记为完成:', result);
  return result;
}

deleteTask('tascnxxxxxxxxxxxx');
```

## 任务清单管理

### 创建任务清单

```javascript
// examples/feishu/create-tasklist.js
const { feishu_task_tasklist } = require('@openclaw/feishu');

async function createTasklist() {
  const result = await feishu_task_tasklist({
    action: 'create',
    name: 'OpenClaw 文档项目',
    // 清单成员
    members: [
      { 
        id: 'ou_xxxxxxxxxxxxx', 
        role: 'editor'  // 可编辑
      },
      { 
        id: 'ou_yyyyyyyyyyyyy', 
        role: 'viewer'  // 仅查看
      }
    ]
  });
  
  console.log('任务清单创建成功:', result);
  console.log('Tasklist GUID:', result.tasklist_guid);
  return result;
}

createTasklist();
```

### 查询任务清单列表

```javascript
// examples/feishu/list-tasklists.js
const { feishu_task_tasklist } = require('@openclaw/feishu');

async function listTasklists() {
  const result = await feishu_task_tasklist({
    action: 'list',
    page_size: 50
  });
  
  console.log(`共 ${result.tasklists.length} 个清单:`);
  result.tasklists.forEach(list => {
    console.log(`- ${list.name} (${list.tasklist_guid})`);
  });
  
  return result.tasklists;
}

listTasklists();
```

### 查询清单详情

```javascript
// examples/feishu/get-tasklist.js
const { feishu_task_tasklist } = require('@openclaw/feishu');

async function getTasklist(tasklistGuid) {
  const result = await feishu_task_tasklist({
    action: 'get',
    tasklist_guid: tasklistGuid
  });
  
  console.log('清单详情:', result);
  return result;
}

getTasklist('tl_xxxxxxxxxxxxx');
```

### 查询清单内的任务

```javascript
// examples/feishu/list-tasklist-tasks.js
const { feishu_task_tasklist } = require('@openclaw/feishu');

async function listTasklistTasks(tasklistGuid, completed = false) {
  const result = await feishu_task_tasklist({
    action: 'tasks',
    tasklist_guid: tasklistGuid,
    completed: completed,
    page_size: 50
  });
  
  console.log(`共 ${result.tasks.length} 个任务:`);
  result.tasks.forEach(task => {
    const status = task.completed ? '✅' : '⏳';
    console.log(`${status} ${task.summary}`);
  });
  
  return result.tasks;
}

listTasklistTasks('tl_xxxxxxxxxxxxx');
```

### 更新清单

```javascript
// examples/feishu/update-tasklist.js
const { feishu_task_tasklist } = require('@openclaw/feishu');

async function updateTasklist(tasklistGuid) {
  const result = await feishu_task_tasklist({
    action: 'patch',
    tasklist_guid: tasklistGuid,
    name: 'OpenClaw 文档项目（2026 Q1）'
  });
  
  console.log('清单更新成功:', result);
  return result;
}

updateTasklist('tl_xxxxxxxxxxxxx');
```

### 删除清单

```javascript
// examples/feishu/delete-tasklist.js
const { feishu_task_tasklist } = require('@openclaw/feishu');

async function deleteTasklist(tasklistGuid) {
  const result = await feishu_task_tasklist({
    action: 'delete',
    tasklist_guid: tasklistGuid
  });
  
  console.log('清单删除成功:', result);
  return result;
}

deleteTasklist('tl_xxxxxxxxxxxxx');
```

### 管理清单成员

```javascript
// examples/feishu/manage-tasklist-members.js
const { feishu_task_tasklist } = require('@openclaw/feishu');

async function addTasklistMembers(tasklistGuid) {
  const result = await feishu_task_tasklist({
    action: 'add_members',
    tasklist_guid: tasklistGuid,
    members: [
      { 
        id: 'ou_zzzzzzzzzzzzz', 
        role: 'editor' 
      }
    ]
  });
  
  console.log('成员添加成功:', result);
  return result;
}

async function removeTasklistMembers(tasklistGuid, memberIds) {
  const result = await feishu_task_tasklist({
    action: 'remove_members',
    tasklist_guid: tasklistGuid,
    members: memberIds.map(id => ({ id }))
  });
  
  console.log('成员移除成功:', result);
  return result;
}

addTasklistMembers('tl_xxxxxxxxxxxxx');
```

## 子任务管理

### 创建子任务

```javascript
// examples/feishu/create-subtask.js
const { feishu_task_subtask } = require('@openclaw/feishu');

async function createSubtask(taskGuid) {
  const result = await feishu_task_subtask({
    action: 'create',
    task_guid: taskGuid,
    summary: '编写多维表格教程',
    description: '包括基础操作、字段管理、视图管理、实战案例',
    start: {
      timestamp: '2026-03-18T09:00:00+08:00',
      is_all_day: false
    },
    due: {
      timestamp: '2026-03-19T18:00:00+08:00',
      is_all_day: false
    },
    members: [
      { 
        id: 'ou_xxxxxxxxxxxxx', 
        role: 'assignee' 
      }
    ]
  });
  
  console.log('子任务创建成功:', result);
  return result;
}

createSubtask('tascnxxxxxxxxxxxx');
```

### 查询子任务列表

```javascript
// examples/feishu/list-subtasks.js
const { feishu_task_subtask } = require('@openclaw/feishu');

async function listSubtasks(taskGuid) {
  const result = await feishu_task_subtask({
    action: 'list',
    task_guid: taskGuid,
    page_size: 50
  });
  
  console.log(`共 ${result.tasks.length} 个子任务:`);
  result.tasks.forEach(task => {
    const status = task.completed ? '✅' : '⏳';
    console.log(`${status} ${task.summary}`);
  });
  
  return result.tasks;
}

listSubtasks('tascnxxxxxxxxxxxx');
```

## 任务评论

### 添加评论

```javascript
// examples/feishu/create-comment.js
const { feishu_task_comment } = require('@openclaw/feishu');

async function createComment(taskGuid) {
  const result = await feishu_task_comment({
    action: 'create',
    task_guid: taskGuid,
    content: '教程已完成初稿，请 review',
    // 回复某条评论（可选）
    // reply_to_comment_id: 'cmt_xxxxxxxxxxxxx'
  });
  
  console.log('评论添加成功:', result);
  return result;
}

createComment('tascnxxxxxxxxxxxx');
```

### 查询评论列表

```javascript
// examples/feishu/list-comments.js
const { feishu_task_comment } = require('@openclaw/feishu');

async function listComments(taskGuid) {
  const result = await feishu_task_comment({
    action: 'list',
    task_guid: taskGuid,
    page_size: 50,
    direction: 'desc'  // desc=从新到旧，asc=从旧到新
  });
  
  console.log(`共 ${result.comments.length} 条评论:`);
  result.comments.forEach(comment => {
    console.log(`- ${comment.author?.name}: ${comment.content}`);
  });
  
  return result.comments;
}

listComments('tascnxxxxxxxxxxxx');
```

### 获取评论详情

```javascript
// examples/feishu/get-comment.js
const { feishu_task_comment } = require('@openclaw/feishu');

async function getComment(commentId) {
  const result = await feishu_task_comment({
    action: 'get',
    resource_id: commentId
  });
  
  console.log('评论详情:', result);
  return result;
}

getComment('cmt_xxxxxxxxxxxxx');
```

## 实战案例

### 案例 1：项目任务分解

```javascript
// examples/feishu/project-breakdown.js
const { feishu_task_tasklist, feishu_task_task, feishu_task_subtask } = require('@openclaw/feishu');

async function setupProjectTasks(userOpenId, projectName, phases) {
  // 1. 创建任务清单
  const tasklist = await feishu_task_tasklist({
    action: 'create',
    name: projectName,
    members: [
      { id: userOpenId, role: 'editor' }
    ]
  });
  
  console.log(`创建任务清单：${tasklist.name}`);
  
  // 2. 为每个阶段创建主任务
  for (const phase of phases) {
    const mainTask = await feishu_task_task({
      action: 'create',
      current_user_id: userOpenId,
      summary: phase.name,
      description: phase.description,
      start: {
        timestamp: phase.startDate,
        is_all_day: false
      },
      due: {
        timestamp: phase.dueDate,
        is_all_day: false
      },
      tasklists: [
        { tasklist_guid: tasklist.tasklist_guid }
      ]
    });
    
    console.log(`创建主任务：${mainTask.summary}`);
    
    // 3. 为每个阶段创建子任务
    for (const subtask of phase.subtasks) {
      await feishu_task_subtask({
        action: 'create',
        task_guid: mainTask.task_guid,
        summary: subtask.name,
        description: subtask.description,
        due: {
          timestamp: subtask.dueDate,
          is_all_day: false
        },
        members: subtask.assignee ? [
          { id: subtask.assignee, role: 'assignee' }
        ] : []
      });
    }
  }
  
  console.log(`项目任务分解完成：${projectName}`);
  return { tasklist, phases };
}

// 使用示例
setupProjectTasks('ou_xxxxxxxxxxxxx', 'OpenClaw 文档项目', [
  {
    name: '基础教程编写',
    description: '完成飞书系列教程',
    startDate: '2026-03-18T09:00:00+08:00',
    dueDate: '2026-03-20T18:00:00+08:00',
    subtasks: [
      { name: '多维表格教程', dueDate: '2026-03-18T18:00:00+08:00' },
      { name: '日历教程', dueDate: '2026-03-19T12:00:00+08:00' },
      { name: '任务教程', dueDate: '2026-03-19T18:00:00+08:00' },
      { name: '文档教程', dueDate: '2026-03-20T18:00:00+08:00' }
    ]
  },
  {
    name: '实战工作流开发',
    description: '创建常用工作流模板',
    startDate: '2026-03-21T09:00:00+08:00',
    dueDate: '2026-03-25T18:00:00+08:00',
    subtasks: [
      { name: '晨间简报', dueDate: '2026-03-22T18:00:00+08:00' },
      { name: '会议纪要', dueDate: '2026-03-23T18:00:00+08:00' },
      { name: '周报生成', dueDate: '2026-03-24T18:00:00+08:00' },
      { name: '项目追踪', dueDate: '2026-03-25T18:00:00+08:00' }
    ]
  }
]);
```

### 案例 2：每日站会任务同步

```javascript
// examples/feishu/daily-standup.js
const { feishu_task_task } = require('@openclaw/feishu');

async function syncDailyStandup(userOpenId, standupData) {
  const today = new Date().toISOString().split('T')[0];
  
  // 1. 查询今天的任务
  const tasks = await feishu_task_task({
    action: 'list',
    current_user_id: userOpenId,
    completed: false,
    page_size: 50
  });
  
  // 2. 筛选出今天的任务
  const todayTasks = tasks.tasks.filter(task => {
    if (!task.due?.timestamp) return false;
    const dueDate = task.due.timestamp.split('T')[0];
    return dueDate === today;
  });
  
  // 3. 生成站会报告
  const report = {
    date: today,
    name: standupData.name,
    yesterday: standupData.yesterday,
    today: todayTasks.map(t => `- ${t.summary}`).join('\n'),
    blockers: standupData.blockers || '无'
  };
  
  console.log('=== 每日站会 ===');
  console.log(`日期：${report.date}`);
  console.log(`姓名：${report.name}`);
  console.log(`昨天完成：${report.yesterday}`);
  console.log(`今天计划：\n${report.today}`);
  console.log(`遇到阻碍：${report.blockers}`);
  
  return report;
}

// 使用示例
syncDailyStandup('ou_xxxxxxxxxxxxx', {
  name: '张三',
  yesterday: '完成飞书多维表格教程编写',
  blockers: '需要确认 API 权限配置'
});
```

### 案例 3：任务自动分配

```javascript
// examples/feishu/auto-assign-task.js
const { feishu_task_task, feishu_search_user } = require('@openclaw/feishu');

async function createAndAssignTask(userOpenId, taskData) {
  // 1. 搜索负责人
  let assigneeId = taskData.assignee;
  if (typeof taskData.assignee === 'string') {
    const users = await feishu_search_user({ query: taskData.assignee });
    if (users.users.length > 0) {
      assigneeId = users.users[0].open_id;
    } else {
      throw new Error(`找不到用户：${taskData.assignee}`);
    }
  }
  
  // 2. 创建任务
  const task = await feishu_task_task({
    action: 'create',
    current_user_id: userOpenId,
    summary: taskData.summary,
    description: taskData.description,
    due: {
      timestamp: taskData.dueDate,
      is_all_day: false
    },
    members: [
      { id: assigneeId, role: 'assignee' },
      { id: userOpenId, role: 'follower' }  // 创建者作为关注人
    ]
  });
  
  console.log(`任务创建并分配给 ${taskData.assignee}: ${task.summary}`);
  return task;
}

// 使用示例
createAndAssignTask('ou_xxxxxxxxxxxxx', {
  summary: 'Review 飞书教程 PR',
  description: '检查教程内容是否完整、准确',
  assignee: '张三',  // 可以是姓名或 open_id
  dueDate: '2026-03-19T18:00:00+08:00'
});
```

## 最佳实践

### 1. 任务分解原则

```javascript
// ✅ 推荐：合理分解任务
// 主任务：完成飞书教程编写
//   ├─ 子任务：多维表格教程（1 天）
//   ├─ 子任务：日历教程（0.5 天）
//   ├─ 子任务：任务教程（0.5 天）
//   └─ 子任务：文档教程（1 天）

// ❌ 避免：任务过大或过小
// 主任务：完成所有文档（太大，无法追踪）
// 子任务：写一个字（太小，无意义）
```

### 2. 截止时间设置

```javascript
// ✅ 推荐：设置明确的截止时间
due: {
  timestamp: '2026-03-20T18:00:00+08:00',
  is_all_day: false
}

// ✅ 全天任务（如生日、纪念日）
due: {
  timestamp: '2026-03-20T00:00:00+08:00',
  is_all_day: true
}
```

### 3. 任务状态管理

```javascript
// 使用评论记录进度，而不是频繁更新任务描述
await feishu_task_comment({
  action: 'create',
  task_guid: taskGuid,
  content: '进度更新：已完成 50%，剩余视频教程部分'
});
```

## 相关资源

- [飞书任务 API 文档](https://open.feishu.cn/document/ukTMukTMukTM/uYjNwUjL5YDM14iN2ATN)
- [示例代码仓库](https://github.com/rookie1989/claw-picker/tree/main/examples/feishu)

## 下一步

- 📊 学习 [飞书多维表格集成](./bitable-integration.md)
- 📅 学习 [飞书日历集成](./calendar-integration.md)
- 📄 学习 [飞书文档集成](./doc-integration.md)
- 🔧 查看 [完整工作流模板](../workflows/)
