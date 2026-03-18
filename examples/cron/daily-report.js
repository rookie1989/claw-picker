/**
 * 每日自动报告生成器
 * 
 * 功能：收集数据、生成日报、自动发送
 * 运行：Cron 定时任务，每天 18:00 执行
 */

const config = {
  sendTime: process.env.REPORT_SEND_TIME || '18:00',
  recipients: (process.env.REPORT_RECIPIENTS || 'default').split(',')
};

/**
 * 生成并发送日报
 */
async function generateDailyReport() {
  console.log('📊 开始生成每日报告...');
  
  const report = {
    date: new Date().toISOString().split('T')[0],
    sections: []
  };
  
  // 收集数据
  const githubStats = await collectGitHubStats();
  const taskStats = await collectTaskStats();
  
  // 组装报告
  report.sections.push({
    title: '📅 日期',
    content: formatDate(new Date())
  });
  
  if (githubStats) {
    report.sections.push({
      title: '🐙 GitHub 活动',
      content: formatGitHubStats(githubStats)
    });
  }
  
  if (taskStats) {
    report.sections.push({
      title: '✅ 任务进度',
      content: formatTaskStats(taskStats)
    });
  }
  
  // 发送报告
  const formatted = formatReport(report);
  await sendReport(formatted);
  
  console.log('✅ 日报生成完成');
  return report;
}

async function collectGitHubStats() {
  // 实际使用时调用 GitHub API
  return {
    commits: 5,
    issuesClosed: 3,
    prsCreated: 2
  };
}

async function collectTaskStats() {
  // 实际使用时从任务系统获取
  return {
    completedToday: 4,
    todo: 10,
    inProgress: 3
  };
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
  return `${year}年${month}月${day}日 星期${weekday}`;
}

function formatGitHubStats(stats) {
  return `• Commits: ${stats.commits}\n• 关闭 Issues: ${stats.issuesClosed}\n• 创建 PRs: ${stats.prsCreated}`;
}

function formatTaskStats(stats) {
  return `• 今日完成：${stats.completedToday}\n• 待办：${stats.todo}\n• 进行中：${stats.inProgress}`;
}

function formatReport(report) {
  let text = `📊 **每日工作报告**\n\n`;
  text += `━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  for (const section of report.sections) {
    text += `**${section.title}**\n${section.content}\n\n`;
  }
  
  return text;
}

async function sendReport(report) {
  console.log('📤 发送报告给:', config.recipients);
  // 实际使用时调用消息发送 API
}

module.exports = { generateDailyReport };

// 直接运行时执行
if (require.main === module) {
  generateDailyReport().catch(console.error);
}
