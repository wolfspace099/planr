import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { studyApi } from "../studyApi";
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval,
  format, isSameDay, isToday,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, MapPin, FlaskConical, BookOpen,
  ClipboardList, RefreshCw, Plus, X, ClipboardCheck, CheckSquare,
} from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader, Modal, Input, Textarea, Button } from "../components/ui/primitives";
import { useLang } from "../i18n";
import clsx from "clsx";

const SCHOOL_PERIODS = [
  { label: "u1", startHH: 8,  startMM: 30, endHH: 9,  endMM: 20 },
  { label: "u2", startHH: 9,  startMM: 20, endHH: 10, endMM: 10 },
  { label: "u3", startHH: 10, startMM: 25, endHH: 11, endMM: 15 },
  { label: "u4", startHH: 11, startMM: 15, endHH: 12, endMM: 5  },
  { label: "u5", startHH: 12, startMM: 30, endHH: 13, endMM: 20 },
  { label: "u6", startHH: 13, startMM: 20, endHH: 14, endMM: 10 },
  { label: "u7", startHH: 14, startMM: 25, endHH: 15, endMM: 15 },
  { label: "u8", startHH: 15, startMM: 15, endHH: 16, endMM: 5  },
] as const;

const EVENING_HOURS = [17, 18, 19, 20, 21, 22, 23] as const;

function toMins(hh: number, mm: number) { return hh * 60 + mm; }

function lessonPeriod(startTime: number): string | null {
  const d = new Date(startTime);
  const mins = d.getHours() * 60 + d.getMinutes();
  for (const p of SCHOOL_PERIODS) {
    if (Math.abs(mins - toMins(p.startHH, p.startMM)) <= 5) return p.label;
  }
  return null;
}

function hasBreakBefore(idx: number): boolean {
  if (idx === 0) return false;
  const prev = SCHOOL_PERIODS[idx - 1];
  const curr = SCHOOL_PERIODS[idx];
  return toMins(curr.startHH, curr.startMM) - toMins(prev.endHH, prev.endMM) > 1;
}

function breakHeightPx(idx: number): number {
  const prev = SCHOOL_PERIODS[idx - 1];
  const curr = SCHOOL_PERIODS[idx];
  const gap = toMins(curr.startHH, curr.startMM) - toMins(prev.endHH, prev.endMM);
  return Math.max(8, Math.min(gap * 1.4, 36));
}

function subjectDisplay(subject: string): string {
  return subject.length > 12 ? subject.slice(0, 10) + "…" : subject;
}

function appointmentStartMinutes(appointment: any): number {
  if (appointment.isRecurring) {
    const parts = String(appointment.recurringTimeHHMM ?? "0:00").split(":");
    const [hours, minutes] = parts.map((v) => parseInt(v, 10));
    return (Number.isNaN(hours) ? 0 : hours) * 60 + (Number.isNaN(minutes) ? 0 : minutes);
  }
  const date = new Date(appointment.startTime);
  return date.getHours() * 60 + date.getMinutes();
}

function appointmentWithinPeriod(appointment: any, day: Date, period: typeof SCHOOL_PERIODS[number]): boolean {
  if (appointment.isRecurring) {
    if (appointment.recurringDayOfWeek !== day.getDay()) return false;
    const minutes = appointmentStartMinutes(appointment);
    return minutes >= toMins(period.startHH, period.startMM) && minutes < toMins(period.endHH, period.endMM);
  }
  if (!isSameDay(new Date(appointment.startTime), day)) return false;
  const minutes = appointmentStartMinutes(appointment);
  return minutes >= toMins(period.startHH, period.startMM) && minutes < toMins(period.endHH, period.endMM);
}

function getAppointmentsAtPeriod(appointments: any[], day: Date, period: typeof SCHOOL_PERIODS[number]) {
  return appointments.filter((a) => appointmentWithinPeriod(a, day, period));
}

function appointmentsInHour(appointments: any[], day: Date, hour: number): any[] {
  return appointments.filter((a) => {
    if (a.isRecurring) {
      if (a.recurringDayOfWeek !== day.getDay()) return false;
      const [hStr] = (a.recurringTimeHHMM ?? "0:0").split(":");
      return parseInt(hStr, 10) === hour;
    } else {
      if (!isSameDay(new Date(a.startTime), day)) return false;
      return new Date(a.startTime).getHours() === hour;
    }
  });
}

