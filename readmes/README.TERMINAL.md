# Terminal over WebSocket（基于 ClientTerminal 的实现整理）

本文整理 `/webapp/src/app/c2/components/ClientTerminal` 的“通过 WebSocket 通信 + 在浏览器中模拟交互式终端”的实现方法，目标是让 AI 编程助手能够据此实现一个**完整可运行**的前后端终端应用（不包含 AI 对话/推理等功能）。

参考实现入口：
- 前端组件：[ClientTerminal.tsx](file:///Volumes/CODE/01.AI/06.redamon/webapp/src/app/c2/components/ClientTerminal/ClientTerminal.tsx)
- 相关类型：[center.ts](file:///Volumes/CODE/01.AI/06.redamon/webapp/src/app/c2/types/center.ts)
- 终端服务端示例（PTY WebSocket）：[terminal_server.py](file:///Volumes/CODE/01.AI/06.redamon/mcp/servers/terminal_server.py)

---

## 1. 总体架构（Architecture）

**浏览器端（Web UI）**
- 使用 xterm.js 在 DOM 中渲染“伪终端”（Terminal emulator）
- 将键盘输入（含控制字符）通过 WebSocket 发送到服务端
- 接收服务端回传的终端输出（TTY stream），写入 xterm
- 处理窗口尺寸变化：fit + resize 通知服务端调整 PTY/SSH 终端大小
- 断线重连：指数退避（exponential backoff）+ 最大重试次数
- 保活：定时发送 ping（应用层或 WebSocket 原生 ping/pong 均可）

**服务端（Terminal Gateway）**
- 每条 WebSocket 连接对应一个会话（session）
- 会话内桥接两条流：
  - WebSocket → PTY/SSH stdin（写入）
  - PTY/SSH stdout/stderr → WebSocket（读取并回传）
- 支持控制消息（至少 resize、可选 ping、可选认证/选择目标主机）

---

## 2. 前端实现要点（ClientTerminal）

### 2.1 动态加载 xterm（避免 SSR 问题）

ClientTerminal 是 Next.js Client Component（`'use client'`），但仍建议动态 import xterm 相关依赖，避免 SSR/打包时机问题：

- `@xterm/xterm`
- `@xterm/addon-fit`
- `@xterm/addon-web-links`

在组件首次连接时创建并缓存：
- `terminalRef.current`：xterm 实例
- `fitAddonRef.current`：用于自动计算 cols/rows

### 2.2 WebSocket 生命周期管理

ClientTerminal 使用 `wsRef` 保存当前连接，主要事件处理：
- `onopen`：
  - 更新状态为 connected
  - 发送认证（可选）
  - 发送 resize（如果可计算 dimensions）
  - 注册输入事件（onData/onBinary）将用户输入转发给服务端
  - 启动 keepalive ping
- `onmessage`：
  - 解析为 JSON（若是 `{type:"text", data:"..."}` 则取 data）
  - 否则按原始文本写入终端（兼容服务端直接推送 TTY stream）
  - 同时支持“采集输出”的能力（见 2.5）
- `onerror` / `onclose`：
  - 更新状态为 error/disconnected
  - 清理 ping 定时器
  - 非手动断开时启动重连（指数退避）

### 2.3 输入转发（onData / onBinary）

xterm 的输入回调：
- `terminal.onData((data) => ...)`：字符串输入（含控制字符）
- `terminal.onBinary((data) => ...)`：二进制输入（例如粘贴/IME/某些键序列）

ClientTerminal 当前将两者都包装为 `{type:"text", data:string}` 发送（见 [ClientTerminal.tsx](file:///Volumes/CODE/01.AI/06.redamon/webapp/src/app/c2/components/ClientTerminal/ClientTerminal.tsx#L175-L323)）。

对“完整终端体验”而言，更推荐与 [terminal_server.py](file:///Volumes/CODE/01.AI/06.redamon/mcp/servers/terminal_server.py) 类似：
- 文本输入：直接 `ws.send(string)`
- 二进制输入：`ws.send(ArrayBuffer)`（需要 `ws.binaryType = 'arraybuffer'`）

两种方案都可行，关键是前后端协议要一致。

### 2.4 Resize：fit + 通知服务端

目标：让服务端 PTY/SSH 端的窗口大小与浏览器显示一致，保证：
- `top/htop/vim/less` 等 TUI 正常渲染
- 换行/分页正确

ClientTerminal 的做法：
- 通过 `FitAddon` 计算 cols/rows
- 用 `ResizeObserver` 监听终端容器 DOM 尺寸变化
- 同时监听 `window.resize`
- fullscreen 切换后延迟 100ms 再 fit（避免过渡动画导致 proposeDimensions 不准）

发送的控制消息是：
- `{ type: 'resize', data: { cols, rows } }`

（对比 KaliTerminal 的协议是 `{ type:'resize', rows, cols }`，见 [KaliTerminal.tsx](file:///Volumes/CODE/01.AI/06.redamon/webapp/src/app/graph/components/KaliTerminal/KaliTerminal.tsx#L152-L158)）

### 2.5 “程序化执行命令并采集输出”（runTerminalCommand）

ClientTerminal 内置了一个非常实用的能力：向终端发送命令，并在“输出静默一段时间”后返回采集到的输出文本（不是 AI 专用，任何自动化功能都能用）。

实现核心思路：
- 发送命令（确保以 `\n` 结尾触发执行）
- 开启一个 activeRun：
  - `buffer`：累计输出（限制 maxChars，避免内存爆）
  - `touch()`：每次收到输出就重置“静默定时器”
  - `timeoutTimer`：总超时，防止命令卡死
- `ws.onmessage` 每次写入终端的同时，也把数据 append 进 activeRun.buffer
- 当 `silenceMs` 时间内无新输出时，认为命令结束，resolve(buffer)

关键点：
- 一次只允许一个 activeRun（避免并发输出混叠）
- 断线/错误时要调用 `finish(error)` 兜底结束

这类“静默窗口”方案对大部分命令有效，但不是严格的“命令完成”语义（例如后台持续输出的命令会在 timeout 后失败）。

---

## 3. WebSocket 消息协议（建议规范）

ClientTerminal 涉及的 TS 类型定义见：[center.ts](file:///Volumes/CODE/01.AI/06.redamon/webapp/src/app/c2/types/center.ts)：

```ts
export type CommandMessage<T> = {
  type: string
  data?: T
}

export type TerminalSizeMessage = {
  cols?: number
  rows?: number
}

export type TerminalAuthMessage = {
  host_ip: string
  host_port: number
  auth_type?: "key" | "password"
  username?: string
  privilege_key?: string
  password?: string
}
```

### 3.1 浏览器 → 服务端（Client → Server）

推荐统一用 JSON envelope（与 ClientTerminal 现状一致），至少支持：

- 认证（可选，用于“连到哪台机器/用什么凭据”）
  - `{ "type": "terminal", "data": TerminalAuthMessage }`
- Resize（必须）
  - `{ "type": "resize", "data": { "cols": number, "rows": number } }`
- 输入（必须）
  - `{ "type": "text", "data": string }`
- Ping（可选；也可以依赖 WebSocket 原生 ping/pong）
  - `{ "type": "ping" }`

如果你选择“TTY 直通协议”（更贴近传统终端）：
- 输入：直接发送 string/ArrayBuffer
- 控制：仅 resize/ping 走 JSON

### 3.2 服务端 → 浏览器（Server → Client）

ClientTerminal 兼容两种输出格式：

1) 原始文本（或字节流）
- 直接 `ws.send(ttyChunk)`
- 浏览器收到后 `terminal.write(chunk)`

2) JSON 包装
- `{ "type": "text", "data": "..." }`

建议选 1) 作为主协议（更高效），必要时在业务层再加 JSON 通道。

---

## 4. 环境变量与 URL 约定

ClientTerminal 中 WebSocket URL 构造：
- `NEXT_PUBLIC_BLINK_WS_URL` + `/api/terminal/:clientId`
  - 代码见：[getWsUrl](file:///Volumes/CODE/01.AI/06.redamon/webapp/src/app/c2/components/ClientTerminal/ClientTerminal.tsx#L18-L22)

因此一个可运行的应用至少需要：
- 前端：设置 `NEXT_PUBLIC_BLINK_WS_URL` 指向终端网关（ws/wss 基址）
- 服务端：实现 `GET ws(s)://<host>/api/terminal/{clientId}` 的 WebSocket endpoint

---

## 5. 服务端参考实现（实现一个可跑的 Terminal Gateway）

本仓库已有一个最小可用的 PTY WebSocket 示例：[terminal_server.py](file:///Volumes/CODE/01.AI/06.redamon/mcp/servers/terminal_server.py)。它的行为要点：
- 每条 WS 连接 fork 一个 bash 并通过 PTY 桥接
- 支持 JSON 控制消息：
  - `{"type":"resize","rows":...,"cols":...}`
  - `{"type":"ping"}`
- 其余字符串会写入 PTY；PTY 输出直接以 bytes 回传

为了与 ClientTerminal 的 envelope 兼容，建议在服务端同时支持：
- `{"type":"text","data":"..."}` → 写入 PTY
- `{"type":"resize","data":{"rows":...,"cols":...}}` → 调整 PTY

下面给出一个“协议兼容版”的伪代码示例（Python websockets 风格），用于指导实现：

```python
import json

def parse_client_message(message: str) -> tuple[str, object | None] | None:
    """Parse client message and normalize to (type, data)."""
    if not isinstance(message, str):
        return None
    try:
        obj = json.loads(message)
        if isinstance(obj, dict) and isinstance(obj.get("type"), str):
            return obj["type"], obj.get("data")
    except json.JSONDecodeError:
        return "raw_text", message
    return None

def extract_resize(data: object) -> tuple[int, int] | None:
    """Extract (rows, cols) from either flat or nested resize payload."""
    if isinstance(data, dict):
        rows = data.get("rows")
        cols = data.get("cols")
        if isinstance(rows, int) and isinstance(cols, int):
            return rows, cols
    return None
```

### 5.1 多目标（clientId / 认证）如何落地

ClientTerminal 的 URL 中包含 `clientId`，并且在 `onopen` 会发送一次 `type:"terminal"` 的认证数据（见 [sendAuthMessage](file:///Volumes/CODE/01.AI/06.redamon/webapp/src/app/c2/components/ClientTerminal/ClientTerminal.tsx#L162-L173) 及 `onopen` 逻辑）。

一个“完整应用”的合理实现方式：

- `clientId` 用于在服务端选择目标：
  - 可能代表某台 agent/机器的标识
  - 或代表某个预先注册的连接/会话
- `terminal` 认证消息用于选择“如何连”：
  - `auth_type = "key"`：用私钥连接 SSH
  - `auth_type = "password"`：用密码连接 SSH
  - `host_ip/host_port/username` 指定目标

服务端实现建议：
- 建立 WS 后先进入“未认证”状态，限制只能发 `terminal/resize/ping`
- 收到 `terminal` 后创建 SSH/PTY，并开始桥接
- 若不需要认证（例如固定连到本机 bash），可忽略 `terminal` 消息

---

## 6. 前端最小可用实现清单（Checklist）

要实现一个“能用的 Web Terminal”，前端至少具备：
- xterm 初始化 + open 到 DOM 容器
- FitAddon + 首次 fit，并在 resize/容器变化时重新 fit
- WebSocket 连接管理（open/message/error/close）
- 将 xterm 输入转发到服务端（onData 必须；onBinary 建议）
- 将服务端输出写入 xterm（`terminal.write(...)`）
- 断线重连（指数退避）+ 手动重连按钮
- keepalive（应用层 ping 或原生 ping/pong）

ClientTerminal 已涵盖上述全部能力（除“二进制直通”目前未开启），可直接作为实现蓝本。

