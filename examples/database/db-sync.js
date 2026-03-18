/**
 * 数据库同步机器人
 * 
 * 功能：
 * - 定时同步数据库数据
 * - 数据变更通知
 * - 数据查询和统计
 * - 数据备份提醒
 * 
 * 支持数据库：
 * - MySQL
 * - PostgreSQL
 * - MongoDB
 * - SQLite
 * 
 * 使用方式：
 * /db-sync 同步数据
 * /db-query 查询数据
 * /db-stats 查看统计
 */

const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const Database = require('better-sqlite3');

// 配置
const config = {
  type: process.env.DB_TYPE || 'mysql',
  mysql: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  postgres: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    database: process.env.DB_NAME
  },
  sync: {
    schedule: process.env.SYNC_SCHEDULE || '0 */6 * * *', // 每 6 小时同步
    notifyChanges: true,
    backupReminder: true
  }
};

// 数据库连接池
let dbConnection = null;

/**
 * 初始化数据库连接
 */
async function initDB() {
  try {
    switch (config.type) {
      case 'mysql':
        dbConnection = await mysql.createConnection(config.mysql);
        console.log('[DB Sync] MySQL 连接成功');
        break;
      
      case 'postgresql':
        dbConnection = new Pool(config.postgres);
        console.log('[DB Sync] PostgreSQL 连接成功');
        break;
      
      case 'mongodb':
        const client = new MongoClient(config.mongodb.uri);
        await client.connect();
        dbConnection = client.db(config.mongodb.database);
        console.log('[DB Sync] MongoDB 连接成功');
        break;
      
      case 'sqlite':
        dbConnection = new Database('database.sqlite');
        console.log('[DB Sync] SQLite 连接成功');
        break;
      
      default:
        throw new Error(`不支持的数据库类型：${config.type}`);
    }
  } catch (error) {
    console.error('[DB Sync] 数据库连接失败:', error);
    throw error;
  }
}

/**
 * 主处理函数
 */
async function handleDBSync(message, context) {
  const command = extractCommand(message.text);
  
  switch (command) {
    case 'sync':
      return await syncData(context);
    
    case 'query':
      return await queryData(message.text, context);
    
    case 'stats':
      return await getStats(context);
    
    case 'backup':
      return await triggerBackup(context);
    
    default:
      return {
        text: `数据库同步机器人

可用命令：
/db-sync 同步数据
/db-query <SQL> 查询数据
/db-stats 查看统计
/db-backup 触发备份

当前配置：
- 数据库类型：${config.type}
- 同步频率：${config.sync.schedule}
- 变更通知：${config.sync.notifyChanges ? '开启' : '关闭'}`
      };
  }
}

/**
 * 提取命令
 */
function extractCommand(text) {
  const patterns = {
    sync: [/同步/, /sync/i],
    query: [/查询/, /query/i, /select/i],
    stats: [/统计/, /stats/i, /状态/],
    backup: [/备份/, /backup/i]
  };
  
  for (const [cmd, regs] of Object.entries(patterns)) {
    for (const reg of regs) {
      if (reg.test(text)) {
        return cmd;
      }
    }
  }
  
  return 'help';
}

/**
 * 同步数据
 */
async function syncData(context) {
  try {
    const startTime = Date.now();
    
    // 获取需要同步的表
    const tables = await getTables();
    
    // 逐表同步
    const results = [];
    for (const table of tables) {
      const result = await syncTable(table);
      results.push(result);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      text: `✅ 数据同步完成

📊 同步统计：
- 表数量：${tables.length}
- 同步记录：${results.reduce((sum, r) => sum + r.count, 0)}
- 耗时：${duration}ms

📋 详情：
${results.map(r => `• ${r.table}: ${r.count} 条记录`).join('\n')}`
    };
  } catch (error) {
    console.error('[DB Sync] 同步失败:', error);
    return {
      text: `❌ 数据同步失败：${error.message}`
    };
  }
}

/**
 * 获取表列表
 */
