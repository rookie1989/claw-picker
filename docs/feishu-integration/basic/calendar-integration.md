# 飞书日历集成教程

> 使用 OpenClaw 管理飞书日历和日程，实现智能会议安排

## 概述

本教程将教你如何使用 OpenClaw 调用飞书日历 API，实现：
- 查询和管理日历
- 创建、修改、删除日程
- 管理参会人
- 查询忙闲状态
- 自动安排会议

## 前置准备

### 1. 获取飞书 API 凭证

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 `App ID` 和 `App Secret`
4. 配置权限：
   - 日历权限：`calendar:calendar`、`calendar:event`、`calendar:freebusy`
   - 联系人权限：`contact:user`

### 2. 配置 OpenClaw

在 OpenClaw 配置文件中添加飞书插件配置：

```yaml
plugins:
  feishu:
    app_id: cli_xxxxxxxxxxxxx
    app_secret: xxxxxxxxxxxxxxx
```

## 基础操作

### 查询日历列表

```javascript
// examples/feishu/list-calendars.js
const { feishu_calendar_calendar } = require('@openclaw/feishu');

async function listCalendars() {
  const result = await feishu_calendar_calendar({
    action: 'list',
    page_size: 50
  });
  
  console.log(`共 ${result.calendars.length} 个日历:`);
  result.calendars.forEach(calendar => {
    console.log(`- ${calendar.summary} (${calendar.calendar_id})`);
  });
  
  return result.calendars;
}

listCalendars();
```

### 查询主日历

```javascript
// examples/feishu/get-primary-calendar.js
const { feishu_calendar_calendar } = require('@openclaw/feishu');

async function getPrimaryCalendar() {
  const result = await feishu_calendar_calendar({
    action: 'primary'
  });
  
  console.log('主日历:', result);
  return result;
}

getPrimaryCalendar();
```

### 创建日程

```javascript
// examples/feishu/create-event.js
const { feishu_calendar_event } = require('@openclaw/feishu');

async function createEvent(userOpenId) {
  const result = await feishu_calendar_event({
    action: 'create',
    // 必填：用户 open_id，否则日程不会出现在用户日历中
    user_open_id: userOpenId,
    summary: '项目评审会议',
    description: '讨论 Q2 项目进度和下一步计划',
    start_time: '2026-03-20T14:00:00+08:00',
    end_time: '2026-03-20T15:00:00+08:00',
    location: {
      name: '会议室 A',
      address: '北京市朝阳区 xxx 路 xxx 号'
    },
    // 参会人列表
    attendees: [
      { type: 'user', id: 'ou_xxxxxxxxxxxxx' },
      { type: 'user', id: 'ou_yyyyyyyyyyyyy' }
    ],
    // 视频会议（不传则自动生成飞书视频会议）
    vchat: {
      vc_type: 'vc'  // vc=飞书会议，third_party=第三方链接，no_meeting=无会议
    },
    // 提醒设置
    reminders: [
      { minutes: 15 },  // 提前 15 分钟提醒
      { minutes: 5 }    // 提前 5 分钟提醒
    ],
    // 是否通知参会人
    need_notification: true
  });
  
  console.log('日程创建成功:', result);
  console.log('Event ID:', result.event_id);
  return result;
}

createEvent('ou_xxxxxxxxxxxxx');
```

### 查询日程列表

```javascript
// examples/feishu/list-events.js
const { feishu_calendar_event } = require('@openclaw/feishu');

async function listEvents(userOpenId) {
  const result = await feishu_calendar_event({
    action: 'list',
    user_open_id: userOpenId,
    start_time: '2026-03-18T00:00:00+08:00',
    end_time: '2026-03-25T23:59:59+08:00',
    page_size: 100
  });
  
  console.log(`共 ${result.events.length} 个日程:`);
  result.events.forEach(event => {
    console.log(`- ${event.summary}: ${event.start_time} - ${event.end_time}`);
  });
  
  return result.events;
}

listEvents('ou_xxxxxxxxxxxxx');
```

### 查询日程详情

```javascript
// examples/feishu/get-event.js
const { feishu_calendar_event } = require('@openclaw/feishu');

async function getEvent(eventId) {
  const result = await feishu_calendar_event({
    action: 'get',
    event_id: eventId
  });
  
  console.log('日程详情:', result);
  return result;
}

getEvent('evt_xxxxxxxxxxxxx');
```

