# 实战工作流模板

> 基于 OpenClaw + 飞书的自动化工作流，提升日常工作效率

## 工作流列表

1. [晨间简报](#晨间简报) - 每日自动收集任务和日程
2. [会议纪要](#会议纪要) - 会后自动生成纪要和待办
3. [周报生成](#周报生成) - 每周自动汇总工作内容
4. [项目追踪](#项目追踪) - 实时更新项目进度

---

## 晨间简报

### 功能说明

每天早上 9:00 自动发送晨间简报，包括：
- 今日日程安排
- 到期任务提醒
- 昨日完成情况

### 配置步骤

#### 1. 创建任务清单

```javascript
// workflows/morning-briefing/setup.js
const { feishu_task_tasklist } = require('@openclaw/feishu');

async function setupMorningBriefing(userOpenId) {
  // 创建晨间简报任务清单
  const tasklist = await feishu_task_tasklist({
    action: 'create',
    name: '晨间简报',
    members: [
      { id: userOpenId, role: 'editor' }
    ]
  });
  
  console.log('任务清单创建成功:', tasklist.tasklist_guid);
  return tasklist;
}
```

#### 2. 创建简报生成脚本

```javascript
// workflows/morning-briefing/generate.js
const { 
  feishu_calendar_event, 
  feishu_task_task,
  feishu_im_user_message 
} = require('@openclaw/feishu');

async function generateMorningBriefing(userOpenId, chatId) {
  const today = new Date();
  const todayStart = today.toISOString().split('T')[0] + 'T00:00:00+08:00';
  const todayEnd = today.toISOString().split('T')[0] + 'T23:59:59+08:00';
  
  // 1. 查询今日日程
  const events = await feishu_calendar_event({
    action: 'list',
    user_open_id: userOpenId,
    start_time: todayStart,
    end_time: todayEnd
  });
  
  // 2. 查询到期任务
  const tasks = await feishu_task_task({
    action: 'list',
    current_user_id: userOpenId,
    completed: false,
    page_size: 50
  });
  
  // 筛选今天到期的任务
  const dueTasks = tasks.tasks.filter(task => {
    if (!task.due?.timestamp) return false;
    const dueDate = task.due.timestamp.split('T')[0];
    return dueDate === today.toISOString().split('T')[0];
  });
  
  // 3. 查询昨日完成的任务
  const completedTasks = await feishu_task_task({
    action: 'list',
    current_user_id: userOpenId,
    completed: true,
    page_size: 50
  });
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const yesterdayCompleted = completedTasks.tasks.filter(task => {
    if (!task.completed_at) return false;
    const completedDate = new Date(task.completed_at).toISOString().split('T')[0];
    return completedDate === yesterdayStr;
  });
  
  // 4. 生成简报内容
  const briefing = `🌞 晨间简报 - ${today.toISOString().split('T')[0]}

📅 今日日程 (${events.events.length}个)
${events.events.map(e => `• ${e.start_time.split('T')[1].substring(0, 5)} ${e.summary}`).join('\n') || '• 无日程安排'}

✅ 到期任务 (${dueTasks.length}个)
${dueTasks.map(t => `• ${t.summary}`).join('\n') || '• 无到期任务'}

✨ 昨日完成 (${yesterdayCompleted.length}个)
${yesterdayCompleted.map(t => `• ${t.summary}`).join('\n') || '• 无完成任务'}

祝你今天工作顺利！💪`;
  
  // 5. 发送简报到群聊
  await feishu_im_user_message({
    action: 'send',
    receive_id_type: 'chat_id',
    receive_id: chatId,
    msg_type: 'text',
    content: JSON.stringify({ text: briefing })
  });
  
  console.log('晨间简报发送成功');
  return briefing;
}

module.exports = { generateMorningBriefing };
```

#### 3. 配置定时任务

```yaml
# config/cron/morning-briefing.yaml
schedules:
  - name: morning-briefing
    cron: '0 9 * * 1-5'  # 工作日早上 9 点
    script: workflows/morning-briefing/generate.js
    env:
      USER_OPEN_ID: ou_xxxxxxxxxxxxx
      CHAT_ID: oc_xxxxxxxxxxxxx
```

### 使用示例

```bash
# 手动触发晨间简报
node workflows/morning-briefing/generate.js
```

---

## 会议纪要

### 功能说明

会议结束后自动生成会议纪要，包括：
- 会议基本信息
- 讨论议题
- 决议事项
- 待办任务（自动创建飞书任务）

### 配置步骤

#### 1. 创建会议纪要模板

```javascript
// workflows/meeting-minutes/template.js
const MINUTES_TEMPLATE = `# 会议纪要 - {meetingName}

## 基本信息
- **时间**: {time}
- **地点**: {location}
- **参会人**: {attendees}
- **记录人**: {recorder}

## 会议内容

### 讨论议题
{agendas}

### 决议事项
{decisions}

### 待办任务
{actionItems}

## 下次会议
- 时间：{nextMeetingTime}
- 议题：{nextMeetingAgenda}

---
*会议纪要自动生成于 {generatedAt}*
`;

module.exports = { MINUTES_TEMPLATE };
```

#### 2. 创建纪要生成脚本

```javascript
// workflows/meeting-minutes/generate.js
const { 
  feishu_calendar_event,
  feishu_calendar_event_attendee,
  feishu_create_doc,
  feishu_task_task,
  feishu_im_user_message
} = require('@openclaw/feishu');
const { MINUTES_TEMPLATE } = require('./template');

async function generateMeetingMinutes(eventId, meetingData, userOpenId) {
  // 1. 查询会议详情
  const event = await feishu_calendar_event({
    action: 'get',
    event_id: eventId
  });
  
  // 2. 查询参会人
  const attendees = await feishu_calendar_event_attendee({
    action: 'list',
    calendar_id: event.calendar_id,
    event_id: eventId
  });
  
  // 3. 填充模板
  const markdown = MINUTES_TEMPLATE
    .replace('{meetingName}', event.summary)
    .replace('{time}', `${event.start_time} - ${event.end_time}`)
    .replace('{location}', event.location?.name || '线上会议')
    .replace('{attendees}', attendees.attendees.map(a => a.display_name).join(', '))
    .replace('{recorder}', meetingData.recorder || '系统自动记录')
    .replace('{agendas}', meetingData.agendas.map((a, i) => `${i + 1}. ${a}`).join('\n'))
    .replace('{decisions}', meetingData.decisions.map(d => `- ${d}`).join('\n'))
    .replace('{actionItems}', meetingData.actionItems.map(item => 
      `- [ ] ${item.task} (@${item.assignee}, 截止：${item.dueDate})`
    ).join('\n'))
    .replace('{nextMeetingTime}', meetingData.nextMeetingTime || '待定')
    .replace('{nextMeetingAgenda}', meetingData.nextMeetingAgenda || '待定')
    .replace('{generatedAt}', new Date().toISOString());
  
  // 4. 创建纪要文档
  const doc = await feishu_create_doc({
    title: `会议纪要 - ${event.summary} - ${event.start_time.split('T')[0]}`,
    markdown: markdown
  });
  
  // 5. 创建待办任务
  const createdTasks = [];
  for (const item of meetingData.actionItems) {
    // 搜索负责人
    let assigneeId = item.assigneeId;
    if (!assigneeId && item.assignee) {
      // 这里可以调用 feishu_search_user 搜索用户
      assigneeId = userOpenId;  // 暂时使用当前用户
    }
    
    const task = await feishu_task_task({
      action: 'create',
      current_user_id: userOpenId,
      summary: `[会议待办] ${item.task}`,
      description: `来自会议：${event.summary}\n文档：${doc.url}`,
      due: {
        timestamp: new Date(item.dueDate).toISOString(),
        is_all_day: false
      },
      members: assigneeId ? [
        { id: assigneeId, role: 'assignee' }
      ] : []
    });
    
    createdTasks.push(task);
  }
  
  // 6. 发送通知
  const notification = `📋 会议纪要已生成

**会议**: ${event.summary}
**时间**: ${event.start_time.split('T')[1].substring(0, 5)} - ${event.end_time.split('T')[1].substring(0, 5)}

📄 纪要文档：${doc.url}

✅ 已创建 ${createdTasks.length} 个待办任务`;
  
  if (meetingData.chatId) {
    await feishu_im_user_message({
      action: 'send',
      receive_id_type: 'chat_id',
      receive_id: meetingData.chatId,
      msg_type: 'text',
      content: JSON.stringify({ text: notification })
    });
  }
  
  console.log('会议纪要生成成功');
  return { doc, tasks: createdTasks };
}

module.exports = { generateMeetingMinutes };
```

#### 3. 使用示例

```javascript
// 触发会议纪要生成
const { generateMeetingMinutes } = require('./workflows/meeting-minutes/generate');

generateMeetingMinutes('evt_xxxxxxxxxxxxx', {
  recorder: '张三',
  agendas: [
    '项目进度同步',
    '技术方案讨论',
    '资源分配'
  ],
  decisions: [
    '确定使用方案 A',
    '下周一开始开发',
    '增加 2 名开发人员'
  ],
  actionItems: [
    { 
      task: '完成技术方案文档', 
      assignee: '张三', 
      dueDate: '2026-03-20' 
    },
    { 
      task: '准备开发环境', 
      assignee: '李四', 
      dueDate: '2026-03-19' 
    },
    { 
      task: '协调会议室', 
      assignee: '王五', 
      dueDate: '2026-03-18' 
    }
  ],
  nextMeetingTime: '2026-03-25 14:00',
  nextMeetingAgenda: '代码 Review',
  chatId: 'oc_xxxxxxxxxxxxx'
}, 'ou_xxxxxxxxxxxxx');
```

---

## 周报生成

### 功能说明

每周五下午自动生成周报，包括：
- 本周完成的任务
- 本周参加的会议
- 下周计划
- 风险与问题

### 配置步骤

#### 1. 创建周报生成脚本

```javascript
// workflows/weekly-report/generate.js
const { 
  feishu_task_task,
  feishu_calendar_event,
  feishu_create_doc,
  feishu_im_user_message
} = require('@openclaw/feishu');

async function generateWeeklyReport(userOpenId, chatId = null) {
  const now = new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(now);
  
  // 1. 查询本周完成的任务
  const completedTasks = await feishu_task_task({
    action: 'list',
    current_user_id: userOpenId,
    completed: true,
    page_size: 100
  });
  
  const weekCompletedTasks = completedTasks.tasks.filter(task => {
    if (!task.completed_at) return false;
    const completedDate = new Date(task.completed_at);
    return completedDate >= weekStart && completedDate <= weekEnd;
  });
  
  // 2. 查询本周的会议
  const events = await feishu_calendar_event({
    action: 'list',
    user_open_id: userOpenId,
    start_time: weekStart.toISOString(),
    end_time: weekEnd.toISOString()
  });
  
  const meetings = events.events.filter(event => 
    event.attendees && event.attendees.length > 0
  );
  
  // 3. 查询未完成的任务（作为下周计划参考）
  const pendingTasks = await feishu_task_task({
    action: 'list',
    current_user_id: userOpenId,
    completed: false,
    page_size: 50
  });
  
  // 4. 生成周报内容
  const markdown = `# 周报 - ${formatDate(weekStart)} ~ ${formatDate(weekEnd)}

## 本周完成 (${weekCompletedTasks.length}项)
${weekCompletedTasks.length > 0 
  ? weekCompletedTasks.map(t => `- ✅ ${t.summary}`).join('\n')
  : '- 无完成任务'}

## 本周会议 (${meetings.length}场)
${meetings.length > 0
  ? meetings.map(m => `- 📅 ${m.summary} (${m.start_time.split('T')[1].substring(0, 5)})`).join('\n')
  : '- 无会议'}

## 进行中任务 (${pendingTasks.length}项)
${pendingTasks.length > 0
  ? pendingTasks.map(t => `- ⏳ ${t.summary} ${t.due?.timestamp ? '(截止：' + t.due.timestamp.split('T')[0] + ')' : ''}`).join('\n')
  : '- 无进行中任务'}

## 下周计划
- [ ] 

## 风险与问题
- 无

---
*周报自动生成于 ${now.toISOString()}*
`;
  
  // 5. 创建周报文档
  const doc = await feishu_create_doc({
    title: `周报 - ${formatDate(weekStart)}`,
    markdown: markdown
  });
  
  // 6. 发送通知
  const notification = `📊 周报已生成

**周期**: ${formatDate(weekStart)} ~ ${formatDate(weekEnd)}
**完成任务**: ${weekCompletedTasks.length}项
**参加会议**: ${meetings.length}场

📄 查看详情：${doc.url}`;
  
  if (chatId) {
    await feishu_im_user_message({
      action: 'send',
      receive_id_type: 'chat_id',
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text: notification })
    });
  }
  
  console.log('周报生成成功');
  return doc;
}

// 辅助函数
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekEnd(date) {
  const d = getWeekStart(date);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

module.exports = { generateWeeklyReport };
```

#### 2. 配置定时任务

```yaml
# config/cron/weekly-report.yaml
schedules:
  - name: weekly-report
    cron: '0 17 * * 5'  # 每周五下午 5 点
    script: workflows/weekly-report/generate.js
    env:
      USER_OPEN_ID: ou_xxxxxxxxxxxxx
      CHAT_ID: oc_xxxxxxxxxxxxx
```

### 使用示例

```bash
# 手动触发周报生成
node workflows/weekly-report/generate.js
```

---

## 项目追踪

### 功能说明

实时更新项目进度，包括：
- 任务完成情况
- 里程碑进度
- 风险预警
- 资源使用情况

### 配置步骤

#### 1. 创建项目追踪看板

```javascript
// workflows/project-tracker/setup.js
const { 
  feishu_bitable_app,
  feishu_bitable_app_table,
  feishu_bitable_app_table_record
} = require('@openclaw/feishu');

async function setupProjectTracker(projectName, milestones) {
  // 1. 创建多维表格应用
  const bitable = await feishu_bitable_app({
    action: 'create',
    name: `${projectName} - 项目追踪`,
    is_advanced: true
  });
  
  // 2. 创建任务表
  const taskTable = await feishu_bitable_app_table({
    action: 'create',
    app_token: bitable.app_token,
    table: {
      name: '任务清单',
      fields: [
        { field_name: '任务名称', type: 1 },
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
              { name: '已完成', color: 'green' },
              { name: '已阻塞', color: 'red' }
            ]
          }
        },
        { field_name: '完成百分比', type: 2 },
        { field_name: '所属里程碑', type: 3 }
      ]
    }
  });
  
  // 3. 创建里程碑表
  const milestoneTable = await feishu_bitable_app_table({
    action: 'create',
    app_token: bitable.app_token,
    table: {
      name: '里程碑',
      fields: [
        { field_name: '里程碑名称', type: 1 },
        { field_name: '计划日期', type: 5 },
        { field_name: '实际日期', type: 5 },
        { 
          field_name: '状态', 
          type: 3,
          property: {
            options: [
              { name: '未开始', color: 'gray' },
              { name: '进行中', color: 'blue' },
              { name: '已完成', color: 'green' },
              { name: '已延期', color: 'red' }
            ]
          }
        },
        { field_name: '完成度', type: 2 }
      ]
    }
  });
  
  // 4. 创建里程碑记录
  const milestoneRecords = milestones.map(m => ({
    fields: {
      '里程碑名称': m.name,
      '计划日期': new Date(m.dueDate).getTime(),
      '状态': '未开始',
      '完成度': 0
    }
  }));
  
  await feishu_bitable_app_table_record({
    action: 'batch_create',
    app_token: bitable.app_token,
    table_id: milestoneTable.table_id,
    records: milestoneRecords
  });
  
  console.log('项目追踪看板创建成功');
  console.log('多维表格 URL:', `https://bytedance.feishu.cn/base/${bitable.app_token}`);
  
  return {
    app_token: bitable.app_token,
    task_table_id: taskTable.table_id,
    milestone_table_id: milestoneTable.table_id
  };
}

module.exports = { setupProjectTracker };
```

#### 2. 创建进度更新脚本

```javascript
// workflows/project-tracker/update-progress.js
const { 
  feishu_bitable_app_table_record,
  feishu_task_task
} = require('@openclaw/feishu');

async function updateProjectProgress(appToken, taskTableId, milestoneTableId) {
  // 1. 查询所有任务
  const tasks = await feishu_bitable_app_table_record({
    action: 'list',
    app_token: appToken,
    table_id: taskTableId,
    page_size: 500
  });
  
  // 2. 统计各里程碑进度
  const milestoneProgress = {};
  tasks.records.forEach(task => {
    const milestone = task.fields['所属里程碑'];
    if (!milestone) return;
    
    if (!milestoneProgress[milestone]) {
      milestoneProgress[milestone] = { total: 0, completed: 0 };
    }
    
    milestoneProgress[milestone].total++;
    if (task.fields['状态'] === '已完成') {
      milestoneProgress[milestone].completed++;
    }
  });
  
  // 3. 更新里程碑完成度
  const milestones = await feishu_bitable_app_table_record({
    action: 'list',
    app_token: appToken,
    table_id: milestoneTableId,
    page_size: 100
  });
  
  for (const milestone of milestones.records) {
    const progress = milestoneProgress[milestone.fields['里程碑名称']];
    if (progress) {
      const completionRate = Math.round((progress.completed / progress.total) * 100);
      
      await feishu_bitable_app_table_record({
        action: 'update',
        app_token: appToken,
        table_id: milestoneTableId,
        record_id: milestone.record_id,
        fields: {
          '完成度': completionRate,
          '状态': completionRate === 100 ? '已完成' : 
                  completionRate > 0 ? '进行中' : '未开始'
        }
      });
    }
  }
  
  // 4. 生成进度报告
  const report = {
    totalTasks: tasks.records.length,
    completedTasks: tasks.records.filter(t => t.fields['状态'] === '已完成').length,
    inProgressTasks: tasks.records.filter(t => t.fields['状态'] === '进行中').length,
    blockedTasks: tasks.records.filter(t => t.fields['状态'] === '已阻塞').length,
    milestoneProgress: milestoneProgress
  };
  
  console.log('项目进度更新成功');
  console.log(`总任务：${report.totalTasks}, 完成：${report.completedTasks}, 进行中：${report.inProgressTasks}, 阻塞：${report.blockedTasks}`);
  
  return report;
}

module.exports = { updateProjectProgress };
```

#### 3. 使用示例

```javascript
// 初始化项目追踪
const { setupProjectTracker } = require('./workflows/project-tracker/setup');

setupProjectTracker('OpenClaw 文档项目', [
  { name: '基础教程', dueDate: '2026-03-20' },
  { name: '工作流开发', dueDate: '2026-03-25' },
  { name: '视频教程', dueDate: '2026-03-30' }
]);

// 更新项目进度
const { updateProjectProgress } = require('./workflows/project-tracker/update-progress');

updateProjectProgress(
  'bascnxxxxxxxxxxxx',
  'tblxxxxxxxxxxxx',
  'tblyyyyyyyyyyyy'
);
```

---

## 相关资源

- [飞书多维表格集成](../feishu-integration/basic/bitable-integration.md)
- [飞书日历集成](../feishu-integration/basic/calendar-integration.md)
- [飞书任务集成](../feishu-integration/basic/task-integration.md)
- [飞书文档集成](../feishu-integration/basic/doc-integration.md)
