# LumieClaw 后端开发现状分析 & 开发规划

> 生成日期: 2026-04-01 | 基于: 产品需求文档 v1.0.0 + 当前代码库 + 神马中转站 API 文档

---

## 一、当前后端已完成模块

### 1. 认证体系 ✅ (对应需求 5.1 登录)

| 能力 | 状态 | 说明 |
|------|------|------|
| 邮箱注册/登录 | ✅ 已完成 | `POST /api/v1/auth/email/login`, `register` |
| Google OAuth | ✅ 已完成 | `POST /api/v1/auth/google/login` |
| Facebook OAuth | ✅ 已完成 | `POST /api/v1/auth/facebook/login` |
| Apple OAuth | ✅ 已完成 | `POST /api/v1/auth/apple/login` |
| JWT Access Token | ✅ 已完成 | 15分钟过期, Bearer 认证 |
| Refresh Token | ✅ 已完成 | 3650天过期, 支持无感刷新 |
| 邮箱确认 | ✅ 已完成 | 确认链接 + token 验证 |
| 忘记/重置密码 | ✅ 已完成 | 邮件发送 + hash token |
| 安全退出 | ✅ 已完成 | `POST /api/v1/auth/logout` 清除 session |
| 个人信息更新 | ✅ 已完成 | `PATCH /api/v1/auth/me` |

**需求覆盖度: ~90%** — 产品需求的 OAuth 2.0、Refresh Token、安全退出均已实现。仅差「会话过期主动推送提示」(需 WebSocket)。

### 2. 用户管理 ✅ (对应需求: 管理端用户管理)

| 能力 | 状态 | 说明 |
|------|------|------|
| 用户 CRUD | ✅ 已完成 | 完整的增删改查, Admin 权限保护 |
| 分页 & 过滤 | ✅ 已完成 | 支持排序、筛选、分页查询 |
| 角色系统 | ✅ 已完成 | `admin(1)` / `user(2)`, RolesGuard |
| 状态系统 | ✅ 已完成 | `active(1)` / `inactive(2)` |
| 软删除 | ✅ 已完成 | `deletedAt` 字段 |

### 3. Session 管理 ✅

- 基于数据库的 Session 持久化
- 与 JWT 配合做 token 吊销验证 (hash 比对)
- 支持多设备登录管理

### 4. 文件服务 ✅

- 三种驱动: Local / S3 / S3-Presigned
- 文件上传需认证
- UUID 主键, 路径存储

### 5. 邮件服务 ✅

- SMTP 配置 (Nodemailer)
- 欢迎邮件、密码重置邮件模板
- Docker Maildev 用于本地调试

### 6. 基础设施 ✅

| 组件 | 状态 |
|------|------|
| PostgreSQL 17.9 | ✅ |
| TypeORM + 迁移 | ✅ |
| Docker Compose | ✅ |
| Swagger/OpenAPI | ✅ |
| API 版本化 `/api/v1/` | ✅ |
| i18n (后端) | ✅ |
| class-validator DTO 验证 | ✅ |
| PM2 生产部署 | ✅ |

---

## 二、需求 vs 后端覆盖 — 差距分析

| 产品模块 | 需求章节 | 后端状态 | 优先级 |
|----------|---------|---------|--------|
| 登录/认证 | 5.1 | ✅ 已完成 | — |
| Dashboard 连续性总览 | 5.2 | ❌ 未开始 | P1 |
| Tasks 自动化 | 5.3 | ❌ 未开始 | P1 |
| Agent 管理 | 5.4 | ❌ 未开始 | P0 |
| 数据日志 | 5.5 | ❌ 未开始 | P1 |
| 终端/聊天 | 5.6 | ❌ 未开始 | P0 |
| 记忆中枢 | 5.7 | ❌ 未开始 | P1 |
| IM 频道 | 5.8 | ❌ 未开始 | P2 |
| MCP Porter | 5.9 | ❌ 未开始 | P2 |
| 设置 | 5.10 | 🟡 部分 (有用户偏好基础) | P2 |
| 订阅/支付 | 5.11 | ❌ 未开始 | P3 |
| 迁移中心 | 5.12 | ❌ 未开始 | P3 |
| **AI 中转代理** | 用户架构需求 | ❌ 未开始 | **P0** |
| **用量统计/计费** | 用户架构需求 | ❌ 未开始 | **P0** |

