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
