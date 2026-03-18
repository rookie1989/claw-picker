/**
 * GitHub PR 审查机器人
 * 
 * 功能：
 * - 自动审查 Pull Request
 * - 检查代码规范
 * - 识别潜在 Bug
 * - 提供改进建议
 * - 生成审查报告
 * 
 * 使用方式：
 * 在聊天中发送：/review https://github.com/owner/repo/pull/123
 */

const axios = require('axios');

// 配置
const config = {
  githubToken: process.env.GITHUB_TOKEN,
  aiApiKey: process.env.AI_API_KEY,
  aiModel: 'Qwen2.5-72B-Instruct'
};

/**
 * 主处理函数
 */
async function handlePRReview(message, context) {
  try {
    // 1. 提取 PR 信息
    const prInfo = extractPRInfo(message.text);
    
    if (!prInfo) {
      return {
        text: '请提供 GitHub PR 链接，例如：\n/review https://github.com/owner/repo/pull/123'
      };
    }
    
    // 2. 获取 PR 详情
    console.log(`[PR Review] 获取 PR 详情：${prInfo.owner}/${prInfo.repo}#${prInfo.number}`);
    const pr = await getPRDetails(prInfo.owner, prInfo.repo, prInfo.number);
    
    // 3. 获取 PR 变更文件
    console.log(`[PR Review] 获取变更文件...`);
    const files = await getPRFiles(prInfo.owner, prInfo.repo, prInfo.number);
    
    // 4. 调用 AI 审查
    console.log(`[PR Review] 调用 AI 审查...`);
    const review = await reviewWithAI(pr, files);
    
    // 5. 返回审查结果
    return {
      text: review,
      metadata: {
        prNumber: pr.number,
        prTitle: pr.title,
        filesChanged: files.length
      }
    };
    
  } catch (error) {
    console.error('[PR Review] 错误:', error);
    return {
      text: `抱歉，PR 审查失败：${error.message}\n\n请检查：\n1. PR 链接是否正确\n2. GitHub Token 是否有效\n3. 仓库是否可访问`
    };
  }
}

/**
 * 从消息中提取 PR 信息
 */
function extractPRInfo(text) {
  // 匹配完整的 GitHub PR 链接
  const urlPattern = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
  const match = text.match(urlPattern);
  
  if (match) {
    return {
      owner: match[1],
      repo: match[2],
      number: match[3]
    };
  }
  
  // 匹配短格式：owner/repo#123
  const shortPattern = /([^/]+)\/([^#]+)#(\d+)/;
  const shortMatch = text.match(shortPattern);
  
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      number: shortMatch[3]
    };
  }
  
  return null;
}

/**
 * 获取 PR 详情
 */
async function getPRDetails(owner, repo, number) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}`;
  
  const response = await axios.get(url, {
    headers: {
      'Authorization': `token ${config.githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  return response.data;
}

/**
 * 获取 PR 变更文件
 */
async function getPRFiles(owner, repo, number) {
  const url = `https://api.github.com/repos/${owner}/${repo}/pulls/${number}/files`;
  
  const response = await axios.get(url, {
    headers: {
      'Authorization': `token ${config.githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    params: {
      per_page: 100 // 最多获取 100 个文件
    }
  });
  
  return response.data;
}

/**
 * 调用 AI 进行审查
 */
async function reviewWithAI(pr, files) {
  // 构建审查提示
  const prompt = buildReviewPrompt(pr, files);
  
  // 调用 AI 服务
  const review = await callAI(prompt);
  
  return review;
}

/**
 * 构建审查提示
 */
function buildReviewPrompt(pr, files) {
  const fileSummaries = files.map(file => {
    return `### ${file.filename}\n状态：${file.status}\n变更：+${file.additions} -${file.deletions}\n\n\`\`\`${file.patch}\n\`\`\``;
  }).join('\n\n');
  
  return `请审查以下 Pull Request：

## PR 信息
- **标题**: ${pr.title}
- **作者**: ${pr.user.login}
- **描述**: 
${pr.body || '无描述'}

## 变更统计
- 文件数：${files.length}
- 新增行数：${files.reduce((sum, f) => sum + f.additions, 0)}
- 删除行数：${files.reduce((sum, f) => sum + f.deletions, 0)}

## 文件变更详情
${fileSummaries}

## 审查要求
请从以下角度进行审查：

### 1. 代码质量
- 代码是否清晰易读？
- 命名是否规范？
- 是否有适当的注释？

### 2. 潜在 Bug
- 是否有逻辑错误？
- 是否有边界条件未处理？
- 是否有空指针风险？

### 3. 性能问题
- 是否有性能瓶颈？
- 是否有内存泄漏风险？
- 是否有不必要的计算？

### 4. 代码规范
- 是否符合项目代码规范？
- 是否有格式问题？
- 是否有未使用的代码？

### 5. 测试
- 是否有足够的测试？
- 测试是否覆盖了关键场景？

### 6. 改进建议
- 具体的改进建议
- 可优化的代码片段

请按以下格式输出审查报告：

## 🔍 审查总结
[整体评价]

## ✅ 优点
- [列表]

## ⚠️ 需要注意
- [列表]

## ❌ 问题
- [列表]

## 💡 改进建议
- [列表]

## 📊 审查结论
[通过/需要修改/拒绝]`;
}

/**
 * 调用 AI 服务
 */
async function callAI(prompt) {
  // 这里使用硅基流动 API 作为示例
  // 实际使用时请根据你的 AI 服务调整
  
  const response = await axios.post(
    'https://api.siliconflow.cn/v1/chat/completions',
    {
      model: config.aiModel,
      messages: [
        {
          role: 'system',
          content: '你是资深软件工程师，擅长代码审查。请提供专业、具体、可操作的审查意见。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    },
    {
      headers: {
        'Authorization': `Bearer ${config.aiApiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return response.data.choices[0].message.content;
}

/**
 * 导出模块
 */
module.exports = {
  name: 'github-pr-reviewer',
  triggers: ['/review', '/审查 PR', '/pr review'],
  description: '审查 GitHub Pull Request',
  examples: [
    '/review https://github.com/owner/repo/pull/123',
    '/审查 PR owner/repo#123'
  ],
  handler: handlePRReview
};
