// Notion 数据库管理器
// 创建、查询、更新 Notion 数据库

const https = require('https');

// 配置
const config = {
  token: process.env.NOTION_TOKEN,
  databaseId: process.env.NOTION_DATABASE_ID
};

// 主类
class NotionDatabaseManager {
  constructor(databaseId) {
    this.databaseId = databaseId || config.databaseId;
    this.token = config.token;
  }

  // 查询数据库
  async query(filter = null) {
    const body = filter ? { filter } : {};
    
    const response = await this.apiRequest(`/databases/${this.databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    
    return response.results;
  }

  // 创建页面
  async createPage(properties) {
    return this.apiRequest('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: { database_id: this.databaseId },
        properties
      })
    });
  }

  // 更新页面
  async updatePage(pageId, properties) {
    return this.apiRequest(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties })
    });
  }

  // 删除页面（归档）
  async archivePage(pageId) {
    return this.apiRequest(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ archived: true })
    });
  }

  // API 调用
  async apiRequest(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `https://api.notion.com/v1${path}`;
      
      const req = https.request(url, {
        method: options.method || 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  }
}

// 使用示例
async function example() {
  const db = new NotionDatabaseManager();
  
  // 查询所有记录
  const all = await db.query();
  console.log(`共 ${all.length} 条记录`);
  
  // 创建新记录
  const newPage = await db.createPage({
    'Name': {
      title: [{ text: { content: '新任务' } }]
    },
    'Status': {
      select: { name: '进行中' }
    },
    'Due Date': {
      date: { start: '2026-04-01' }
    }
  });
  console.log('创建成功:', newPage.id);
  
  // 更新记录
  await db.updatePage(newPage.id, {
    'Status': { select: { name: '已完成' } }
  });
  console.log('更新成功');
}

// 命令行使用
if (require.main === module) {
  example().catch(console.error);
}

module.exports = NotionDatabaseManager;
