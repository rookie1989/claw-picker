/**
 * 飞书日历示例 - 智能会议安排
 * 
 * 功能：
 * - 查询参会人忙闲状态
 * - 自动寻找最佳会议时间
 * - 创建会议日程
 * - 发送会议通知
 */

const { 
  feishu_calendar_freebusy,
  feishu_calendar_event,
  feishu_calendar_event_attendee,
  feishu_search_user
} = require('@openclaw/feishu');

// 配置
const CONFIG = {
  organizerOpenId: 'ou_xxxxxxxxxxxxx',  // 会议组织者
  calendarId: 'cal_xxxxxxxxxxxxx',       // 日历 ID
};

/**
 * 搜索用户 open_id
 */
async function findUserOpenId(nameOrEmail) {
  const users = await feishu_search_user({ query: nameOrEmail });
  if (users.users.length === 0) {
    throw new Error(`找不到用户：${nameOrEmail}`);
  }
  return users.users[0].open_id;
}

/**
 * 查询参会人忙闲状态
 */
async function checkAttendeesFreeBusy(attendeeIds, date, timeRange = { start: 9, end: 18 }) {
  const timeMin = `${date}T${String(timeRange.start).padStart(2, '0')}:00:00+08:00`;
  const timeMax = `${date}T${String(timeRange.end).padStart(2, '0')}:00:00+08:00`;
  
  console.log(`📅 查询 ${date} 的忙闲状态...`);
  console.log(`   时间范围：${timeRange.start}:00 - ${timeRange.end}:00`);
  console.log(`   参会人：${attendeeIds.length} 人`);
  
  const result = await feishu_calendar_freebusy({
    action: 'list',
    time_min: timeMin,
    time_max: timeMax,
    user_ids: attendeeIds
  });
  
  console.log('✅ 忙闲状态查询成功');
  return result.freebusy;
}

/**
 * 寻找最佳会议时间
 */
function findBestSlot(freebusyList, durationMinutes, date) {
  console.log('\n🔍 寻找最佳会议时间...');
  
  // 简化实现：返回一个默认时间段
  // 实际实现需要分析所有人的 busy_periods，找出共同空闲时间
  
  const availableSlots = [
    {
      start: `${date}T14:00:00+08:00`,
      end: `${date}T15:00:00+08:00`
    },
    {
      start: `${date}T10:00:00+08:00`,
      end: `${date}T11:00:00+08:00`
    }
  ];
  
  if (availableSlots.length === 0) {
    console.log('❌ 今天没有合适的会议时间');
    return null;
  }
  
  const bestSlot = availableSlots[0];
  console.log(`✅ 推荐会议时间：${bestSlot.start.split('T')[1].substring(0, 5)} - ${bestSlot.end.split('T')[1].substring(0, 5)}`);
  
  return bestSlot;
}

/**
 * 创建会议日程
 */
async function scheduleMeeting(organizerId, attendees, meetingInfo) {
  console.log('\n📋 创建会议日程...');
  console.log(`   主题：${meetingInfo.subject}`);
  console.log(`   时间：${meetingInfo.startTime} - ${meetingInfo.endTime}`);
  console.log(`   参会人：${attendees.length} 人`);
  
  const event = await feishu_calendar_event({
    action: 'create',
    user_open_id: organizerId,
    summary: meetingInfo.subject,
    description: meetingInfo.description || '',
    start_time: meetingInfo.startTime,
    end_time: meetingInfo.endTime,
    location: meetingInfo.location ? {
      name: meetingInfo.location,
      address: meetingInfo.address || ''
    } : undefined,
    attendees: attendees.map(a => ({ type: 'user', id: a.open_id })),
    vchat: { vc_type: 'vc' },  // 自动生成飞书视频会议
    reminders: [
      { minutes: 15 },  // 提前 15 分钟提醒
      { minutes: 5 }    // 提前 5 分钟提醒
    ],
    need_notification: true
  });
  
  console.log('✅ 会议创建成功');
  console.log(`   Event ID: ${event.event_id}`);
  console.log(`   会议链接：${event.vchat_info?.meeting_url || '自动生成'}`);
  
  return event;
}

/**
 * 添加参会人
 */