### 更新日程

```javascript
// examples/feishu/update-event.js
const { feishu_calendar_event } = require('@openclaw/feishu');

async function updateEvent(eventId) {
  const result = await feishu_calendar_event({
    action: 'patch',
    event_id: eventId,
    summary: '项目评审会议（时间调整）',
    start_time: '2026-03-20T15:00:00+08:00',
    end_time: '2026-03-20T16:00:00+08:00',
    need_notification: true  // 通知参会人
  });
  
  console.log('日程更新成功:', result);
  return result;
}

updateEvent('evt_xxxxxxxxxxxxx');
```

### 删除日程

```javascript
// examples/feishu/delete-event.js
const { feishu_calendar_event } = require('@openclaw/feishu');

async function deleteEvent(eventId) {
  const result = await feishu_calendar_event({
    action: 'delete',
    event_id: eventId,
    need_notification: true  // 通知参会人
  });
  
  console.log('日程删除成功:', result);
  return result;
}

deleteEvent('evt_xxxxxxxxxxxxx');
```

## 参会人管理

### 添加参会人

```javascript
// examples/feishu/add-attendees.js
const { feishu_calendar_event_attendee } = require('@openclaw/feishu');

async function addAttendees(calendarId, eventId) {
  const result = await feishu_calendar_event_attendee({
    action: 'create',
    calendar_id: calendarId,
    event_id: eventId,
    attendees: [
      { type: 'user', attendee_id: 'ou_zzzzzzzzzzzzz' },
      { type: 'user', attendee_id: 'ou_aaaaaaaaaaaaa' }
    ],
    need_notification: true
  });
  
  console.log('参会人添加成功:', result);
  return result;
}

addAttendees('cal_xxxxxxxxxxxxx', 'evt_xxxxxxxxxxxxx');
```

### 查询参会人列表

```javascript
// examples/feishu/list-attendees.js
const { feishu_calendar_event_attendee } = require('@openclaw/feishu');

async function listAttendees(calendarId, eventId) {
  const result = await feishu_calendar_event_attendee({
    action: 'list',
    calendar_id: calendarId,
    event_id: eventId,
    page_size: 50
  });
  
  console.log(`共 ${result.attendees.length} 位参会人:`);
  result.attendees.forEach(attendee => {
    console.log(`- ${attendee.display_name} (${attendee.attendee_id})`);
  });
  
  return result.attendees;
}

listAttendees('cal_xxxxxxxxxxxxx', 'evt_xxxxxxxxxxxxx');
```

### 移除参会人

```javascript
// examples/feishu/remove-attendees.js
const { feishu_calendar_event_attendee } = require('@openclaw/feishu');

async function removeAttendees(calendarId, eventId, userOpenIds) {
  const result = await feishu_calendar_event_attendee({
    action: 'batch_delete',
    calendar_id: calendarId,
    event_id: eventId,
    user_open_ids: userOpenIds,
    need_notification: true
  });
  
  console.log('参会人移除成功:', result);
  return result;
}

removeAttendees('cal_xxxxxxxxxxxxx', 'evt_xxxxxxxxxxxxx', ['ou_xxxxxxxxxxxxx']);
```

## 忙闲查询

### 查询用户忙闲状态

```javascript
// examples/feishu/check-freebusy.js
const { feishu_calendar_freebusy } = require('@openclaw/feishu');

async function checkFreeBusy(userIds) {
  const result = await feishu_calendar_freebusy({
    action: 'list',
    time_min: '2026-03-20T09:00:00+08:00',
    time_max: '2026-03-20T18:00:00+08:00',
    user_ids: userIds  // 最多支持 10 个用户
  });
  
  console.log('忙闲状态:');
  result.freebusy.forEach(item => {
    console.log(`用户 ${item.user_id}:`);
    item.busy_periods.forEach(period => {
      console.log(`  - 忙碌：${period.start} - ${period.end}`);
    });
  });
  
  return result.freebusy;
}

checkFreeBusy(['ou_xxxxxxxxxxxxx', 'ou_yyyyyyyyyyyyy']);
```

### 智能安排会议时间

