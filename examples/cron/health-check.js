// 服务健康检查
// 定期检查服务状态并发送告警

const https = require('https');

// 配置
const config = {
  services: [
    { name: 'Web 服务', url: 'https://example.com', timeout: 5000 },
    { name: 'API 服务', url: 'https://api.example.com', timeout: 5000 },
    { name: '数据库', url: 'https://db.example.com/health', timeout: 3000 }
  ],
  notifyChannel: 'feishu',
  notifyChatId: 'oc_xxx',
  feishuToken: process.env.FEISHU_USER_TOKEN
};

// 主函数
async function healthCheck() {
  console.log('开始健康检查...');
  
  const results = [];
  
  for (const service of config.services) {
    const result = await checkService(service);
    results.push(result);
    console.log(`${service.name}: ${result.status}`);
  }
  
  // 生成报告
  const report = generateReport(results);
  console.log(report);
  
  // 发送告警（如果有服务异常）
  const unhealthy = results.filter(r => r.status !== 'healthy');
  if (unhealthy.length > 0) {
    await sendAlert(unhealthy);
  }
  
  return results;
}

// 检查单个服务
async function checkService(service) {
  const start = Date.now();
  
  return new Promise((resolve) => {
    const req = https.request(service.url, {
      method: 'GET',
      timeout: service.timeout
    }, (res) => {
      const duration = Date.now() - start;
      
      if (res.statusCode >= 200 && res.statusCode < 300) {
        resolve({
          name: service.name,
          status: 'healthy',
          statusCode: res.statusCode,
          duration
        });
      } else {
        resolve({
          name: service.name,
          status: 'unhealthy',
          statusCode: res.statusCode,
          duration,
          error: `HTTP ${res.statusCode}`
        });
      }
    });
    
    req.on('error', (error) => {
      resolve({
        name: service.name,
        status: 'unhealthy',
        statusCode: 0,
        duration: Date.now() - start,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        name: service.name,
        status: 'timeout',
        statusCode: 0,
        duration: service.timeout,
        error: '请求超时'
      });
    });
    
    req.end();
  });
}

// 生成报告
function generateReport(results) {
  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.length;
  
  let report = `🏥 健康检查报告

总体状态：${healthy}/${total} 服务正常

`;
  
  for (const result of results) {
    const icon = result.status === 'healthy' ? '✅' : '❌';
    report += `${icon} ${result.name}\n`;
    report += `   状态：${result.status}\n`;
    report += `   响应：${result.duration}ms\n`;
    if (result.error) {
      report += `   错误：${result.error}\n`;
    }
    report += '\n';
  }
  
  return report;
}

// 发送告警
async function sendAlert(unhealthy) {
  const message = `⚠️ **服务告警**

${unhealthy.map(u => `❌ ${u.name}: ${u.error}`).join('\n')}

请立即检查！`;
  
  // 实际调用飞书消息 API
  console.log('发送告警:', message);
  
  // await sendFeishuMessage(config.notifyChatId, message);
}

// 发送飞书消息
async function sendFeishuMessage(chatId, message) {
  // 实际调用飞书 API
  return new Promise((resolve, reject) => {
    const req = https.request('https://open.feishu.cn/open-apis/im/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.feishuToken}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    
    req.on('error', reject);
    
    req.write(JSON.stringify({
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text: message })
    }));
    
    req.end();
  });
}

// 命令行使用
if (require.main === module) {
  healthCheck()
    .then(() => console.log('完成'))
    .catch(console.error);
}

module.exports = { healthCheck, checkService };
