"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'

import { readSseStream } from "../../lib";
import { TERMINAL_DEFAULT_AUTH_DATA, TerminalAuthMessage, useTerminal, type TerminalCommandMessage } from "../../hooks";

import styles from './OpsAgentChat.module.css'
import { Bot, Send, Square, Trash2, User } from "lucide-react";

type ChatRole = 'user' | 'assistant' | 'system'

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  streaming?: boolean
  thinking?: string[]
};

type ToolStartEvent = { name: string; args?: Record<string, unknown> };
type ToolCallEvent = {
  name: string;
  tool_call_id: string;
  args?: Record<string, unknown>;
  requires_approval?: boolean;
};
type FinalEvent = { content: string };
type ErrorEvent = { message: string };
type InfoEvent = { session_id: string; model?: string };

function uid() {
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
}

interface ToolQueueItem {
  id: string;
  command: string;
}

interface OpsAgentChatProps {
  clientId: string;
}

export function OpsAgentChat({
  clientId,
}: OpsAgentChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const chatAreaRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const interruptedRef = useRef(false);
  const stickToBottomRef = useRef(true);

  function buildSummaryMarkdown(finalContent: string) {
    const normalized = finalContent.replace(/\r\n/g, "\n");
    const withoutCode = normalized.replace(/```[\s\S]*?```/g, "").trim();
    const candidates = withoutCode
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .filter((l) => !l.startsWith("#"))
      .filter((l) => l !== "---");

    if (candidates.length === 0) return "**总结**\n\n- 分析完成";

    const focusStartIdx = candidates.findIndex((l) => /现象\/结论|现象|结论|摘要|总结/.test(l));
    const picked =
      focusStartIdx >= 0 ? candidates.slice(focusStartIdx + 1, focusStartIdx + 6) : candidates.slice(0, 5);

    const bullets = (picked.length > 0 ? picked : candidates.slice(0, 5)).map((l) => {
      if (/^[-*]\s+/.test(l)) return l;
      if (/^\d+\.\s+/.test(l)) return `- ${l.replace(/^\d+\.\s+/, "")}`;
      return `- ${l}`;
    });

    return `**总结**\n\n${bullets.join("\n")}`;
  }

  const apiBase = useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
    return base || "http://localhost:8000";
  }, []);

  const postToolFeedback = useCallback(
    async (toolCallId: string, output: string, error?: string) => {
      await fetch(`${apiBase}/agent/chat/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool_call_id: toolCallId, output, error: error ?? null }),
      });
    },
    [apiBase],
  );

  const {
    status,
    initTerminal,
    sendMessage,
    sendCommandMessage
  } = useTerminal({
    clientId,
    onCommand: (command: TerminalCommandMessage) => {
      // console.log("terminal command:", command);
      const sysMsg: ChatMessage = {
        id: command.session_id,
        role: "system",
        content: `✅ 执行：${command.command}\n\`\`\`bash\n${command.result}\n\`\`\``,
      };
      setMessages((prev) => [...prev, sysMsg]);
      postToolFeedback(command.session_id, command.result);
    },
    onConnect: () => {
      const authMessage: TerminalAuthMessage = {
        host_ip: "localhost",
        host_port: 5922,
        auth_type: "key",
        username: "user",
        password: "pass",
        privilege_key: TERMINAL_DEFAULT_AUTH_DATA,
        terminal_type: "pipe",
      };

      sendMessage("terminal", authMessage);
    }
  });

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = chatAreaRef.current;
    if (!el) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [messages]);

  const updateStickToBottom = useCallback(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const thresholdPx = 80;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceToBottom <= thresholdPx;
  }, []);

  const interruptChat = useCallback(() => {
    interruptedRef.current = true;
    abortRef.current?.abort();
  }, []);

  /**
   * 清空当前对话消息列表并重置会话 ID
   */
  const handleClear = useCallback(() => {
    setMessages([]);
    setSessionId(null);
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  async function runToolQueue(toolItem: ToolQueueItem) {
    const commandMessage: TerminalCommandMessage = {
      session_id: toolItem.id,
      command: toolItem.command,
      result: "",
    };
    await sendCommandMessage(commandMessage);
    return;
  }

  const appendAssistantThinking = useCallback((assistantId: string, line: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantId) return m;
        return { ...m, thinking: [...(m.thinking ?? []), line] };
      }),
    );
  }, []);

  async function runChat(message: string) {
    setRunning(true);
    stickToBottomRef.current = true;
    const assistantId = uid();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", streaming: true, thinking: ["思考中..."] },
    ]);
    try {
      interruptedRef.current = false;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const resp = await fetch(`${apiBase}/agent/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message, session_id: sessionId }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const text = await resp.text();
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, streaming: false, content: `请求失败：${resp.status}\n${text}` }
              : m,
          ),
        );
        return;
      }

      try {
        for await (const msg of readSseStream(resp)) {
          console.log("msg event:", msg.event);

          if (msg.event === "info") {
            const info = msg.data as InfoEvent;
            if (info?.session_id) setSessionId(info.session_id);
            if (info?.model) appendAssistantThinking(assistantId, `模型：${info.model}`);
            continue;
          }

          if (msg.event === "tool_start") {
            const ev = msg.data as ToolStartEvent;
            const q = typeof ev?.args?.query === "string" ? `：${ev.args.query}` : "";
            appendAssistantThinking(assistantId, `🔍 工具开始：${ev.name}${q}`);
            continue;
          }

          if (msg.event === "tool_call") {
            const ev = msg.data as ToolCallEvent;
            console.log("tool_call:", ev);
            if (ev?.name === "shell_exec") {
              const command = typeof ev?.args?.command === "string" ? ev.args.command : "";
              appendAssistantThinking(assistantId, `🧰 请求执行：${command}`);
              const toolItem: ToolQueueItem = { id: ev.tool_call_id, command };
              void runToolQueue(toolItem);
            } else {
              appendAssistantThinking(assistantId, `工具调用：${ev.name}`);
            }
            continue;
          }

          if (msg.event === "final") {
            const ev = msg.data as FinalEvent;
            setMessages((prev) => {
              const next = prev.map((m) =>
                m.id === assistantId ? { ...m, content: ev.content, streaming: false } : m,
              );
              return [
                ...next,
                {
                  id: uid(),
                  role: "assistant",
                  content: buildSummaryMarkdown(ev.content),
                },
              ];
            });
            continue;
          }

          if (msg.event === "error") {
            const ev = msg.data as ErrorEvent;
            const errMsg = ev?.message || "Unknown error";
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: `错误：${errMsg}`, streaming: false } : m)),
            );
          }
        }
      } catch (err) {
        const isAbort =
          interruptedRef.current ||
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === "AbortError");
        if (!isAbort) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: `错误：${String(err)}`, streaming: false } : m,
            ),
          );
        }
      }

      if (interruptedRef.current || controller.signal.aborted) {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: "已中断", streaming: false } : m)),
        );
      } else {
        appendAssistantThinking(assistantId, "分析完成");
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  function sendCommandToAI() {
    const text = input.trim();
    if (!text || running) return;
    setInput("");
    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, { id: uid(), role: "user", content: text }]);
    void runChat(text);
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <span className={styles.statusChip}>AI {status}</span>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            disabled={!running}
            onClick={interruptChat}
          >
            中断
          </button>
          <button type="button" className={styles.secondaryBtn} onClick={handleClear}>
            <Trash2 size={14} />
            清空
          </button>
          <button type="button" className={styles.primaryBtn} onClick={initTerminal}>
            连接
          </button>
        </div>
      </div>

      <div className={styles.chatArea} ref={chatAreaRef} onScroll={updateStickToBottom}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            你好！我是 AI 辅助侦查助手。你可以询问磁盘、内存、CPU 状态，或执行远程操作。
          </div>
        ) : null}

        {messages.map((m) => {
          return (
            <div
              key={m.id}
              className={`${styles.message} ${m.role === 'user' ? styles.messageUser : styles.msgAssistant}`}
            >
              <div className={styles.messageIcon}>
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={styles.bubble}>
                {m.role === "assistant" && (m.streaming || (m.thinking?.length ?? 0) > 0) ? (
                  <details className={styles.toolSection} open={m.streaming}>
                    <summary className={styles.toolSummary}>{m.streaming ? "思考中" : "过程"}</summary>
                    <pre className={styles.toolPre}>{(m.thinking ?? []).join("\n")}</pre>
                  </details>
                ) : null}

                {m.role === "system" ? (
                  <details className={styles.toolSection}>
                    <summary className={styles.toolSummary}>工具调用</summary>
                    <pre className={styles.toolPre}>{m.content}</pre>
                  </details>
                ) : null}

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                >
                  {m.content || (m.role === 'assistant' && (m.streaming) ? '...' : '')}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.composer}>
        <div
          className="sticky bottom-0 flex items-end gap-2 rounded-xl border border-zinc-200 bg-white/70 p-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/50"
        >
          <textarea
            className={styles.textarea}
            rows={1}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              if (e.nativeEvent.isComposing) return;
              e.preventDefault();
              sendCommandToAI();
            }}
          />
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => {
              if (running) {
                interruptChat();
                return;
              }
              sendCommandToAI();
            }}
          >
            {running ? <Square size={14} /> : <Send size={14} />}
            {running ? "中断" : "发送"}
          </button>

          <button
            type="button"
            disabled={running}
            className={styles.primaryBtn}
            onClick={() => {
              void runChat("分析磁盘情况");
            }}
          >
            AI
          </button>

          <button
            type="button"
            disabled={running}
            className={styles.primaryBtn}
            onClick={async () => {
              const commandMessage: TerminalCommandMessage = {
                session_id: "test",
                command: "BLUE=1",
                result: "",
              };
              await sendCommandMessage(commandMessage);
            }}
          >
            set
          </button>

          <button
            type="button"
            disabled={running}
            className={styles.primaryBtn}
            onClick={async () => {
              const commandMessage: TerminalCommandMessage = {
                session_id: "test",
                command: "sleep 10; echo LOGNAME=$LOGNAME",
                result: "",
              };
              await sendCommandMessage(commandMessage);
            }}
          >
            get
          </button>
          <button
            type="button"
            disabled={running}
            className={styles.primaryBtn}
            onClick={() => {
              void runChat("使用HexStrike扫描192.168.31.1/24网络");
            }}
          >
            HexStrike
          </button>

        </div>
      </div>
    </div>
  );
}
