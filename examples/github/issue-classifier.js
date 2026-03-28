// GitHub Issue 自动分类器
// 自动分析 Issue 内容并添加标签

const https = require('https');

// 配置
const config = {
  token: process.env.GITHUB_TOKEN,
  owner: 'rookie1989',
  repo: 'claw-picker',
  labels: {
    bug: ['error', 'fail', 'broken', 'crash', 'exception'],
    feature: ['add', 'new', 'enhance', 'request', 'feature'],
    documentation: ['doc', 'readme', 'typo', 'comment'],
    question: ['how', 'what', 'why', 'help', 'question'],
    good first issue: ['beginner', 'easy', 'first']
  }
};

// 主函数
async function classifyIssue(issue) {
  console.log(`分析 Issue #${issue.number}: ${issue.title}`);
  
  // 1. 提取关键词
  const text = `${issue.title} ${issue.body}`.toLowerCase();
  const detectedLabels = [];
  
  // 2. 匹配标签
  for (const [label, keywords] of Object.entries(config.labels)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        detectedLabels.push(label);
        break;
      }
    }
  }
  
  // 3. 添加标签
  if (detectedLabels.length > 0) {
    await addLabels(issue.number, detectedLabels);
    console.log(`添加标签：${detectedLabels.join(', ')}`);
  }
  
  // 4. 自动回复
  await postComment(issue.number, generateResponse(detectedLabels));
  
  return detectedLabels;
}

// 添加标签
async function addLabels(issueNumber, labels) {
  return apiRequest(`/repos/${config.owner}/${config.repo}/issues/${issueNumber}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels })
  });
}

// 发表评论
async function postComment(issueNumber, body) {
  return apiRequest(`/repos/${config.owner}/${config.repo}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body })
  });
}

// 生成自动回复
function generateResponse(labels) {
  const responses = {
    bug: '🐛 感谢反馈！我们会尽快检查这个问题。',
    feature: '✨ 好建议！我们会考虑纳入开发计划。',
    documentation: '📚 谢谢指出！会尽快完善文档。',
    question: '❓ 收到问题，会尽快解答。',
    'good first issue': '👋 这个问题很适合新手贡献！'
  };
  
  let response = '🤖 **自动分类完成**\n\n';
  for (const label of labels) {
    if (responses[label]) {
      response += responses[label] + '\n';
    }
  }
  
  return response;
}

// GitHub API 调用
function apiRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com${path}`;
    
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'OpenClaw-Issue-Classifier',
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

// 监听 Webhook（如果使用）
async function handleWebhook(req, res) {
  const event = req.headers['x-github-event'];
  const payload = req.body;
  
  if (event === 'issues' && payload.action === 'opened') {
    await classifyIssue(payload.issue);
  }
  
  res.status(200).send('OK');
}

// 命令行使用
if (require.main === module) {
  const issueNumber = process.argv[2];
  if (issueNumber) {
    apiRequest(`/repos/${config.owner}/${config.repo}/issues/${issueNumber}`)
      .then(classifyIssue)
      .catch(console.error);
  } else {
    console.log('用法：node issue-classifier.js <issue-number>');
  }
}

module.exports = { classifyIssue, handleWebhook };
