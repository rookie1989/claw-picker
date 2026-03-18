/**
 * 飞书任务示例 - 项目任务管理
 * 
 * 功能：
 * - 创建任务清单
 * - 批量创建任务
 * - 创建子任务
 * - 添加评论
 * - 任务统计
 */

const { 
  feishu_task_tasklist,
  feishu_task_task,
  feishu_task_subtask,
  feishu_task_comment
} = require('@openclaw/feishu');

// 配置
const CONFIG = {
  userOpenId: 'ou_xxxxxxxxxxxxx',  // 替换为你的 open_id
};

/**
 * 创建任务清单
 */
async function createTasklist(name, members = []) {
  console.log(`📋 创建任务清单：${name}`);
  
  const tasklist = await feishu_task_tasklist({
    action: 'create',
    name: name,
    members: members.length > 0 ? members : [
      { id: CONFIG.userOpenId, role: 'editor' }
    ]
  });
  
  console.log('✅ 任务清单创建成功');
  console.log(`   GUID: ${tasklist.tasklist_guid}`);
  
  return tasklist;
}

/**
 * 创建项目任务结构
 */
async function createProjectTasks(tasklistGuid, projectName, phases) {
  console.log(`\n🚀 创建项目任务：${projectName}`);
  
  const createdTasks = [];
  
  for (const phase of phases) {
    // 创建阶段主任务
    const mainTask = await feishu_task_task({
      action: 'create',
      current_user_id: CONFIG.userOpenId,
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
        { tasklist_guid: tasklistGuid }
      ]
    });
    
    console.log(`   ✅ 主任务：${mainTask.summary}`);
    createdTasks.push(mainTask);
    
    // 创建子任务
    if (phase.subtasks && phase.subtasks.length > 0) {
      for (const subtask of phase.subtasks) {
        await feishu_task_subtask({
          action: 'create',
          task_guid: mainTask.task_guid,
          summary: subtask.name,
          description: subtask.description,
          start: subtask.startDate ? {
            timestamp: subtask.startDate,
            is_all_day: false
          } : undefined,
          due: {
            timestamp: subtask.dueDate,
            is_all_day: false
          },
          members: subtask.assignee ? [
            { id: subtask.assignee, role: 'assignee' }
          ] : []
        });
      }
      console.log(`      └─ 创建 ${phase.subtasks.length} 个子任务`);
    }
  }
  
  console.log(`\n✅ 项目任务创建完成，共 ${createdTasks.length} 个主任务`);
  return createdTasks;
}

/**
 * 添加任务评论
 */
async function addTaskComment(taskGuid, content) {
  console.log(`\n💬 添加任务评论...`);
  
  const comment = await feishu_task_comment({
    action: 'create',
    task_guid: taskGuid,
    content: content
  });
  
  console.log('✅ 评论添加成功');
  return comment;
}

/**
 * 查询任务列表
 */
async function listTasks(completed = false) {
  console.log(`\n📊 查询任务列表（${completed ? '已完成' : '未完成'}）...`);
  
  const result = await feishu_task_task({
    action: 'list',
    current_user_id: CONFIG.userOpenId,
    completed: completed,
    page_size: 50
  });
  
  console.log(`   共 ${result.tasks.length} 个任务`);
  result.tasks.forEach(task => {
    const status = task.completed ? '✅' : '⏳';
    const dueDate = task.due?.timestamp ? 
      new Date(task.due.timestamp).toISOString().split('T')[0] : '无';
    console.log(`   ${status} ${task.summary} (截止：${dueDate})`);
  });
  
  return result.tasks;
}

/**
 * 完成任务
 */
async function completeTask(taskGuid) {
  console.log(`\n✅ 完成任务...`);
  
  const result = await feishu_task_task({
    action: 'patch',
    task_guid: taskGuid,
    completed_at: new Date().toISOString()
  });
  
  console.log('✅ 任务已标记为完成');
  return result;
}

/**
 * 任务统计
 */
