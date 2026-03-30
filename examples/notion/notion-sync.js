/**
 * Notion 深度集成示例 - OpenClaw × Notion
 * 
 * 功能：
 * 1. 读取 Notion 数据库并用 AI 生成摘要
 * 2. 将 AI 生成内容写回 Notion 页面
 * 3. 监听 Notion 变更，触发自动化工作流
 * 4. 双向同步：飞书/企微消息 ↔ Notion 数据库
 * 
 * 依赖：
 *   npm install @notionhq/client axios dotenv
 */

require('dotenv').config();
const { Client } = require('@notionhq/client');
const axios = require('axios');

// ─────────────────────────────────────────
// 配置区
// ─────────────────────────────────────────
const NOTION_TOKEN    = process.env.NOTION_TOKEN;      // Notion Integration Token
const DATABASE_ID     = process.env.NOTION_DATABASE_ID; // 目标数据库 ID
const OPENCLAW_URL    = process.env.OPENCLAW_URL || 'http://localhost:3000';
const OPENCLAW_KEY    = process.env.OPENCLAW_API_KEY;
const CHANNEL         = process.env.OPENCLAW_CHANNEL || 'default';  // OpenClaw 渠道名

const notion = new Client({ auth: NOTION_TOKEN });

// ─────────────────────────────────────────
// 工具函数：调用 OpenClaw AI
// ─────────────────────────────────────────
async function callAI(prompt, context = '') {
  const res = await axios.post(
    `${OPENCLAW_URL}/api/v1/chat`,
    {
      channel: CHANNEL,
      messages: [
        ...(context ? [{ role: 'system', content: context }] : []),
        { role: 'user', content: prompt }
      ]
    },
    { headers: { Authorization: `Bearer ${OPENCLAW_KEY}` } }
  );
  return res.data.choices[0].message.content.trim();
}

// ─────────────────────────────────────────
// 1. 读取 Notion 数据库条目
// ─────────────────────────────────────────
async function fetchDatabaseEntries(filter = {}, sorts = []) {
  const entries = [];
  let cursor;

  do {
    const res = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: Object.keys(filter).length ? filter : undefined,
      sorts: sorts.length ? sorts : undefined,
      start_cursor: cursor,
      page_size: 100
    });
    entries.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  return entries;
}

// ─────────────────────────────────────────
// 2. 读取页面正文（Blocks）
// ─────────────────────────────────────────
async function fetchPageContent(pageId) {
  const blocks = [];
  let cursor;

  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100
    });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  // 将 blocks 转成纯文本
  return blocks
    .filter(b => b[b.type]?.rich_text)
    .map(b => b[b.type].rich_text.map(t => t.plain_text).join(''))
    .join('\n');
}

// ─────────────────────────────────────────
// 3. 将 AI 摘要写入 Notion 页面
// ─────────────────────────────────────────
async function appendSummaryToPage(pageId, summary) {
  await notion.blocks.children.append({
    block_id: pageId,
    children: [
      {
        object: 'block',
        type: 'divider',
        divider: {}
      },
      {
        object: 'block',
        type: 'callout',
        callout: {
          rich_text: [{ type: 'text', text: { content: '🤖 AI 摘要（由 OpenClaw 生成）' } }],
          icon: { type: 'emoji', emoji: '🦞' },
          color: 'blue_background'
        }
      },
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: summary } }]
        }
      }
    ]
  });
  console.log(`✅ 摘要已写入页面 ${pageId}`);
}

// ─────────────────────────────────────────
// 4. 更新数据库条目属性（标记已处理）
// ─────────────────────────────────────────
async function markPageProcessed(pageId, summaryText) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      // 需根据你的数据库结构调整属性名
      Status: {
        select: { name: 'AI已处理' }
      },
      AI摘要: {
        rich_text: [{ type: 'text', text: { content: summaryText.slice(0, 2000) } }]
      },
      处理时间: {
        date: { start: new Date().toISOString() }
      }
    }
  });
}