function studySessionsInHour(sessions: any[], day: Date, hour: number): any[] {
  return sessions.filter((s) => {
    if (!isSameDay(new Date(s.startTime), day)) return false;
    return new Date(s.startTime).getHours() === hour;
  });
}

function homeworkSessionsInHour(sessions: any[], day: Date, hour: number): any[] {
  return sessions.filter((s) => {
    if (!isSameDay(new Date(s.startTime), day)) return false;
    return new Date(s.startTime).getHours() === hour;
  });
}

function rehearsalSessionsInHour(sessions: any[], day: Date, hour: number): any[] {
  return sessions.filter((s) => {
    if (!isSameDay(new Date(s.startTime), day)) return false;
    return new Date(s.startTime).getHours() === hour;
  });
}

// ─── Lesson Picker Modal ────────────────────────────────────────────────────
function LessonPickerModal({
  open, onClose, lessons, onSelect, title: modalTitle,
}: {
  open: boolean; onClose: () => void; lessons: any[]; onSelect: (l: any) => void; title: string;
}) {
  const { t } = useLang();
  const byDay = useMemo(() => {
    return lessons
      .slice()
      .sort((a, b) => a.startTime - b.startTime)
      .reduce((acc: Record<string, any[]>, l) => {
        const day = format(new Date(l.startTime), "EEEE d MMM");
        if (!acc[day]) acc[day] = [];
        acc[day].push(l);
        return acc;
      }, {});
  }, [lessons]);

  return (
    <Modal open={open} onClose={onClose} title={modalTitle}>
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        {Object.keys(byDay).length === 0 ? (
          <p className="text-sm text-ink-muted">{t.noLessons}</p>
        ) : (
          Object.entries(byDay).map(([day, dayLessons]) => (
            <div key={day} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{day}</p>
              <div className="space-y-2">
                {dayLessons.map((lesson) => (
                  <button
                    key={lesson._id}
                    onClick={() => onSelect(lesson)}
                    className="w-full text-left px-3 py-2 rounded border border-border bg-surface hover:border-accent hover:bg-accent/5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{lesson.subject}</p>
                        <p className="text-xs text-ink-muted">
                          {format(new Date(lesson.startTime), "HH:mm")} – {format(new Date(lesson.endTime), "HH:mm")}
                        </p>
                      </div>
                      {lesson.location && <span className="text-xs text-ink-muted">{lesson.location}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

// ─── Add Homework Modal ─────────────────────────────────────────────────────
function AddHomeworkModal({ open, onClose, lessons }: { open: boolean; onClose: () => void; lessons: any[] }) {
  const { t } = useLang();
  const create = useMutation(api.homework.create);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [lesson, setLesson] = useState<any>(null);
  const [lessonPicker, setLessonPicker] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => { setTitle(""); setDesc(""); setLesson(null); setDone(false); };

  const submit = async () => {
    if (!title.trim() || !lesson) return;
    await create({ lessonId: lesson._id, title, description: desc || undefined, subject: lesson.subject, dueDate: lesson.startTime });
    setDone(true);
    setTimeout(() => { reset(); onClose(); }, 900);
  };

  return (
    <>
      <Modal open={open} onClose={() => { reset(); onClose(); }} title={t.addHomework}>
        <div className="space-y-3">
          {done ? (
            <div className="flex items-center gap-2 text-success py-2">
              <ClipboardCheck size={16} /> {t.homeworkAdded}
            </div>
          ) : (
            <>
              <Input label={t.title} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.exampleHomework} />
              <Textarea label={t.description} value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">{t.subject} / Les</label>
                {lesson ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded border border-accent/40 bg-accent/5 text-sm text-ink">
                      {lesson.subject} · {format(new Date(lesson.startTime), "EEE d MMM · HH:mm")}
                    </div>
                    <button onClick={() => setLesson(null)} className="p-1.5 text-ink-muted hover:text-danger">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setLessonPicker(true)}>
                    {t.selectLesson}
                  </Button>
                )}
                <p className="text-xs text-ink-muted mt-1">{t.homeworkNote}</p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => { reset(); onClose(); }}>{t.cancel}</Button>
                <Button variant="primary" onClick={submit} disabled={!lesson || !title.trim()}>{t.add}</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
      <LessonPickerModal
        open={lessonPicker}
        onClose={() => setLessonPicker(false)}
        lessons={lessons}
        onSelect={(l) => { setLesson(l); setLessonPicker(false); }}
        title={t.pickLesson}
      />
    </>
  );
}

// ─── Add Task Modal ─────────────────────────────────────────────────────────
function AddTaskModal({ open, onClose, lessons }: { open: boolean; onClose: () => void; lessons: any[] }) {
  const { t } = useLang();
  const create = useMutation(api.tasks.create);
  const [title, setTitle] = useState("");
  const [lesson, setLesson] = useState<any>(null);
  const [lessonPicker, setLessonPicker] = useState(false);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [done, setDone] = useState(false);

  const reset = () => { setTitle(""); setLesson(null); setPriority("medium"); setDone(false); };

  const submit = async () => {
    if (!title.trim()) return;
    await create({
      title,
      subject: lesson?.subject || undefined,
      dueDate: lesson?.startTime || undefined,
      priority,
    });
    setDone(true);
    setTimeout(() => { reset(); onClose(); }, 900);
  };

  return (
    <>
      <Modal open={open} onClose={() => { reset(); onClose(); }} title={t.addTask}>
        <div className="space-y-3">
          {done ? (
            <div className="flex items-center gap-2 text-success py-2">
              <CheckSquare size={16} /> {t.taskAdded}
            </div>
          ) : (
            <>
              <Input label={t.title} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="bijv. Samenvatting maken" />
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">{t.priority}</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((p) => (
                    <button key={p} onClick={() => setPriority(p)}
                      className={clsx("px-3 py-1 text-xs rounded-full border transition-colors capitalize",
                        priority === p ? "bg-ink text-white border-ink" : "border-border text-ink-muted hover:border-border-strong"
                      )}>
                      {t[p]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Les koppelen (optioneel)</label>
                {lesson ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded border border-accent/40 bg-accent/5 text-sm text-ink">
                      {lesson.subject} · {format(new Date(lesson.startTime), "EEE d MMM · HH:mm")}
                    </div>
                    <button onClick={() => setLesson(null)} className="p-1.5 text-ink-muted hover:text-danger">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setLessonPicker(true)}>
                    {t.selectLesson}
                  </Button>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => { reset(); onClose(); }}>{t.cancel}</Button>
                <Button variant="primary" onClick={submit} disabled={!title.trim()}>{t.add}</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
      <LessonPickerModal
        open={lessonPicker}
        onClose={() => setLessonPicker(false)}
        lessons={lessons}
        onSelect={(l) => { setLesson(l); setLessonPicker(false); }}
        title={t.pickLesson}
      />
    </>
  );
}

// ─── Add Test Modal ─────────────────────────────────────────────────────────
function AddTestModal({ open, onClose, lessons }: { open: boolean; onClose: () => void; lessons: any[] }) {
  const { t } = useLang();
  const create = useMutation(api.misc.createTest);
  const [topic, setTopic] = useState("");
  const [lesson, setLesson] = useState<any>(null);
  const [lessonPicker, setLessonPicker] = useState(false);
  const [done, setDone] = useState(false);

  const reset = () => { setTopic(""); setLesson(null); setDone(false); };

  const submit = async () => {
    if (!topic.trim() || !lesson) return;
    await create({ topic, subject: lesson.subject, date: lesson.startTime, lessonId: lesson._id });
    setDone(true);
    setTimeout(() => { reset(); onClose(); }, 900);
  };

  return (
    <>
      <Modal open={open} onClose={() => { reset(); onClose(); }} title={t.addTest}>
        <div className="space-y-3">
          {done ? (
            <div className="flex items-center gap-2 text-success py-2">
              <FlaskConical size={16} /> {t.testAdded}
            </div>
          ) : (
            <>
              <Input label={t.topic} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="bijv. Hoofdstuk 4" />
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">{t.selectLesson}</label>
                {lesson ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded border border-accent/40 bg-accent/5 text-sm text-ink">
                      {lesson.subject} · {format(new Date(lesson.startTime), "EEE d MMM · HH:mm")}
                    </div>
                    <button onClick={() => setLesson(null)} className="p-1.5 text-ink-muted hover:text-danger">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setLessonPicker(true)}>
                    {t.selectLesson}
                  </Button>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => { reset(); onClose(); }}>{t.cancel}</Button>
                <Button variant="primary" onClick={submit} disabled={!lesson || !topic.trim()}>{t.add}</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
      <LessonPickerModal
        open={lessonPicker}
        onClose={() => setLessonPicker(false)}
        lessons={lessons}
        onSelect={(l) => { setLesson(l); setLessonPicker(false); }}
        title={t.pickLesson}
      />
    </>
  );
}

// ─── + Dropdown Button ──────────────────────────────────────────────────────
function AddDropdown({ lessons }: { lessons: any[] }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"homework" | "task" | "test" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = [
    { key: "homework", label: t.addHomework, icon: ClipboardList, color: "text-emerald-600" },
    { key: "task",     label: t.addTask,     icon: CheckSquare,   color: "text-blue-600" },
    { key: "test",     label: t.addTest,     icon: FlaskConical,  color: "text-purple-600" },
  ] as const;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
          open ? "bg-accent text-white" : "bg-accent text-white hover:bg-accent-hover"
        )}
      >
        <Plus size={13} />
        {t.addToCalendar}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-surface border border-border rounded-xl shadow-modal w-52 py-1.5 animate-slide-up">
          {items.map(({ key, label, icon: Icon, color }) => (
            <button
              key={key}
              onClick={() => { setModal(key); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-ink hover:bg-border/40 transition-colors"
            >
              <Icon size={14} className={color} />
              {label}
            </button>
          ))}
        </div>
      )}

      <AddHomeworkModal open={modal === "homework"} onClose={() => setModal(null)} lessons={lessons} />
      <AddTaskModal     open={modal === "task"}     onClose={() => setModal(null)} lessons={lessons} />
      <AddTestModal     open={modal === "test"}     onClose={() => setModal(null)} lessons={lessons} />
    </div>
  );
}

// ─── Main Calendar Page ─────────────────────────────────────────────────────
export default function CalendarPage() {
  const { user } = useUser();
  const { t } = useLang();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5);

  const settings = useQuery(api.userSettings.get);
  const syncCalendar = useAction(api.ical.syncCalendar);
  const [autoSynced, setAutoSynced] = useState(false);

  // Auto-sync iCal when page opens, if URL is configured
  useEffect(() => {
    if (!autoSynced && settings?.icalUrl && user?.id) {
      setAutoSynced(true);
      syncCalendar({ userId: user.id, icalUrl: settings.icalUrl }).catch(() => {
        // Silent fail — user can manually sync in settings
      });
    }
  }, [settings, user, autoSynced, syncCalendar]);

  const lessons      = useQuery(api.lessons.getRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const tests        = useQuery(api.misc.getTests);
  const appointments = useQuery(api.misc.getAppointments);
  const homework     = useQuery(api.homework.getAll);
  const allLessons   = useQuery(api.lessons.getAll);
  const homeworkSessions = useQuery(studyApi.getHomeworkSessionsInRange, {
    from: weekStart.getTime(), to: weekEnd.getTime(),
  });
  const rehearsalSessions = useQuery(studyApi.getRehearsalSessionsInRange, {
    from: weekStart.getTime(), to: weekEnd.getTime(),
  });
  const studySessions = useQuery(studyApi.getStudySessionsInRange, {
    from: weekStart.getTime(), to: weekEnd.getTime(),
  });

  const homeworkLessonIds = useMemo(
    () => new Set((homework ?? []).filter((h: any) => h.lessonId).map((h: any) => String(h.lessonId))),
    [homework]
  );

  const testLessonIds = useMemo(
    () => new Set((tests ?? []).filter((t: any) => t.lessonId).map((t: any) => String(t.lessonId))),
    [tests]
  );

  const weekTests = (tests ?? []).filter((t) => {
    const d = new Date(t.date);
    return d >= weekStart && d <= weekEnd;
  });

  function getLessonsAt(day: Date, period: string) {
    return (lessons ?? []).filter(
      (l) => isSameDay(new Date(l.startTime), day) && lessonPeriod(l.startTime) === period
    );
  }

  function getTestsAt(day: Date) {
    return weekTests.filter((t) => isSameDay(new Date(t.date), day));
  }

  function getStudySessionsAt(day: Date) {
    return (studySessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day));
  }

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t.rooster}
        subtitle={`${format(weekStart, "d MMM")} – ${format(weekEnd, "d MMM yyyy")}`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <button onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                className="p-1.5 rounded hover:bg-border transition-colors text-ink-muted hover:text-ink">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
                className="px-2.5 py-1 text-xs rounded border border-border hover:bg-border transition-colors text-ink-muted">
                {t.today2}
              </button>
              <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                className="p-1.5 rounded hover:bg-border transition-colors text-ink-muted hover:text-ink">
                <ChevronRight size={16} />
              </button>
            </div>
            <AddDropdown lessons={allLessons ?? []} />
          </div>
        }
      />

      <div className="overflow-x-auto">
        <div className="min-w-[500px]">

          {/* Day header */}
          <div className="grid gap-x-1 mb-1" style={{ gridTemplateColumns: "52px repeat(5, 1fr)" }}>
            <div />
            {days.map((day) => (
              <div key={day.toISOString()} className="text-center pb-2 border-b border-border">
                <p className="text-[11px] text-ink-muted font-medium uppercase tracking-wider">
                  {format(day, "EEE")}
                </p>
                <p className={clsx(
                  "text-sm font-semibold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto",
                  isToday(day) ? "bg-accent text-white" : "text-ink"
                )}>
                  {format(day, "d")}
                </p>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {getTestsAt(day).map((t) => (
                    <div key={t._id} title={`Toets: ${t.topic}`}>
                      <FlaskConical size={13} className="text-purple-500" />
                    </div>
                  ))}
                  {getStudySessionsAt(day).length > 0 && (
                    <div title={`${getStudySessionsAt(day).length} studie sessie(s)`}>
                      <BookOpen size={12} className="text-purple-400" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* School period rows */}
          {SCHOOL_PERIODS.map((period, idx) => (
            <div key={period.label}>
              {hasBreakBefore(idx) && (
                <div className="grid gap-x-1 items-center"
                  style={{ gridTemplateColumns: "52px repeat(5, 1fr)", height: breakHeightPx(idx) }}>
                  <div className="text-right pr-2">
                    <span className="text-[9px] text-ink-light italic">{t.break}</span>
                  </div>
                  {days.map((day) => (
                    <div key={day.toISOString()} className="h-full bg-border/20 rounded mx-0.5" />
                  ))}
                </div>
              )}

              <div className="grid gap-x-1 mb-0.5" style={{ gridTemplateColumns: "52px repeat(5, 1fr)" }}>
                <div className="flex flex-col items-end justify-start pr-2 pt-1 shrink-0">
                  <span className="text-[10px] text-ink-muted font-medium leading-tight">
                    {String(period.startHH).padStart(2, "0")}:{String(period.startMM).padStart(2, "0")}
                  </span>
                  <span className="text-[9px] text-ink-light leading-tight">{period.label}</span>
                </div>

                {days.map((day) => {
                  const cellLessons = getLessonsAt(day, period.label);
                  const cellAppointments = getAppointmentsAtPeriod(appointments ?? [], day, period);
                  return (
                    <div key={day.toISOString()} className="min-h-[54px]">
                      {cellAppointments.length > 0 && (
                        <div className="space-y-1 mb-1">
                          {cellAppointments.map((a) => (
                            <div key={a._id}
                              className="rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[11px] text-purple-800 truncate">
                              <span className="font-semibold">{a.isRecurring ? a.recurringTimeHHMM : format(new Date(a.startTime), "HH:mm")}</span>
                              <span className="ml-1 truncate">{a.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {cellLessons.length === 0 ? (
                        <div className="h-full min-h-[54px] rounded border border-dashed border-border/30" />
                      ) : (
                        cellLessons.map((l) => (
                          <Link key={l._id} to={`/lesson/${l._id}`}>
                            <div className={clsx(
                              "rounded border border-border bg-surface px-1.5 py-1 min-h-[54px] flex flex-col gap-0.5 hover:bg-bg hover:border-border-strong transition-colors cursor-pointer",
                              l.isEvent && "border-l-4 border-l-purple-400"
                            )}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold text-ink leading-tight">
                                  {subjectDisplay(l.subject)}
                                </span>
                                <div className="flex items-center gap-1">
                                  {homeworkLessonIds.has(String(l._id)) && (
                                    <span className="h-2.5 w-2.5 rounded-full bg-purple-500" title="Huiswerk" />
                                  )}
                                  {testLessonIds.has(String(l._id)) && (
                                    <span className="block" title="Toets"
                                      style={{ width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderBottom: "8px solid #8b5cf6" }} />
                                  )}
                                </div>
                              </div>
                              {l.location && (
                                <span className="text-[10px] text-ink-muted leading-tight flex items-center gap-0.5">
                                  <MapPin size={8} className="shrink-0" />{l.location}
                                </span>
                              )}
                            </div>
                          </Link>
                        ))
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Divider */}
          <div className="grid gap-x-1 my-2" style={{ gridTemplateColumns: "52px repeat(5, 1fr)" }}>
            <div />
            <div className="col-span-5 border-t border-border" />
          </div>

          {/* Evening rows */}
          {EVENING_HOURS.map((hour) => (
            <div key={hour} className="grid gap-x-1 mb-0.5" style={{ gridTemplateColumns: "52px repeat(5, 1fr)" }}>
              <div className="flex flex-col items-end justify-start pr-2 pt-1 shrink-0">
                <span className="text-[10px] text-ink-muted font-medium leading-tight">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>

              {days.map((day) => {
                const appts  = appointmentsInHour(appointments ?? [], day, hour);
                const studys = studySessionsInHour(studySessions ?? [], day, hour);
                const hwSess = homeworkSessionsInHour(homeworkSessions ?? [], day, hour);
                const rehSess = rehearsalSessionsInHour(rehearsalSessions ?? [], day, hour);
                const hasContent = appts.length > 0 || studys.length > 0 || hwSess.length > 0 || rehSess.length > 0;
                return (
                  <div key={day.toISOString()} className="min-h-[40px] space-y-1">
                    {!hasContent && (
                      <div className="h-full min-h-[40px] rounded border border-dashed border-border/20" />
                    )}
                    {appts.map((a) => (
                      <div key={a._id}
                        className="rounded border px-1.5 py-1 min-h-[40px] flex flex-col gap-0.5"
                        style={{ backgroundColor: (a.color ?? "#6B7280") + "18", borderColor: (a.color ?? "#6B7280") + "55" }}
                        title={a.title}
                      >
                        <span className="text-[11px] font-semibold leading-tight truncate" style={{ color: a.color ?? "#6B7280" }}>
                          {a.title}
                        </span>
                        {a.location && (
                          <span className="text-[10px] leading-tight flex items-center gap-0.5 text-ink-muted">
                            <MapPin size={8} className="shrink-0" />{a.location}
                          </span>
                        )}
                      </div>
                    ))}
                    {studys.map((s) => (
                      <div key={s._id}
                        className={clsx(
                          "rounded border border-purple-200 bg-purple-50/60 px-1.5 py-1 min-h-[40px] flex flex-col gap-0.5",
                          s.done && "opacity-50"
                        )}
                        title={s.title}
                      >
                        <div className="flex items-center gap-1">
                          <BookOpen size={9} className="text-purple-500 flex-shrink-0" />
                          <span className="text-[11px] font-semibold leading-tight truncate text-purple-800">{s.title}</span>
                        </div>
                        <span className="text-[10px] text-purple-600 leading-tight">
                          {format(new Date(s.startTime), "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}{s.done && " ✓"}
                        </span>
                      </div>
                    ))}
                    {hwSess.map((s) => (
                      <div key={s._id}
                        className={clsx(
                          "rounded border border-emerald-200 bg-emerald-50/60 px-1.5 py-1 min-h-[40px] flex flex-col gap-0.5",
                          s.done && "opacity-50"
                        )}
                        title={s.title}
                      >
                        <div className="flex items-center gap-1">
                          <ClipboardList size={9} className="text-emerald-500 flex-shrink-0" />
                          <span className="text-[11px] font-semibold leading-tight truncate text-emerald-800">{s.title}</span>
                        </div>
                        <span className="text-[10px] text-emerald-600 leading-tight">
                          {format(new Date(s.startTime), "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}{s.done && " ✓"}
                        </span>
                      </div>
                    ))}
                    {rehSess.map((s) => (
                      <div key={s._id}
                        className={clsx(
                          "rounded border border-amber-200 bg-amber-50/60 px-1.5 py-1 min-h-[40px] flex flex-col gap-0.5",
                          s.done && "opacity-50"
                        )}
                        title={s.title}
                      >
                        <div className="flex items-center gap-1">
                          <RefreshCw size={9} className="text-amber-500 flex-shrink-0" />
                          <span className="text-[11px] font-semibold leading-tight truncate text-amber-800">{s.title}</span>
                        </div>
                        <span className="text-[10px] text-amber-600 leading-tight">
                          {format(new Date(s.startTime), "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}{s.done && " ✓"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}