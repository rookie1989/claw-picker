/**
 * 飞书文档示例 - 自动周报生成
 * 
 * 功能：
 * - 查询本周完成任务
 * - 查询本周会议
 * - 生成周报文档
 * - 发送周报通知
 */

const { 
  feishu_task_task,
  feishu_calendar_event,
  feishu_create_doc,
  feishu_update_doc
} = require('@openclaw/feishu');

// 配置
const CONFIG = {
  userOpenId: 'ou_xxxxxxxxxxxxx',  // 替换为你的 open_id
  chatId: 'oc_xxxxxxxxxxxxx',       // 接收通知的群聊 ID（可选）
};

/**
 * 获取周起始和结束日期
 */
function getWeekRange(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);  // 调整为周一
  
  const weekStart = new Date(d);
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

/**
 * 格式化日期
 */
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

/**
 * 查询本周完成任务
 */
async function getCompletedTasks(weekStart, weekEnd) {
  console.log('📝 查询本周完成任务...');
  
  const result = await feishu_task_task({
    action: 'list',
    current_user_id: CONFIG.userOpenId,
    completed: true,
    page_size: 100
  });
  
  const weekTasks = result.tasks.filter(task => {
    if (!task.completed_at) return false;
    const completedDate = new Date(task.completed_at);
    return completedDate >= weekStart && completedDate <= weekEnd;
  });
  
  console.log(`   共 ${weekTasks.length} 个完成任务`);
  return weekTasks;
}

/**
 * 查询本周会议
 */
async function getWeekMeetings(weekStart, weekEnd) {
  console.log('📅 查询本周会议...');
  
  const result = await feishu_calendar_event({
    action: 'list',
    user_open_id: CONFIG.userOpenId,
    start_time: weekStart.toISOString(),
    end_time: weekEnd.toISOString()
  });
  
  // 筛选有参会人的会议
  const meetings = result.events.filter(event => 
    event.attendees && event.attendees.length > 0
  );
  
  console.log(`   共 ${meetings.length} 场会议`);
  return meetings;
}

/**
 * 查询进行中任务
 */
async function getPendingTasks() {
  console.log('⏳ 查询进行中任务...');
  
  const result = await feishu_task_task({
    action: 'list',
    current_user_id: CONFIG.userOpenId,
    completed: false,
    page_size: 50
  });
  
  console.log(`   共 ${result.tasks.length} 个进行中任务`);
  return result.tasks;
}

/**
 * 生成周报内容
 */
function generateWeeklyReportContent(weekStart, weekEnd, completedTasks, meetings, pendingTasks) {
  const weekNumber = getWeekNumber(weekStart);
  
  let markdown = `# 周报 - ${formatDate(weekStart)} ~ ${formatDate(weekEnd)} (第${weekNumber}周)

## 本周完成 (${completedTasks.length}项)
`;
  
  if (completedTasks.length > 0) {
    completedTasks.forEach(task => {
      markdown += `- ✅ ${task.summary}\n`;
    });
  } else {
    markdown += `- 无完成任务\n`;
  }
  
  markdown += `\n## 本周会议 (${meetings.length}场)
`;
  
  if (meetings.length > 0) {
    meetings.forEach(meeting => {
      const time = meeting.start_time.split('T')[1].substring(0, 5);
      markdown += `- 📅 ${meeting.summary} (${time})\n`;
    });
  } else {
    markdown += `- 无会议\n`;
  }
  
  markdown += `\n## 进行中任务 (${pendingTasks.length}项)
`;
  
  if (pendingTasks.length > 0) {
    pendingTasks.forEach(task => {
      const dueDate = task.due?.timestamp 
        ? `(截止：${task.due.timestamp.split('T')[0]})` 
        : '';
      markdown += `- ⏳ ${task.summary} ${dueDate}\n`;
    });
  } else {
    markdown += `- 无进行中任务\n`;
  }
  
  markdown += `\n## 下周计划
- [ ] 
- [ ] 
- [ ] 

## 风险与问题
- 无

## 备注
${completedTasks.length > 0 ? '\n### 本周亮点\n- ' + completedTasks[0].summary : ''}

---
*周报自动生成于 ${new Date().toISOString()}*
`;
  
  return markdown;
}

/**
 * 获取周数
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * 生成周报
 */
async function generateWeeklyReport() {
  try {
    console.log('🚀 开始生成周报...\n');
    
    // 1. 获取本周时间范围
    const { weekStart, weekEnd } = getWeekRange();
    console.log(`📅 周报周期：${formatDate(weekStart)} ~ ${formatDate(weekEnd)}\n`);
    
    // 2. 查询数据
    const [completedTasks, meetings, pendingTasks] = await Promise.all([
      getCompletedTasks(weekStart, weekEnd),
      getWeekMeetings(weekStart, weekEnd),
      getPendingTasks()
    ]);
    
    // 3. 生成周报内容
    const markdown = generateWeeklyReportContent(
      weekStart, weekEnd,
      completedTasks, meetings, pendingTasks
    );
    
    // 4. 创建周报文档
    console.log('\n📄 创建周报文档...');
    const doc = await feishu_create_doc({
      title: `周报 - ${formatDate(weekStart)}`,
      markdown: markdown
      // 可选：保存到知识库
      // wiki_space: 'my_library'
    });
    
    console.log('✅ 周报创建成功');
    console.log(`   文档 URL: ${doc.url}`);
    
    // 5. 发送通知（可选）
    if (CONFIG.chatId) {
      console.log('\n📤 发送周报通知...');
      // 这里可以调用 feishu_im_user_message 发送通知
      // 由于需要额外的导入，这里仅做示例
      console.log('   （通知功能需要配置 chatId）');
    }
    
    console.log('\n✅ 周报生成完成！');
    return doc;
    
  } catch (error) {
    console.error('❌ 周报生成失败:', error);
    throw error;
  }
}

/**
 * 使用示例
 */
async function example() {
  const doc = await generateWeeklyReport();
  console.log('\n📊 周报详情:');
  console.log(`   标题：${doc.title}`);
  console.log(`   URL: ${doc.url}`);
}

// 运行示例
if (require.main === module) {
  example().catch(console.error);
}

module.exports = {
  getWeekRange,
  getCompletedTasks,
  getWeekMeetings,
  getPendingTasks,
  generateWeeklyReportContent,
  generateWeeklyReport
};
