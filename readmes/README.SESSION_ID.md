# README.SESSION_ID

本文记录 `sessionId`（前端）/ `session_id`（后端消息字段）在 RedAmon WebApp + Agentic 系统中的来源、流转路径，以及它在 WebSocket、对话持久化（PostgreSQL/Prisma）、LangGraph checkpoint、Neo4j AttackChain（chain_id）中的一致性约定。

---

## 1. 结论（TL;DR）

- `sessionId` 在 `AIAssistantDrawer` 内部不会生成，它来自 `graph/page.tsx`，由 `useSession()` 提供，并通过 props 传入。
- `sessionId` 同时承担两类身份：
  - **Chat Session**：WebSocket `/ws/agent` 认证与任务路由的关键标识（与 `userId` + `projectId` 组合成唯一 `session_key`）。
  - **Attack Chain Session**：Neo4j 攻击链的 `chain_id`，前端图谱 UI 用它来区分与切换攻击链（session chains）。
- 只要 `sessionId` 不变，同一用户同一项目下：
  - 断线重连可以“接回”同一个 WS session（后端会把运行中的 task 迁移到新连接对象）。
  - LangGraph checkpoint 的 `thread_id` 不变，可以 stop/resume 并从 checkpoint 恢复。
  - 数据库中同一条 Conversation 会被持续追加 ChatMessage（`Conversation.sessionId` 是唯一键）。
  - Neo4j 中同一条 AttackChain（`chain_id=sessionId`）持续被更新/追加步骤。

---

## 2. 前端：sessionId 如何获取/生成

### 2.1 useSession：生成与切换

入口：`webapp/src/hooks/useSession.ts`

- mount（`useEffect([])`）时：
  - 优先取 `process.env.NEXT_PUBLIC_SESSION_ID`
  - 否则调用 `generateSessionId()` 生成随机值，形如 `session_ab12cd34`
  - 然后写入 `sessionStorage['redamon-session-id']`
- 提供两个动作：
  - `resetSession()`：生成一个新 sessionId 并写回 state + sessionStorage，同时返回新值
  - `switchSession(existingSessionId)`：切换到指定 sessionId（用于“历史会话切换”场景）

代码位置：
- `useSession.ts`: `generateSessionId()` 与初始化逻辑
- `useSession.ts`: `resetSession()` / `switchSession()`

注意点（实现细节）：
- 当前实现 **不会** 从 `sessionStorage` 读取已有值，而是在 mount 时总是用 env 或随机生成并覆盖写入。

### 2.2 graph/page.tsx：把 sessionId 注入到 AIAssistantDrawer

入口：`webapp/src/app/graph/page.tsx`

- 页面通过 `useSession()` 获取：
  - `const { sessionId, resetSession, switchSession } = useSession()`
- 然后渲染 AI Drawer 时传入：
  - `sessionId={sessionId || ''}`
  - `onResetSession={resetSession}`
  - `onSwitchSession={switchSession}`

这意味着：
- Drawer 的“New Chat”实际上会调用 `resetSession()`，从而触发新的 sessionId。
- Drawer 的“切换历史会话”会调用 `switchSession(conv.sessionId)`，切回某个已存在的 sessionId。

---

## 3. 前端图谱 UI：sessionId 与攻击链 chain_id 的关系

在 `graph/page.tsx` 中：

- `GraphCanvas` 的 `activeChainId` 直接使用当前的 `sessionId`
- 页面会从图谱数据节点（AttackChain/ChainStep/ChainFinding/…）的 `properties.chain_id` 收集所有链 ID（`sessionChainIds`）
- “Hide other chains / Show all” 的开关逻辑依赖 `id !== sessionId` 来判断“其他链”

因此前端约定是：

- **当前活跃攻击链 ID = sessionId**
- 图里每个攻击链/步骤节点的 `chain_id` 用于区分不同 session/攻击链

---

## 4. WebSocket：session_id 如何被用作连接与任务路由的 key

### 4.1 前端：INIT payload 携带 sessionId

入口：`webapp/src/hooks/useAgentWebSocket.ts`

- 建连后发送 `init` 消息，payload 包含：
  - `user_id`
  - `project_id`
  - `session_id`（来自前端 `sessionId`）
  - 可选：`graph_view_cypher`