---

## 三、核心架构: AI API 中转代理

你提到的架构：**前端 → 你的后端 → 神马中转站**，这是整个产品的核心链路。

### 3.1 架构图

```
┌──────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  LumieClaw   │     │  LumieClaw Backend   │     │   神马中转站 API     │
│  Frontend    │────▶│  (NestJS Gateway)    │────▶│  api.whatai.cc/v1   │
│              │     │                      │     │                     │
│  React/      │ JWT │  ● 鉴权 & 限流       │ Key │  ● Chat Completions │
│  Electron    │◀────│  ● 用量记录          │◀────│  ● Embeddings       │
│              │     │  ● 模型路由          │     │  ● Images           │
└──────────────┘     │  ● 流式转发 (SSE)    │     │  ● Audio/Video      │
                     │  ● 成本计算          │     │  ● 650+ 模型        │
                     └──────────────────────┘     └─────────────────────┘
```

### 3.2 神马中转站 API 关键信息

| 项目 | 详情 |
|------|------|
| Base URL | `https://api.whatai.cc/v1` |
| 认证 | `Authorization: Bearer {API_KEY}` |
| 协议 | 完全兼容 OpenAI API 格式 |
| 模型数量 | 650+ (GPT-5, Claude 4.x, Gemini, DeepSeek, 开源模型等) |
| 支持能力 | Chat / Embeddings / Images / Audio / Video / Midjourney / Suno 等 |
| 流式 | 支持 SSE (`stream: true`) |
| 计费 | 按 token 计量, response 中返回 `usage` 字段 |
| 查余额 | `GET /v1/token/quota` 或 `GET /api/user/self` (系统令牌) |

### 3.3 需要中转的核心端点

| 端点 | 方法 | 用途 | 优先级 |
|------|------|------|--------|
| `/v1/chat/completions` | POST | 对话 (文本/图片/视频分析/工具调用/流式) | P0 |
| `/v1/embeddings` | POST | 文本向量化 (RAG) | P1 |
| `/v1/images/generations` | POST | 图片生成 (DALL-E/Flux/MJ 等) | P1 |
| `/v1/audio/speech` | POST | TTS 文字转语音 | P2 |
| `/v1/audio/transcriptions` | POST | 语音转文字 | P2 |
| `/v1/models` | GET | 获取可用模型列表 | P0 |
| `/v1/messages` | POST | Claude 原生格式 | P1 |
| `/v1/responses` | POST | OpenAI Responses API | P1 |

---

## 四、待开发模块详细规划

### 模块 1: AI Proxy Gateway (P0 — 最高优先级)

**目标**: 前端所有 AI 请求经过后端中转，后端记录用量并转发到神马中转站。

**需要新建的文件/模块:**

```
src/
├── ai-proxy/
│   ├── ai-proxy.module.ts
│   ├── ai-proxy.controller.ts          # 接收前端请求
│   ├── ai-proxy.service.ts             # 转发到中转站 + 用量记录
│   ├── dto/
│   │   ├── chat-completion.dto.ts      # OpenAI 格式 DTO
│   │   └── ...
│   └── config/
│       └── ai-proxy.config.ts          # 中转站 API Key, Base URL
```

**核心逻辑:**
1. 前端带 JWT 调用 `POST /api/v1/ai/chat/completions`
2. 后端验证用户身份 + 检查余额/额度
3. 后端用服务端 API Key 转发请求到 `https://api.whatai.cc/v1/chat/completions`
4. 返回响应给前端 (支持 SSE 流式)
5. 从 response 的 `usage` 字段提取 token 用量，写入数据库

**流式转发关键点:**
- 使用 NestJS 的 `@Sse()` 或直接操作 `Response` 对象
- 逐 chunk 转发, 同时累积 token 计数
- 最后一个 chunk (`[DONE]`) 后写入用量记录

### 模块 2: 用量统计 & 计费系统 (P0)

**新增数据库表:**

