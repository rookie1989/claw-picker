/**
 * GitHub Issue 自动处理器
 * 
 * 功能：自动标记、分配 Issue，发送欢迎消息
 * 使用：配置 Webhook 接收 GitHub 事件
 */

const { Octokit } = require('@octokit/rest');

const config = {
  github: {
    token: process.env.GITHUB_TOKEN,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO
  },
  labelRules: [
    { keywords: ['bug', '错误'], label: 'bug' },
    { keywords: ['feature', '功能'], label: 'enhancement' },
    { keywords: ['help', '帮助'], label: 'question' }
  ]
};

const octokit = new Octokit({ auth: config.github.token });

async function handleNewIssue(issue) {
  const { number, title, body, user } = issue;
  console.log(`📬 处理 Issue #${number}: ${title}`);
  
  // 自动添加标签
  const labels = autoLabel(title, body);
  if (labels.length > 0) {
    await octokit.issues.addLabels({
      owner: config.github.owner,
      repo: config.github.repo,
      issue_number: number,
      labels
    });
  }
  
  // 发送欢迎消息
  await octokit.issues.createComment({
    owner: config.github.owner,
    repo: config.github.repo,
    issue_number: number,
    body: `👋 @${user.login} 感谢提交 Issue！我们会尽快处理。`
  });
}

function autoLabel(title, body) {
  const text = `${title} ${body}`.toLowerCase();
  const labels = [];
  for (const rule of config.labelRules) {
    if (rule.keywords.some(k => text.includes(k))) {
      labels.push(rule.label);
    }
  }
  return [...new Set(labels)];
}

module.exports = { handleNewIssue };