// ─────────────────────────────────────────
// 5. 创建新 Notion 页面（用于写回 AI 生成内容）
// ─────────────────────────────────────────
async function createNotionPage(title, content, tags = []) {
  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties: {
      Name: {
        title: [{ type: 'text', text: { content: title } }]
      },
      Tags: {
        multi_select: tags.map(tag => ({ name: tag }))
      },
      Source: {
        select: { name: 'OpenClaw AI' }
      },
      CreatedAt: {
        date: { start: new Date().toISOString() }
      }
    },
    children: content.split('\n\n').map(para => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: para } }]
      }
    }))
  });
  console.log(`📝 新页面已创建：${page.id}`);
  return page;
}

// ─────────────────────────────────────────
// 6. 批量 AI 摘要处理流程
// ─────────────────────────────────────────
async function batchSummarize() {
  console.log('🚀 开始批量 AI 摘要处理...');

  // 只处理 Status = "待处理" 的条目
  const entries = await fetchDatabaseEntries({
    property: 'Status',
    select: { equals: '待处理' }
  });

  console.log(`📋 找到 ${entries.length} 条待处理内容`);

  for (const entry of entries) {
    const pageId = entry.id;
    const title = entry.properties.Name?.title?.[0]?.plain_text || '无标题';

    try {
      console.log(`\n处理：「${title}」`);
      const content = await fetchPageContent(pageId);

      if (!content || content.length < 50) {
        console.log(`  ⚠️ 内容过短，跳过`);
        continue;
      }

      const summary = await callAI(
        `请对以下内容生成一份简洁的中文摘要（200字以内），提炼核心观点和关键信息：\n\n${content}`,
        '你是一个专业的内容分析助手，擅长提炼要点和生成清晰摘要。'
      );

      await appendSummaryToPage(pageId, summary);
      await markPageProcessed(pageId, summary);

      // 避免 API 限流
      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.error(`  ❌ 处理失败：${err.message}`);
    }
  }

  console.log('\n✅ 批量处理完成！');
}

// ─────────────────────────────────────────
// 7. 从消息生成 Notion 文档（飞书/企微/钉钉 → Notion）
// ─────────────────────────────────────────
async function messageToNotion(message, source = '消息同步') {
  console.log(`\n📨 收到消息，正在生成 Notion 文档...`);

  const structured = await callAI(
    `请将以下消息整理成结构化的知识卡片，包含：标题、核心要点（bullet points）、背景说明、行动建议。以 JSON 格式返回，字段：title, points(数组), background, action。\n\n消息：${message}`,
    '你是一个知识管理助手，擅长将零散信息组织成结构化文档。'
  );

  let parsed;
  try {
    parsed = JSON.parse(structured.replace(/```json\n?|\n?```/g, ''));
  } catch {
    // 解析失败则直接存原文
    parsed = { title: source + ' - ' + new Date().toLocaleDateString(), points: [], background: message, action: '' };
  }

  const pageContent = [
    `## 核心要点\n${parsed.points.map(p => `• ${p}`).join('\n')}`,
    `## 背景说明\n${parsed.background}`,
    `## 行动建议\n${parsed.action}`
  ].join('\n\n');

  const page = await createNotionPage(parsed.title, pageContent, [source, 'AI整理']);
  return page;
}

// ─────────────────────────────────────────
// 8. Notion → 消息平台推送（定时报告）
// ─────────────────────────────────────────
async function generateDailyReport(webhookUrl) {
  console.log('\n📊 生成每日 Notion 报告...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const entries = await fetchDatabaseEntries({
    property: 'CreatedAt',
    date: { on_or_after: today.toISOString() }
  });

  if (entries.length === 0) {
    console.log('今日暂无新内容');
    return;
  }

  const titles = entries.map(e =>
    e.properties.Name?.title?.[0]?.plain_text || '无标题'
  );

  const report = await callAI(
    `以下是今日新增的 ${entries.length} 条 Notion 记录，请生成一份简洁的日报摘要（markdown 格式，300字以内）：\n${titles.map((t, i) => `${i + 1}. ${t}`).join('\n')}`,
    '你是一个效率助手，擅长生成清晰的工作日报。'
  );

  // 推送到企微/飞书/钉钉 Webhook
  await axios.post(webhookUrl, {
    msgtype: 'markdown',
    markdown: {
      content: `## 📒 Notion 每日报告（${new Date().toLocaleDateString()}）\n\n${report}\n\n> 共 ${entries.length} 条新记录 | 由 OpenClaw 自动生成`
    }
  });

  console.log('✅ 日报已推送！');
}