```sql
-- 用量记录表 (每次 API 调用一条)
CREATE TABLE usage_record (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES "user"(id),
    model           VARCHAR(100) NOT NULL,     -- 使用的模型
    endpoint        VARCHAR(100) NOT NULL,     -- chat/embeddings/images...
    prompt_tokens   INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    total_tokens    INT DEFAULT 0,
    cost_usd        DECIMAL(10, 6) DEFAULT 0,  -- 计算出的费用
    request_id      VARCHAR(100),              -- 中转站返回的 ID
    status          VARCHAR(20) DEFAULT 'success', -- success/error
    duration_ms     INT DEFAULT 0,             -- 请求耗时
    created_at      TIMESTAMP DEFAULT NOW()
);

-- 用户额度表
CREATE TABLE user_quota (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES "user"(id) UNIQUE,
    total_quota_usd DECIMAL(10, 4) DEFAULT 0,  -- 总额度
    used_usd        DECIMAL(10, 6) DEFAULT 0,  -- 已使用
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 模型定价表
CREATE TABLE model_pricing (
    id              SERIAL PRIMARY KEY,
    model_name      VARCHAR(100) UNIQUE NOT NULL,
    prompt_price    DECIMAL(10, 8) NOT NULL,   -- 每 token 价格
    completion_price DECIMAL(10, 8) NOT NULL,
    unit            INT DEFAULT 1000,          -- 价格单位 (per 1K tokens)
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

**管理端 API:**

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /api/v1/admin/usage` | GET | 查看所有用户用量 (分页/筛选) |
| `GET /api/v1/admin/usage/summary` | GET | 总览统计 (今日/本周/本月) |
| `GET /api/v1/admin/usage/user/:id` | GET | 查看指定用户用量 |
| `GET /api/v1/admin/users/quota` | GET | 所有用户额度概览 |
| `PATCH /api/v1/admin/users/:id/quota` | PATCH | 调整用户额度 |
| `GET /api/v1/admin/models/pricing` | GET | 模型定价列表 |
| `PUT /api/v1/admin/models/pricing` | PUT | 更新模型定价 |

**用户端 API:**

| 端点 | 方法 | 说明 |
|------|------|------|
| `GET /api/v1/usage/me` | GET | 查看我的用量 |
| `GET /api/v1/usage/me/summary` | GET | 我的用量统计 |
| `GET /api/v1/quota/me` | GET | 我的剩余额度 |

### 模块 3: Agent 管理 (P0, 对应需求 5.4)

```
src/
├── agents/
│   ├── agents.module.ts
│   ├── agents.controller.ts
│   ├── agents.service.ts
│   ├── domain/agent.ts
│   ├── dto/
│   │   ├── create-agent.dto.ts
│   │   ├── update-agent.dto.ts
│   │   └── query-agent.dto.ts
│   └── infrastructure/persistence/relational/
│       ├── entities/agent.entity.ts
│       ├── repositories/agent.repository.ts
│       └── mappers/agent.mapper.ts
```

**Agent 实体字段:**
- id, name, status (running/idle/offline/error)
- skills[], collaborators[], completedCount, successRate
- soul: { name, role, expertise, background, style, goal, configured }
- userId (所属用户)
- createdAt, updatedAt, deletedAt

### 模块 4: 记忆中枢 (P1, 对应需求 5.7)

```
src/
├── memories/
│   ├── memories.module.ts
│   ├── memories.controller.ts
│   ├── memories.service.ts
│   └── infrastructure/persistence/relational/
│       └── entities/memory.entity.ts
```

**Memory 实体:** id, agentId, userId, category, content, pinned, createdAt

### 模块 5: Tasks 自动化 (P1, 对应需求 5.3)

```
src/
├── tasks/
│   ├── tasks.module.ts
│   ├── tasks.controller.ts
│   ├── tasks.service.ts
│   └── infrastructure/persistence/relational/
│       └── entities/task.entity.ts
```

**Task 实体:** id, name, type, status, agentId, userId, lastRun, failReason, fixSuggestion, schedule

### 模块 6: 数据日志 (P1, 对应需求 5.5)

```
src/
├── logs/
│   ├── logs.module.ts
│   ├── logs.controller.ts
│   └── logs.service.ts
```

**Log 实体:** id, level, source, agentId, taskId, message, metadata(JSON), createdAt

