# RedAmon Agent 对外接口说明

本文整理 `agentic` 服务当前暴露的 HTTP / WebSocket 接口，供前端、集成方和自动化脚本调用。

## 1. 服务概览

- 服务入口：`agentic/api.py`
- 主体协议：
  - HTTP REST（FastAPI）
  - WebSocket（实时流式交互）
- 默认版本字段：`3.0.0`（见 `/health`）

## 2. HTTP 接口清单

> 说明：除特别标注外，请求体均为 `application/json`。

### 2.1 Guardrail （护栏）/ RoE / Report

| Method | Path                        | 用途                                 | 请求体（核心字段）                                               | 主要返回                              |
| ------ | --------------------------- | ------------------------------------ | ---------------------------------------------------------------- | ------------------------------------- |
| POST   | `/guardrail/check-target` | 扫描目标安全校验（硬规则+LLM软规则） | `target_domain`, `target_ips[]`, `project_id`, `user_id` | `{allowed, reason, hard_blocked?}`  |
| POST   | `/roe/parse`              | RoE 文档解析为结构化配置             | `text`, `model?`                                             | RoE 结构化 JSON（解析失败返回 error） |
| POST   | `/api/report/summarize`   | 生成报告叙述内容                     | `data`, `model?`                                             | narrative JSON                        |
| POST   | `/text-to-cypher`         | 自然语言生成 Cypher（只读）          | `question`, `user_id`, `project_id`                        | `{cypher}`                          |

### 2.2 System / Models / Skills

| Method | Path                             | 用途                              | 请求参数                           | 主要返回                                                  |
| ------ | -------------------------------- | --------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| POST   | `/emergency-stop-all`          | 紧急停止全部正在运行的 agent 任务 | 无                                 | `{stopped}`                                             |
| GET    | `/health`                      | 健康检查                          | 无                                 | `{status, version, tools_loaded, active_sessions}`      |
| GET    | `/defaults`                    | 项目默认设置（camelCase）         | 无                                 | 默认配置字典                                              |
| GET    | `/models`                      | 拉取模型列表（多 provider）       | `providers`（可选，JSON 字符串） | 模型列表                                                  |
| GET    | `/skills`                      | 技能目录（内置）                  | 无                                 | `{skills, total}`                                       |
| GET    | `/skills/{skill_id:path}`      | 技能内容（内置）                  | path                               | `{id, name, description, category, content}`            |
| GET    | `/community-skills`            | 社区技能目录                      | 无                                 | `{skills, total}`                                       |
| GET    | `/community-skills/{skill_id}` | 社区技能内容                      | path                               | `{id, name, content}`                                   |
| POST   | `/llm-provider/test`           | 测试 LLM Provider 配置连通性      | 见下方“LLM 测试请求结构”         | `{success, response_text}` 或 `{success:false,error}` |
| GET    | `/tunnel-status`               | 查询 ngrok/chisel 隧道状态        | 无                                 | `{ngrok:{...}, chisel:{...}}`                           |

### 2.3 文件与会话代理

| Method | Path                                | 用途                                 | 请求参数                                     | 主要返回      |
| ------ | ----------------------------------- | ------------------------------------ | -------------------------------------------- | ------------- |
| GET    | `/files`                          | 下载 kali-sandbox `/tmp/` 文件     | query:`path=/tmp/...`                      | 二进制文件流  |
| POST   | `/command-whisperer`              | 自然语言转命令                       | `prompt`, `session_type`, `project_id` | `{command}` |
| GET    | `/sessions`                       | 查询会话/作业（代理到 kali-sandbox） | 无                                           | 原样代理返回  |
| POST   | `/sessions/{session_id}/interact` | 向会话发命令                         | path + body(dict)                            | 原样代理返回  |
| POST   | `/sessions/{session_id}/kill`     | 终止会话                             | path                                         | 原样代理返回  |
| POST   | `/jobs/{job_id}/kill`             | 终止后台作业                         | path                                         | 原样代理返回  |
| POST   | `/session-chat-map`               | 绑定会话ID与聊天ID                   | body(dict)                                   | 原样代理返回  |
| POST   | `/non-msf-sessions`               | 注册非 MSF 会话                      | body(dict)                                   | 原样代理返回  |

## 3. LLM Provider 测试请求结构（`POST /llm-provider/test`）

```json
{
  "providerType": "openai_compatible",
  "apiKey": "",
  "baseUrl": "",
  "modelIdentifier": "",
  "defaultHeaders": {},
  "timeout": 120,
  "temperature": 0,
  "maxTokens": 16384,
  "sslVerify": true,
  "awsRegion": "us-east-1",
  "awsAccessKeyId": "",
  "awsSecretKey": ""
}
```