### 4.2 后端：session_key = user:project:session

入口：`agentic/websocket_api.py`

- `InitMessage` 定义 `session_id`
- `WebSocketConnection.get_key()` 返回：
  - `f"{user_id}:{project_id}:{session_id}"`
- `WebSocketManager.authenticate()`：
  - 将 `active_connections[session_key] = connection`
  - 若 `session_key` 已存在旧连接，会关闭旧连接，并把旧连接上的运行任务/队列状态迁移到新连接
- `WebSocketManager` 还维护了 `_active_tasks[session_key]`，使 task 注册与连接对象解耦，支持“连接替换但任务不断”。

这决定了：
- **同一个 user/project/session 下，后端把它视作同一条会话通道**。

---

## 5. LangGraph / Checkpointer：thread_id 与 sessionId 的绑定

入口：`agentic/orchestrator_helpers/config.py`

- `thread_id = f"{user_id}:{project_id}:{session_id}"`
- `create_config()` 把 `thread_id` 和 `session_id` 放进 `configurable`
- stop/resume、读取运行状态（`aget_state`）等功能会基于这套 config 对应到同一个 checkpoint 线程

因此：
- **sessionId 稳定 ⇒ thread_id 稳定 ⇒ checkpoint/恢复能力稳定**

---

## 6. 对话持久化（PostgreSQL/Prisma via WebApp API）：Conversation 的唯一键是 sessionId

### 6.1 agentic 侧：通过 session_id 调 WebApp API

入口：`agentic/chat_persistence.py`

- 保存消息：
  - `POST /api/conversations/by-session/{session_id}/messages`
- 更新会话元信息（agentRunning、phase 等）：
  - `PATCH /api/conversations/by-session/{session_id}`

### 6.2 webapp 侧：按 sessionId 查找/创建 Conversation

入口：
- `webapp/src/app/api/conversations/by-session/[sessionId]/route.ts`
- `webapp/src/app/api/conversations/by-session/[sessionId]/messages/route.ts`

核心规则：
- `Conversation.sessionId` 是 `@unique`（Prisma）
- 写入消息时如果 Conversation 不存在，且 body 提供了 `projectId + userId`，会自动创建 Conversation（并写入 `sessionId`）
- ChatMessage 使用自增的 `sequenceNum` 保证消息顺序

---

## 7. Neo4j 攻击链：chain_id = session_id（关键一致性）

入口：`agentic/orchestrator_helpers/nodes/initialize_node.py`

- 创建/更新 AttackChain 节点时，直接使用：
  - `chain_id=session_id`

这就是前端图谱数据中 `properties.chain_id` 的来源之一，并且解释了：
- 为什么前端可以用 `sessionId` 来切换“当前攻击链”
- 为什么“历史会话切换”需要切换 sessionId 才能对齐同一条攻击链

---

## 8. 统一映射（建议作为 mental model）

- 前端 `useSession().sessionId`
  - WebSocket INIT：`payload.session_id`
  - DB：`Conversation.sessionId`（unique）
  - Neo4j：`AttackChain(chain_id=sessionId)` 及其下游链路节点的 `chain_id`
  - LangGraph：`thread_id = user:project:session`

---

## 9. 常见场景的行为总结

### 9.1 New Chat（新对话）

- Drawer 调用 `onResetSession` → `useSession.resetSession()` → 新 sessionId
- 前端 sessionId 改变会触发 Drawer 的 sessionId 相关 effect，清空/重置聊天状态
- 后端会把它当作全新 session_key / thread_id / Conversation / AttackChain

### 9.2 切换历史对话（Conversation Restoration）

- 选择历史会话后，前端会调用 `onSwitchSession(conv.sessionId)`
- sessionId 切回旧值后：
  - WS session_key 切回旧会话
  - DB 查回同一个 Conversation
  - Neo4j chain_id 对齐旧攻击链
  - LangGraph checkpoint thread_id 对齐旧线程（具备恢复语义）

---

## 10. 已观察到的实现注意点

- `useSession` 当前“写入 sessionStorage 但不读取”，mount 会覆盖已有值；如果希望刷新页面也保持同一个 session，需要补上读取逻辑（当前文档仅记录现状，不修改实现）。