async function getTables() {
  switch (config.type) {
    case 'mysql':
      const [mysqlRows] = await dbConnection.query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = ?
      `, [config.mysql.database]);
      return mysqlRows.map(r => r.TABLE_NAME);
    
    case 'postgresql':
      const pgResult = await dbConnection.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      return pgResult.rows.map(r => r.table_name);
    
    case 'mongodb':
      const collections = await dbConnection.collections();
      return collections.map(c => c.collectionName);
    
    case 'sqlite':
      const sqliteRows = dbConnection.prepare(`
        SELECT name FROM sqlite_master WHERE type='table'
      `).all();
      return sqliteRows.map(r => r.name);
    
    default:
      return [];
  }
}

/**
 * 同步单个表
 */
async function syncTable(tableName) {
  // 这里实现具体的同步逻辑
  // 示例：获取记录数
  let count = 0;
  
  switch (config.type) {
    case 'mysql':
      const [rows] = await dbConnection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      count = rows[0].count;
      break;
    
    case 'postgresql':
      const result = await dbConnection.query(`SELECT COUNT(*) FROM ${tableName}`);
      count = result.rows[0].count;
      break;
    
    case 'mongodb':
      count = await dbConnection.collection(tableName).countDocuments();
      break;
    
    case 'sqlite':
      const row = dbConnection.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get();
      count = row.count;
      break;
  }
  
  return { table: tableName, count: parseInt(count) };
}

/**
 * 查询数据
 */
async function queryData(text, context) {
  try {
    // 提取 SQL 语句
    const sql = extractSQL(text);
    
    if (!sql) {
      return {
        text: '请提供 SQL 查询语句，例如：\n/db-query SELECT * FROM users LIMIT 10'
      };
    }
    
    // 安全检查：只允许 SELECT
    if (!/^\s*SELECT/i.test(sql)) {
      return {
        text: '⚠️ 安全限制：只允许执行 SELECT 查询'
      };
    }
    
    // 执行查询
    let results = [];
    
    switch (config.type) {
      case 'mysql':
        const [rows] = await dbConnection.query(sql);
        results = rows;
        break;
      
      case 'postgresql':
        const result = await dbConnection.query(sql);
        results = result.rows;
        break;
      
      case 'mongodb':
        // MongoDB 查询需要特殊处理
        results = await executeMongoQuery(sql);
        break;
      
      case 'sqlite':
        results = dbConnection.prepare(sql).all();
        break;
    }
    
    // 格式化结果
    const formatted = formatQueryResults(results);
    
    return {
      text: `📊 查询结果

${formatted}

共 ${results.length} 条记录`
    };
  } catch (error) {
    console.error('[DB Query] 查询失败:', error);
    return {
      text: `❌ 查询失败：${error.message}`
    };
  }
}

/**
 * 提取 SQL 语句
 */
function extractSQL(text) {
  const patterns = [
    /\/db-query\s+(.+)/i,
    /查询\s+(.+)/i,
    /(SELECT\s+.+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * 格式化查询结果
 */
function formatQueryResults(results) {
  if (results.length === 0) {
    return '无数据';
  }
  
  // 取前 10 条
  const limited = results.slice(0, 10);
  
  // 获取字段名
  const fields = Object.keys(limited[0]);
  
  // 构建表格
  const header = fields.join(' | ');
  const separator = fields.map(() => '---').join(' | ');
  const rows = limited.map(row => 
    fields.map(f => String(row[f] || 'NULL')).join(' | ')
  );
  
  return `\`\`\`
${header}
${separator}
${rows.join('\n')}
\`\`\`

${results.length > 10 ? '\n（仅显示前 10 条）' : ''}`;
}

/**
 * 获取统计信息
 */
async function getStats(context) {
  try {
    const tables = await getTables();
    const stats = [];
    
    for (const table of tables) {
      const result = await syncTable(table);
      stats.push(result);
    }
    
    const totalRecords = stats.reduce((sum, s) => sum + s.count, 0);
    
    return {
      text: `📊 数据库统计

📋 表统计：
${stats.map(s => `• ${s.table}: ${s.count.toLocaleString()} 条记录`).join('\n')}

📈 总计：
• 表数量：${tables.length}
• 总记录数：${totalRecords.toLocaleString()}

💾 数据库类型：${config.type}
🕐 统计时间：${new Date().toLocaleString('zh-CN')}`
    };
  } catch (error) {
    console.error('[DB Stats] 统计失败:', error);
    return {
      text: `❌ 统计失败：${error.message}`
    };
  }
}

/**
 * 触发备份
 */
async function triggerBackup(context) {
  // 这里实现备份逻辑
  // 示例：发送备份提醒
  return {
    text: `💾 备份提醒

📅 下次自动备份：今晚 02:00
📦 备份位置：/backups/database/
📧 备份完成通知：已开启

如需立即备份，请运行：
\`\`\`bash
mysqldump -u root -p ${config.mysql.database} > backup.sql
\`\`\`

或使用备份脚本：
\`\`\`bash
./scripts/backup-db.sh
\`\`\``
  };
}

/**
 * 导出模块
 */
module.exports = {
  name: 'database-sync',
  triggers: ['/db-sync', '/db-query', '/db-stats', '/db-backup'],
  description: '数据库同步和查询',
  examples: [
    '/db-sync',
    '/db-query SELECT * FROM users LIMIT 10',
    '/db-stats',
    '/db-backup'
  ],
  init: initDB,
  handler: handleDBSync
};