// ─────────────────────────────────────────
// 9. 搜索 Notion 内容并用 AI 回答问题
// ─────────────────────────────────────────
async function searchAndAnswer(question) {
  console.log(`\n🔍 搜索 Notion：「${question}」`);

  const results = await notion.search({
    query: question,
    filter: { object: 'page' },
    page_size: 5
  });

  if (results.results.length === 0) {
    return await callAI(question);
  }

  const contexts = await Promise.all(
    results.results.slice(0, 3).map(async page => {
      const content = await fetchPageContent(page.id);
      const title = page.properties?.Name?.title?.[0]?.plain_text || '无标题';
      return `【${title}】\n${content.slice(0, 1000)}`;
    })
  );

  const answer = await callAI(
    `基于以下 Notion 知识库内容回答问题：\n\n${contexts.join('\n\n---\n\n')}\n\n问题：${question}`,
    '你是一个知识库助手，基于提供的文档内容回答问题，如文档中没有相关信息则如实说明。'
  );

  return answer;
}

// ─────────────────────────────────────────
// 入口：命令行 / 模块调用
// ─────────────────────────────────────────
async function main() {
  const cmd = process.argv[2];

  switch (cmd) {
    case 'summarize':
      // 批量摘要处理
      await batchSummarize();
      break;

    case 'report':
      // 发送日报（需提供 Webhook URL）
      const webhook = process.argv[3] || process.env.WEBHOOK_URL;
      if (!webhook) { console.error('请提供 Webhook URL'); process.exit(1); }
      await generateDailyReport(webhook);
      break;

    case 'ask':
      // 问答模式
      const question = process.argv.slice(3).join(' ');
      if (!question) { console.error('请提供问题'); process.exit(1); }
      const answer = await searchAndAnswer(question);
      console.log('\n💬 回答：\n' + answer);
      break;

    case 'sync':
      // 同步单条消息到 Notion（测试用）
      const msg = process.argv.slice(3).join(' ');
      if (!msg) { console.error('请提供消息内容'); process.exit(1); }
      await messageToNotion(msg, '手动同步');
      break;

    default:
      console.log(`
OpenClaw × Notion 集成工具

用法：
  node notion-sync.js summarize           批量 AI 摘要处理（处理 Status=待处理 的页面）
  node notion-sync.js report <webhook>    生成每日报告并推送到 Webhook
  node notion-sync.js ask <问题>          基于 Notion 知识库回答问题
  node notion-sync.js sync <消息内容>     将消息同步到 Notion

环境变量：
  NOTION_TOKEN          Notion Integration Token
  NOTION_DATABASE_ID    目标数据库 ID
  OPENCLAW_URL          OpenClaw 服务地址（默认 http://localhost:3000）
  OPENCLAW_API_KEY      OpenClaw API Key
  OPENCLAW_CHANNEL      OpenClaw 渠道名（默认 default）
  WEBHOOK_URL           默认推送 Webhook（企微/飞书/钉钉）

示例：
  node notion-sync.js ask "如何配置飞书机器人？"
  node notion-sync.js sync "今天客户反馈了一个性能问题，需要跟进优化连接池配置"
      `);
  }
}

// 支持直接运行和模块引用
if (require.main === module) {
  main().catch(err => {
    console.error('❌ 执行失败：', err.message);
    process.exit(1);
  });
}

module.exports = {
  fetchDatabaseEntries,
  fetchPageContent,
  appendSummaryToPage,
  createNotionPage,
  messageToNotion,
  searchAndAnswer,
  generateDailyReport,
  batchSummarize
};
