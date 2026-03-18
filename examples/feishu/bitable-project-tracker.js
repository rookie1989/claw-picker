/**
 * 飞书多维表格示例 - 项目任务追踪
 * 
 * 功能：
 * - 创建项目追踪多维表格
 * - 批量创建任务
 * - 查询和筛选任务
 * - 更新任务状态
 */

const { 
  feishu_bitable_app,
  feishu_bitable_app_table,
  feishu_bitable_app_table_record
} = require('@openclaw/feishu');

// 配置
const CONFIG = {
  projectName: 'OpenClaw 文档项目',
  userOpenId: 'ou_xxxxxxxxxxxxx',  // 替换为你的 open_id
};

/**
 * 创建项目追踪表格
 */
async function createProjectTracker() {
  console.log('🚀 开始创建项目追踪表格...');
  
  // 1. 创建多维表格应用
  const bitable = await feishu_bitable_app({
    action: 'create',
    name: `${CONFIG.projectName} - 项目追踪`,
    is_advanced: true
  });
  
  console.log('✅ 多维表格应用创建成功:', bitable.name);
  console.log('   App Token:', bitable.app_token);
  
  // 2. 创建任务数据表
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
              { name: '已完成', color: 'green' },
              { name: '已阻塞', color: 'red' }
            ]
          }
        },
        { field_name: '完成百分比', type: 2 }
      ]
    }
  });
  
  console.log('✅ 数据表创建成功:', table.table_name);
  console.log('   Table ID:', table.table_id);
  
  return {
    app_token: bitable.app_token,
    table_id: table.table_id
  };
}

/**
 * 批量创建示例任务
 */
async function createSampleTasks(appToken, tableId) {
  console.log('\n📝 开始创建示例任务...');
  
  const tasks = [
    {
      '任务名称': '编写飞书多维表格教程',
      '描述': '包括基础操作、字段管理、视图管理、实战案例',
      '负责人': [{ id: CONFIG.userOpenId }],
      '开始日期': new Date('2026-03-18').getTime(),
      '截止日期': new Date('2026-03-18').getTime(),
      '优先级': 'P0-紧急',
      '状态': '已完成',
      '完成百分比': 100
    },
    {
      '任务名称': '编写飞书日历教程',
      '描述': '包括日程管理、参会人管理、忙闲查询',
      '负责人': [{ id: CONFIG.userOpenId }],
      '开始日期': new Date('2026-03-18').getTime(),
      '截止日期': new Date('2026-03-18').getTime(),
      '优先级': 'P0-紧急',
      '状态': '已完成',
      '完成百分比': 100
    },
    {
      '任务名称': '编写飞书任务教程',
      '描述': '包括任务管理、清单管理、子任务、评论',
      '负责人': [{ id: CONFIG.userOpenId }],
      '开始日期': new Date('2026-03-18').getTime(),
      '截止日期': new Date('2026-03-18').getTime(),
      '优先级': 'P0-紧急',
      '状态': '已完成',
      '完成百分比': 100
    },
    {
      '任务名称': '编写飞书文档教程',
      '描述': '包括文档 CRUD、评论、媒体、知识库管理',
      '负责人': [{ id: CONFIG.userOpenId }],
      '开始日期': new Date('2026-03-18').getTime(),
      '截止日期': new Date('2026-03-18').getTime(),
      '优先级': 'P0-紧急',
      '状态': '已完成',
      '完成百分比': 100
    },
    {
      '任务名称': '创建实战工作流模板',
      '描述': '晨间简报、会议纪要、周报生成、项目追踪',
      '负责人': [{ id: CONFIG.userOpenId }],
      '开始日期': new Date('2026-03-18').getTime(),
      '截止日期': new Date('2026-03-18').getTime(),
      '优先级': 'P1-重要',
      '状态': '已完成',
      '完成百分比': 100
    },
    {
      '任务名称': '创建 API 速查手册',
      '描述': '飞书 API 快速查阅手册',
      '负责人': [{ id: CONFIG.userOpenId }],
      '开始日期': new Date('2026-03-18').getTime(),
      '截止日期': new Date('2026-03-18').getTime(),
      '优先级': 'P1-重要',
      '状态': '已完成',
      '完成百分比': 100
    },
    {
      '任务名称': '编写避坑指南',
      '描述': '国内用户常见问题及解决方案',
      '负责人': [{ id: CONFIG.userOpenId }],
      '开始日期': new Date('2026-03-18').getTime(),
      '截止日期': new Date('2026-03-18').getTime(),
      '优先级': 'P1-重要',
      '状态': '已完成',
      '完成百分比': 100
    },
    {
      '任务名称': '创建示例代码',
      '描述': '完整的飞书集成示例代码',
      '负责人': [{ id: CONFIG.userOpenId }],
      '开始日期': new Date('2026-03-18').getTime(),
      '截止日期': new Date('2026-03-19').getTime(),
      '优先级': 'P2-普通',
      '状态': '进行中',
      '完成百分比': 50
    }
  ];
  
  const records = tasks.map(task => ({ fields: task }));
  
  const result = await feishu_bitable_app_table_record({
    action: 'batch_create',
    app_token: appToken,
    table_id: tableId,
    records: records
  });
  
  console.log(`✅ 成功创建 ${result.records.length} 个任务`);
  return result.records;
}

