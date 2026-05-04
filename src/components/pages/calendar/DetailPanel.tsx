import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useState } from "react";
import {
  X,
  MapPin,
  Clock,
  BookOpen,
  ClipboardList,
  CheckSquare,
  FlaskConical,
  Trash2,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import type { DetailPanelState } from "../../../pages/calendarTabs/types";

export function DetailPanel({
  state,
  onClose,
  onOpen,
}: {
  state: DetailPanelState;
  onClose: () => void;
  onOpen: (next: DetailPanelState) => void;
}) {
  if (!state) return null;
  return (
    <div className="flex-shrink-0 w-[440px] border-l border-[#e7e7e7] dark:border-[#252526] bg-white dark:bg-[#1e1e1e] flex flex-col overflow-hidden">
      {state.kind === "lesson" && <LessonPanel id={state.id as Id<"lessons">} onClose={onClose} onOpen={onOpen} />}
      {state.kind === "homework" && <HomeworkPanel id={state.id as Id<"homework">} onClose={onClose} />}
      {state.kind === "test" && <TestPanel id={state.id as Id<"tests">} onClose={onClose} />}
      {state.kind === "task" && <TaskPanel id={state.id as Id<"tasks">} onClose={onClose} />}
      {state.kind === "appointment" && <AppointmentPanel id={state.id as Id<"appointments">} onClose={onClose} />}
    </div>
  );
}

function PanelHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between h-[28px] px-3 bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e]">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696] truncate">
        {title}
      </span>
      <button
        onClick={onClose}
        className="h-5 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
      >
        <X size={13} strokeWidth={2} />
      </button>
    </div>
  );
}

