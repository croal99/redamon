"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Terminal as TerminalIcon, Wifi, WifiOff, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";
import styles from "./ClientTerminal.module.css";
import { TERMINAL_DEFAULT_AUTH_DATA, TerminalAuthMessage, useTerminal } from "../../hooks";
import "@xterm/xterm/css/xterm.css";

interface ClientTerminalProps {
  clientId: string;
}

/**
 * 客户端终端组件，集成了 xterm.js 及自适应、链接插件
 */
export const ClientTerminal = memo(function ClientTerminal({
  clientId,
}: ClientTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputDisposablesRef = useRef<Array<{ dispose: () => void }>>([]);
  const mountedRef = useRef(true);

  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    status,
    initTerminal,
    disconnect,
    sendMessage,
    sendTextMessage,
    sendResizeMessage,
  } = useTerminal({
    clientId,
    onMessage: (text) => {
      terminalRef.current?.write(text);
    },
    onConnect: () => {
      const terminal = terminalRef.current;
      if (terminal) {
        terminal.writeln("\x1b[1;32m\u2713 Connected\x1b[0m\n");
      }

      const authMessage: TerminalAuthMessage = {
        host_ip: "localhost",
        host_port: 5922,
        auth_type: "key",
        username: "user",
        password: "pass",
        privilege_key: TERMINAL_DEFAULT_AUTH_DATA,
        terminal_type: "stream",
      };

      sendMessage("terminal", authMessage);

      const fitAddon = fitAddonRef.current;
      if (fitAddon) {
        try {
          fitAddon.fit();
          const dims = fitAddon.proposeDimensions();
          if (dims) {
            sendResizeMessage({ cols: dims.cols, rows: dims.rows });
          }
        } catch {
          // ignore
        }
      }
    },
    onDisconnect: () => {
      const terminal = terminalRef.current;
      if (terminal) {
        terminal.writeln(`\n\x1b[1;31m\u2717 Disconnected\x1b[0m`);
      }
    },
    onError: () => {
      const terminal = terminalRef.current;
      if (terminal) {
        terminal.writeln("\n\x1b[1;31mWebSocket connection failed.\x1b[0m");
      }
    },
  });

  /**
   * 初始化并连接终端
   */
  const connect = useCallback(async () => {
    if (!clientId) return;
    if (!termRef.current || !mountedRef.current) return;

    let TerminalCtor, FitAddonCtor, WebLinksAddonCtor;
    try {
      const [termMod, fitMod, linksMod] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
      ]);
      TerminalCtor = termMod.Terminal;
      FitAddonCtor = fitMod.FitAddon;
      WebLinksAddonCtor = linksMod.WebLinksAddon;
    } catch (e) {
      console.error("Failed to load xterm modules", e);
      return;
    }

    if (!mountedRef.current) return;

    if (!terminalRef.current) {
      const fitAddon = new FitAddonCtor();
      fitAddonRef.current = fitAddon;

      const terminal = new TerminalCtor({
        cursorBlink: true,
        cursorStyle: "block",
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Menlo', monospace",
        lineHeight: 1.3,
        letterSpacing: 0.5,
        theme: {
          background: "#0a0e14",
          foreground: "#e6e1cf",
          cursor: "#73d0ff",
          cursorAccent: "#0a0e14",
          selectionBackground: "#33415580",
          selectionForeground: "#e6e1cf",
          black: "#1a1e29",
          red: "#ff3333",
          green: "#bae67e",
          yellow: "#ffd580",
          blue: "#73d0ff",
          magenta: "#d4bfff",
          cyan: "#95e6cb",
          white: "#e6e1cf",
          brightBlack: "#4d556a",
          brightRed: "#ff6666",
          brightGreen: "#91d076",
          brightYellow: "#ffe6b3",
          brightBlue: "#5ccfe6",
          brightMagenta: "#c3a6ff",
          brightCyan: "#a6f0db",
          brightWhite: "#fafafa",
        },
        scrollback: 10000,
        allowProposedApi: true,
      });

      terminal.loadAddon(fitAddon);
      terminal.loadAddon(new WebLinksAddonCtor());

      terminal.open(termRef.current);

      try {
        fitAddon.fit();
      } catch {
        // ignore
      }

      terminalRef.current = terminal;

      inputDisposablesRef.current.forEach((d) => d.dispose());
      inputDisposablesRef.current = [];

      inputDisposablesRef.current.push(
        terminal.onData((data: string) => {
          sendTextMessage(data);
        })
      );

      inputDisposablesRef.current.push(
        terminal.onBinary((data: string) => {
          sendTextMessage(data);
        })
      );
    } else {
      terminalRef.current.clear();
    }

    const terminal = terminalRef.current!;
    terminal.writeln("");
    terminal.writeln("\x1b[1;36m  Connecting to client terminal...\x1b[0m");

    await initTerminal();
  }, [clientId, initTerminal, sendTextMessage]);

  /**
   * 重连终端
   */
  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      void connect();
    }, 200);
  }, [disconnect, connect]);

  /**
   * 切换全屏模式
   */
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    // disconnect();
    // void connect();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (!fitAddonRef.current || !terminalRef.current) return;
      try {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) {
          sendResizeMessage({ cols: dims.cols, rows: dims.rows });
        }
      } catch {
        return;
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (termRef.current) resizeObserver.observe(termRef.current);
    window.addEventListener("resize", handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [sendResizeMessage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fitAddonRef.current) return;
      try {
        fitAddonRef.current.fit();
        const dims = fitAddonRef.current.proposeDimensions();
        if (dims) {
          sendResizeMessage({ cols: dims.cols, rows: dims.rows });
        }
      } catch {
        return;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen, sendResizeMessage]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      inputDisposablesRef.current.forEach((d) => d.dispose());
      inputDisposablesRef.current = [];
      if (terminalRef.current) {
        terminalRef.current.dispose();
        terminalRef.current = null;
      }
    };
  }, []);

  return (
    <div className={`${styles.container} ${isFullscreen ? styles.fullscreen : ""}`}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <TerminalIcon size={14} className={styles.terminalIcon} />
          <span className={styles.title}>Client Terminal</span>
          <span className={styles.subtitle} title={clientId}>
            {clientId}
          </span>
        </div>
        <div className={styles.toolbarRight}>
          <span className={`${styles.statusBadge} ${styles[status]}`} aria-live="polite">
            {status === "connected" ? <Wifi size={10} /> : <WifiOff size={10} />}
            <span>{status}</span>
          </span>
          <button
            className={styles.toolbarBtn}
            onClick={reconnect}
            title="Reconnect"
            disabled={status === "connecting" || !clientId}
            aria-label="Reconnect to terminal"
          >
            <RefreshCw size={12} />
          </button>
          <button
            className={styles.toolbarBtn}
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>
      <div className={styles.body}>
        <div ref={termRef} className={styles.terminal} role="application" aria-label="Client terminal" />
      </div>
    </div>
  );
});
