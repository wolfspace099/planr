import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { X, Calendar, ClipboardList, FlaskConical, CheckSquare, MapPin } from "lucide-react";
import clsx from "clsx";

type Mode = "appointment" | "homework" | "test" | "task";

export type QuickAddDraft = {
  mode: Mode;
  title?: string;
  description?: string;
  // homework + test
  lessonId?: string;
  // test fallback
  bindMode?: "lesson" | "date";
  subject?: string;
  date?: string;
};

export function QuickAddPopup({
  open,
  onClose,
  initialMode = "appointment",
  initialDate,
  initialDraft,
  onRequestPickLesson,
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
  initialDate?: Date | null;
  initialDraft?: QuickAddDraft | null;
  onRequestPickLesson?: (draft: QuickAddDraft) => void;
}) {
  const [mode, setMode] = useState<Mode>(initialDraft?.mode ?? initialMode);

  useEffect(() => {
    if (open) setMode(initialDraft?.mode ?? initialMode);
  }, [open, initialMode, initialDraft]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#252526] border border-[#cccccc] dark:border-[#454545] w-[460px] shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between h-[28px] px-3 bg-[#f3f3f3] dark:bg-[#2d2d30] border-b border-[#e7e7e7] dark:border-[#1e1e1e]">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]">Toevoegen</span>
          <button onClick={onClose} className="h-5 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none">
            <X size={13} strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center h-[28px] bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] px-1">
          {(
            [
              { key: "appointment", label: "Afspraak", icon: <Calendar size={11} strokeWidth={2} /> },
              { key: "task", label: "Taak", icon: <CheckSquare size={11} strokeWidth={2} /> },
              { key: "homework", label: "Huiswerk", icon: <ClipboardList size={11} strokeWidth={2} /> },
              { key: "test", label: "Toets", icon: <FlaskConical size={11} strokeWidth={2} /> },
            ] as { key: Mode; label: string; icon: React.ReactNode }[]
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={clsx(
                "h-[28px] px-3 text-[11px] uppercase tracking-wide flex items-center gap-1.5 transition-colors focus:outline-none",
                mode === t.key
                  ? "bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#ffffff] border-t-2 border-t-[#7c3aed] -mt-px"
                  : "text-[#6c6c6c] dark:text-[#969696] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e]"
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-3">
          {mode === "appointment" && <AppointmentForm initialDate={initialDate} onDone={onClose} />}
          {mode === "task" && <TaskForm initialDate={initialDate} onDone={onClose} />}
          {mode === "homework" && (
            <HomeworkForm
              initialDraft={initialDraft?.mode === "homework" ? initialDraft : undefined}
              onRequestPickLesson={(d) => onRequestPickLesson?.({ ...d, mode: "homework" })}
              onDone={onClose}
            />
          )}
          {mode === "test" && (
            <TestForm
              initialDate={initialDate}
              initialDraft={initialDraft?.mode === "test" ? initialDraft : undefined}
              onRequestPickLesson={(d) => onRequestPickLesson?.({ ...d, mode: "test" })}
              onDone={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-mono uppercase tracking-wider text-[#969696] mb-1">{children}</div>;
}

const inputCls =
  "w-full px-2 py-1.5 bg-white dark:bg-[#1e1e1e] border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] text-[13px] focus:outline-none focus:border-[#7c3aed]";

function PrimaryButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-[#7c3aed] text-white text-[12px] font-medium py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#6d28d9] transition-colors focus:outline-none"
    >
      {children}
    </button>
  );
}

function toLocalDateTime(d: Date | null | undefined) {
  const date = d ?? new Date();
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}
function toLocalDate(d: Date | null | undefined) {
  const date = d ?? new Date();
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

function AppointmentForm({ initialDate, onDone }: { initialDate?: Date | null; onDone: () => void }) {
  const calendars = useQuery(api.calendars.getAll) ?? [];
  const create = useMutation(api.misc.createAppointment);

  const defaultStart = (() => {
    const d = initialDate ?? new Date();
    d.setMinutes(0, 0, 0);
    return d;
  })();
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60_000);

  const [title, setTitle] = useState("");
  const [start, setStart] = useState(toLocalDateTime(defaultStart));
  const [end, setEnd] = useState(toLocalDateTime(defaultEnd));
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [calendarId, setCalendarId] = useState<string>("");

  const submit = async () => {
    if (!title.trim()) return;
    await create({
      title,
      startTime: new Date(start).getTime(),
      endTime: new Date(end).getTime(),
      location: location || undefined,
      description: description || undefined,
      calendarId: calendarId ? (calendarId as any) : undefined,
      isRecurring: false,
    });
    onDone();
  };

  return (
    <div className="space-y-2.5">
      <input className={inputCls + " text-[14px]"} placeholder="Titel" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Start</FieldLabel>
          <input type="datetime-local" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Eind</FieldLabel>
          <input type="datetime-local" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>
      <div>
        <FieldLabel>Locatie</FieldLabel>
        <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optioneel" />
      </div>
      <div>
        <FieldLabel>Agenda</FieldLabel>
        <select className={inputCls} value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
          <option value="">Standaard</option>
          {calendars.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Beschrijving</FieldLabel>
        <textarea className={inputCls + " resize-none font-mono"} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <PrimaryButton onClick={submit} disabled={!title.trim()}>Opslaan</PrimaryButton>
    </div>
  );
}

function TaskForm({ initialDate, onDone }: { initialDate?: Date | null; onDone: () => void }) {
  const create = useMutation(api.tasks.create);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(initialDate ? toLocalDateTime(initialDate) : "");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [subject, setSubject] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    await create({
      title,
      dueDate: due ? new Date(due).getTime() : undefined,
      priority,
      subject: subject || undefined,
    });
    onDone();
  };

  return (
    <div className="space-y-2.5">
      <input className={inputCls + " text-[14px]"} placeholder="Titel" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Wanneer</FieldLabel>
          <input type="datetime-local" className={inputCls} value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <div>
          <FieldLabel>Vak</FieldLabel>
          <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Optioneel" />
        </div>
      </div>
      <div>
        <FieldLabel>Prioriteit</FieldLabel>
        <div className="flex gap-1">
          {(["low", "medium", "high"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              className={clsx(
                "flex-1 h-7 text-[11.5px] uppercase tracking-wide transition-colors focus:outline-none",
                priority === p
                  ? "bg-[#7c3aed] text-white"
                  : "border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]"
              )}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <PrimaryButton onClick={submit} disabled={!title.trim()}>Opslaan</PrimaryButton>
    </div>
  );
}

function HomeworkForm({
  initialDraft,
  onRequestPickLesson,
  onDone,
}: {
  initialDraft?: QuickAddDraft;
  onRequestPickLesson?: (draft: QuickAddDraft) => void;
  onDone: () => void;
}) {
  const lessons = useQuery(api.lessons.getAll) ?? [];
  const create = useMutation(api.homework.create);

  const [lessonId, setLessonId] = useState<string>(initialDraft?.lessonId ?? "");
  const [title, setTitle] = useState(initialDraft?.title ?? "");
  const [description, setDescription] = useState(initialDraft?.description ?? "");

  const lesson = lessons.find((l) => String(l._id) === lessonId);

  const submit = async () => {
    if (!title.trim() || !lesson) return;
    await create({
      lessonId: lesson._id,
      title,
      description: description || undefined,
      subject: lesson.subject,
      dueDate: lesson.startTime,
    });
    onDone();
  };

  const requestPick = () => {
    onRequestPickLesson?.({
      mode: "homework",
      title,
      description,
      lessonId: lessonId || undefined,
    });
  };

  return (
    <div className="space-y-2.5">
      <input className={inputCls + " text-[14px]"} placeholder="Titel" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} />
      <div>
        <FieldLabel>Les (verplicht)</FieldLabel>
        <LessonBindRow lesson={lesson} onPick={requestPick} />
      </div>
      <div>
        <FieldLabel>Beschrijving</FieldLabel>
        <textarea className={inputCls + " resize-none font-mono"} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <PrimaryButton onClick={submit} disabled={!title.trim() || !lesson}>Opslaan</PrimaryButton>
    </div>
  );
}

function TestForm({
  initialDate,
  initialDraft,
  onRequestPickLesson,
  onDone,
}: {
  initialDate?: Date | null;
  initialDraft?: QuickAddDraft;
  onRequestPickLesson?: (draft: QuickAddDraft) => void;
  onDone: () => void;
}) {
  const lessons = useQuery(api.lessons.getAll) ?? [];
  const create = useMutation(api.misc.createTest);

  const [bindMode, setBindMode] = useState<"lesson" | "date">(initialDraft?.bindMode ?? "lesson");
  const [lessonId, setLessonId] = useState<string>(initialDraft?.lessonId ?? "");
  const [date, setDate] = useState(initialDraft?.date ?? toLocalDate(initialDate));
  const [subject, setSubject] = useState(initialDraft?.subject ?? "");
  const [topic, setTopic] = useState(initialDraft?.title ?? "");
  const [description, setDescription] = useState(initialDraft?.description ?? "");

  const lesson = lessons.find((l) => String(l._id) === lessonId);

  const canSubmit =
    topic.trim() &&
    ((bindMode === "lesson" && lesson) || (bindMode === "date" && subject.trim() && date));

  const submit = async () => {
    if (!canSubmit) return;
    if (bindMode === "lesson" && lesson) {
      await create({
        subject: lesson.subject,
        topic,
        date: lesson.startTime,
        description: description || undefined,
        lessonId: lesson._id,
      });
    } else {
      await create({
        subject,
        topic,
        date: new Date(date).getTime(),
        description: description || undefined,
      });
    }
    onDone();
  };

  const requestPick = () => {
    onRequestPickLesson?.({
      mode: "test",
      title: topic,
      description,
      lessonId: lessonId || undefined,
      bindMode: "lesson",
      subject,
      date,
    });
  };

  return (
    <div className="space-y-2.5">
      <input className={inputCls + " text-[14px]"} placeholder="Onderwerp" autoFocus value={topic} onChange={(e) => setTopic(e.target.value)} />

      <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide">
        <button
          onClick={() => setBindMode("lesson")}
          className={clsx(
            "h-6 px-2 transition-colors focus:outline-none",
            bindMode === "lesson"
              ? "bg-[#7c3aed] text-white"
              : "border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]"
          )}
        >
          Aan les
        </button>
        <button
          onClick={() => setBindMode("date")}
          className={clsx(
            "h-6 px-2 transition-colors focus:outline-none",
            bindMode === "date"
              ? "bg-[#7c3aed] text-white"
              : "border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]"
          )}
        >
          Op datum
        </button>
      </div>

      {bindMode === "lesson" ? (
        <div>
          <FieldLabel>Les (verplicht)</FieldLabel>
          <LessonBindRow lesson={lesson} onPick={requestPick} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <FieldLabel>Vak</FieldLabel>
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="bv. Wiskunde" />
          </div>
          <div>
            <FieldLabel>Datum</FieldLabel>
            <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      )}

      <div>
        <FieldLabel>Beschrijving</FieldLabel>
        <textarea className={inputCls + " resize-none font-mono"} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <PrimaryButton onClick={submit} disabled={!canSubmit}>Opslaan</PrimaryButton>
    </div>
  );
}

function LessonBindRow({ lesson, onPick }: { lesson: any; onPick: () => void }) {
  if (lesson) {
    return (
      <div className="flex items-stretch border border-[#cccccc] dark:border-[#3c3c3c] bg-white dark:bg-[#1e1e1e]">
        <div className="flex-1 px-2 py-1.5 min-w-0">
          <div className="text-[12.5px] font-semibold text-[#333333] dark:text-[#cccccc] truncate">{lesson.subject}</div>
          <div className="text-[10.5px] text-[#6c6c6c] dark:text-[#969696] font-mono mt-0.5 flex items-center gap-2 truncate">
            <span>{format(new Date(lesson.startTime), "EEE d MMM | HH:mm", { locale: nl })}</span>
            {lesson.location && (
              <span className="flex items-center gap-0.5"><MapPin size={9} strokeWidth={2} />{lesson.location}</span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onPick}
          className="px-3 text-[11px] uppercase tracking-wide border-l border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] focus:outline-none"
        >
          Wijzig
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full h-9 px-3 border border-dashed border-[#cccccc] dark:border-[#3c3c3c] text-[12px] text-[#6c6c6c] dark:text-[#969696] hover:border-[#7c3aed] hover:text-[#7c3aed] focus:outline-none flex items-center gap-1.5 transition-colors"
    >
      <Calendar size={12} strokeWidth={2} />
      Klik om een les uit de kalender te kiezen…
    </button>
  );
}
