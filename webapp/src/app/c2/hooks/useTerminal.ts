"use client";

import { homedir } from "os";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type TerminalType = "stream" | "pipe";
export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error";

export type CommandMessage<T> = {
    type: string;
    data?: T;
};

export type TerminalSizeMessage = {
    cols: number;
    rows: number;
};

export type TerminalCommandMessage = {
    session_id: string;
    command: string;
    result: string;
};

export type TerminalAuthMessage = {
    host_ip: string;
    host_port: number;
    auth_type?: "key" | "password";
    username?: string;
    privilege_key?: string;
    password?: string;
    terminal_type?: string;
};

export const TERMINAL_DEFAULT_AUTH_DATA: string = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABFwAAAAdzc2gtcn
NhAAAAAwEAAQAAAQEAuz2tEeuDAdkJNFUahak+HOIiVR1j64+Cuky0OzvC2yhjTcqj3ULt
TGyWVWHMr76qofwUuFcFLdvwr/1e3n3/VXMFNExV93YX7ns41x/ViEWnr+LSYJ/PBYKcRk
COXFc0MlhK8zLXji9zjwIiXvAvsWEq6MJU2XHxOo5MiLt+0TOf6FsIPxpH9O5eJGos/GDq
DNNA77r5/xVQuUZNmqp+H2S8heyhUgpEwgmPtrViWQ5KNxFx8vgMQQUuE6ua+/oenABATl
Y4JxYd31GKRokibsDVrFDmpxipjKa1/WXIFDaSWXKRgwRpVmAyxFptk4QGU+QgUi92vtkp
DGVVUotZJwAAA8CBrBNOgawTTgAAAAdzc2gtcnNhAAABAQC7Pa0R64MB2Qk0VRqFqT4c4i
JVHWPrj4K6TLQ7O8LbKGNNyqPdQu1MbJZVYcyvvqqh/BS4VwUt2/Cv/V7eff9VcwU0TFX3
dhfuezjXH9WIRaev4tJgn88FgpxGQI5cVzQyWErzMteOL3OPAiJe8C+xYSrowlTZcfE6jk
yIu37RM5/oWwg/Gkf07l4kaiz8YOoM00Dvuvn/FVC5Rk2aqn4fZLyF7KFSCkTCCY+2tWJZ
Dko3EXHy+AxBBS4Tq5r7+h6cAEBOVjgnFh3fUYpGiSJuwNWsUOanGKmMprX9ZcgUNpJZcp
GDBGlWYDLEWm2ThAZT5CBSL3a+2SkMZVVSi1knAAAAAwEAAQAAAQBl+RUEqWrT2su0gJTN
LnrxaAairDr601Gy/Is7pzRb/wb2GuJbYlOyR4EoRvcez4xGY+805c+gRiQy9J5yNdSVSO
sQrHI1L0+hReKS5nd4m9bTZ4iDrwUkTxmk+QuPJr76nDNVd98FRLp+q/7kDZMr22tvEEb9
lZx284CjBtnuPGzba0EFEtwwc5nksZAqgMGChcC0Fjl8eMIBxlq0ychktvZfgDCN8wz0Tt
PWYwf0NZMfi36aC7zPydem0D0gt6Scb/+EAIsa6hvz385uhA0kikTzrPcsTg4HRdV9euvC
UYS+uZq1AFWNFLcTiYXGW8Sx5UhNdHvpbrG+AxuNf3zhAAAAgDp09f+fG4B9UeQpe9Kn5J
/iP/zVxn6bacdC71hObjr+CtCI98UCGk4iOqLWSDQpgMNLfukB8q5+++ZXzwfH14yBQCwQ
ojqSEZmfONo3rjoDHFWsUU2YaPUnfWtSl1DXWaNdr/1DYZ3pvAzMrPYGRIilOzrmBkVvT/
Oqi4Wx3W5GAAAAgQDez/3KQc84KaCUZ+xs7pGyfYblNqQNQHkmU+jiu5RzZ6+F1+BmDqj5
77xWSeDdVwnLfSXyEg3QsI0VIbX4M5GkFtinb/wGYTQFB5WpbM89lxC9BXtNn1cFAV9DcX
w/CvwODt0zZxqQ4QK3e+ATlWsGB8Jx3Ag/GTQfluuN/9iK5QAAAIEA1yFQjt0pUDU6fdlx
dvr0HLYQSYU51ECz39dnmVOXoCyRA3NjIgAw7dA80AnUVKRkNZZwv6yCq5oPq5MVMfegTL
OoGXxC2OVC4E8zTD+zcO5ba/QGb63VXVrZ/XBz+99yaVIyuLFsZR1qE0fI+yxdCB4n+j2Z
iW2fkCcla0gPtxsAAAAIdGVzdF9rZXkBAgM=
-----END OPENSSH PRIVATE KEY-----`

interface UseTerminalConfig {
    clientId: string
    onCommand?: (message: TerminalCommandMessage) => void
    onMessage?: (message: string) => void
    onError?: () => void
    onConnect?: () => void
    onDisconnect?: () => void
}

/**
 * getWsUrl: 根据 clientId 拼接 terminal websocket 地址。
 */
function getWsUrl(clientId: string) {
    const base = process.env.NEXT_PUBLIC_BLINK_WS_URL?.replace(/\/$/, "");
    if (base) return `${base}/api/terminal/${clientId}`;
    return `ws://localhost:8000/api/terminal/${clientId}`;
}


