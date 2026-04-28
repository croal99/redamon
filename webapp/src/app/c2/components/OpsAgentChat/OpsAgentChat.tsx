"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm'

import { readSseStream } from "../../lib";
import { useTerminal, type TerminalCommandMessage } from "../../hooks";

import styles from './OpsAgentChat.module.css'
import { Bot, Send, Trash2, User } from "lucide-react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
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
  const toolQueueRef = useRef<{ toolCallId: string; command: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  const onCommand = useCallback(
    (command: TerminalCommandMessage) => {
      console.log("terminal command:", command);
      setMessages((prev) => [
        ...prev,
        { id: command.session_id, role: "system", content: `✅ 执行：${command.command}\n${command.result}` },
      ]);
      postToolFeedback(command.session_id, command.result);
    },
    [postToolFeedback],
  );

  const { status, content, initTerminal: connect, disconnect, sendCommandMessage } = useTerminal({ clientId, onCommand });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function runToolQueue(toolItem: ToolQueueItem) {
    const commandMessage: TerminalCommandMessage = {
      session_id: toolItem.id,
      command: toolItem.command,
      result: "",
    };
    await sendCommandMessage(commandMessage);
    return;
  }

  async function runChat(message: string) {
    setRunning(true);
    try {
      const resp = await fetch(`${apiBase}/agent/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({ message, session_id: sessionId }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        setMessages((prev) => [
          ...prev,
          { id: uid(), role: "system", content: `请求失败：${resp.status}\n${text}` },
        ]);
        return;
      }

      for await (const msg of readSseStream(resp)) {
        console.log("msg event:", msg.event);

        if (msg.event === "info") {
          const info = msg.data as InfoEvent;
          if (info?.session_id) setSessionId(info.session_id);
          // if (info?.model) {
          //   setMessages((prev) => [
          //     ...prev,
          //     { id: uid(), role: "system", content: `模型：${info.model}` },
          //   ]);
          // }
          continue;
        }

        if (msg.event === "tool_start") {
          const ev = msg.data as ToolStartEvent;
          const q = typeof ev?.args?.query === "string" ? `：${ev.args.query}` : "";
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "system", content: `🔍 工具开始：${ev.name}${q}` },
          ]);
          continue;
        }

        if (msg.event === "tool_call") {
          const ev = msg.data as ToolCallEvent;
          if (ev?.name === "shell_exec") {
            const command = typeof ev?.args?.command === "string" ? ev.args.command : "";
            const toolItem: ToolQueueItem = { id: ev.tool_call_id, command };
            void runToolQueue(toolItem);
          } else {
            setMessages((prev) => [
              ...prev,
              { id: uid(), role: "system", content: `工具调用：${ev.name}` },
            ]);
          }
          continue;
        }

        if (msg.event === "final") {
          const ev = msg.data as FinalEvent;
          setMessages((prev) => [...prev, { id: uid(), role: "assistant", content: ev.content }]);
          continue;
        }

        if (msg.event === "error") {
          const ev = msg.data as ErrorEvent;
          const errMsg = ev?.message || "Unknown error";
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "system", content: `错误：${errMsg}` },
          ]);
        }
      }

      setMessages((prev) => [
        ...prev,
        { id: uid(), role: "system", content: `分析完成` },
      ]);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <div className={styles.headerLeft}>
          <span className={styles.statusChip}>AI {status}</span>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={styles.secondaryBtn}>
            <Trash2 size={14} />
            清空
          </button>
          <button type="button" className={styles.primaryBtn} onClick={connect}>
            连接
          </button>
        </div>
      </div>

      <div className={styles.chatArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            你好！我是 AI 辅助侦查助手。你可以询问磁盘、内存、CPU 状态，或执行远程操作。
          </div>
        ) : null}

        {messages.map((m) => {
          const accent =
            m.role === "user"
              ? "border-sky-500/20 bg-sky-500/5 dark:border-sky-400/20 dark:bg-sky-400/5"
              : m.role === "assistant"
                ? "border-indigo-500/20 bg-indigo-500/5 dark:border-indigo-400/20 dark:bg-indigo-400/5"
                : "border-zinc-200/60 bg-white/40 dark:border-zinc-800 dark:bg-zinc-900/20";

          return (
            <div
              key={m.id}
              className={`${styles.msgRow} ${m.role === 'user' ? styles.msgUser : styles.msgAssistant}`}
            >
              <div className={styles.avatar}>
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={styles.bubble}>
                {m.role === "user" ? (
                  <div className={styles.userMsg}>{m.content}</div>
                ) : null}
                
                {m.role === "system" ? (
                  <details className={styles.toolSection}>
                    <summary className={styles.toolSummary}>工具调用</summary>
                    <pre className={styles.toolPre}>{m.content}</pre>
                  </details>
                ) : null}

                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {m.content || (m.role === 'assistant' && (m.streaming) ? '...' : '')}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.composer}>
        <form
          className="sticky bottom-0 flex items-end gap-2 rounded-xl border border-zinc-200 bg-white/70 p-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/50"
          onSubmit={(e) => {
            e.preventDefault();
            const text = input.trim();
            if (!text || running) return;
            setInput("");
            setMessages((prev) => [...prev, { id: uid(), role: "user", content: text }]);
            void runChat(text);
          }}
        >
          <textarea
            className={styles.textarea}
            rows={1}
            placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={running}
            className={styles.secondaryBtn}
          >
            <Send size={14} />
            {running ? "运行中…" : "发送"}
          </button>
          {/* <button
            disabled={running}
            className={styles.primaryBtn}
            onClick={async () => {
              runChat("分析磁盘情况");
            }}
          >
            AI
          </button>
          <button
            disabled={running}
            className={styles.primaryBtn}
            onClick={async () => {
              connect();
            }}
          >
            connect
          </button>
          <button
            disabled={running}
            className={styles.primaryBtn}
            onClick={async () => {
              const toolItem: ToolQueueItem = { id: "test1", command: "ls -l" };
              await runToolQueue(toolItem);
            }}
          >
            test1
          </button>
          <button
            disabled={running}
            className={styles.primaryBtn}
            onClick={async () => {
              const toolItem: ToolQueueItem = { id: "test2", command: "id" };
              await runToolQueue(toolItem);
            }}
          >
            test2
          </button> */}
        </form>
      </div>
    </div>
  );
}
