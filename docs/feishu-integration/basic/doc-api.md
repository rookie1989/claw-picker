# 飞书文档集成教程

> 使用 OpenClaw 管理飞书云文档，实现自动化文档创建和更新

## 概述

本教程将教你如何使用 OpenClaw 调用飞书文档 API，实现：
- 创建和更新云文档
- 管理文档评论
- 插入图片和媒体
- 搜索和读取文档
- 知识库管理

## 前置准备

### 1. 获取飞书 API 凭证

1. 访问 [飞书开放平台](https://open.feishu.cn/)
2. 创建企业自建应用
3. 获取 `App ID` 和 `App Secret`
4. 配置权限：
   - 文档权限：`docs:docs`、`docs:wiki`
   - 云空间权限：`drive:file`

### 2. 配置 OpenClaw

在 OpenClaw 配置文件中添加飞书插件配置：

```yaml
plugins:
  feishu:
    app_id: cli_xxxxxxxxxxxxx
    app_secret: xxxxxxxxxxxxxxx
```

## 基础操作

### 创建云文档

```javascript
// examples/feishu/create-doc.js
const { feishu_create_doc } = require('@openclaw/feishu');

async function createDoc() {
  const result = await feishu_create_doc({
    title: '项目周报 - 2026 年第 12 周',
    markdown: `# 项目周报

## 本周完成
- ✅ 完成飞书多维表格教程
- ✅ 完成飞书日历教程
- ✅ 完成飞书任务教程

## 下周计划
- [ ] 完成飞书文档教程
- [ ] 创建实战工作流模板
- [ ] 录制视频教程

## 风险与问题
- 无
`,
    // 可选：指定创建位置
    // folder_token: 'fld_xxxxxxxxxxxxx',
    // wiki_space: 'my_library',
    // wiki_node: 'wb_xxxxxxxxxxxxx'
  });
  
  console.log('文档创建成功:', result);
  console.log('文档 ID:', result.doc_id);
  console.log('文档 URL:', result.url);
  return result;
}

createDoc();
```

### 读取云文档

```javascript
// examples/feishu/fetch-doc.js
const { feishu_fetch_doc } = require('@openclaw/feishu');

async function fetchDoc(docId) {
  const result = await feishu_fetch_doc({
    doc_id: docId,
    // 可选：分页读取大文档
    // offset: 0,
    // limit: 5000
  });
  
  console.log('文档标题:', result.title);
  console.log('文档内容:');
  console.log(result.content);
  return result;
}

fetchDoc('docxxxxxxxxxxxxx');
```

### 更新云文档

```javascript
// examples/feishu/update-doc.js
const { feishu_update_doc } = require('@openclaw/feishu');

async function updateDoc(docId) {
  const result = await feishu_update_doc({
    doc_id: docId,
    mode: 'append',  // 追加模式
    markdown: `

## 最新更新
- 2026-03-18: 完成初稿
- 2026-03-19: 补充示例代码
`
  });
  
  console.log('文档更新成功:', result);
  return result;
}

updateDoc('docxxxxxxxxxxxxx');
```

### 更新模式说明

```javascript
// 7 种更新模式：

// 1. overwrite - 覆盖全文
await feishu_update_doc({
  doc_id: docId,
  mode: 'overwrite',
  markdown: '# 新标题\n\n新内容'
});

// 2. append - 追加到末尾
await feishu_update_doc({
  doc_id: docId,
  mode: 'append',
  markdown: '\n## 新增章节\n\n新内容'
});

// 3. replace_all - 替换所有内容
await feishu_update_doc({
  doc_id: docId,
  mode: 'replace_all',
  markdown: '# 完全替换'
});

// 4. replace_range - 替换指定范围
await feishu_update_doc({
  doc_id: docId,
  mode: 'replace_range',
  markdown: '替换内容',
  selection_with_ellipsis: '旧内容开头...旧内容结尾'
});

// 5. insert_before - 在指定位置前插入
await feishu_update_doc({
  doc_id: docId,
  mode: 'insert_before',
  markdown: '插入内容',
  selection_by_title: '## 目标章节'
});

// 6. insert_after - 在指定位置后插入
await feishu_update_doc({
  doc_id: docId,
  mode: 'insert_after',
  markdown: '插入内容',
  selection_by_title: '## 目标章节'
});

// 7. delete_range - 删除指定范围
await feishu_update_doc({
  doc_id: docId,
  mode: 'delete_range',
  selection_with_ellipsis: '要删除的内容开头...要删除的内容结尾'
});
```

## 文档评论

### 添加评论

```javascript
// examples/feishu/create-comment.js
const { feishu_doc_comments } = require('@openclaw/feishu');

async function createComment(docId, docType = 'docx') {
  const result = await feishu_doc_comments({
    action: 'create',
    file_token: docId,
    file_type: docType,
    // 评论内容（支持文本、@用户、超链接）
    elements: [
      { type: 'text', text: '这部分内容写得很清晰！' },
      { type: 'mention', open_id: 'ou_xxxxxxxxxxxxx', text: '@张三' },
      { type: 'text', text: ' 请 review 一下' },
      { type: 'link', url: 'https://example.com', text: '参考链接' }
    ]
  });
  
  console.log('评论添加成功:', result);
  return result;
}

createComment('docxxxxxxxxxxxxx');
```

### 查询评论列表

```javascript
// examples/feishu/list-comments.js
const { feishu_doc_comments } = require('@openclaw/feishu');

async function listComments(docId, docType = 'docx') {
  const result = await feishu_doc_comments({
    action: 'list',
    file_token: docId,
    file_type: docType,
    // 可选：只获取全文评论
    // is_whole: true,
    // 可选：只获取已解决的评论
    // is_solved: true,
    page_size: 50
  });
  
  console.log(`共 ${result.comments.length} 条评论:`);
  result.comments.forEach(comment => {
    console.log(`- ${comment.author?.name}: ${comment.content}`);
    if (comment.is_solved) {
      console.log('  [已解决]');
    }
  });
  
  return result.comments;
}

listComments('docxxxxxxxxxxxxx');
```

### 解决/恢复评论

```javascript
// examples/feishu/resolve-comment.js
const { feishu_doc_comments } = require('@openclaw/feishu');

async function resolveComment(docId, commentId, docType = 'docx') {
  const result = await feishu_doc_comments({
    action: 'patch',
    file_token: docId,
    file_type: docType,
    comment_id: commentId,
    is_solved_value: true  // true=解决，false=恢复
  });
  
  console.log('评论已解决:', result);
  return result;
}

resolveComment('docxxxxxxxxxxxxx', 'cmt_xxxxxxxxxxxxx');
```

## 文档媒体

### 插入图片

```javascript
// examples/feishu/insert-image.js
const { feishu_doc_media } = require('@openclaw/feishu');

async function insertImage(docId, imagePath) {
  const result = await feishu_doc_media({
    action: 'insert',
    doc_id: docId,
    file_path: imagePath,  // 本地文件路径
    type: 'image',
    align: 'center',  // left/center/right
    caption: '图片说明文字'
  });
  
  console.log('图片插入成功:', result);
  return result;
}

insertImage('docxxxxxxxxxxxxx', '/path/to/image.png');
```

### 插入文件附件

```javascript
// examples/feishu/insert-file.js
const { feishu_doc_media } = require('@openclaw/feishu');

async function insertFile(docId, filePath) {
  const result = await feishu_doc_media({
    action: 'insert',
    doc_id: docId,
    file_path: filePath,
    type: 'file'  // 文件附件
  });
  
  console.log('文件插入成功:', result);
  return result;
}

insertFile('docxxxxxxxxxxxxx', '/path/to/document.pdf');
```

### 下载文档素材

```javascript
// examples/feishu/download-media.js
const { feishu_doc_media } = require('@openclaw/feishu');

async function downloadMedia(resourceToken, outputPath) {
  const result = await feishu_doc_media({
    action: 'download',
    resource_token: resourceToken,
    resource_type: 'media',  // media=文档素材，whiteboard=画板
    output_path: outputPath
  });
  
  console.log('素材下载成功:', result);
  return result;
}

downloadMedia('res_xxxxxxxxxxxxx', '/tmp/downloaded.png');
```

## 文档搜索

### 搜索文档

```javascript
// examples/feishu/search-docs.js
const { feishu_search_doc_wiki } = require('@openclaw/feishu');

async function searchDocs(query) {
  const result = await feishu_search_doc_wiki({
    action: 'search',
    query: query,
    page_size: 20,
    // 可选：过滤条件
    // filter: {
    //   doc_types: ['DOC', 'DOCX'],  // 文档类型
    //   creator_ids: ['ou_xxxxxxxxxxxxx'],  // 创建者
    //   create_time: {
    //     start: '2026-03-01T00:00:00+08:00',
    //     end: '2026-03-31T23:59:59+08:00'
    //   },
    //   sort_type: 'EDIT_TIME'  // 按编辑时间排序
    // }
  });
  
  console.log(`找到 ${result.results.length} 个文档:`);
  result.results.forEach(doc => {
    console.log(`- ${doc.title}`);
    console.log(`  类型：${doc.obj_type}`);
    console.log(`  摘要：${doc.summary}`);
  });
  
  return result.results;
}

searchDocs('OpenClaw 教程');
```

## 知识库管理

### 查询知识库列表

```javascript
// examples/feishu/list-wiki-spaces.js
const { feishu_wiki_space } = require('@openclaw/feishu');

async function listWikiSpaces() {
  const result = await feishu_wiki_space({
    action: 'list',
    page_size: 50
  });
  
  console.log(`共 ${result.spaces.length} 个知识库:`);
  result.spaces.forEach(space => {
    console.log(`- ${space.name} (${space.space_id})`);
  });
  
  return result.spaces;
}

listWikiSpaces();
```

### 创建知识库

```javascript
// examples/feishu/create-wiki-space.js
const { feishu_wiki_space } = require('@openclaw/feishu');

async function createWikiSpace() {
  const result = await feishu_wiki_space({
    action: 'create',
    name: 'OpenClaw 文档库',
    description: 'OpenClaw 用户指南和教程'
  });
  
  console.log('知识库创建成功:', result);
  console.log('Space ID:', result.space_id);
  return result;
}

createWikiSpace();
```

### 查询知识库节点

```javascript
// examples/feishu/list-wiki-nodes.js
const { feishu_wiki_space_node } = require('@openclaw/feishu');

async function listWikiNodes(spaceId, parentToken = null) {
  const result = await feishu_wiki_space_node({
    action: 'list',
    space_id: spaceId,
    parent_node_token: parentToken,  // null 表示根目录
    page_size: 50
  });
  
  console.log(`共 ${result.items.length} 个节点:`);
  result.items.forEach(node => {
    console.log(`- ${node.title} (${node.node_type})`);
  });
  
  return result.items;
}

listWikiNodes('spc_xxxxxxxxxxxxx');
```

### 创建知识库节点

```javascript
// examples/feishu/create-wiki-node.js
const { feishu_wiki_space_node } = require('@openclaw/feishu');

async function createWikiNode(spaceId, parentToken) {
  const result = await feishu_wiki_space_node({
    action: 'create',
    space_id: spaceId,
    parent_node_token: parentToken,
    title: '飞书集成教程',
    obj_type: 'docx'  // docx=新版文档
  });
  
  console.log('节点创建成功:', result);
  console.log('Node Token:', result.node_token);
  return result;
}

createWikiNode('spc_xxxxxxxxxxxxx', 'root');
```

## 实战案例

### 案例 1：自动周报生成

```javascript
// examples/feishu/auto-weekly-report.js
const { feishu_create_doc, feishu_task_task } = require('@openclaw/feishu');

async function generateWeeklyReport(userOpenId, weekStart, weekEnd) {
  // 1. 查询本周完成的任务
  const tasks = await feishu_task_task({
    action: 'list',
    current_user_id: userOpenId,
    completed: true,
    page_size: 100
  });
  
  // 2. 筛选本周完成的任务
  const weekTasks = tasks.tasks.filter(task => {
    if (!task.completed_at) return false;
    const completedDate = new Date(task.completed_at);
    return completedDate >= new Date(weekStart) && 
           completedDate <= new Date(weekEnd);
  });
  
  // 3. 生成周报内容
  const markdown = `# 周报 - ${weekStart.split('T')[0]} ~ ${weekEnd.split('T')[0]}

## 本周完成
${weekTasks.map(t => `- ✅ ${t.summary}`).join('\n')}

## 下周计划
- [ ] 

## 风险与问题
- 无

---
*自动生成于 ${new Date().toISOString()}*
`;
  
  // 4. 创建周报文档
  const doc = await feishu_create_doc({
    title: `周报 - ${weekStart.split('T')[0]}`,
    markdown: markdown,
    // 可选：保存到知识库
    // wiki_space: 'my_library'
  });
  
  console.log('周报生成成功:', doc.url);
  return doc;
}

// 使用示例
generateWeeklyReport(
  'ou_xxxxxxxxxxxxx',
  '2026-03-11T00:00:00+08:00',
  '2026-03-17T23:59:59+08:00'
);
```

### 案例 2：会议纪要自动生成

```javascript
// examples/feishu/meeting-minutes.js
const { feishu_create_doc, feishu_calendar_event } = require('@openclaw/feishu');

async function createMeetingMinutes(eventId, meetingData) {
  // 1. 查询会议详情
  const event = await feishu_calendar_event({
    action: 'get',
    event_id: eventId
  });
  
  // 2. 生成会议纪要
  const markdown = `# 会议纪要 - ${event.summary}

## 基本信息
- **时间**: ${event.start_time} - ${event.end_time}
- **地点**: ${event.location?.name || '线上会议'}
- **参会人**: ${event.attendees?.map(a => a.display_name).join(', ') || '待定'}

## 会议内容

### 讨论议题
${meetingData.agendas.map((a, i) => `${i + 1}. ${a}`).join('\n')}

### 决议事项
${meetingData.decisions.map(d => `- ${d}`).join('\n')}

### 待办任务
${meetingData.actionItems.map(item => `- [ ] ${item.task} (@${item.assignee}, 截止：${item.dueDate})`).join('\n')}

## 下次会议
- 时间：待定
- 议题：待定

---
*会议纪要自动生成于 ${new Date().toISOString()}*
`;
  
  // 3. 创建纪要文档
  const doc = await feishu_create_doc({
    title: `会议纪要 - ${event.summary} - ${event.start_time.split('T')[0]}`,
    markdown: markdown
  });
  
  console.log('会议纪要创建成功:', doc.url);
  return doc;
}

// 使用示例
createMeetingMinutes('evt_xxxxxxxxxxxxx', {
  agendas: [
    '项目进度同步',
    '技术方案讨论',
    '资源分配'
  ],
  decisions: [
    '确定使用方案 A',
    '下周一开始开发'
  ],
  actionItems: [
    { task: '完成技术方案文档', assignee: '张三', dueDate: '2026-03-20' },
    { task: '准备开发环境', assignee: '李四', dueDate: '2026-03-19' }
  ]
});
```

### 案例 3：文档模板系统

```javascript
// examples/feishu/doc-templates.js
const { feishu_create_doc, feishu_fetch_doc } = require('@openclaw/feishu');

// 文档模板库
const TEMPLATES = {
  'project-plan': `# 项目计划 - {projectName}

## 项目概述
- **项目名称**: {projectName}
- **项目负责人**: {owner}
- **开始日期**: {startDate}
- **结束日期**: {endDate}

## 项目目标
{goals}

## 项目阶段
{phases}

## 风险评估
{risks}
`,
  
  'meeting-agenda': `# 会议议程 - {meetingName}

## 基本信息
- **时间**: {time}
- **地点**: {location}
- **参会人**: {attendees}

## 议程
{agenda}

## 准备材料
{materials}
`,
  
  'pr-review': `# PR Review - {prTitle}

## PR 信息
- **PR 链接**: {prUrl}
- **作者**: {author}
- **变更描述**: {description}

## Review 意见
{comments}

## Review 结果
- [ ] 代码质量
- [ ] 功能完整性
- [ ] 测试覆盖
- [ ] 文档更新

## 建议
{suggestions}
`
};

async function createDocFromTemplate(templateName, variables) {
  // 1. 获取模板
  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(`模板不存在：${templateName}`);
  }
  
  // 2. 替换变量
  let content = template;
  for (const [key, value] of Object.entries(variables)) {
    content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  
  // 3. 创建文档
  const doc = await feishu_create_doc({
    title: variables.documentTitle || `${templateName}-${Date.now()}`,
    markdown: content
  });
  
  console.log('文档创建成功:', doc.url);
  return doc;
}

// 使用示例
createDocFromTemplate('project-plan', {
  projectName: 'OpenClaw 文档项目',
  owner: '张三',
  startDate: '2026-03-18',
  endDate: '2026-03-31',
  goals: '- 完成飞书系列教程\n- 创建实战工作流模板',
  phases: '1. 基础教程（3 天）\n2. 工作流开发（5 天）\n3. 视频教程（3 天）',
  risks: '- 时间紧张\n- API 权限配置复杂',
  documentTitle: '项目计划 - OpenClaw 文档项目'
});
```

## 最佳实践

### 1. Markdown 格式规范

```markdown
# 一级标题

## 二级标题

### 三级标题

- 无序列表
- 无序列表

1. 有序列表
2. 有序列表

**加粗文本**

*斜体文本*

[链接文本](https://example.com)

![图片说明](image.png)

\`\`\`javascript
// 代码块
const code = 'example';
\`\`\`

| 表格 | 示例 |
|-----|------|
| 内容 | 内容 |
```

### 2. 文档版本管理

```javascript
// 在文档末尾添加版本历史
const versionHistory = `

---

## 版本历史
| 版本 | 日期 | 作者 | 变更说明 |
|-----|------|------|---------|
| v1.0 | 2026-03-18 | 张三 | 初稿 |
| v1.1 | 2026-03-19 | 李四 | 补充示例代码 |
`;

await feishu_update_doc({
  doc_id: docId,
  mode: 'append',
  markdown: versionHistory
});
```

### 3. 文档权限管理

```javascript
// 创建文档时指定权限
await feishu_create_doc({
  title: '内部文档',
  markdown: content,
  // 通过 folder_token 控制访问权限
  folder_token: 'fld_internal_only'
});
```

## 相关资源

- [飞书文档 API 文档](https://open.feishu.cn/document/ukTMukTMukTM/uAjNwUjL3YDM14iN2ATN)
- [飞书知识库 API 文档](https://open.feishu.cn/document/ukTMukTMukTM/ugjNwUjL4YDM14iN2ATN)
- [示例代码仓库](https://github.com/rookie1989/claw-picker/tree/main/examples/feishu)

## 下一步

- 📊 查看 [飞书多维表格集成](./bitable-integration.md)
- 📅 查看 [飞书日历集成](./calendar-integration.md)
- ✅ 查看 [飞书任务集成](./task-integration.md)
- 🔧 查看 [完整工作流模板](../workflows/)