/**
 * useTerminal: 纯 websocket 的 terminal 客户端（不渲染/不显示 UI），提供 connect -> auth -> sendText，以及 sendCommand 等待输出。
 */
export function useTerminal({
    clientId,
    onCommand,
    onMessage,
    onError,
    onConnect,
    onDisconnect,
}: UseTerminalConfig) {
    const wsRef = useRef<WebSocket | null>(null);
    const connectPromiseRef = useRef<Promise<void> | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");

    const wsUrl = useMemo(() => getWsUrl(clientId), [clientId]);

    /**
     * sendMessage: 向 websocket 发送标准结构消息（type/data）。
     */
    const sendMessage = useCallback(<T,>(type: string, data: T) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
        const message: CommandMessage<T> = { type, data };
        wsRef.current.send(JSON.stringify(message));
    }, []);

    /**
     * sendTextMessage: 向终端通道发送用户输入/命令文本。
     */
    const sendTextMessage = useCallback((text: string) => {
        sendMessage("text", text);
    }, [sendMessage]);

    /**
     * sendTextMessage: 向终端通道发送用户输入/命令文本。
     */
    const sendCommandMessage = useCallback((command: TerminalCommandMessage) => {
        if (!command) return;
        sendMessage("command", command);
    }, [sendMessage]);

    /**
     * disconnect: 主动断开 websocket；会拒绝当前等待中的 sendCommand。
     */
    const disconnect = useCallback(() => {
        const ws = wsRef.current;
        wsRef.current = null;
        connectPromiseRef.current = null;
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            ws.close();
        }
        setStatus("disconnected");
    }, []);

    /**
     * initTerminal: 确保 websocket 已连接；若未连接则发起连接并等待 open。
     */
    const initTerminal = useCallback(async () => {
        const existing = wsRef.current;
        if (existing && existing.readyState === WebSocket.OPEN) return;
        if (connectPromiseRef.current) return await connectPromiseRef.current;

        setStatus("connecting");

        const p = new Promise<void>((resolve, reject) => {
            const ws = new WebSocket(wsUrl);
            ws.binaryType = "arraybuffer";
            wsRef.current = ws;

            ws.onopen = () => {
                setStatus("connected");
                onConnect?.();
                resolve();
            };

            ws.onmessage = (evt) => {
                try {
                    const message = JSON.parse(evt.data) as CommandMessage<unknown>;
                    if (!message || typeof message !== "object") return;

                    if (message.type === "command") {
                        onCommand?.(message.data as TerminalCommandMessage);
                    } else if (message.type === "text") {
                        onMessage?.(message.data as string || "");
                    }
                } catch {
                    return;
                }
            };

            ws.onerror = () => {
                setStatus("error");
                connectPromiseRef.current = null;
                try {
                    ws.close();
                } catch { }
                reject(new Error("websocket error"));
                onError?.();
            };

            ws.onclose = () => {
                wsRef.current = null;
                connectPromiseRef.current = null;
                setStatus("disconnected");
                onDisconnect?.();

            };
        });

        connectPromiseRef.current = p;
        return await p;
    }, [wsUrl, onConnect, onCommand, onError, onDisconnect]);

    // useEffect(() => {
    //     void connect();
    //     return () => disconnect();
    // }, [connect, disconnect]);

    const sendResizeMessage = useCallback((dims: TerminalSizeMessage) => {
        sendMessage("resize", dims);
    }, [sendMessage]);

    return {
        wsUrl,
        status,
        setStatus,
        initTerminal,
        disconnect,
        sendMessage,
        sendTextMessage,
        sendCommandMessage,
        sendResizeMessage,
    };
}

export default useTerminal