async function addMeetingAttendees(calendarId, eventId, additionalAttendees) {
  console.log('\n👥 添加额外参会人...');
  
  const result = await feishu_calendar_event_attendee({
    action: 'create',
    calendar_id: calendarId,
    event_id: eventId,
    attendees: additionalAttendees.map(a => ({ type: 'user', attendee_id: a.open_id })),
    need_notification: true
  });
  
  console.log(`✅ 成功添加 ${result.attendees?.length || 0} 位参会人`);
  return result;
}

/**
 * 智能安排会议（完整流程）
 */
async function smartScheduleMeeting(organizerId, attendeeNames, meetingInfo) {
  try {
    console.log('🚀 开始智能安排会议...\n');
    
    // 1. 搜索参会人
    console.log('📇 搜索参会人...');
    const attendees = [];
    
    // 添加组织者
    attendees.push({
      open_id: organizerId,
      name: '组织者'
    });
    
    // 搜索其他参会人
    for (const name of attendeeNames) {
      const open_id = await findUserOpenId(name);
      attendees.push({ open_id, name });
      console.log(`   ✅ ${name}: ${open_id}`);
    }
    
    // 2. 查询忙闲状态
    const date = meetingInfo.date || new Date().toISOString().split('T')[0];
    const freebusy = await checkAttendeesFreeBusy(
      attendees.map(a => a.open_id),
      date,
      meetingInfo.timeRange
    );
    
    // 3. 寻找最佳时间
    const slot = findBestSlot(freebusy, meetingInfo.duration || 60, date);
    if (!slot) {
      throw new Error('找不到合适的会议时间');
    }
    
    // 4. 创建会议
    const event = await scheduleMeeting(organizerId, attendees, {
      subject: meetingInfo.subject,
      description: meetingInfo.description,
      startTime: slot.start,
      endTime: slot.end,
      location: meetingInfo.location,
      address: meetingInfo.address
    });
    
    // 5. 添加额外参会人（如有）
    if (meetingInfo.additionalAttendees) {
      await addMeetingAttendees(
        event.calendar_id,
        event.event_id,
        meetingInfo.additionalAttendees
      );
    }
    
    console.log('\n✅ 会议安排完成！');
    console.log('\n📊 会议详情:');
    console.log(`   主题：${event.summary}`);
    console.log(`   时间：${event.start_time.split('T')[1].substring(0, 5)} - ${event.end_time.split('T')[1].substring(0, 5)}`);
    console.log(`   参会人：${event.attendees?.length || 0} 人`);
    console.log(`   视频会议：${event.vchat_info?.meeting_url ? '已生成' : '无'}`);
    
    return event;
    
  } catch (error) {
    console.error('❌ 会议安排失败:', error.message);
    throw error;
  }
}

/**
 * 使用示例
 */
async function example() {
  // 示例 1：智能安排会议
  await smartScheduleMeeting(
    CONFIG.organizerOpenId,
    ['张三', '李四'],  // 参会人姓名
    {
      subject: '项目评审会',
      description: '讨论 Q2 项目进度和下一步计划',
      date: '2026-03-20',
      timeRange: { start: 9, end: 18 },  // 9:00-18:00
      duration: 60,  // 60 分钟
      location: '会议室 A',
      address: '北京市朝阳区 xxx 路 xxx 号'
    }
  );
  
  // 示例 2：直接创建会议（已知时间）
  await feishu_calendar_event({
    action: 'create',
    user_open_id: CONFIG.organizerOpenId,
    summary: '周会',
    start_time: '2026-03-20T10:00:00+08:00',
    end_time: '2026-03-20T11:00:00+08:00',
    attendees: [
      { type: 'user', id: 'ou_xxxxxxxxxxxxx' },
      { type: 'user', id: 'ou_yyyyyyyyyyyyy' }
    ],
    recurrence: 'FREQ=WEEKLY;INTERVAL=1;BYDAY=FR',  // 每周重复
    reminders: [{ minutes: 15 }]
  });
}

// 运行示例
if (require.main === module) {
  example().catch(console.error);
}

module.exports = {
  findUserOpenId,
  checkAttendeesFreeBusy,
  findBestSlot,
  scheduleMeeting,
  addMeetingAttendees,
  smartScheduleMeeting
};
