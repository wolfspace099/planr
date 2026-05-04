import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, Trash2, X, Check, CircleAlert } from "lucide-react";
import clsx from "clsx";
import { useAIPanel } from "./AIPanelProvider";

export function AIPanel() {
  const { open, setOpen, messages, send, clear, pending } = useAIPanel();
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  if (!open) return null;

  const submit = async () => {
    const text = draft.trim();
    if (!text || pending) return;
    setDraft("");
    await send(text);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="fixed top-0 right-0 bottom-0 w-[380px] z-40 flex flex-col bg-white dark:bg-[#252526] border-l border-[#cccccc] dark:border-[#454545] shadow-[-8px_0_24px_rgba(0,0,0,0.25)]"
      role="dialog"
      aria-label="AI assistent"
    >
      <div className="flex-shrink-0 flex items-center justify-between h-[28px] px-2 bg-[#f3f3f3] dark:bg-[#2d2d30] border-b border-[#e7e7e7] dark:border-[#1e1e1e]">
        <div className="flex items-center gap-1.5 px-1">
          <Sparkles size={12} strokeWidth={2.25} className="text-[#7c3aed]" />
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]">
            AI assistent
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clear}
            title="Wis chat"
            aria-label="Wis chat"
            disabled={messages.length === 0}
            className="h-5 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            title="Sluiten"
            aria-label="Sluiten"
            className="h-5 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] [scrollbar-width:thin] px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-[11.5px] text-[#6c6c6c] dark:text-[#969696] leading-relaxed">
            <p className="font-semibold mb-1.5 text-[#333333] dark:text-[#cccccc]">Wat kan ik doen?</p>
            <ul className="space-y-1 list-none pl-0">
              <li>• Toetsen, huiswerk, taken en afspraken aanmaken</li>
              <li>• Studie-/leersessies plannen rond je rooster</li>
              <li>• Vrije tijd vinden in een specifieke periode</li>
              <li>• Overzicht van wat er deze week op je staat</li>
            </ul>
            <p className="mt-3 text-[10.5px] italic opacity-70">
              Bv: "Plan 4 leersessies van 45 min voor mijn wiskundetoets volgende week dinsdag"
            </p>
          </div>
        )}

        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
      </div>

      <div className="flex-shrink-0 border-t border-[#e7e7e7] dark:border-[#1e1e1e] bg-white dark:bg-[#252526] p-2">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder={pending ? "Bezig…" : "Stel een vraag of geef een opdracht…"}
          disabled={pending}
          rows={2}
          className="w-full resize-none bg-white dark:bg-[#1e1e1e] border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] text-[12.5px] px-2 py-1.5 focus:outline-none focus:border-[#7c3aed] disabled:opacity-50 font-mono"
        />
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[#6c6c6c] dark:text-[#969696] font-mono">
            {pending ? "▸ aan het denken…" : "Enter = verzenden · Shift+Enter = nieuwe regel"}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || pending}
            className="h-[22px] px-2 text-[11px] font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 focus:outline-none"
          >
            <Send size={11} strokeWidth={2.25} />
            Verstuur
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center h-[20px] bg-[#7c3aed] text-white text-[10px] font-medium select-none px-2 gap-2">
        <span className="font-mono">gemini-2.0-flash</span>
        <span className="opacity-60">|</span>
        <span className="font-mono">{messages.filter((m) => m.role === "user").length} vragen</span>
        <span className="opacity-60">|</span>
        <span className="font-mono">
          {messages.reduce((acc, m) => acc + (m.actions?.length ?? 0), 0)} tool-calls
        </span>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: import("./AIPanelProvider").AIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={clsx("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div className="text-[9.5px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696] mb-0.5 px-1 font-mono">
        {isUser ? "Jij" : "AI"}
      </div>
      <div
        className={clsx(
          "max-w-[100%] px-2.5 py-1.5 text-[12.5px] leading-relaxed whitespace-pre-wrap break-words border",
          isUser
            ? "bg-[#7c3aed] text-white border-[#7c3aed]"
            : "bg-[#f3f3f3] dark:bg-[#2d2d30] text-[#333333] dark:text-[#cccccc] border-[#e7e7e7] dark:border-[#1e1e1e]",
        )}
      >
        {message.pending && !message.content ? (
          <span className="inline-flex gap-0.5 opacity-60">
            <span className="animate-pulse">▸</span>
            <span className="animate-pulse" style={{ animationDelay: "0.15s" }}>▸</span>
            <span className="animate-pulse" style={{ animationDelay: "0.3s" }}>▸</span>
          </span>
        ) : (
          message.content
        )}
      </div>
      {message.actions && message.actions.length > 0 && (
        <div className="mt-1 w-full space-y-0.5">
          {message.actions.map((a, i) => (
            <ToolCallRow key={i} action={a} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolCallRow({ action }: { action: import("./AIPanelProvider").AIToolCall }) {
  return (
    <div
      className={clsx(
        "flex items-start gap-1.5 px-2 py-1 text-[10.5px] font-mono border-l-2",
        action.ok
          ? "bg-[#f3f3f3] dark:bg-[#252526] border-l-[#7c3aed] text-[#333333] dark:text-[#cccccc]"
          : "bg-[#fdf2f2] dark:bg-[#3a1d1d] border-l-[#f48771] text-[#a31515] dark:text-[#f48771]",
      )}
    >
      {action.ok ? (
        <Check size={10} strokeWidth={2.5} className="mt-0.5 flex-shrink-0 text-[#7c3aed]" />
      ) : (
        <CircleAlert size={10} strokeWidth={2.5} className="mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="truncate">
          <span className="font-semibold">{action.tool}</span>
          <span className="opacity-50">({summarizeArgs(action.args)})</span>
        </div>
        {!action.ok && action.error && (
          <div className="opacity-80 truncate">{action.error}</div>
        )}
      </div>
    </div>
  );
}

function summarizeArgs(args: Record<string, unknown>) {
  const entries = Object.entries(args).slice(0, 3);
  return entries
    .map(([k, v]) => {
      const s = typeof v === "string" ? v : JSON.stringify(v);
      return `${k}: ${s.length > 24 ? s.slice(0, 22) + "…" : s}`;
    })
    .join(", ");
}