### 模块 7: 终端/聊天 (P0, 对应需求 5.6)

- 基于 WebSocket (NestJS Gateway) 或 SSE
- 与 AI Proxy 联动，支持与 Agent 实时对话
- 会话历史持久化

### 模块 8: IM 频道 (P2, 对应需求 5.8)

```
src/
├── im-channels/
│   ├── im-channels.module.ts
│   ├── im-channels.controller.ts
│   └── im-channels.service.ts
```

**IMChannel 实体:** id, platform(wechat/lark/telegram/wecom/dingtalk), connectionType(qr/webhook/token), config(加密JSON), status, userId

### 模块 9: MCP Porter (P2, 对应需求 5.9)

```
src/
├── mcp/
│   ├── mcp.module.ts
│   ├── mcp.controller.ts
│   └── mcp.service.ts
```

**MCPServer 实体:** id, name, endpoint, status, tools(JSON), official, version, userId

### 模块 10: 订阅/支付 (P3, 对应需求 5.11)

- 订阅计划管理 (Free/Pro/Enterprise)
- 与用户额度系统关联
- 可对接 Stripe 或支付宝/微信支付

---

## 五、开发优先级 & 建议路线图

### Phase 1 — 核心闭环 (建议先做)

```
Week 1-2:
  ├── AI Proxy Gateway (中转模块)
  │   ├── chat/completions 转发 (含流式 SSE)
  │   ├── models 列表
  │   └── 基础鉴权拦截
  ├── Usage 用量记录
  │   ├── usage_record 表 + 自动记录
  │   ├── user_quota 表 + 额度检查
  │   └── model_pricing 表 + 费用计算
  └── Admin 用量查看
      ├── 用户用量列表 API
      ├── 用量统计汇总 API
      └── 额度管理 API

Week 3-4:
  ├── Agent CRUD 管理
  ├── Terminal/Chat (WebSocket + 对话持久化)
  └── Memory 记忆中枢
```

### Phase 2 — 功能扩展

```
Week 5-6:
  ├── Tasks 自动化管理
  ├── Logs 日志系统
  └── Dashboard 聚合 API (统计指标)
```

### Phase 3 — 集成与商业化

```
Week 7+:
  ├── IM 频道集成 (先做 Telegram, 再做飞书/微信)
  ├── MCP Porter
  ├── 订阅/支付
  └── Migration 迁移中心
```

---

## 六、技术要点备忘

### SSE 流式转发示例思路 (NestJS)

```typescript
// ai-proxy.controller.ts
@Post('chat/completions')
@UseGuards(AuthGuard('jwt'))
async chatCompletions(
  @Request() req,
  @Body() body: ChatCompletionDto,
  @Res() res: Response,
) {
  // 1. 检查用户额度
  // 2. 如果 stream=true, 设置 SSE headers
  // 3. 转发请求到 api.whatai.cc
  // 4. 逐 chunk 转发 + 累积 usage
  // 5. 完成后写入 usage_record
}
```

### 中转站认证配置

```env
# .env
AI_PROXY_BASE_URL=https://api.whatai.cc/v1
AI_PROXY_API_KEY=sk-xxx  # 你在神马中转站的 API Key
```

### 费用计算逻辑

```
cost = (prompt_tokens / 1000 * prompt_price) + (completion_tokens / 1000 * completion_price)
```

从 API 响应的 `usage` 字段直接获取 token 数，再查 `model_pricing` 表计算费用。

---

## 七、总结

| 维度 | 现状 |
|------|------|
| 已完成 | 认证体系、用户管理、Session、文件、邮件、RBAC、数据库基础设施 |
| 完成度 | 约 **25%** (基础框架已搭好，业务模块待开发) |
| 最紧急 | AI Proxy 中转 + 用量统计 (产品核心链路) |
| 技术栈 | NestJS 11 + TypeORM + PostgreSQL, 无需更换 |
| 中转站 | 神马中转站 (api.whatai.cc), OpenAI 兼容格式, 650+ 模型 |

当前后端是一个**生产级 NestJS boilerplate**，认证和用户管理做得很完善。下一步的核心工作是搭建 **AI API 中转层 + 用量计费系统**，这是整个产品的业务核心。
