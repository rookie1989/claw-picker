# 📅 飞书日历集成指南

完整教程：如何在 OpenClaw 中集成飞书日历。

## 🎯 功能概览

- ✅ 查询日程列表
- ✅ 创建/修改/删除日程
- ✅ 查询忙闲状态
- ✅ 添加/移除参会人
- ✅ 自动会议安排

## 📋 前置要求

1. 已安装 OpenClaw
2. 已创建飞书企业自建应用
3. 已获取用户授权（User Access Token）

## 🔧 配置步骤

### 1. 飞书应用配置

访问 [飞书开放平台](https://open.feishu.cn/)：

1. 创建企业自建应用
2. 添加权限：
   - 日历权限（只读/读写）
   - 用户信息权限
3. 获取 App ID 和 App Secret
4. 配置重定向 URL（OAuth）

### 2. 获取用户 Token

**方法 1：OAuth 授权（推荐）**

```
https://open.feishu.cn/open-apis/authen/v1/authorize?
  app_id=cli_xxx&
  redirect_uri=https://your-domain.com/callback&
  state=xxx
```

**方法 2：手动获取**

在应用后台 → 凭证与基础信息 → 用户身份凭证

### 3. OpenClaw 配置

编辑 `~/.openclaw/config.json`：

```json
{
  "plugins": {
    "feishu": {
      "appId": "cli_xxx",
      "appSecret": "xxx",
      "userToken": "u-xxx"
    }
  },
  "skills": {
    "entries": ["feishu-calendar"]
  }
}
```

### 4. 重启网关

```bash
openclaw gateway restart
```

## 💬 使用示例

### 查询今日日程

```
今天有什么会议？
```

回复：
```
📅 今日日程（3 个）

09:30-10:00 团队站会
14:00-15:00 产品评审会
16:00-16:30 1:1 沟通
```

### 创建日程

```
明天下午 2 点安排一个产品评审会，1 小时
```

回复：
```
✅ 已创建日程

📝 产品评审会
⏰ 2026-03-29 14:00-15:00
👥 参会人：你
🔗 https://feishu.cn/calendar/xxx
```

### 查询忙闲

```
明天下午大家有空吗？
```

回复：
```
📊 忙闲状态（明天 14:00-15:00）

✅ 张三 - 空闲
❌ 李四 - 忙碌（项目评审会）
✅ 王五 - 空闲
```

### 安排会议

```
帮我安排一个下周的项目启动会，需要张三、李四、王五参加，1 小时
```

回复：
```
🔍 正在查找共同空闲时间...

✅ 找到 3 个合适时间：
1. 周一 10:00-11:00（全员空闲）
2. 周二 15:00-16:00（全员空闲）
3. 周三 14:00-15:00（全员空闲）

要创建哪个时间的会议？
```

## 🔐 权限说明

| 权限 | 用途 | 必需 |
|------|------|------|
| 日历只读 | 查询日程 | ✅ |
| 日历读写 | 创建/修改日程 | ✅ |
| 用户信息 | 获取参会人信息 | ✅ |
| 忙闲查询 | 安排会议时间 | ✅ |

## 🛠️ 高级用法

### 1. 周期性日程

```
每周一上午 10 点安排团队例会
```

创建重复日程：
```
RRULE: FREQ=WEEKLY;BYDAY=MO
```

### 2. 会议提醒

```
创建日程时添加提醒
```

配置：
```json
{
  "reminders": [
    {"minutes": 15},  // 提前 15 分钟
    {"minutes": 5}    // 提前 5 分钟
  ]
}
```

### 3. 视频会议

自动创建飞书视频会议：
```
创建会议时自动生成视频会议链接
```

### 4. 日历订阅

订阅团队日历：
```json
{
  "calendar_id": "team_calendar_xxx"
}
```

## 🐛 常见问题

### Q: 提示"权限不足"？

**A:** 检查：
1. 飞书应用是否添加了日历权限
2. 用户是否已授权
3. Token 是否过期

### Q: 查询不到日程？

**A:** 确认：
1. 日历权限是"读写"而非"只读"
2. 查询的是正确的日历 ID
3. 时间范围是否正确

### Q: 如何删除日程？

**A:** 
```
删除明天下午 2 点的会议
```

或提供日程 ID：
```
删除日程 xxx
```

## 📚 相关资源

- [飞书日历 API 文档](https://open.feishu.cn/document/ukTMukTMukTM/ucTM5YjL3ETO24yNxkjN)
- [OpenClaw 飞书技能](../../skills/feishu-calendar/SKILL.md)
- [飞书 API 速查](../../cheatsheets/feishu-api-cheatsheet.md)

## 💡 实战场景

### 晨间简报

自动汇总今日日程：
```javascript
const events = await calendar.list({
  time_min: today_start,
  time_max: today_end
});
```

### 会议纪要

会议结束后自动生成纪要：
1. 监听日程结束
2. 读取聊天记录
3. AI 生成纪要
4. 创建文档并分享

### 智能调度

根据忙闲自动安排：
```javascript
const freebusy = await calendar.freebusy({
  user_ids: ['ou_xxx1', 'ou_xxx2'],
  time_min: next_week_start,
  time_max: next_week_end
});
```

---

_最后更新：2026-03-28_