function LessonPanel({
  id,
  onClose,
  onOpen,
}: {
  id: Id<"lessons">;
  onClose: () => void;
  onOpen: (next: DetailPanelState) => void;
}) {
  const lesson = useQuery(api.lessons.getById, { id });
  const tests = useQuery(api.misc.getTests);
  const homework = useQuery(api.homework.getByLesson, { lessonId: id });
  const tasks = useQuery(api.tasks.getByLesson, { lessonId: id });
  const lessonTest = (tests ?? []).find((t: any) => String(t.lessonId) === String(id));

  const [tab, setTab] = useState<"info" | "homework" | "tasks">("info");

  if (!lesson) {
    return (
      <>
        <PanelHeader title="Loading" onClose={onClose} />
        <div className="p-4 text-[12px] text-[#6c6c6c] dark:text-[#969696]">Loading lesson…</div>
      </>
    );
  }

  const dur = Math.round((lesson.endTime - lesson.startTime) / 60000);

  return (
    <>
      <PanelHeader title={`Les | ${lesson.subject}`} onClose={onClose} />

      <div className="flex-shrink-0 px-4 py-3 border-b border-[#e7e7e7] dark:border-[#252526]">
        <h2 className="text-[18px] font-semibold text-[#333333] dark:text-[#cccccc] tracking-tight">{lesson.subject}</h2>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-[#6c6c6c] dark:text-[#969696] font-mono">
          <span className="flex items-center gap-1">
            <Clock size={11} strokeWidth={2} />
            {format(new Date(lesson.startTime), "EEEE d MMM | HH:mm", { locale: nl })}–{format(new Date(lesson.endTime), "HH:mm")}
          </span>
          <span className="opacity-50">|</span>
          <span>{dur}min</span>
          {lesson.location && (
            <>
              <span className="opacity-50">|</span>
              <span className="flex items-center gap-1">
                <MapPin size={11} strokeWidth={2} />
                {lesson.location}
              </span>
            </>
          )}
        </div>
        {lessonTest && (
          <button
            onClick={() => onOpen({ kind: "test", id: String(lessonTest._id) })}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#7c3aed] hover:underline"
          >
            <FlaskConical size={11} strokeWidth={2} />
            Toets gekoppeld: {lessonTest.topic}
          </button>
        )}
      </div>

      <div className="flex-shrink-0 flex items-center h-[28px] bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] px-1">
        {(["info", "homework", "tasks"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "h-[28px] px-3 text-[11px] uppercase tracking-wide flex items-center gap-1.5 transition-colors focus:outline-none",
              tab === t
                ? "bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#ffffff] border-t-2 border-t-[#7c3aed] -mt-px"
                : "text-[#6c6c6c] dark:text-[#969696] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e]"
            )}
          >
            {t === "info" && <BookOpen size={11} strokeWidth={2} />}
            {t === "homework" && <ClipboardList size={11} strokeWidth={2} />}
            {t === "tasks" && <CheckSquare size={11} strokeWidth={2} />}
            {t === "info" ? "Notities" : t === "homework" ? `Huiswerk${homework?.length ? ` (${homework.length})` : ""}` : `Taken${tasks?.length ? ` (${tasks.length})` : ""}`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-width:thin] p-4">
        {tab === "info" && (
          <div className="space-y-3">
            <Link
              to={`/calendar?tab=notebook&subject=${encodeURIComponent(lesson.subject)}`}
              className="flex items-center gap-2 px-3 py-2 bg-[#f8f8f8] dark:bg-[#252526] border border-[#e7e7e7] dark:border-[#2d2d30] hover:border-[#7c3aed]/50 transition-colors text-[12px] text-[#333333] dark:text-[#cccccc]"
            >
              <BookOpen size={13} className="text-[#7c3aed]" strokeWidth={2} />
              <span>Open {lesson.subject} notitieboek</span>
              <ExternalLink size={11} className="ml-auto opacity-50" strokeWidth={2} />
            </Link>
            <p className="text-[11.5px] text-[#6c6c6c] dark:text-[#969696] leading-relaxed">
              Notities staan in het vakgebonden notitieboek. Open het boek om handgeschreven of getypte notities toe te voegen.
            </p>
          </div>
        )}

        {tab === "homework" && (
          <div className="space-y-1.5">
            {(homework?.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-[12px] text-[#6c6c6c] dark:text-[#969696]">Geen huiswerk voor deze les</div>
            ) : (
              homework?.map((hw) => (
                <button
                  key={hw._id}
                  onClick={() => onOpen({ kind: "homework", id: String(hw._id) })}
                  className={clsx(
                    "w-full text-left border-l-2 px-2 py-1.5 transition-colors",
                    hw.done
                      ? "border-l-[#969696] bg-[#f8f8f8] dark:bg-[#252526] opacity-60"
                      : "border-l-[#7c3aed] bg-[#f8f8f8] dark:bg-[#2d2d30] hover:bg-[#eeeeee] dark:hover:bg-[#37373d]"
                  )}
                >
                  <p className={clsx("text-[12px] font-medium text-[#333333] dark:text-[#cccccc] truncate", hw.done && "line-through")}>
                    {hw.title}
                  </p>
                  <p className="text-[10.5px] text-[#6c6c6c] dark:text-[#969696] font-mono mt-0.5">
                    {format(new Date(hw.dueDate), "EEE d MMM", { locale: nl })}
                  </p>
                </button>
              ))
            )}
          </div>
        )}

        {tab === "tasks" && (
          <div className="space-y-1.5">
            {(tasks?.length ?? 0) === 0 ? (
              <div className="py-8 text-center text-[12px] text-[#6c6c6c] dark:text-[#969696]">Geen taken voor deze les</div>
            ) : (
              tasks?.map((t) => (
                <button
                  key={t._id}
                  onClick={() => onOpen({ kind: "task", id: String(t._id) })}
                  className={clsx(
                    "w-full text-left border-l-2 px-2 py-1.5 transition-colors",
                    t.done
                      ? "border-l-[#969696] bg-[#f8f8f8] dark:bg-[#252526] opacity-60"
                      : "border-l-[#7c3aed] bg-[#f8f8f8] dark:bg-[#2d2d30] hover:bg-[#eeeeee] dark:hover:bg-[#37373d]"
                  )}
                >
                  <p className={clsx("text-[12px] font-medium text-[#333333] dark:text-[#cccccc] truncate", t.done && "line-through")}>
                    {t.title}
                  </p>
                  {t.dueDate && (
                    <p className="text-[10.5px] text-[#6c6c6c] dark:text-[#969696] font-mono mt-0.5">
                      {format(new Date(t.dueDate), "EEE d MMM | HH:mm", { locale: nl })}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </>
  );
}

function HomeworkPanel({ id, onClose }: { id: Id<"homework">; onClose: () => void }) {
  const homework = useQuery(api.homework.getAll);
  const item = (homework ?? []).find((h) => String(h._id) === String(id));
  const toggle = useMutation(api.homework.toggle);
  const remove = useMutation(api.homework.remove);

  if (!item) {
    return (
      <>
        <PanelHeader title="Huiswerk" onClose={onClose} />
        <div className="p-4 text-[12px] text-[#6c6c6c] dark:text-[#969696]">Loading…</div>
      </>
    );
  }

  return (
    <>
      <PanelHeader title="Huiswerk" onClose={onClose} />
      <div className="flex-1 overflow-y-auto [scrollbar-width:thin] p-4 space-y-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#969696] mb-1">Titel</div>
          <h2 className={clsx("text-[16px] font-semibold text-[#333333] dark:text-[#cccccc]", item.done && "line-through opacity-60")}>
            {item.title}
          </h2>
        </div>
        <DetailField label="Vak" value={item.subject} />
        <DetailField label="Wanneer" value={format(new Date(item.dueDate), "EEEE d MMM yyyy", { locale: nl })} />
        {item.description && <DetailField label="Beschrijving" value={item.description} multiline />}
        <div className="flex items-center gap-2 pt-2 border-t border-[#e7e7e7] dark:border-[#252526]">
          <button
            onClick={() => toggle({ id: item._id })}
            className={clsx(
              "flex-1 h-7 text-[12px] font-medium transition-colors focus:outline-none",
              item.done
                ? "border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]"
                : "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
            )}
          >
            {item.done ? "Heropenen" : "Markeer als klaar"}
          </button>
          <button
            onClick={() => {
              remove({ id: item._id });
              onClose();
            }}
            className="h-7 w-7 flex items-center justify-center border border-[#cccccc] dark:border-[#3c3c3c] text-[#f48771] hover:bg-[#fdeeee] dark:hover:bg-[#3a1d1d]/40 focus:outline-none"
            aria-label="Verwijderen"
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}

function TestPanel({ id, onClose }: { id: Id<"tests">; onClose: () => void }) {
  const tests = useQuery(api.misc.getTests);
  const item = (tests ?? []).find((t: any) => String(t._id) === String(id));
  const remove = useMutation(api.misc.deleteTest);

  if (!item) {
    return (
      <>
        <PanelHeader title="Toets" onClose={onClose} />
        <div className="p-4 text-[12px] text-[#6c6c6c] dark:text-[#969696]">Loading…</div>
      </>
    );
  }

  return (
    <>
      <PanelHeader title="Toets" onClose={onClose} />
      <div className="flex-1 overflow-y-auto [scrollbar-width:thin] p-4 space-y-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#969696] mb-1">Onderwerp</div>
          <h2 className="text-[16px] font-semibold text-[#333333] dark:text-[#cccccc]">{item.topic}</h2>
        </div>
        <DetailField label="Vak" value={item.subject} />
        <DetailField label="Wanneer" value={format(new Date(item.date), "EEEE d MMM yyyy", { locale: nl })} />
        {item.description && <DetailField label="Beschrijving" value={item.description} multiline />}
        <div className="flex items-center gap-2 pt-2 border-t border-[#e7e7e7] dark:border-[#252526]">
          <button
            onClick={() => {
              remove({ id: item._id });
              onClose();
            }}
            className="h-7 px-3 text-[12px] border border-[#cccccc] dark:border-[#3c3c3c] text-[#f48771] hover:bg-[#fdeeee] dark:hover:bg-[#3a1d1d]/40 focus:outline-none flex items-center gap-1.5"
          >
            <Trash2 size={11} strokeWidth={2} />
            Verwijderen
          </button>
        </div>
      </div>
    </>
  );
}

function TaskPanel({ id, onClose }: { id: Id<"tasks">; onClose: () => void }) {
  const tasks = useQuery(api.tasks.getAll);
  const item = (tasks ?? []).find((t) => String(t._id) === String(id));
  const toggle = useMutation(api.tasks.toggle);
  const remove = useMutation(api.tasks.remove);

  if (!item) {
    return (
      <>
        <PanelHeader title="Taak" onClose={onClose} />
        <div className="p-4 text-[12px] text-[#6c6c6c] dark:text-[#969696]">Loading…</div>
      </>
    );
  }

  return (
    <>
      <PanelHeader title="Taak" onClose={onClose} />
      <div className="flex-1 overflow-y-auto [scrollbar-width:thin] p-4 space-y-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#969696] mb-1">Titel</div>
          <h2 className={clsx("text-[16px] font-semibold text-[#333333] dark:text-[#cccccc]", item.done && "line-through opacity-60")}>
            {item.title}
          </h2>
        </div>
        {item.subject && <DetailField label="Vak" value={item.subject} />}
        {item.dueDate && (
          <DetailField label="Wanneer" value={format(new Date(item.dueDate), "EEEE d MMM yyyy | HH:mm", { locale: nl })} />
        )}
        {item.description && <DetailField label="Beschrijving" value={item.description} multiline />}
        <DetailField label="Prioriteit" value={item.priority} />
        <div className="flex items-center gap-2 pt-2 border-t border-[#e7e7e7] dark:border-[#252526]">
          <button
            onClick={() => toggle({ id: item._id })}
            className={clsx(
              "flex-1 h-7 text-[12px] font-medium transition-colors focus:outline-none",
              item.done
                ? "border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]"
                : "bg-[#7c3aed] text-white hover:bg-[#6d28d9]"
            )}
          >
            {item.done ? "Heropenen" : "Markeer als klaar"}
          </button>
          <button
            onClick={() => {
              remove({ id: item._id });
              onClose();
            }}
            className="h-7 w-7 flex items-center justify-center border border-[#cccccc] dark:border-[#3c3c3c] text-[#f48771] hover:bg-[#fdeeee] dark:hover:bg-[#3a1d1d]/40 focus:outline-none"
            aria-label="Verwijderen"
          >
            <Trash2 size={12} strokeWidth={2} />
          </button>
        </div>
      </div>
    </>
  );
}

function AppointmentPanel({ id, onClose }: { id: Id<"appointments">; onClose: () => void }) {
  const appts = useQuery(api.misc.getAppointments);
  const item = (appts ?? []).find((a: any) => String(a._id) === String(id));
  const remove = useMutation(api.misc.deleteAppointment);

  if (!item) {
    return (
      <>
        <PanelHeader title="Afspraak" onClose={onClose} />
        <div className="p-4 text-[12px] text-[#6c6c6c] dark:text-[#969696]">Loading…</div>
      </>
    );
  }
  const start = item.startTime ? new Date(item.startTime) : null;
  const end = item.endTime ? new Date(item.endTime) : null;

  return (
    <>
      <PanelHeader title="Afspraak" onClose={onClose} />
      <div className="flex-1 overflow-y-auto [scrollbar-width:thin] p-4 space-y-4">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#969696] mb-1">Titel</div>
          <h2 className="text-[16px] font-semibold text-[#333333] dark:text-[#cccccc]">{item.title}</h2>
        </div>
        {start && (
          <DetailField
            label="Wanneer"
            value={`${format(start, "EEEE d MMM yyyy | HH:mm", { locale: nl })}${end ? `–${format(end, "HH:mm")}` : ""}`}
          />
        )}
        {item.location && <DetailField label="Locatie" value={item.location} />}
        {item.description && <DetailField label="Beschrijving" value={item.description} multiline />}
        <div className="flex items-center gap-2 pt-2 border-t border-[#e7e7e7] dark:border-[#252526]">
          <button
            onClick={() => {
              remove({ id: item._id });
              onClose();
            }}
            className="h-7 px-3 text-[12px] border border-[#cccccc] dark:border-[#3c3c3c] text-[#f48771] hover:bg-[#fdeeee] dark:hover:bg-[#3a1d1d]/40 focus:outline-none flex items-center gap-1.5"
          >
            <Trash2 size={11} strokeWidth={2} />
            Verwijderen
          </button>
        </div>
      </div>
    </>
  );
}

function DetailField({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-wider text-[#969696] mb-1">{label}</div>
      <div className={clsx("text-[12.5px] text-[#333333] dark:text-[#cccccc]", multiline && "whitespace-pre-wrap leading-relaxed")}>
        {value}
      </div>
    </div>
  );
}
