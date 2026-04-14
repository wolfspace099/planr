import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, isPast } from "date-fns";
import { Plus, Trash2, CheckSquare } from "lucide-react";
import { PageHeader, Button, Modal, Input, EmptyState, Badge } from "../components/ui/primitives";
import clsx from "clsx";

const PRIORITY_COLORS: Record<string, string> = {
  high: "red",
  medium: "amber",
  low: "default",
};

export default function TasksPage() {
  const tasks = useQuery(api.tasks.getAll);
  const subjects = useQuery(api.lessons.getSubjects);
  const toggle = useMutation(api.tasks.toggle);
  const remove = useMutation(api.tasks.remove);
  const create = useMutation(api.tasks.create);

  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [subject, setSubject] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [filter, setFilter] = useState<"pending" | "done" | "all">("pending");

  const filtered = (tasks ?? [])
    .filter((t) => filter === "all" ? true : filter === "pending" ? !t.done : t.done)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const pa = a.priority === "high" ? 0 : a.priority === "medium" ? 1 : 2;
      const pb = b.priority === "high" ? 0 : b.priority === "medium" ? 1 : 2;
      return pa - pb;
    });

  const submit = async () => {
    if (!title.trim()) return;
    await create({ title, dueDate: dueDate ? new Date(dueDate).getTime() : undefined, subject: subject || undefined, priority });
    setTitle(""); setDueDate(""); setSubject(""); setPriority("medium"); setModal(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Tasks"
        actions={
          <Button variant="primary" size="sm" onClick={() => setModal(true)}>
            <Plus size={13} /> Add task
          </Button>
        }
      />

      <div className="flex gap-1.5 mb-5">
        {(["pending", "done", "all"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={clsx("px-3 py-1.5 text-xs rounded-full border font-medium transition-colors capitalize",
              filter === f ? "bg-ink text-white border-ink" : "border-border text-ink-muted hover:border-border-strong"
            )}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CheckSquare size={28} />} title="No tasks here" action={<Button size="sm" onClick={() => setModal(true)}>Add task</Button>} />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((t) => {
            const overdue = !t.done && t.dueDate && isPast(new Date(t.dueDate));
            return (
              <div key={t._id}
                className={clsx("flex items-center gap-3 p-3 bg-surface border rounded-lg transition-all",
                  t.done ? "border-border/60 opacity-60" : overdue ? "border-red-200" : "border-border hover:border-border-strong"
                )}>
                <button onClick={() => toggle({ id: t._id })}
                  className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                    t.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
                  )}>
                  {t.done && <span className="text-white text-[10px]">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={clsx("text-sm text-ink truncate", t.done && "line-through text-ink-muted")}>{t.title}</p>
                  {t.subject && <p className="text-xs text-ink-light">{t.subject}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge color={PRIORITY_COLORS[t.priority] as any}>{t.priority}</Badge>
                  {t.dueDate && <span className="text-xs text-ink-light">{format(new Date(t.dueDate), "d MMM")}</span>}
                </div>
                <button onClick={() => remove({ id: t._id })} className="p-1 rounded text-ink-light hover:text-danger transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add task">
        <div className="space-y-3">
          <Input label="Task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Subject (optional)</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40">
              <option value="">None</option>
              {subjects?.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label="Due date (optional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Priority</label>
            <div className="flex gap-2">
              {(["low", "medium", "high"] as const).map((p) => (
                <button key={p} onClick={() => setPriority(p)}
                  className={clsx("flex-1 py-1.5 rounded border text-xs font-medium capitalize transition-colors",
                    priority === p ? "bg-accent text-white border-accent" : "border-border text-ink-muted hover:border-border-strong"
                  )}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
