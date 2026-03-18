# 国内用户避坑指南

> OpenClaw 在中国大陆使用常见问题及解决方案

## 网络问题

### 1. 无法连接 WhatsApp/Telegram/Discord

**问题表现：**
- 连接超时
- 无法收到消息
- 无法发送消息

**解决方案：**

```yaml
# 方案 1：使用代理配置
# 在 OpenClaw 配置中添加
proxy:
  http: http://127.0.0.1:7890
  https: http://127.0.0.1:7890
```

```yaml
# 方案 2：使用支持代理的插件
plugins:
  whatsapp:
    proxy_url: http://127.0.0.1:7890
```

```bash
# 方案 3：系统级代理
export http_proxy=http://127.0.0.1:7890
export https_proxy=http://127.0.0.1:7890
openclaw start
```

### 2. GitHub 访问慢

**问题表现：**
- `git clone` 超时
- GitHub API 请求失败
- 无法下载依赖

**解决方案：**

```bash
# 使用镜像源
git clone https://github.com/openclaw/openclaw.git
# 改为
git clone https://github.com.cnpmjs.org/openclaw/openclaw.git

# 或使用代理
git -c http.proxy=http://127.0.0.1:7890 clone https://github.com/openclaw/openclaw.git
```

```yaml
# npm 使用淘宝镜像
npm config set registry https://registry.npmmirror.com
```

---

## 飞书集成问题

### 1. 权限配置错误

**问题表现：**
```
Error: insufficient_permission
```

**解决方案：**

