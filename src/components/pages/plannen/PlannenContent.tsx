import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { studyApi } from "../../../studyApi";
import {
  format, isToday, isFuture, addDays, startOfDay, endOfDay,
} from "date-fns";
import { nl } from "date-fns/locale";
import {
  FlaskConical, ClipboardList, RefreshCw, AlertTriangle,
  Check, Plus, ChevronRight, X,
} from "lucide-react";
import clsx from "clsx";
import { PlannenScheduler, PlannenMultiScheduler, ScheduledSlot } from "./PlannenScheduler";

// ─── Selection types ──────────────────────────────────────────────────────
type Selection =
  | { kind: "test";      item: any }
  | { kind: "homework";  item: any }
  | { kind: "rehearsal" };

// ─── Main component ───────────────────────────────────────────────────────
export function PlannenContent() {
  const now    = new Date();
  const todayEnd = endOfDay(now).getTime();

  const homework         = useQuery(api.homework.getAll);
  const tests            = useQuery(api.misc.getTests);
  const subjects         = useQuery(api.lessons.getSubjects);
  const studySessions    = useQuery(studyApi.getStudySessions);
  const homeworkSessions = useQuery(studyApi.getHomeworkSessions);

  const [selected, setSelected] = useState<Selection | null>(null);

  // ── Derived lists ─────────────────────────────────────────────────────
  const upcomingTests = useMemo(
    () => (tests ?? [])
      .filter((t: any) => isFuture(new Date(t.date)) || isToday(new Date(t.date)))
      .sort((a: any, b: any) => a.date - b.date),
    [tests],
  );

  const pendingHomework = useMemo(
    () => (homework ?? [])
      .filter((h: any) => !h.done && (isFuture(new Date(h.dueDate)) || isToday(new Date(h.dueDate))))
      .sort((a: any, b: any) => a.dueDate - b.dueDate),
    [homework],
  );

  const sessionsByTest = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of studySessions ?? []) {
      if (!map[s.testId]) map[s.testId] = [];
      map[s.testId].push(s);
    }
    return map;
  }, [studySessions]);

  const sessionsByHw = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of homeworkSessions ?? []) {
      if (!map[s.homeworkId]) map[s.homeworkId] = [];
      map[s.homeworkId].push(s);
    }
    return map;
  }, [homeworkSessions]);

  const todayCount = upcomingTests.filter((t: any) => isToday(new Date(t.date))).length
    + pendingHomework.filter((h: any) => h.dueDate <= todayEnd).length;

  // ── Helpers ───────────────────────────────────────────────────────────
  const select = (s: Selection) =>
    setSelected((prev) =>
      prev?.kind === s.kind &&
      ((s.kind === "test" && prev.kind === "test" && prev.item._id === s.item._id) ||
       (s.kind === "homework" && prev.kind === "homework" && prev.item._id === s.item._id) ||
       s.kind === "rehearsal")
        ? null
        : s
    );

  const isActiveTest = (id: string) => selected?.kind === "test" && selected.item._id === id;
  const isActiveHw   = (id: string) => selected?.kind === "homework" && selected.item._id === id;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center h-[28px] bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] px-2 select-none gap-1">
        <span className="text-[11px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696] font-semibold">Plannen</span>
        <span className="text-[#e0e0e0] dark:text-[#3e3e42]">|</span>
        <span className="text-[11px] font-mono text-[#6c6c6c] dark:text-[#969696] tabular-nums">
          {upcomingTests.length} toets{upcomingTests.length !== 1 ? "en" : ""}
          {" · "}
          {pendingHomework.length} taak{pendingHomework.length !== 1 ? "en" : ""}
          {todayCount > 0 && <span className="text-[#f48771] ml-1">· {todayCount} vandaag</span>}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => select({ kind: "rehearsal" })}
          className={clsx(
            "h-[22px] px-2 text-[11px] flex items-center gap-1 focus:outline-none transition-colors",
            selected?.kind === "rehearsal"
              ? "bg-[#7c3aed] text-white"
              : "text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e]"
          )}
        >
          <Plus size={11} strokeWidth={2.25} />
          Oefensessie
        </button>
      </div>

      {/* Body: left list + right detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left panel ────────────────────────────────────────────────── */}
        <div className="w-[280px] flex-shrink-0 border-r border-[#e7e7e7] dark:border-[#252526] flex flex-col overflow-hidden bg-[#f8f8f8] dark:bg-[#1e1e1e]">
          <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">

            {/* Tests */}
            <div>
              <div className="sticky top-0 z-10 flex items-center h-[22px] px-3 bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e]">
                <FlaskConical size={10} className="text-[#ce9178] mr-1.5" />
                <span className="text-[10px] uppercase tracking-wide font-semibold text-[#6c6c6c] dark:text-[#969696]">
                  Toetsen
                </span>
                <span className="ml-auto text-[10px] font-mono text-[#969696]">{upcomingTests.length}</span>
              </div>

              {upcomingTests.length === 0 ? (
                <p className="px-3 py-3 text-[11px] text-[#969696] dark:text-[#858585] italic">Geen aankomende toetsen</p>
              ) : (
                upcomingTests.map((test: any) => {
                  const sessions = sessionsByTest[test._id] ?? [];
                  const done     = sessions.filter((s: any) => s.done).length;
                  const today    = isToday(new Date(test.date));
                  const daysLeft = Math.ceil((new Date(test.date).getTime() - Date.now()) / 86400000);
                  const active   = isActiveTest(test._id);

                  return (
                    <button
                      key={test._id}
                      onClick={() => select({ kind: "test", item: test })}
                      className={clsx(
                        "w-full text-left border-b border-[#e7e7e7] dark:border-[#252526] px-3 py-2 transition-colors focus:outline-none",
                        active
                          ? "bg-[#e4e6f1] dark:bg-[#094771]"
                          : "hover:bg-[#eeeeee] dark:hover:bg-[#2a2d2e]"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-0.5 self-stretch flex-shrink-0 mt-0.5"
                          style={{ background: today ? "#f48771" : "#ce9178", minHeight: "1rem" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {today && <AlertTriangle size={9} className="text-[#f48771] flex-shrink-0" strokeWidth={2.5} />}
                            <p className="text-[11.5px] font-medium text-[#333333] dark:text-[#cccccc] truncate leading-tight">
                              {test.topic}
                            </p>
                          </div>
                          <p className="text-[10.5px] text-[#6c6c6c] dark:text-[#969696] font-mono truncate mt-0.5">
                            {test.subject} · {daysLeft === 0 ? "vandaag" : `${daysLeft}d`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {sessions.length > 0 && (
                            <span className={clsx(
                              "text-[10px] font-mono tabular-nums",
                              done === sessions.length ? "text-[#4ec9b0]" : "text-[#969696]"
                            )}>
                              {done}/{sessions.length}
                            </span>
                          )}
                          <ChevronRight size={10} className={clsx("ml-0.5 transition-colors", active ? "text-[#7c3aed]" : "text-[#d4d4d4]")} />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Homework */}
            <div>
              <div className="sticky top-0 z-10 flex items-center h-[22px] px-3 bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] border-t border-t-[#e7e7e7] dark:border-t-[#1e1e1e]">
                <ClipboardList size={10} className="text-[#7ec699] mr-1.5" />
                <span className="text-[10px] uppercase tracking-wide font-semibold text-[#6c6c6c] dark:text-[#969696]">
                  Huiswerk
                </span>
                <span className="ml-auto text-[10px] font-mono text-[#969696]">{pendingHomework.length}</span>
              </div>

              {pendingHomework.length === 0 ? (
                <p className="px-3 py-3 text-[11px] text-[#969696] dark:text-[#858585] italic">Geen huiswerk</p>
              ) : (
                pendingHomework.map((hw: any) => {
                  const sessions = sessionsByHw[hw._id] ?? [];
                  const done     = sessions.filter((s: any) => s.done).length;
                  const today    = isToday(new Date(hw.dueDate));
                  const daysLeft = Math.ceil((new Date(hw.dueDate).getTime() - Date.now()) / 86400000);
                  const active   = isActiveHw(hw._id);

                  return (
                    <button
                      key={hw._id}
                      onClick={() => select({ kind: "homework", item: hw })}
                      className={clsx(
                        "w-full text-left border-b border-[#e7e7e7] dark:border-[#252526] px-3 py-2 transition-colors focus:outline-none",
                        active
                          ? "bg-[#e4e6f1] dark:bg-[#094771]"
                          : "hover:bg-[#eeeeee] dark:hover:bg-[#2a2d2e]"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className="w-0.5 self-stretch flex-shrink-0 mt-0.5"
                          style={{ background: today ? "#f48771" : "#7ec699", minHeight: "1rem" }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            {today && <AlertTriangle size={9} className="text-[#f48771] flex-shrink-0" strokeWidth={2.5} />}
                            <p className="text-[11.5px] font-medium text-[#333333] dark:text-[#cccccc] truncate leading-tight">
                              {hw.title}
                            </p>
                          </div>
                          <p className="text-[10.5px] text-[#6c6c6c] dark:text-[#969696] font-mono truncate mt-0.5">
                            {hw.subject} · inleveren {daysLeft === 0 ? "vandaag" : `${daysLeft}d`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {sessions.length > 0 && (
                            <span className={clsx(
                              "text-[10px] font-mono tabular-nums",
                              done === sessions.length ? "text-[#4ec9b0]" : "text-[#969696]"
                            )}>
                              {done}/{sessions.length}
                            </span>
                          )}
                          <ChevronRight size={10} className={clsx("ml-0.5 transition-colors", active ? "text-[#7c3aed]" : "text-[#d4d4d4]")} />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-[#1e1e1e]">
          {selected === null ? (
            <EmptyDetail />
          ) : selected.kind === "test" ? (
            <TestDetail
              test={selected.item}
              sessions={sessionsByTest[selected.item._id] ?? []}
              onClose={() => setSelected(null)}
            />
          ) : selected.kind === "homework" ? (
            <HomeworkDetail
              hw={selected.item}
              sessions={sessionsByHw[selected.item._id] ?? []}
              onClose={() => setSelected(null)}
            />
          ) : (
            <RehearsalDetail
              subjects={subjects ?? []}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────
function EmptyDetail() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
      <RefreshCw size={22} className="text-[#d4d4d4] dark:text-[#3e3e42]" strokeWidth={1.5} />
      <p className="text-[12px] text-[#6c6c6c] dark:text-[#6c6c6c]">
        Selecteer een toets of huiswerktaak om een studie­sessie te plannen
      </p>
      <p className="text-[11px] text-[#969696] dark:text-[#555555]">
        of klik op <span className="font-mono bg-[#f3f3f3] dark:bg-[#252526] px-1 py-0.5 text-[#7c3aed]">+ Oefensessie</span> bovenaan voor vrij oefenen
      </p>
    </div>
  );
}

// ─── Test detail ──────────────────────────────────────────────────────────
function TestDetail({ test, sessions, onClose }: { test: any; sessions: any[]; onClose: () => void }) {
  const createSession = useMutation(studyApi.scheduleStudySession);
  const toggle        = useMutation(studyApi.toggleStudySession);
  const del           = useMutation(studyApi.deleteStudySession);

  // NEW: list of timestamps the user has placed on the grid
  const [plannedSlots,    setPlannedSlots]    = useState<number[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [submitting,      setSubmitting]      = useState(false);

  const daysLeft   = Math.ceil((new Date(test.date).getTime() - Date.now()) / 86400000);
  const canSubmit  = plannedSlots.length > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    // Delete existing sessions then create one per slot
    for (const s of sessions) await del({ id: s._id });
    for (const ts of plannedSlots) {
      await createSession({ testId: test._id, startTime: ts, durationMinutes });
    }
    setPlannedSlots([]);
    setSubmitting(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex-shrink-0 flex items-center h-[28px] bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] px-2 gap-2 select-none">
        <FlaskConical size={11} className="text-[#ce9178]" />
        <span className="flex-1 text-[11px] font-medium text-[#333333] dark:text-[#cccccc] truncate">
          {test.topic} <span className="text-[#969696] font-normal font-mono">· {test.subject}</span>
        </span>
        <span className={clsx("text-[10px] font-mono tabular-nums", daysLeft <= 2 ? "text-[#f48771]" : "text-[#969696]")}>
          {daysLeft === 0 ? "vandaag" : `${daysLeft}d`}
        </span>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#3e3e42] focus:outline-none">
          <X size={12} strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
        {/* Saved sessions */}
        {sessions.length > 0 && (
          <div className="border-b border-[#e7e7e7] dark:border-[#252526]">
            <div className="flex items-center h-[22px] px-3 bg-[#f3f3f3] dark:bg-[#2d2d30]">
              <span className="text-[10px] uppercase tracking-wide font-semibold text-[#6c6c6c] dark:text-[#969696]">Geplande sessies</span>
              <span className="ml-auto text-[10px] font-mono text-[#969696]">
                {sessions.filter((s: any) => s.done).length}/{sessions.length}
              </span>
            </div>
            {sessions.sort((a: any, b: any) => a.startTime - b.startTime).map((s: any) => (
              <div key={s._id} className="flex items-center gap-2 px-3 py-1.5 border-b border-[#e7e7e7] dark:border-[#252526] hover:bg-[#f8f8f8] dark:hover:bg-[#252526] group">
                <button
                  onClick={() => toggle({ id: s._id })}
                  className={clsx(
                    "w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 focus:outline-none transition-colors",
                    s.done ? "bg-[#4ec9b0] border-[#4ec9b0]" : "border-[#c0c0c0] dark:border-[#555] hover:border-[#7c3aed]"
                  )}
                >
                  {s.done && <Check size={8} className="text-white" strokeWidth={3} />}
                </button>
                <span className={clsx("flex-1 text-[11px] font-mono text-[#333333] dark:text-[#cccccc] truncate", s.done && "line-through text-[#969696]")}>
                  {format(new Date(s.startTime), "EEE d MMM · HH:mm", { locale: nl })} – {format(new Date(s.endTime), "HH:mm")}
                </span>
                <button onClick={() => del({ id: s._id })} className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-[#969696] hover:text-[#f48771] focus:outline-none">
                  <X size={10} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="p-3 space-y-2">
          {/* Hint */}
          <p className="text-[10px] text-[#969696] dark:text-[#858585] font-mono">
            Klik op de kalender om een sessie toe te voegen · klik op een chip om te verwijderen · sleep om te verplaatsen
          </p>

          {/* Multi-slot grid */}
          <PlannenMultiScheduler
            slots={plannedSlots}
            onChange={setPlannedSlots}
            durationMinutes={durationMinutes}
            onDurationChange={setDurationMinutes}
            deadlineDate={test.date}
          />

          {/* Summary + submit */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#6c6c6c] dark:text-[#969696]">
              {plannedSlots.length === 0
                ? "Geen sessies geselecteerd"
                : `${plannedSlots.length} sessie${plannedSlots.length !== 1 ? "s" : ""} geselecteerd`}
            </span>
            {plannedSlots.length > 0 && (
              <button
                onClick={() => setPlannedSlots([])}
                className="text-[10px] font-mono text-[#969696] hover:text-[#f48771] focus:outline-none ml-auto"
              >
                Wissen
              </button>
            )}
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit}
            className="w-full h-[26px] bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[11px] font-medium focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting
              ? "Plannen…"
              : plannedSlots.length === 0
              ? "Selecteer sessies hierboven"
              : `${plannedSlots.length} sessie${plannedSlots.length !== 1 ? "s" : ""} plannen`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Homework detail ──────────────────────────────────────────────────────
function HomeworkDetail({ hw, sessions, onClose }: { hw: any; sessions: any[]; onClose: () => void }) {
  const schedule = useMutation(studyApi.scheduleHomeworkSession);
  const toggle   = useMutation(studyApi.toggleHomeworkSession);
  const del      = useMutation(studyApi.deleteHomeworkSession);

  const [slot, setSlot] = useState<ScheduledSlot>({
    startTime: addDays(new Date(), 1).setHours(18, 0, 0, 0),
    durationMinutes: 45,
  });
  const [submitting, setSubmitting] = useState(false);

  const daysLeft = Math.ceil((new Date(hw.dueDate).getTime() - Date.now()) / 86400000);

  const submit = async () => {
    setSubmitting(true);
    await schedule({ homeworkId: hw._id, startTime: slot.startTime, durationMinutes: slot.durationMinutes });
    setSubmitting(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 flex items-center h-[28px] bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] px-2 gap-2 select-none">
        <ClipboardList size={11} className="text-[#7ec699]" />
        <span className="flex-1 text-[11px] font-medium text-[#333333] dark:text-[#cccccc] truncate">
          {hw.title} <span className="text-[#969696] font-normal font-mono">· {hw.subject}</span>
        </span>
        <span className="text-[10px] font-mono text-[#969696] tabular-nums">
          {daysLeft === 0 ? "vandaag" : `${daysLeft}d`}
        </span>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#3e3e42] focus:outline-none">
          <X size={12} strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
        {sessions.length > 0 && (
          <div className="border-b border-[#e7e7e7] dark:border-[#252526]">
            <div className="flex items-center h-[22px] px-3 bg-[#f3f3f3] dark:bg-[#2d2d30]">
              <span className="text-[10px] uppercase tracking-wide font-semibold text-[#6c6c6c] dark:text-[#969696]">
                Geplande sessies
              </span>
              <span className="ml-auto text-[10px] font-mono text-[#969696]">
                {sessions.filter((s: any) => s.done).length}/{sessions.length}
              </span>
            </div>
            {sessions
              .sort((a: any, b: any) => a.startTime - b.startTime)
              .map((s: any) => (
                <div
                  key={s._id}
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-[#e7e7e7] dark:border-[#252526] hover:bg-[#f8f8f8] dark:hover:bg-[#252526] group"
                >
                  <button
                    onClick={() => toggle({ id: s._id })}
                    className={clsx(
                      "w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0 focus:outline-none transition-colors",
                      s.done
                        ? "bg-[#4ec9b0] border-[#4ec9b0]"
                        : "border-[#c0c0c0] dark:border-[#555] hover:border-[#16a34a]"
                    )}
                  >
                    {s.done && <Check size={8} className="text-white" strokeWidth={3} />}
                  </button>
                  <span className={clsx(
                    "flex-1 text-[11px] font-mono text-[#333333] dark:text-[#cccccc] truncate",
                    s.done && "line-through text-[#969696]"
                  )}>
                    {format(new Date(s.startTime), "EEE d MMM · HH:mm", { locale: nl })} – {format(new Date(s.endTime), "HH:mm")}
                  </span>
                  <button
                    onClick={() => del({ id: s._id })}
                    className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-[#969696] hover:text-[#f48771] focus:outline-none"
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </div>
              ))}
          </div>
        )}

        <div className="p-3 space-y-3">
          {hw.description && (
            <p className="text-[11px] text-[#6c6c6c] dark:text-[#969696] font-mono border-l-2 border-[#7ec699] pl-2">
              {hw.description}
            </p>
          )}

          <PlannenScheduler value={slot} onChange={setSlot} kind="homework" />

          <button
            onClick={submit}
            disabled={submitting}
            className="w-full h-[26px] bg-[#16a34a] hover:bg-[#15803d] text-white text-[11px] font-medium focus:outline-none disabled:opacity-50 transition-colors"
          >
            {submitting ? "Toevoegen…" : "Sessie toevoegen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Rehearsal detail ─────────────────────────────────────────────────────
function RehearsalDetail({ subjects, onClose }: { subjects: string[]; onClose: () => void }) {
  const create = useMutation(studyApi.createRehearsalSession);

  const [subject,     setSubject]     = useState("");
  const [title,       setTitle]       = useState("");
  const [description, setDescription] = useState("");
  const [slot, setSlot] = useState<ScheduledSlot>({
    startTime: addDays(new Date(), 1).setHours(18, 0, 0, 0),
    durationMinutes: 60,
  });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!subject || !title.trim()) return;
    setSubmitting(true);
    await create({ subject, title, description: description || undefined, startTime: slot.startTime, durationMinutes: slot.durationMinutes });
    setSubject(""); setTitle(""); setDescription("");
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 flex items-center h-[28px] bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] px-2 gap-2 select-none">
        <RefreshCw size={11} className="text-[#b45309]" />
        <span className="flex-1 text-[11px] font-medium text-[#333333] dark:text-[#cccccc]">
          Oefensessie plannen
        </span>
        <button onClick={onClose} className="w-5 h-5 flex items-center justify-center text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#3e3e42] focus:outline-none">
          <X size={12} strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
        <div className="p-3 space-y-3">
          {/* Fields */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]">Vak</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-2 py-1 bg-white dark:bg-[#1e1e1e] border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] text-[12px] focus:outline-none focus:border-[#7c3aed]"
              >
                <option value="">Selecteer vak…</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]">Wat ga je oefenen</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="bijv. Formules hfdst 4"
                className="w-full px-2 py-1 bg-white dark:bg-[#1e1e1e] border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] text-[12px] focus:outline-none focus:border-[#7c3aed]"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]">Notities (optioneel)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Specifieke aandachtspunten…"
              className="w-full px-2 py-1 bg-white dark:bg-[#1e1e1e] border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] text-[12px] font-mono focus:outline-none focus:border-[#7c3aed] resize-none"
            />
          </div>

          <PlannenScheduler value={slot} onChange={setSlot} kind="rehearsal" />

          <button
            onClick={submit}
            disabled={submitting || !subject || !title.trim()}
            className="w-full h-[26px] bg-[#b45309] hover:bg-[#92400e] text-white text-[11px] font-medium focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Toevoegen…" : "Sessie toevoegen"}
          </button>
        </div>
      </div>
    </div>
  );
}