- `providerType` 支持：`openai` / `anthropic` / `openrouter` / `bedrock` / `openai_compatible`
- `openai_compatible` 路径支持 `baseUrl + defaultHeaders + timeout + sslVerify`

## 4. WebSocket 接口清单

### 4.1 `WS /ws/agent`（主 Agent）

#### 客户端 -> 服务端消息类型

- `init`
  - payload: `{ "user_id": "...", "project_id": "...", "session_id": "...", "graph_view_cypher": "..."? }`
- `query`
  - payload: `{ "question": "..." }`
- `approval`
  - payload: `{ "decision": "approve|modify|abort", "modification": "..."? }`
- `answer`
  - payload: `{ "answer": "..." }`
- `tool_confirmation`
  - payload: `{ "decision": "approve|modify|reject", "modifications": {...}? }`
- `guidance`
  - payload: `{ "message": "..." }`
- `skill_inject`
  - payload: `{ "skill_id": "...", "skill_name": "...", "content": "..." }`
- `stop` / `resume` / `ping`

#### 服务端 -> 客户端常见消息类型

- `connected`
- `thinking` / `thinking_chunk`
- `tool_start` / `tool_output_chunk` / `tool_complete`
- `phase_update` / `todo_update`
- `approval_request` / `question_request` / `tool_confirmation_request`
- `response` / `task_complete`
- `guidance_ack` / `skill_inject_ack`
- `stopped` / `pong` / `error`
- 规划相关：`plan_start` / `plan_complete` / `plan_analysis` / `deep_think`
- 文件相关：`file_ready`

#### 最小调用序列

1. 建连 `ws://<host>/ws/agent`
2. 发送 `init`
3. 收到 `connected`
4. 发送 `query`
5. 按需处理 `approval_request/question_request/tool_confirmation_request`
6. 收到 `response` 与 `task_complete`

### 4.2 `WS /ws/kali-terminal`

- 浏览器终端与 kali-sandbox PTY 的双向透传
- 文本/二进制消息均支持

### 4.3 `WS /ws/cypherfix-triage`

#### 客户端消息

- `init`（`user_id`, `project_id`, `session_id?`）
- `start_triage`
- `stop`
- `ping`

#### 服务端消息（常见）

- `connected`, `triage_phase`, `triage_finding`, `thinking`, `thinking_chunk`
- `tool_start`, `tool_complete`, `triage_complete`, `error`, `stopped`, `pong`

### 4.4 `WS /ws/cypherfix-codefix`

#### 客户端消息

- `init`（`user_id`, `project_id`, `session_id?`）
- `start_fix`（`remediation_id`）
- `block_decision`（用于 diff block 审批）
- `guidance`
- `stop`
- `ping`

#### 服务端消息（常见）

- `connected`, `codefix_phase`, `thinking`, `thinking_chunk`
- `tool_start`, `tool_complete`
- `diff_block`, `block_status`, `fix_plan`, `pr_created`, `codefix_complete`
- `error`, `stopped`, `pong`

## 5. 错误与状态码约定（通用）

- 4xx：请求参数错误、配置缺失、业务校验失败
- 5xx：内部异常或依赖服务异常
- 部分代理接口会透传下游状态码（如会话管理相关接口）
- WebSocket 错误统一通过 `type: "error"` + `payload.message` 返回

## 6. 前端如何提交 AI 请求（AIAssistantDrawer → agentic）

本节以 `webapp/src/app/graph/components/AIAssistantDrawer` 为例，说明用户操作如何转成对 `agentic/api.py` 的调用。

### 6.1 主要通道：WebSocket `/ws/agent`

- 前端入口：`AIAssistantDrawer.tsx` 通过 `useAgentWebSocket` 建连，并把 `useWebSocketHandler` 作为 `onMessage` 处理器（状态更新、渲染 Timeline）。
- URL 生成策略：`useAgentWebSocket` 默认直连同域主机的 `:8090` 端口：`ws(s)://{window.location.hostname}:8090/ws/agent`（也可用 `NEXT_PUBLIC_AGENT_WS_URL` 覆盖）。
- 连接建立后会自动发送 `init` 消息进行“会话身份绑定”。

对应后端入口：

- `agentic/api.py`: `@app.websocket("/ws/agent")` → `websocket_endpoint(websocket, orchestrator, ws_manager)`
- `agentic/websocket_api.py`: `handle_init/handle_query/handle_approval/handle_answer/...`