1. 登录 [飞书开放平台](https://open.feishu.cn/)
2. 进入应用管理 → 权限管理
3. 申请以下权限：

**多维表格：**
- `bitable:app` - 读取应用列表
- `bitable:table` - 管理数据表
- `bitable:record` - 管理记录

**日历：**
- `calendar:calendar` - 管理日历
- `calendar:event` - 管理日程
- `calendar:freebusy` - 查询忙闲

**任务：**
- `task:task` - 管理任务
- `task:tasklist` - 管理任务清单

**文档：**
- `docs:docs` - 管理云文档
- `docs:wiki` - 管理知识库

4. 提交审核（企业自建应用通常自动通过）
5. 等待生效后重试

### 2. 日程创建后用户看不到

**问题表现：**
- API 返回成功
- 但用户飞书日历中看不到日程

**原因：**
创建日程时未传 `user_open_id` 参数

**解决方案：**
```javascript
// ❌ 错误
feishu_calendar_event({
  action: 'create',
  summary: '会议',
  start_time: '...',
  end_time: '...'
})

// ✅ 正确
feishu_calendar_event({
  action: 'create',
  user_open_id: 'ou_xxxxxxxxxxxxx',  // 必填！
  summary: '会议',
  start_time: '...',
  end_time: '...'
})
```

### 3. 获取用户信息失败

**问题表现：**
```
Error: user not found
```

**解决方案：**

```javascript
// 方法 1：通过搜索获取用户
const users = await feishu_search_user({
  query: '张三'  // 姓名、手机号、邮箱
});
const userId = users.users[0].open_id;

// 方法 2：从消息上下文获取
// 如果是响应消息，可以直接从 SenderId 获取
const userId = message.SenderId;  // ou_xxxxxxxxxxxxx

// 方法 3：获取当前用户
const currentUser = await feishu_get_user();
const userId = currentUser.user.open_id;
```

### 4. 多维表格字段类型错误

**问题表现：**
```
Error: invalid_field_type
```

**解决方案：**

确保使用正确的字段类型代码：

```javascript
fields: [
  { field_name: '文本', type: 1 },
  { field_name: '数字', type: 2 },
  { field_name: '单选', type: 3, property: { options: [...] } },
  { field_name: '多选', type: 4, property: { options: [...] } },
  { field_name: '日期', type: 5 },
  { field_name: '复选框', type: 7 },
  { field_name: '人员', type: 11 },
  { field_name: '电话', type: 13 },
  { field_name: '超链接', type: 15 },  // ⚠️ 不要传 property
  { field_name: '附件', type: 17 }
]
```

**特别注意：** 超链接字段（type=15）不能传 `property` 参数，否则会报错。

### 5. 日期格式错误

**问题表现：**
```
Error: invalid_time_format
```

**解决方案：**

```javascript
// ✅ 正确：带时区的 ISO 8601 格式
start_time: '2026-03-20T14:00:00+08:00'

// ❌ 错误：缺少时区
start_time: '2026-03-20T14:00:00'

// ✅ 正确：多维表格日期使用毫秒时间戳
fields: {
  '截止日期': Date.now()  // 1742284800000
}

// ❌ 错误：使用字符串
fields: {
  '截止日期': '2026-03-20'  // 会报错
}
```

---

## 部署问题

### 1. Docker 容器启动失败

**问题表现：**
```
Error: listen EADDRINUSE: address already in use :::3000
```

**解决方案：**

```bash
# 检查端口占用
lsof -i :3000

# 杀死占用进程
kill -9 <PID>

# 或修改 OpenClaw 端口
# 在配置文件中
server:
  port: 3001
```

### 2. 数据库连接失败

**问题表现：**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**解决方案：**

```yaml
# 使用 Docker Compose 部署
version: '3'
services:
  openclaw:
    image: openclaw/openclaw:latest
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/openclaw
    depends_on:
      - postgres
  
  postgres:
    image: postgres:14
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=openclaw
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 3. 移动端配对失败

**问题表现：**
- 扫码后提示"配对失败"
- 提示"bootstrap token invalid"

**解决方案：**

```yaml
# 检查配置
plugins:
  entries:
    device-pair:
      config:
        publicUrl: https://your-domain.com  # 必须是公网可访问地址
```

**注意事项：**
1. `publicUrl` 必须是 HTTPS
2. 确保域名可以公网访问
3. 如果使用内网穿透，确保隧道稳定
4. 重启 Gateway 服务后重新生成配对码

---

## 性能优化

### 1. 批量操作避免限流

**问题：** 飞书 API 有速率限制，频繁调用会触发 429 错误

**解决方案：**

```javascript
// ❌ 避免：逐条创建
for (const task of tasks) {
  await feishu_task_task({
    action: 'create',
    ...
  });
}

// ✅ 推荐：批量创建
await feishu_bitable_app_table_record({
  action: 'batch_create',
  records: tasks.map(t => ({ fields: t }))
});

// ✅ 推荐：添加延迟
for (const task of tasks) {
  await feishu_task_task({ ... });
  await sleep(100);  // 避免触发限流
}
```

### 2. 分页查询所有数据

```javascript
async function listAllRecords(appToken, tableId) {
  const allRecords = [];
  let pageToken = null;
  
  do {
    const result = await feishu_bitable_app_table_record({
      action: 'list',
      app_token: appToken,
      table_id: tableId,
      page_size: 500,  // 最大 500
      page_token: pageToken
    });
    
    allRecords.push(...result.records);
    pageToken = result.page_token;
  } while (pageToken);  // page_token 为空表示没有更多数据
  
  return allRecords;
}
```

### 3. 缓存用户信息

```javascript
// 避免重复搜索同一用户
const userCache = new Map();

async function getUserOpenId(nameOrEmail) {
  if (userCache.has(nameOrEmail)) {
    return userCache.get(nameOrEmail);
  }
  
  const users = await feishu_search_user({ query: nameOrEmail });
  if (users.users.length > 0) {
    const openId = users.users[0].open_id;
    userCache.set(nameOrEmail, openId);
    return openId;
  }
  
  throw new Error(`用户不存在：${nameOrEmail}`);
}
```

---

## 常见问题 FAQ

### Q: OpenClaw 支持哪些聊天工具？

**A:** 支持多种聊天工具：
- ✅ WhatsApp
- ✅ Telegram
- ✅ Discord
- ✅ iMessage（macOS）
- ✅ 飞书（通过插件）
- ✅ 微信（需要特殊配置）

### Q: 数据是否安全？

**A:** OpenClaw 是自托管的，所有数据都存储在你的服务器上：
- ✅ 数据完全可控
- ✅ 不经过第三方
- ✅ 支持加密存储

### Q: 需要备案吗？

**A:** 个人使用不需要备案。如果部署在公网并提供公共服务，需要按照当地法规备案。

### Q: 可以在 Windows 上运行吗？

**A:** 可以，推荐使用 Docker：
```bash
docker run -d -p 3000:3000 openclaw/openclaw:latest
```

### Q: 如何备份数据？

**A:** 备份数据库和配置文件：
```bash
# PostgreSQL 备份
pg_dump -U user openclaw > backup.sql

# 备份配置
cp -r ~/.openclaw /backup/openclaw-config
```

### Q: 如何迁移服务器？

**A:** 
1. 备份数据库和配置
2. 在新服务器安装 OpenClaw
3. 恢复数据库和配置
4. 更新域名解析（如有）
5. 重新配对移动设备

---

## 调试技巧

### 1. 开启调试日志

```yaml
# 配置文件
logging:
  level: debug
```

### 2. 查看 Gateway 日志

```bash
# 实时查看日志
openclaw gateway logs -f

# 查看最近 100 行
openclaw gateway logs --tail 100
```

### 3. 测试 API 连通性

```bash
# 测试飞书 API
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal/
```

### 4. 使用诊断工具

```bash
# 飞书插件诊断
/feishu_doctor
```

---

## 获取帮助

- 📚 [官方文档](https://docs.openclaw.ai)
- 💬 [社区讨论](https://github.com/openclaw/openclaw/discussions)
- 🐛 [问题反馈](https://github.com/openclaw/openclaw/issues)
- 📖 [本仓库教程](../../README.md)
