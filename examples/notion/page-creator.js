/**
 * Notion 页面创建器
 * 
 * 功能：创建笔记、任务、会议记录等页面
 * 使用：配置 NOTION_TOKEN 和 NOTION_DATABASE_ID
 */

const { Client } = require('@notionhq/client');

const notion = new Client({
  auth: process.env.NOTION_TOKEN
});

const databaseId = process.env.NOTION_DATABASE_ID;

/**
 * 创建页面
 * @param {Object} options - 页面配置
 */
async function createPage(options) {
  const { title, type = 'note', content = [], properties = {} } = options;
  
  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: {
      title: {
        title: [{ type: 'text', text: { content: title } }]
      },
      ...properties
    }
  });
  
  // 添加内容块
  if (content.length > 0) {
    await notion.blocks.children.append({
      block_id: page.id,
      children: content
    });
  }
  
  return page;
}

/**
 * 创建笔记
 */
async function createNote(title, content, tags = []) {
  return await createPage({
    title,
    type: 'note',
    content: [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content } }]
      }
    }],
    properties: {
      Tags: {
        multi_select: tags.map(tag => ({ name: tag }))
      }
    }
  });
}

/**
 * 创建任务
 */
async function createTask(title, description, options = {}) {
  const { priority = '中', dueDate = null } = options;
  
  return await createPage({
    title,
    type: 'task',
    content: [{
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: description } }]
      }
    }],
    properties: {
      Priority: { select: { name: priority } },
      'Due Date': dueDate ? { date: { start: dueDate } } : undefined
    }
  });
}

module.exports = { createPage, createNote, createTask };