async function getTaskStatistics() {
  console.log('\n📈 生成任务统计...');
  
  const [allTasks, completedTasks] = await Promise.all([
    feishu_task_task({
      action: 'list',
      current_user_id: CONFIG.userOpenId,
      completed: false,
      page_size: 100
    }),
    feishu_task_task({
      action: 'list',
      current_user_id: CONFIG.userOpenId,
      completed: true,
      page_size: 100
    })
  ]);
  
  const stats = {
    total: allTasks.tasks.length + completedTasks.tasks.length,
    completed: completedTasks.tasks.length,
    inProgress: allTasks.tasks.length,
    completionRate: 0
  };
  
  stats.completionRate = stats.total > 0 
    ? Math.round((stats.completed / stats.total) * 100) 
    : 0;
  
  console.log('\n📊 任务统计:');
  console.log(`   总任务数：${stats.total}`);
  console.log(`   已完成：${stats.completed}`);
  console.log(`   进行中：${stats.inProgress}`);
  console.log(`   完成率：${stats.completionRate}%`);
  
  return stats;
}

/**
 * 使用示例
 */
async function example() {
  try {
    // 1. 创建任务清单
    const tasklist = await createTasklist('OpenClaw 文档项目', [
      { id: CONFIG.userOpenId, role: 'editor' }
    ]);
    
    // 2. 创建项目任务结构
    const phases = [
      {
        name: '基础教程编写',
        description: '完成飞书系列教程',
        startDate: '2026-03-18T09:00:00+08:00',
        dueDate: '2026-03-20T18:00:00+08:00',
        subtasks: [
          { 
            name: '多维表格教程', 
            description: '基础操作、字段管理、视图管理',
            dueDate: '2026-03-18T18:00:00+08:00' 
          },
          { 
            name: '日历教程', 
            description: '日程管理、参会人管理、忙闲查询',
            dueDate: '2026-03-18T18:00:00+08:00' 
          },
          { 
            name: '任务教程', 
            description: '任务管理、清单管理、子任务',
            dueDate: '2026-03-18T18:00:00+08:00' 
          },
          { 
            name: '文档教程', 
            description: '文档 CRUD、评论、媒体',
            dueDate: '2026-03-18T18:00:00+08:00' 
          }
        ]
      },
      {
        name: '实战工作流开发',
        description: '创建常用工作流模板',
        startDate: '2026-03-21T09:00:00+08:00',
        dueDate: '2026-03-25T18:00:00+08:00',
        subtasks: [
          { 
            name: '晨间简报', 
            dueDate: '2026-03-22T18:00:00+08:00' 
          },
          { 
            name: '会议纪要', 
            dueDate: '2026-03-23T18:00:00+08:00' 
          },
          { 
            name: '周报生成', 
            dueDate: '2026-03-24T18:00:00+08:00' 
          },
          { 
            name: '项目追踪', 
            dueDate: '2026-03-25T18:00:00+08:00' 
          }
        ]
      },
      {
        name: '配套资料完善',
        description: '速查手册、避坑指南、示例代码',
        startDate: '2026-03-26T09:00:00+08:00',
        dueDate: '2026-03-28T18:00:00+08:00',
        subtasks: [
          { 
            name: 'API 速查手册', 
            dueDate: '2026-03-26T18:00:00+08:00' 
          },
          { 
            name: '避坑指南', 
            dueDate: '2026-03-27T18:00:00+08:00' 
          },
          { 
            name: '示例代码', 
            dueDate: '2026-03-28T18:00:00+08:00' 
          }
        ]
      }
    ];
    
    await createProjectTasks(tasklist.tasklist_guid, 'OpenClaw 文档项目', phases);
    
    // 3. 查询任务列表
    await listTasks(false);
    
    // 4. 任务统计
    await getTaskStatistics();
    
    console.log('\n✅ 所有操作完成！');
    
  } catch (error) {
    console.error('❌ 发生错误:', error);
    throw error;
  }
}

// 运行示例
if (require.main === module) {
  example().catch(console.error);
}

module.exports = {
  createTasklist,
  createProjectTasks,
  addTaskComment,
  listTasks,
  completeTask,
  getTaskStatistics
};