### 6.2 WS 消息类型（前端发送 → 后端处理）

前端消息结构统一为：

```json
{ "type": "<message_type>", "payload": { /* ... */ } }
```

| 前端 type | 触发点（AIAssistantDrawer） | 后端处理（agentic/websocket_api.py） | 后端实际调用（agentic/orchestrator.py） |
|---|---|---|---|
| `init` | WebSocket `onopen` 自动发送 | `handle_init`：认证并保存 `graph_view_cypher` | 无 |
| `query` | 用户发送问题（空闲态） | `handle_query`：启动后台 task 执行 | `invoke_with_streaming(...)` |
| `guidance` | 用户发送指引（运行态） | `handle_guidance`：写入 `guidance_queue` 并回 `guidance_ack` | 无（下一次 think 消费） |
| `skill_inject` | 运行态注入 Chat Skill 内容 | `handle_skill_inject`：格式化后写入 `guidance_queue` | 无（下一次 think 消费） |
| `approval` | 阶段审批（approve/modify/abort） | `handle_approval`：恢复执行并持续流式推送 | `resume_after_approval_with_streaming(...)` |
| `answer` | 回答 agent 提问 | `handle_answer`：恢复执行并持续流式推送 | `resume_after_answer_with_streaming(...)` |
| `tool_confirmation` | 危险工具确认（approve/modify/reject） | `handle_tool_confirmation`：恢复执行并持续流式推送 | `resume_after_tool_confirmation_with_streaming(...)` |
| `stop` | Stop 按钮 | `handle_stop`：取消当前后台 task，回 `stopped` | 无（cancel task） |
| `resume` | Resume 按钮 | `handle_resume`：从 checkpoint 继续执行 | `resume_execution_with_streaming(...)` |
| `ping` | 心跳（30s） | `handle_ping`：回 `pong` | 无 |

### 6.3 结果回流：后端推送 → 前端渲染

- 后端通过 WS 推送 `thinking/tool_start/tool_output_chunk/tool_complete/plan_* / phase_update / todo_update / approval_request / question_request / tool_confirmation_request / response / task_complete / file_ready / stopped ...`
- 前端 `useWebSocketHandler` 负责把这些事件转换为：
  - `chatItems`（Timeline 卡片：ThinkingCard、ToolExecutionCard、PlanWaveCard、DeepThinkCard、FileDownloadCard 等）
  - `awaitingApproval/awaitingQuestion/awaitingToolConfirmation` 等交互态
  - `isLoading/isStopped` 等运行态

### 6.4 WebApp 侧 HTTP 代理接口（与 agentic/api.py 的对应关系）

除了 WS 主链路，AIAssistantDrawer 还会通过 webapp 的 API route 访问/代理 agentic 的 HTTP 接口：

| 前端调用（webapp） | 实现位置（webapp/src/app/api） | 实际访问（agentic/api.py） | 用途 |
|---|---|---|---|
| `GET /api/models?userId=...` | `api/models/route.ts` | `GET /models` | 模型选择器：把 DB 中的 provider 列表传给 agentic 做 model discovery |
| `GET /api/agent/files?path=...` | `api/agent/files/route.ts` | `GET /files` | 下载 agent 生成的文件（kali-sandbox `/tmp/`） |
| `GET /api/agent/health` | `api/agent/health/route.ts` | `GET /health` | agent 健康检查 |
| `GET /api/skills` | `api/skills/route.ts` | `GET /skills` | Chat Skills catalog（用于导入/展示） |
| `GET /api/community-skills` | `api/community-skills/route.ts` | `GET /community-skills` | 社区技能 catalog（用于导入） |
| `POST /api/users/:id/llm-providers/:providerId/test` | `api/users/[id]/llm-providers/[providerId]/test/route.ts` | `POST /llm-provider/test` | 测试 LLM provider 配置 |

### 6.5 消息持久化与 agentRunning 状态

为支持“刷新/切会话后恢复时间线”，agentic 会把关键事件持久化回 webapp：

- `agentic/chat_persistence.py` 会调用 webapp API：
  - `POST /api/conversations/by-session/{session_id}/messages`（保存消息）
  - `PATCH /api/conversations/by-session/{session_id}`（更新元信息，如 `agentRunning`）
- `agentic/websocket_api.py` 在开始任务/结束任务时会更新 `agentRunning`，并将 user_message / approval_response / answer_response / tool_confirmation_response 等写入持久化队列。