```javascript
// examples/feishu/schedule-meeting.js
const { feishu_calendar_freebusy, feishu_calendar_event } = require('@openclaw/feishu');

async function findBestSlot(userIds, durationMinutes, date) {
  const startOfDay = `${date}T09:00:00+08:00`;
  const endOfDay = `${date}T18:00:00+08:00`;
  
  // 查询所有人的忙闲状态
  const freebusy = await feishu_calendar_freebusy({
    action: 'list',
    time_min: startOfDay,
    time_max: endOfDay,
    user_ids: userIds
  });
  
  // 找出共同空闲时间段
  const availableSlots = findCommonSlots(freebusy.freebusy, durationMinutes);
  
  if (availableSlots.length === 0) {
    console.log('今天没有合适的会议时间');
    return null;
  }
  
  // 返回第一个可用时间段
  const bestSlot = availableSlots[0];
  console.log(`推荐会议时间：${bestSlot.start} - ${bestSlot.end}`);
  return bestSlot;
}

function findCommonSlots(freebusyList, durationMinutes) {
  // 简化实现：实际需要根据所有人的 busy_periods 计算交集
  // 这里仅作为示例
  return [
    {
      start: '2026-03-20T14:00:00+08:00',
      end: '2026-03-20T15:00:00+08:00'
    }
  ];
}

async function scheduleMeeting(userOpenId, attendees, summary, durationMinutes) {
  const today = new Date().toISOString().split('T')[0];
  const slot = await findBestSlot(attendees.map(a => a.id), durationMinutes, today);
  
  if (!slot) {
    throw new Error('找不到合适的会议时间');
  }
  
  const event = await feishu_calendar_event({
    action: 'create',
    user_open_id: userOpenId,
    summary: summary,
    start_time: slot.start,
    end_time: slot.end,
    attendees: attendees.map(a => ({ type: 'user', id: a.id })),
    vchat: { vc_type: 'vc' },
    reminders: [{ minutes: 15 }]
  });
  
  console.log('会议安排成功:', event);
  return event;
}

// 使用示例
scheduleMeeting('ou_xxxxxxxxxxxxx', [
  { id: 'ou_yyyyyyyyyyyyy', name: '张三' },
  { id: 'ou_zzzzzzzzzzzzz', name: '李四' }
], '项目讨论会', 60);
```

## 重复日程

### 创建重复日程

```javascript
// examples/feishu/create-recurring-event.js
const { feishu_calendar_event } = require('@openclaw/feishu');

async function createRecurringEvent(userOpenId) {
  const result = await feishu_calendar_event({
    action: 'create',
    user_open_id: userOpenId,
    summary: '每周团队例会',
    description: '同步项目进展和问题',
    start_time: '2026-03-20T10:00:00+08:00',
    end_time: '2026-03-20T11:00:00+08:00',
    // RRULE 格式：每周重复
    recurrence: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=FR',
    attendees: [
      { type: 'user', id: 'ou_xxxxxxxxxxxxx' },
      { type: 'user', id: 'ou_yyyyyyyyyyyyy' }
    ]
  });
  
  console.log('重复日程创建成功:', result);
  return result;
}

createRecurringEvent('ou_xxxxxxxxxxxxx');
```

### 查询重复日程实例

```javascript
// examples/feishu/list-event-instances.js
const { feishu_calendar_event } = require('@openclaw/feishu');

async function listEventInstances(eventId) {
  const result = await feishu_calendar_event({
    action: 'instances',
    event_id: eventId,
    time_min: '2026-03-01T00:00:00+08:00',
    time_max: '2026-04-30T23:59:59+08:00'
  });
  
  console.log(`共 ${result.events.length} 个实例:`);
  result.events.forEach(event => {
    console.log(`- ${event.start_time}: ${event.summary}`);
  });
  
  return result.events;
}

listEventInstances('evt_xxxxxxxxxxxxx');
```

## 实战案例

### 案例 1：自动会议纪要安排

