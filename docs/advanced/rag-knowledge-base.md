# RAG 知识库集成实战 — 向量搜索 + Pinecone/Chroma 企业知识库

> **难度**：⭐⭐⭐⭐⭐  
> **前置知识**：OpenClaw 基础用法、多模型路由  
> **核心技术**：Embedding、向量数据库、混合检索、Prompt 注入

---

## 目录

1. [RAG 原理与架构](#1-rag-原理与架构)
2. [文档预处理与分块策略](#2-文档预处理与分块策略)
3. [Embedding 模型选型](#3-embedding-模型选型)
4. [向量数据库对比与集成](#4-向量数据库对比与集成)
5. [混合检索（向量 + BM25）](#5-混合检索向量--bm25)
6. [上下文注入与 Prompt 工程](#6-上下文注入与-prompt-工程)
7. [增量更新与知识库维护](#7-增量更新与知识库维护)
8. [生产部署与性能优化](#8-生产部署与性能优化)
9. [评估指标与效果测试](#9-评估指标与效果测试)

---

## 1. RAG 原理与架构

### 1.1 什么是 RAG

**RAG（Retrieval-Augmented Generation）** = 检索增强生成。

核心思路：在让大模型生成答案之前，先从知识库中**检索**最相关的文档片段，将这些片段**注入**到 Prompt 中，让模型基于真实资料回答，而不是靠「记忆」。

**为什么需要 RAG？**

| 问题 | RAG 的解决方式 |
|------|--------------|
| 模型知识截止日期 | 知识库实时更新，模型总能读到最新内容 |
| 企业私有知识 | 内网文档/产品手册/SOP 注入模型不知道的信息 |
| 幻觉问题 | 基于真实文档回答，有据可查，减少编造 |
| 上下文限制 | 检索最相关的片段，不需要把全部文档塞进 Prompt |

### 1.2 完整 RAG 流水线

```
                    ┌─────────────────────────────┐
                    │        Knowledge Base        │
                    │                              │
   Documents ──────►│  1. Parse → Chunk → Embed   │
   (PDF/Docs/        │  2. Store in Vector DB       │
    Markdown/…)     │                              │
                    └─────────────┬───────────────┘
                                  │ Offline
   ─────────────────────── ─ ─ ─ ─│─ ─ ─ ─ ─ ─ ─ ─
                                  │ Online
                    ┌─────────────▼───────────────┐
   User Query ─────►│  1. Embed Query              │
                    │  2. Vector Search (Top-K)    │
                    │  3. BM25 Keyword Search       │
                    │  4. RRF Fusion + Re-rank      │
                    │  5. Context Injection         │
                    │  6. LLM Generation            │
                    └─────────────┬───────────────┘
                                  │
                            Final Answer
```

### 1.3 关键指标

- **Recall@K**：Top-K 结果中包含正确答案的比例（越高越好）
- **Precision@K**：Top-K 结果中相关结果的比例
- **MRR (Mean Reciprocal Rank)**：正确答案排名的倒数均值
- **答案正确率（Answer Accuracy）**：最终答案与 Ground Truth 的一致性

---

## 2. 文档预处理与分块策略

### 2.1 支持的文档格式

```javascript
// src/rag/parser.js
const mammoth = require('mammoth');         // .docx
const pdfParse = require('pdf-parse');      // .pdf
const { marked } = require('marked');       // .md
const xlsx = require('xlsx');               // .xlsx

async function parseDocument(filePath, mimeType) {
  switch (mimeType) {
    case 'application/pdf':
      return parsePdf(filePath);
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDocx(filePath);
    case 'text/markdown':
    case 'text/plain':
      return parseText(filePath);
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
      return parseExcel(filePath);
    default:
      throw new Error(`Unsupported format: ${mimeType}`);
  }
}

async function parsePdf(filePath) {
  const buffer = await fs.readFile(filePath);
  const data = await pdfParse(buffer);
  return {
    content: data.text,
    metadata: { pages: data.numpages, format: 'pdf' },
  };
}

async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return { content: result.value, metadata: { format: 'docx' } };
}

async function parseText(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return { content, metadata: { format: 'text' } };
}

async function parseExcel(filePath) {
  const workbook = xlsx.readFile(filePath);
  const lines = [];
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_csv(sheet);
    lines.push(`## Sheet: ${sheetName}\n${data}`);
  }
  return { content: lines.join('\n\n'), metadata: { format: 'excel' } };
}

module.exports = { parseDocument };
```

### 2.2 分块策略对比

| 策略 | 适用场景 | Chunk Size | 优缺点 |
|------|---------|-----------|--------|
| **固定大小** | 通用场景 | 512 tokens | 简单均匀，可能截断语义 |
| **句子分割** | 新闻/文章 | 3-5 句 | 语义完整，大小不均 |
| **段落分割** | 技术文档 | 1 段落 | 最自然，但段落长短差异大 |
| **递归分割** | 混合文档 | 自适应 | **推荐**，平衡语义和大小 |
| **语义分割** | 高质量场景 | 动态 | 效果最好，计算成本高 |

### 2.3 递归分割实现（推荐）

```javascript
// src/rag/chunker.js

const DEFAULT_CHUNK_SIZE = 512;    // tokens
const DEFAULT_OVERLAP    = 50;     // tokens (前后重叠，保留上下文)

const SEPARATORS = ['\n\n', '\n', '。', '！', '？', '. ', '! ', '? ', ' ', ''];

/**
 * 递归字符分割器
 * 按优先级依次尝试分隔符，保证每块不超过 maxSize
 */
function recursiveSplit(text, maxSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP) {
  // 估算 token 数（中文约 2 字/token，英文约 4 字/token）
  function estimateTokens(str) {
    const chineseChars = (str.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = str.length - chineseChars;
    return Math.ceil(chineseChars / 2 + otherChars / 4);
  }

  if (estimateTokens(text) <= maxSize) return [text];

  // 找合适的分隔符
  for (const sep of SEPARATORS) {
    if (!sep && text.length > 0) {
      // 兜底：强制按字符切割
      const chunks = [];
      for (let i = 0; i < text.length; i += maxSize * 3) {
        chunks.push(text.slice(i, i + maxSize * 3));
      }
      return chunks;
    }

    const parts = text.split(sep).filter(Boolean);
    if (parts.length <= 1) continue;

    const chunks = [];
    let current = '';

    for (const part of parts) {
      const candidate = current ? current + sep + part : part;
      if (estimateTokens(candidate) <= maxSize) {
        current = candidate;
      } else {
        if (current) {
          chunks.push(current);
          // 重叠：取上一块的最后 overlap tokens 作为下一块的开头
          const words = current.split(' ');
          const overlapText = words.slice(-Math.ceil(overlap / 4)).join(' ');
          current = overlapText + (overlapText ? sep : '') + part;
        } else {
          // 单个 part 超过 maxSize，递归拆分
          const subChunks = recursiveSplit(part, maxSize, overlap);
          chunks.push(...subChunks.slice(0, -1));
          current = subChunks[subChunks.length - 1] || '';
        }
      }
    }
    if (current) chunks.push(current);
    return chunks;
  }

  return [text];
}

/**
 * 为每个 chunk 附加元数据
 */
function createChunks(docContent, docMeta, options = {}) {
  const { chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP } = options;
  const rawChunks = recursiveSplit(docContent, chunkSize, overlap);

  return rawChunks
    .map((text, index) => ({
      id: `${docMeta.docId}_chunk_${index}`,
      text: text.trim(),
      metadata: {
        ...docMeta,
        chunkIndex: index,
        totalChunks: rawChunks.length,
      },
    }))
    .filter(chunk => chunk.text.length > 20); // 过滤过短的片段
}

module.exports = { recursiveSplit, createChunks };
```

---

## 3. Embedding 模型选型

### 3.1 主流 Embedding 模型对比

| 模型 | 维度 | 中文支持 | 成本/1M tokens | 推荐场景 |
|------|------|---------|---------------|---------|
| `text-embedding-3-small` | 1536 | ✅ 良好 | $0.02 | **性价比首选** |
| `text-embedding-3-large` | 3072 | ✅ 优秀 | $0.13 | 高精度场景 |
| `text-embedding-ada-002` | 1536 | ✅ 良好 | $0.10 | 旧版，不推荐 |
| `BAAI/bge-m3` | 1024 | ✅ 极佳 | 免费（本地） | **中文首选（开源）** |
| `jinaai/jina-embeddings-v3` | 1024 | ✅ 很好 | $0.02 | 多语言场景 |

### 3.2 Embedding 服务封装

```javascript
// src/rag/embedder.js
const axios = require('axios');

class EmbeddingService {
  constructor(provider = 'openclaw') {
    this.provider = provider;
    this.cache = new Map(); // 内存缓存（小规模场景）
  }

  /**
   * 单条文本 Embedding
   */
  async embed(text) {
    const cacheKey = this._hashText(text);
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const vector = await this._callApi([text]);
    this.cache.set(cacheKey, vector[0]);
    return vector[0];
  }

  /**
   * 批量 Embedding（推荐，节省 API 调用次数）
   */
  async embedBatch(texts, batchSize = 100) {
    const results = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const vectors = await this._callApi(batch);
      results.push(...vectors);
      // Rate limit: 100ms between batches
      if (i + batchSize < texts.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }
    return results;
  }

  async _callApi(texts) {
    const response = await axios.post(
      `${process.env.OPENCLAW_ENDPOINT}/embeddings`,
      {
        model: 'text-embedding-3-small',
        input: texts,
        encoding_format: 'float',
      },
      { headers: { Authorization: `Bearer ${process.env.OPENCLAW_API_KEY}` } }
    );
    return response.data.data.map(d => d.embedding);
  }

  _hashText(text) {
    const crypto = require('crypto');
    return crypto.createHash('md5').update(text).digest('hex');
  }
}

module.exports = { EmbeddingService };
```

---

## 4. 向量数据库对比与集成

### 4.1 选型对比

| 数据库 | 部署方式 | 规模 | 特点 | 推荐场景 |
|--------|---------|------|------|---------|
| **Chroma** | 本地/Docker | < 100万 | 轻量、零配置 | **开发/中小规模** |
| **Pinecone** | 云服务 | 无限 | 全托管、高性能 | **生产云原生** |
| **pgvector** | PostgreSQL 插件 | < 500万 | 与 SQL 数据一体 | **已有 PG 用户** |
| **Milvus** | 自部署 | 亿级 | 功能最全 | 超大规模企业 |
| **Weaviate** | 云/自部署 | 千万级 | 内置混合搜索 | 混合检索场景 |

### 4.2 Chroma 集成（开发/测试首选）

```javascript
// src/rag/stores/chroma.js
const { ChromaClient } = require('chromadb');

class ChromaVectorStore {
  constructor(collectionName = 'knowledge_base') {
    this.client = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });
    this.collectionName = collectionName;
    this.collection = null;
  }

  async init() {
    this.collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
      metadata: { 'hnsw:space': 'cosine' },
    });
    console.log(`✅ Chroma collection '${this.collectionName}' ready`);
  }

  /**
   * 批量写入 chunks
   */
  async upsert(chunks, embeddings) {
    const ids        = chunks.map(c => c.id);
    const documents  = chunks.map(c => c.text);
    const metadatas  = chunks.map(c => c.metadata);

    // Chroma 一次最多 5000 条
    const batchSize = 500;
    for (let i = 0; i < ids.length; i += batchSize) {
      await this.collection.upsert({
        ids:        ids.slice(i, i + batchSize),
        documents:  documents.slice(i, i + batchSize),
        embeddings: embeddings.slice(i, i + batchSize),
        metadatas:  metadatas.slice(i, i + batchSize),
      });
    }
  }

  /**
   * 向量检索
   */
  async search(queryEmbedding, topK = 5, filter = null) {
    const queryParams = {
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      include: ['documents', 'metadatas', 'distances'],
    };
    if (filter) queryParams.where = filter;

    const result = await this.collection.query(queryParams);

    return result.ids[0].map((id, i) => ({
      id,
      text: result.documents[0][i],
      metadata: result.metadatas[0][i],
      score: 1 - result.distances[0][i], // 转为相似度（越高越相关）
    }));
  }

  /**
   * 删除文档的所有 chunks
   */
  async deleteByDocId(docId) {
    const results = await this.collection.get({ where: { docId: { '$eq': docId } } });
    if (results.ids.length > 0) {
      await this.collection.delete({ ids: results.ids });
    }
  }
}

module.exports = { ChromaVectorStore };
```

### 4.3 Pinecone 集成（生产环境推荐）

```javascript
// src/rag/stores/pinecone.js
const { Pinecone } = require('@pinecone-database/pinecone');

class PineconeVectorStore {
  constructor(indexName = 'knowledge-base') {
    this.pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    this.indexName = indexName;
    this.index = null;
  }

  async init() {
    // 检查 index 是否存在，不存在则创建
    const indexes = await this.pc.listIndexes();
    const exists = indexes.indexes?.some(i => i.name === this.indexName);

    if (!exists) {
      await this.pc.createIndex({
        name: this.indexName,
        dimension: 1536,         // text-embedding-3-small 的维度
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      console.log(`✅ Pinecone index '${this.indexName}' created`);
      // 等待 index 就绪
      await new Promise(r => setTimeout(r, 5000));
    }

    this.index = this.pc.index(this.indexName);
    console.log(`✅ Pinecone index '${this.indexName}' ready`);
  }

  async upsert(chunks, embeddings) {
    const vectors = chunks.map((chunk, i) => ({
      id: chunk.id,
      values: embeddings[i],
      metadata: {
        text: chunk.text.slice(0, 40000), // Pinecone metadata 限制 40KB
        ...chunk.metadata,
      },
    }));

    // Pinecone 推荐每批 100 条
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      await this.index.upsert(vectors.slice(i, i + batchSize));
    }
  }

  async search(queryEmbedding, topK = 5, filter = null) {
    const queryOptions = {
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
      includeValues: false,
    };
    if (filter) queryOptions.filter = filter;

    const result = await this.index.query(queryOptions);

    return result.matches.map(match => ({
      id: match.id,
      text: match.metadata.text,
      metadata: match.metadata,
      score: match.score,
    }));
  }

  async deleteByDocId(docId) {
    await this.index.deleteMany({ filter: { docId: { '$eq': docId } } });
  }
}

module.exports = { PineconeVectorStore };
```

---

## 5. 混合检索（向量 + BM25）

> 纯向量检索在精确关键词匹配时表现差，纯关键词检索在语义相似时表现差。
> **混合检索 = 两者结合，取长补短**。

### 5.1 BM25 关键词检索

```javascript
// src/rag/bm25.js
const BM25 = require('wink-bm25-text-search');
const stopwords = require('./stopwords'); // 停用词表（中英文）

class BM25Index {
  constructor() {
    this.engine = BM25();
    this.docs = new Map();
    this.docCount = 0;

    this.engine.defineConfig({ fldWeights: { text: 1 } });
    this.engine.definePrepTasks([
      s => s.toLowerCase(),
      s => s.replace(/[^\w\u4e00-\u9fff\s]/g, ' '),
      s => s.split(/\s+/),
      tokens => tokens.filter(t => t.length > 1 && !stopwords.has(t)),
    ]);
  }

  addDocument(id, text, metadata) {
    this.engine.addDoc({ text }, id);
    this.docs.set(String(id), { id, text, metadata });
    this.docCount++;
  }

  consolidate() {
    this.engine.consolidate(/* k1 */ 1.2, /* b */ 0.75);
  }

  search(query, topK = 10) {
    const results = this.engine.search(query, topK);
    return results.map(([id, score]) => ({
      id: String(id),
      text: this.docs.get(String(id))?.text || '',
      metadata: this.docs.get(String(id))?.metadata || {},
      score: score / 10, // 归一化到 0-1
    }));
  }
}

module.exports = { BM25Index };
```

### 5.2 RRF 融合排序

```javascript
// src/rag/hybrid.js
const { EmbeddingService } = require('./embedder');
const { BM25Index } = require('./bm25');

const K = 60; // RRF 常数（60 是经验最优值）

/**
 * Reciprocal Rank Fusion (RRF)
 * 将多个排序列表融合为一个
 */
function rrfFusion(rankLists, weights = null) {
  const scores = new Map();

  rankLists.forEach((list, listIdx) => {
    const weight = weights ? weights[listIdx] : 1;
    list.forEach((item, rank) => {
      const key = item.id;
      const rrfScore = weight / (K + rank + 1);
      scores.set(key, (scores.get(key) || { item, score: 0 }));
      scores.get(key).score += rrfScore;
    });
  });

  return [...scores.values()]
    .sort((a, b) => b.score - a.score)
    .map(({ item, score }) => ({ ...item, hybridScore: score }));
}

class HybridRetriever {
  constructor(vectorStore, embedder) {
    this.vectorStore = vectorStore;
    this.embedder = embedder;
    this.bm25 = new BM25Index();
    this.bm25Ready = false;
  }

  /**
   * 加载所有 chunks 到 BM25 索引
   */
  async buildBm25Index(chunks) {
    for (const chunk of chunks) {
      this.bm25.addDocument(chunk.id, chunk.text, chunk.metadata);
    }
    this.bm25.consolidate();
    this.bm25Ready = true;
    console.log(`✅ BM25 index built with ${chunks.length} chunks`);
  }

  /**
   * 混合检索
   * @param {string} query - 用户查询
   * @param {number} topK - 返回结果数
   * @param {Object} filter - 向量检索过滤条件
   * @param {number} vectorWeight - 向量权重（0-1）
   */
  async retrieve(query, topK = 5, filter = null, vectorWeight = 0.7) {
    // 并行执行两种检索
    const [queryEmbedding, bm25Results] = await Promise.all([
      this.embedder.embed(query),
      Promise.resolve(this.bm25Ready ? this.bm25.search(query, topK * 2) : []),
    ]);

    const vectorResults = await this.vectorStore.search(queryEmbedding, topK * 2, filter);

    // RRF 融合，向量权重 0.7，BM25 权重 0.3
    const fused = rrfFusion(
      [vectorResults, bm25Results],
      [vectorWeight, 1 - vectorWeight]
    );

    return fused.slice(0, topK);
  }
}

module.exports = { HybridRetriever, rrfFusion };
```

---

## 6. 上下文注入与 Prompt 工程

### 6.1 RAG Prompt 模板

```javascript
// src/rag/prompts.js

/**
 * 基础 RAG Prompt（通用）
 */
function buildRagPrompt(query, contexts, options = {}) {
  const {
    language = 'zh',
    maxContextLen = 3000,
    citeSources = true,
  } = options;

  // 截断并格式化上下文
  const contextText = contexts
    .map((ctx, i) => {
      const source = ctx.metadata?.fileName || ctx.metadata?.docId || `Document ${i + 1}`;
      const header = citeSources ? `[${i + 1}] 来源：${source}` : `[${i + 1}]`;
      return `${header}\n${ctx.text}`;
    })
    .join('\n\n---\n\n')
    .slice(0, maxContextLen);

  const systemPrompt = language === 'zh'
    ? `你是一个企业知识库助手。请严格基于以下参考资料回答问题。
如果参考资料中没有相关信息，请明确告知用户"我在知识库中未找到相关信息"，不要凭空编造。
回答要简洁准确，如有来源请标注引用编号（如[1][2]）。`
    : `You are an enterprise knowledge base assistant. Answer questions strictly based on the provided reference materials.
If the information is not found in the materials, clearly state "I couldn't find relevant information in the knowledge base." Do not fabricate answers.
Be concise and accurate. Cite source numbers (e.g., [1][2]) when applicable.`;

  return {
    system: systemPrompt,
    user: `参考资料：\n\n${contextText}\n\n---\n\n问题：${query}`,
  };
}

/**
 * 对话式 RAG Prompt（带历史）
 */
function buildConversationalRagPrompt(query, contexts, history = [], options = {}) {
  const { system, user } = buildRagPrompt(query, contexts, options);

  const messages = [
    { role: 'system', content: system },
    ...history.slice(-6), // 保留最近 3 轮
    { role: 'user', content: user },
  ];

  return messages;
}

module.exports = { buildRagPrompt, buildConversationalRagPrompt };
```

### 6.2 完整 RAG 查询流程

```javascript
// src/rag/query.js
const { HybridRetriever } = require('./hybrid');
const { buildConversationalRagPrompt } = require('./prompts');
const { createOpenClawClient } = require('../openclaw');

class RAGQuery {
  constructor(retriever, ocClient) {
    this.retriever = retriever;
    this.ocClient = ocClient || createOpenClawClient();
  }

  /**
   * 主查询入口
   */
  async query(userQuery, options = {}) {
    const {
      topK = 5,
      filter = null,
      history = [],
      stream = false,
      language = 'zh',
    } = options;

    const startTime = Date.now();

    // 1. 检索相关文档
    const contexts = await this.retriever.retrieve(userQuery, topK, filter);

    if (contexts.length === 0) {
      return {
        answer: language === 'zh'
          ? '抱歉，我在知识库中未找到与您问题相关的内容。请尝试换一种表达方式，或联系管理员补充知识库。'
          : 'Sorry, I could not find relevant information in the knowledge base.',
        contexts: [],
        latencyMs: Date.now() - startTime,
      };
    }

    // 2. 构建 Prompt
    const messages = buildConversationalRagPrompt(userQuery, contexts, history, { language });

    // 3. 调用 LLM
    const response = await this.ocClient.chat({
      messages,
      model: 'gpt-4o-mini', // RAG 问答不需要最强模型
      temperature: 0.2,     // 低温度：更准确，减少创意发挥
    });

    const answer = response.choices[0].message.content;

    return {
      answer,
      contexts: contexts.map(c => ({
        text: c.text.slice(0, 200) + '...', // 返回摘要
        source: c.metadata?.fileName || c.metadata?.docId,
        score: c.hybridScore || c.score,
      })),
      usage: response.usage,
      latencyMs: Date.now() - startTime,
    };
  }
}

module.exports = { RAGQuery };
```

---

## 7. 增量更新与知识库维护

### 7.1 文档版本管理

```javascript
// src/rag/manager.js
const { parseDocument } = require('./parser');
const { createChunks } = require('./chunker');
const { EmbeddingService } = require('./embedder');
const crypto = require('crypto');

class KnowledgeBaseManager {
  constructor(vectorStore, embedder, db) {
    this.vectorStore = vectorStore;
    this.embedder = embedder || new EmbeddingService();
    this.db = db;
  }

  /**
   * 添加或更新文档
   * 如果文档内容未变（hash 相同），跳过重新 embedding，节省费用
   */
  async upsertDocument(filePath, mimeType, metadata = {}) {
    // 1. 解析文档
    const { content, metadata: parsedMeta } = await parseDocument(filePath, mimeType);

    // 2. 计算内容 hash
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    const docId = metadata.docId || crypto.randomUUID();

    // 3. 检查是否已存在且内容未变
    const [existing] = await this.db.execute(
      'SELECT id, content_hash FROM rag_documents WHERE doc_id = ?',
      [docId]
    );

    if (existing.length > 0 && existing[0].content_hash === contentHash) {
      console.log(`⏭️  Document ${docId} unchanged, skipping`);
      return { docId, status: 'unchanged', chunks: 0 };
    }

    // 4. 如果已存在，先删除旧 chunks
    if (existing.length > 0) {
      await this.vectorStore.deleteByDocId(docId);
    }

    // 5. 分块
    const allMeta = { docId, fileName: filePath.split('/').pop(), ...parsedMeta, ...metadata };
    const chunks = createChunks(content, allMeta);

    // 6. 批量 Embedding
    console.log(`🔄 Embedding ${chunks.length} chunks for ${docId}...`);
    const texts = chunks.map(c => c.text);
    const embeddings = await this.embedder.embedBatch(texts);

    // 7. 写入向量数据库
    await this.vectorStore.upsert(chunks, embeddings);

    // 8. 更新文档记录
    await this.db.execute(`
      INSERT INTO rag_documents (doc_id, file_name, content_hash, chunk_count, status, updated_at)
      VALUES (?, ?, ?, ?, 'active', NOW())
      ON DUPLICATE KEY UPDATE
        content_hash = VALUES(content_hash),
        chunk_count  = VALUES(chunk_count),
        updated_at   = NOW()
    `, [docId, allMeta.fileName, contentHash, chunks.length]);

    console.log(`✅ Document ${docId}: ${chunks.length} chunks indexed`);
    return { docId, status: 'indexed', chunks: chunks.length };
  }

  /**
   * 批量导入目录
   */
  async importDirectory(dirPath, options = {}) {
    const fs = require('fs').promises;
    const path = require('path');
    const files = await fs.readdir(dirPath, { recursive: true });
    const results = [];

    const MIME_MAP = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      const mimeType = MIME_MAP[ext];
      if (!mimeType) continue;

      const fullPath = path.join(dirPath, file);
      try {
        const result = await this.upsertDocument(fullPath, mimeType);
        results.push(result);
      } catch (err) {
        console.error(`❌ Failed to index ${file}:`, err.message);
        results.push({ file, status: 'error', error: err.message });
      }
    }

    return results;
  }
}

module.exports = { KnowledgeBaseManager };
```

---

## 8. 生产部署与性能优化

### 8.1 Docker Compose（含向量数据库）

```yaml
# docker-compose.rag.yml
version: '3.9'

services:
  chroma:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
      - PERSIST_DIRECTORY=/chroma/chroma
    restart: unless-stopped

  rag-api:
    build: .
    environment:
      - CHROMA_URL=http://chroma:8000
      - OPENCLAW_API_KEY=${OPENCLAW_API_KEY}
      - OPENCLAW_ENDPOINT=${OPENCLAW_ENDPOINT}
    depends_on:
      - chroma
    ports:
      - "3001:3001"

volumes:
  chroma_data:
```

### 8.2 性能优化清单

| 优化点 | 方案 | 预期收益 |
|--------|------|---------|
| **Embedding 缓存** | Redis 缓存相同文本的向量 | 重复查询 0 费用 |
| **批量 Embedding** | 每批 100 条并发请求 | 速度提升 10x |
| **向量压缩** | int8 量化（维度不变，精度降低） | 内存降低 4x，速度提升 2x |
| **Top-K 预筛选** | 先用低精度 FAISS 筛出 Top-50，再精排 Top-5 | 检索速度提升 5x |
| **LLM 缓存** | 相同问题 + 相同上下文 → 缓存答案 | 重复 QA 0 费用 |
| **异步 Embedding** | 文档入库时异步处理 | 入库 API 响应快 |

---

## 9. 评估指标与效果测试

### 9.1 自动评估脚本

```javascript
// scripts/eval-rag.js
// 使用"问答对"评估 RAG 系统质量

const testCases = [
  {
    query: 'OpenClaw 支持哪些大模型？',
    expected_contains: ['GPT-4o', 'Claude', 'Gemini'],
  },
  {
    query: '如何配置 API Key？',
    expected_contains: ['OPENCLAW_API_KEY', 'Bearer'],
  },
  {
    query: '费用如何计算？',
    expected_contains: ['Token', '计费'],
  },
];

async function evalRAG(ragQuery) {
  let passed = 0;
  const results = [];

  for (const tc of testCases) {
    const start = Date.now();
    const { answer, contexts } = await ragQuery.query(tc.query);
    const latency = Date.now() - start;

    const hits = tc.expected_contains.filter(kw =>
      answer.toLowerCase().includes(kw.toLowerCase())
    );
    const recall = hits.length / tc.expected_contains.length;
    const pass = recall >= 0.7;

    if (pass) passed++;
    results.push({
      query: tc.query,
      recall: `${(recall * 100).toFixed(0)}%`,
      latency: `${latency}ms`,
      contexts: contexts.length,
      pass,
    });
  }

  console.table(results);
  console.log(`\n✅ Passed: ${passed}/${testCases.length} (${(passed/testCases.length*100).toFixed(0)}%)`);
}

module.exports = { evalRAG };
```

### 9.2 效果调优建议

| 问题现象 | 可能原因 | 调优方向 |
|---------|---------|---------|
| 答案不相关 | Top-K 检索精度差 | 增大 topK，启用混合检索 |
| 答案包含幻觉 | System prompt 不够严格 | 强化 prompt 中的"仅基于资料" |
| 答案过于简短 | LLM temperature 太低 | 适当提高 temperature（0.3-0.5）|
| 检索慢（> 500ms）| 向量维度过高 | 改用 int8 量化，或缩减维度 |
| 中文检索效果差 | Embedding 模型中文能力弱 | 改用 BGE-M3 等中文优化模型 |

---

> 📖 **相关文档**：
> - [多模型智能路由](multi-model-routing.md)
> - [性能调优专题](performance-tuning.md)
> - [企业级 RBAC 权限系统](rbac-permission-system.md)
>
> 💻 **示例代码**：`examples/rag/`
