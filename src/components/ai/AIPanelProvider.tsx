import { createContext, useCallback, useContext, useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

export type AIRole = "user" | "assistant" | "system";

export type AIToolCall = {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  error?: string;
};

export type AIMessage = {
  id: string;
  role: AIRole;
  content: string;
  actions?: AIToolCall[];
  pending?: boolean;
};

interface AIPanelContextValue {
  open: boolean;
  setOpen: (next: boolean) => void;
  toggle: () => void;
  messages: AIMessage[];
  send: (text: string) => Promise<void>;
  clear: () => void;
  pending: boolean;
}

const AIPanelContext = createContext<AIPanelContextValue | null>(null);

function newId() {
  return Math.random().toString(36).slice(2, 11);
}

export function AIPanelProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [pending, setPending] = useState(false);
  const ask = useAction(api.ai.ask);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || pending) return;
      const userMsg: AIMessage = { id: newId(), role: "user", content: text };
      const assistantPending: AIMessage = { id: newId(), role: "assistant", content: "", pending: true };
      setMessages((prev) => [...prev, userMsg, assistantPending]);
      setPending(true);

      const history = [...messages, userMsg]
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      try {
        const result = await ask({
          messages: history,
          todayIso: new Date().toISOString(),
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantPending.id
              ? {
                  ...m,
                  content: result.reply,
                  actions: result.actions.map((a: any) => ({
                    tool: a.tool,
                    args: a.args ?? {},
                    ok: a.ok,
                    error: a.error,
                  })),
                  pending: false,
                }
              : m,
          ),
        );
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantPending.id
              ? { ...m, content: `Fout: ${err?.message ?? String(err)}`, pending: false }
              : m,
          ),
        );
      } finally {
        setPending(false);
      }
    },
    [ask, messages, pending],
  );

  const clear = useCallback(() => setMessages([]), []);
  const toggle = useCallback(() => setOpen((v) => !v), []);

  return (
    <AIPanelContext.Provider value={{ open, setOpen, toggle, messages, send, clear, pending }}>
      {children}
    </AIPanelContext.Provider>
  );
}

export function useAIPanel() {
  const ctx = useContext(AIPanelContext);
  if (!ctx) throw new Error("useAIPanel must be used within AIPanelProvider");
  return ctx;
}