```javascript
// examples/feishu/meeting-scheduler.js
const { feishu_calendar_freebusy, feishu_calendar_event, feishu_search_user } = require('@openclaw/feishu');

async function scheduleMeetingFromChat(chatMessage) {
  // 从聊天消息中解析会议信息
  // 示例消息："明天下午 2 点和张三、李四开会讨论项目"
  const meetingInfo = parseMeetingMessage(chatMessage);
  
  // 搜索参会人
  const attendees = [];
  for (const name of meetingInfo.attendeeNames) {
    const users = await feishu_search_user({ query: name });
    if (users.users.length > 0) {
      attendees.push({
        id: users.users[0].open_id,
        name: users.users[0].name
      });
    }
  }
  
  // 查询忙闲状态
  const userIds = attendees.map(a => a.id);
  const freebusy = await feishu_calendar_freebusy({
    action: 'list',
    time_min: meetingInfo.startTime,
    time_max: meetingInfo.endTime,
    user_ids: userIds
  });
  
  // 检查是否有冲突
  const hasConflict = checkConflict(freebusy.freebusy);
  if (hasConflict) {
    return { success: false, message: '参会人有时间冲突，请调整时间' };
  }
  
  // 创建日程
  const event = await feishu_calendar_event({
    action: 'create',
    user_open_id: meetingInfo.organizerId,
    summary: meetingInfo.subject,
    description: meetingInfo.description,
    start_time: meetingInfo.startTime,
    end_time: meetingInfo.endTime,
    attendees: attendees.map(a => ({ type: 'user', id: a.id })),
    location: meetingInfo.location ? { name: meetingInfo.location } : undefined,
    vchat: { vc_type: 'vc' },
    reminders: [{ minutes: 15 }]
  });
  
  return { success: true, event };
}

function parseMeetingMessage(message) {
  // 简化实现，实际需要使用 NLP 或正则表达式解析
  return {
    organizerId: 'ou_xxxxxxxxxxxxx',
    attendeeNames: ['张三', '李四'],
    subject: '项目讨论',
    startTime: '2026-03-19T14:00:00+08:00',
    endTime: '2026-03-19T15:00:00+08:00',
    description: '讨论项目进展',
    location: '会议室 A'
  };
}

function checkConflict(freebusyList) {
  // 检查是否有时间冲突
  return false;
}

// 使用示例
scheduleMeetingFromChat('明天下午 2 点和张三、李四开会讨论项目');
```

### 案例 2：工作日提醒

```javascript
// examples/feishu/daily-reminder.js
const { feishu_calendar_event } = require('@openclaw/feishu');

async function createDailyReminder(userOpenId) {
  // 创建工作日每日提醒
  const result = await feishu_calendar_event({
    action: 'create',
    user_open_id: userOpenId,
    summary: '晨间计划',
    description: '今天的三项重要任务：\n1. \n2. \n3. ',
    start_time: '2026-03-18T09:00:00+08:00',
    end_time: '2026-03-18T09:30:00+08:00',
    // 工作日重复（周一到周五）
    recurrence: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR',
    reminders: [
      { minutes: 0 }  // 开始时提醒
    ],
    visibility: 'private'  // 私密日程
  });
  
  console.log('每日提醒创建成功:', result);
  return result;
}

createDailyReminder('ou_xxxxxxxxxxxxx');
```

## 最佳实践

### 1. 时区处理

```javascript
// ✅ 始终使用带时区的时间格式
const startTime = '2026-03-20T14:00:00+08:00';  // 北京时间

// ❌ 避免使用不带时区的时间
const startTime = '2026-03-20T14:00:00';  // 可能产生歧义
```

### 2. 错误处理

```javascript
async function safeCreateEvent(eventData) {
  try {
    const result = await feishu_calendar_event({
      action: 'create',
      ...eventData
    });
    return result;
  } catch (error) {
    if (error.code === 409) {
      // 时间冲突
      return { success: false, message: '时间冲突，请选择其他时间' };
    } else if (error.code === 403) {
      // 权限不足
      return { success: false, message: '无权限创建日程' };
    }
    throw error;
  }
}
```

### 3. 批量操作

```javascript
// 批量创建多个日程
async function createMultipleEvents(userOpenId, events) {
  const results = [];
  for (const event of events) {
    const result = await feishu_calendar_event({
      action: 'create',
      user_open_id: userOpenId,
      ...event
    });
    results.push(result);
    // 避免触发限流
    await sleep(100);
  }
  return results;
}
```

## 相关资源

- [飞书日历 API 文档](https://open.feishu.cn/document/ukTMukTMukTM/uQjNwUjL2YDM14iN2ATN)
- [RRULE 规范](https://datatracker.ietf.org/doc/html/rfc5545)
- [示例代码仓库](https://github.com/rookie1989/claw-picker/tree/main/examples/feishu)

## 下一步

- 📊 学习 [飞书多维表格集成](./bitable-integration.md)
- ✅ 学习 [飞书任务集成](./task-integration.md)
- 📄 学习 [飞书文档集成](./doc-integration.md)
- 🔧 查看 [完整工作流模板](../workflows/)