/**
 * 查询任务统计
 */
async function getTaskStatistics(appToken, tableId) {
  console.log('\n📊 查询任务统计...');
  
  const result = await feishu_bitable_app_table_record({
    action: 'list',
    app_token: appToken,
    table_id: tableId,
    page_size: 500
  });
  
  const tasks = result.records;
  const stats = {
    total: tasks.length,
    byStatus: {},
    byPriority: {},
    completed: 0,
    inProgress: 0,
    todo: 0
  };
  
  tasks.forEach(task => {
    const status = task.fields['状态'];
    const priority = task.fields['优先级'];
    
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;
    
    if (status === '已完成') stats.completed++;
    else if (status === '进行中') stats.inProgress++;
    else if (status === '待办') stats.todo++;
  });
  
  console.log('\n📈 任务统计:');
  console.log(`   总任务数：${stats.total}`);
  console.log(`   已完成：${stats.completed}`);
  console.log(`   进行中：${stats.inProgress}`);
  console.log(`   待办：${stats.todo}`);
  console.log('\n   按优先级:');
  Object.entries(stats.byPriority).forEach(([priority, count]) => {
    console.log(`     ${priority}: ${count}`);
  });
  
  return stats;
}

/**
 * 筛选高优先级任务
 */
async function filterHighPriorityTasks(appToken, tableId) {
  console.log('\n🔍 筛选高优先级任务...');
  
  const result = await feishu_bitable_app_table_record({
    action: 'list',
    app_token: appToken,
    table_id: tableId,
    filter: {
      conjunction: 'and',
      conditions: [
        {
          field_name: '优先级',
          operator: 'is',
          value: ['P0-紧急']
        },
        {
          field_name: '状态',
          operator: 'isNot',
          value: ['已完成']
        }
      ]
    },
    sort: [
      {
        field_name: '截止日期',
        desc: false
      }
    ]
  });
  
  console.log(`   找到 ${result.records.length} 个高优先级任务`);
  result.records.forEach(task => {
    console.log(`   - ${task.fields['任务名称']} (截止：${new Date(task.fields['截止日期']).toISOString().split('T')[0]})`);
  });
  
  return result.records;
}

/**
 * 主函数
 */
async function main() {
  try {
    // 1. 创建项目追踪表格
    const { app_token, table_id } = await createProjectTracker();
    
    // 2. 创建示例任务
    await createSampleTasks(app_token, table_id);
    
    // 3. 查询任务统计
    await getTaskStatistics(app_token, table_id);
    
    // 4. 筛选高优先级任务
    await filterHighPriorityTasks(app_token, table_id);
    
    console.log('\n✅ 所有操作完成！');
    console.log(`\n📱 查看多维表格:`);
    console.log(`   https://bytedance.feishu.cn/base/${app_token}`);
    
  } catch (error) {
    console.error('❌ 发生错误:', error);
    process.exit(1);
  }
}

// 运行
if (require.main === module) {
  main();
}

module.exports = {
  createProjectTracker,
  createSampleTasks,
  getTaskStatistics,
  filterHighPriorityTasks
};
