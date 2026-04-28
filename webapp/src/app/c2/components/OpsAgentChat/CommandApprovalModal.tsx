"use client";

import { useEffect } from "react";

export function CommandApprovalModal(props: {
  open: boolean;
  commands: string[];
  onApproveAll: () => void;
  onRejectAll: () => void;
}) {
  const { open, commands, onApproveAll, onRejectAll } = props;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRejectAll();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onRejectAll]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-lg dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            确认执行命令（{commands.length} 条）
          </div>
          <button
            type="button"
            onClick={onRejectAll}
            className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            关闭
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">shell_exec</div>
          <div className="mt-2 max-h-72 overflow-auto rounded-lg bg-zinc-50 p-3 dark:bg-zinc-950">
            <div className="flex flex-col gap-2">
              {commands.map((cmd, idx) => (
                <pre
                  key={`${idx}-${cmd}`}
                  className="whitespace-pre-wrap break-words rounded-md bg-white p-2 text-sm text-zinc-900 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  {cmd}
                </pre>
              ))}
            </div>
          </div>
          <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
            确认后将通过内置 Web Terminal 执行，并把输出回传给 AI 继续分析。
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={onRejectAll}
            className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            全部拒绝
          </button>
          <button
            type="button"
            onClick={onApproveAll}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            全部允许并执行
          </button>
        </div>
      </div>
    </div>
  );
}
