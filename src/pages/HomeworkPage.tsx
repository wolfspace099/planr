// HomeworkPage.tsx
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, isPast } from "date-fns";
import { Plus, Trash2, ClipboardList } from "lucide-react";
import { PageHeader, Button, Modal, Input, Textarea, EmptyState, Badge } from "../components/ui/primitives";
import clsx from "clsx";

export function HomeworkPage() {
  const homework = useQuery(api.homework.getAll);
  const subjects = useQuery(api.lessons.getSubjects);
  const toggle = useMutation(api.homework.toggle);
  const remove = useMutation(api.homework.remove);
  const create = useMutation(api.homework.create);

  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [filter, setFilter] = useState<"all" | "pending" | "done">("pending");

  const filtered = (homework ?? []).filter((h) => {
    if (filter === "pending") return !h.done;
    if (filter === "done") return h.done;
    return true;
  }).sort((a, b) => a.dueDate - b.dueDate);

  const submit = async () => {
    if (!title.trim() || !subject) return;
    await create({ title, description: description || undefined, subject, dueDate: new Date(dueDate).getTime() });
    setTitle(""); setDescription(""); setModal(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Homework"
        actions={
          <Button variant="primary" size="sm" onClick={() => setModal(true)}>
            <Plus size={13} /> Add homework
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
        <EmptyState icon={<ClipboardList size={28} />} title="No homework here" />
      ) : (
        <div className="space-y-2">
          {filtered.map((hw) => {
            const overdue = !hw.done && isPast(new Date(hw.dueDate));
            return (
              <div key={hw._id}
                className={clsx("p-4 bg-surface border rounded-lg transition-all",
                  hw.done ? "border-border/60 opacity-60" : overdue ? "border-red-200 bg-danger-light/30" : "border-border hover:border-border-strong"
                )}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggle({ id: hw._id })}
                    className={clsx("w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      hw.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
                    )}>
                    {hw.done && <span className="text-white text-[10px]">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={clsx("font-medium text-sm text-ink", hw.done && "line-through text-ink-muted")}>{hw.title}</p>
                      <Badge color="default">{hw.subject}</Badge>
                      {overdue && <Badge color="red">Overdue</Badge>}
                    </div>
                    {hw.description && (
                      <p className="text-sm text-ink-muted mt-1 whitespace-pre-wrap">{hw.description}</p>
                    )}
                    <p className="text-xs text-ink-light mt-1.5">Due {format(new Date(hw.dueDate), "EEEE d MMM")}</p>
                  </div>
                  <button onClick={() => remove({ id: hw._id })} className="p-1 rounded text-ink-light hover:text-danger transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add homework">
        <div className="space-y-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Exercise 1, 2, 3" />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Exercises 1–5 on page 42" rows={3} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40">
              <option value="">Select subject…</option>
              {subjects?.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>Add</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default HomeworkPage;
