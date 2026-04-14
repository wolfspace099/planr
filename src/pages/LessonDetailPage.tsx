import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { format } from "date-fns";
import { useState } from "react";
import { ArrowLeft, MapPin, Clock, BookOpen, ClipboardList, CheckSquare, Plus, Trash2, Save } from "lucide-react";
import NoteEditor from "../components/editor/NoteEditor";
import { Button, Modal, Input, Textarea, Badge, EmptyState } from "../components/ui/primitives";
import clsx from "clsx";

type Tab = "notes" | "homework" | "tasks";

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const lessonId = id as Id<"lessons">;
  const [tab, setTab] = useState<Tab>("notes");
  const [saved, setSaved] = useState(false);
  const [hwModal, setHwModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);

  const lesson = useQuery(api.lessons.getById, { id: lessonId });
  const note = useQuery(api.notes.getByLesson, { lessonId });
  const homework = useQuery(api.homework.getByLesson, { lessonId });
  const tasks = useQuery(api.tasks.getByLesson, { lessonId });

  const saveNote = useMutation(api.notes.save);
  const toggleHw = useMutation(api.homework.toggle);
  const removeHw = useMutation(api.homework.remove);
  const toggleTask = useMutation(api.tasks.toggle);
  const removeTask = useMutation(api.tasks.remove);
  const createHw = useMutation(api.homework.create);
  const createTask = useMutation(api.tasks.create);

  const handleSaveNote = async (html: string) => {
    await saveNote({ lessonId, content: html });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!lesson) {
    return (
      <div className="flex items-center justify-center h-64 text-ink-muted text-sm">
        Loading lesson…
      </div>
    );
  }

  const dur = Math.round((lesson.endTime - lesson.startTime) / 60000);

  return (
    <div className="animate-fade-in">
      {/* Back + header */}
      <div className="mb-6">
        <Link
          to="/notebook"
          className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink mb-4 transition-colors"
        >
          <ArrowLeft size={12} /> Back to notebook
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-ink tracking-tight">{lesson.subject}</h1>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-ink-muted">
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {format(new Date(lesson.startTime), "EEEE d MMM · HH:mm")} – {format(new Date(lesson.endTime), "HH:mm")}
              </span>
              <span className="text-ink-light">·</span>
              <span>{dur}min</span>
              {lesson.location && (
                <>
                  <span className="text-ink-light">·</span>
                  <span className="flex items-center gap-1">
                    <MapPin size={13} /> {lesson.location}
                  </span>
                </>
              )}
            </div>
          </div>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-success animate-fade-in">
              <Save size={12} /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-6">
        {(["notes", "homework", "tasks"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {t === "notes" && <BookOpen size={13} />}
            {t === "homework" && <ClipboardList size={13} />}
            {t === "tasks" && <CheckSquare size={13} />}
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === "homework" && (homework?.length ?? 0) > 0 && (
              <Badge color="blue">{homework!.length}</Badge>
            )}
            {t === "tasks" && (tasks?.length ?? 0) > 0 && (
              <Badge color="default">{tasks!.length}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Notes tab */}
      {tab === "notes" && (
        <NoteEditor
          content={note?.content ?? ""}
          onChange={handleSaveNote}
          placeholder={`Start writing notes for ${lesson.subject}…`}
        />
      )}

      {/* Homework tab */}
      {tab === "homework" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button variant="primary" size="sm" onClick={() => setHwModal(true)}>
              <Plus size={13} /> Add homework
            </Button>
          </div>
          {(homework?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<ClipboardList size={28} />}
              title="No homework for this lesson"
              action={
                <Button size="sm" onClick={() => setHwModal(true)}>
                  Add homework
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {homework?.map((hw) => (
                <div
                  key={hw._id}
                  className={clsx(
                    "p-4 bg-surface border rounded-lg transition-all",
                    hw.done ? "border-border/60 opacity-70" : "border-border hover:border-border-strong"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleHw({ id: hw._id })}
                      className={clsx(
                        "w-4 h-4 mt-0.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        hw.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
                      )}
                    >
                      {hw.done && <span className="text-white text-[10px]">✓</span>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={clsx("font-medium text-sm text-ink", hw.done && "line-through text-ink-muted")}>
                        {hw.title}
                      </p>
                      {hw.description && (
                        <p className="text-sm text-ink-muted mt-1 whitespace-pre-wrap">{hw.description}</p>
                      )}
                      <p className="text-xs text-ink-light mt-1.5">
                        Due {format(new Date(hw.dueDate), "EEEE d MMM")}
                      </p>
                    </div>
                    <button
                      onClick={() => removeHw({ id: hw._id })}
                      className="p-1 rounded text-ink-light hover:text-danger transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tasks tab */}
      {tab === "tasks" && (
        <div>
          <div className="flex justify-end mb-4">
            <Button variant="primary" size="sm" onClick={() => setTaskModal(true)}>
              <Plus size={13} /> Add task
            </Button>
          </div>
          {(tasks?.length ?? 0) === 0 ? (
            <EmptyState
              icon={<CheckSquare size={28} />}
              title="No tasks linked to this lesson"
              action={
                <Button size="sm" onClick={() => setTaskModal(true)}>
                  Add task
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {tasks?.map((t) => (
                <div key={t._id} className={clsx(
                  "flex items-center gap-3 p-3 bg-surface border rounded-lg transition-all",
                  t.done ? "border-border/60 opacity-70" : "border-border hover:border-border-strong"
                )}>
                  <button
                    onClick={() => toggleTask({ id: t._id })}
                    className={clsx(
                      "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      t.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
                    )}
                  >
                    {t.done && <span className="text-white text-[10px]">✓</span>}
                  </button>
                  <p className={clsx("flex-1 text-sm text-ink", t.done && "line-through text-ink-muted")}>
                    {t.title}
                  </p>
                  {t.dueDate && (
                    <span className="text-xs text-ink-light">{format(new Date(t.dueDate), "d MMM")}</span>
                  )}
                  <button onClick={() => removeTask({ id: t._id })} className="p-1 rounded text-ink-light hover:text-danger transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddHomeworkModal
        open={hwModal}
        onClose={() => setHwModal(false)}
        onAdd={(data) => createHw({ lessonId, subject: lesson.subject, ...data })}
      />
      <AddTaskModal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        onAdd={(data) => createTask({ lessonId, subject: lesson.subject, ...data })}
      />
    </div>
  );
}

function AddHomeworkModal({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title, description: description || undefined, dueDate: new Date(dueDate).getTime() });
    setTitle(""); setDescription(""); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add homework">
      <div className="space-y-3">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Exercise 1, 2, 3" />
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Exercise 1, 2 and 3 on page 42" rows={3} />
        <Input label="Due date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}

function AddTaskModal({
  open, onClose, onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title, dueDate: dueDate ? new Date(dueDate).getTime() : undefined, priority });
    setTitle(""); setDueDate(""); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add task">
      <div className="space-y-3">
        <Input label="Task" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Study chapter 4" />
        <Input label="Due date (optional)" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-ink-muted">Priority</label>
          <div className="flex gap-2">
            {["low", "medium", "high"].map((p) => (
              <button key={p} onClick={() => setPriority(p)}
                className={clsx("flex-1 py-1.5 rounded border text-xs font-medium capitalize transition-colors",
                  priority === p ? "bg-accent text-white border-accent" : "border-border text-ink-muted hover:border-border-strong"
                )}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}
