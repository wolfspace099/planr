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

// ─── Layout constants ───────────────────────────────────────────────────────
const HOUR_HEIGHT = 56;        // px per hour
const START_HOUR  = 7;         // first visible hour
const END_HOUR    = 23;        // last visible hour (exclusive)
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_COL_W  = 52;        // px, left gutter for time labels

// ─── Helpers ────────────────────────────────────────────────────────────────
function toTopPx(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  return (h - START_HOUR) * HOUR_HEIGHT;
}

function durationPx(startMs: number, endMs: number): number {
  return ((endMs - startMs) / 3_600_000) * HOUR_HEIGHT;
}

function subjectDisplay(subject: string): string {
  return subject.length > 12 ? subject.slice(0, 10) + "…" : subject;
}

// ─── School periods (for label overlay only) ────────────────────────────────
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

function lessonPeriod(startTime: number): string | null {
  const d = new Date(startTime);
  const mins = d.getHours() * 60 + d.getMinutes();
  for (const p of SCHOOL_PERIODS) {
    const pMins = p.startHH * 60 + p.startMM;
    if (Math.abs(mins - pMins) <= 5) return p.label;
  }
  return null;
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
    await create({ title, subject: lesson?.subject || undefined, dueDate: lesson?.startTime || undefined, priority });
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

// ─── Now-line ───────────────────────────────────────────────────────────────
function NowLine({ days }: { days: Date[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const todayIdx = days.findIndex((d) => isToday(d));
  if (todayIdx === -1) return null;

  const h = now.getHours() + now.getMinutes() / 60;
  if (h < START_HOUR || h >= END_HOUR) return null;

  const top = (h - START_HOUR) * HOUR_HEIGHT;
  // span from today's column to end
  const leftPct = (todayIdx / 5) * 100;
  const widthPct = ((5 - todayIdx) / 5) * 100;

  return (
    <div
      className="absolute z-30 pointer-events-none flex items-center"
      style={{ top: top - 1, left: `${leftPct}%`, width: `${widthPct}%` }}
    >
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 -ml-1.5 shadow-sm" />
      <div className="flex-1 h-[2px] bg-red-500 opacity-80" />
    </div>
  );
}

// ─── Event chip helpers ──────────────────────────────────────────────────────
interface EventChip {
  key: string;
  top: number;
  height: number;
  dayIdx: number;
  node: React.ReactNode;
}

// ─── Main Calendar Page ─────────────────────────────────────────────────────
export default function CalendarPage() {
  const { user } = useUser();
  const { t } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5);

  const settings    = useQuery(api.userSettings.get);
  const syncCalendar = useAction(api.ical.syncCalendar);
  const [autoSynced, setAutoSynced] = useState(false);

  useEffect(() => {
    if (!autoSynced && settings?.icalUrl && user?.id) {
      setAutoSynced(true);
      syncCalendar({ userId: user.id, icalUrl: settings.icalUrl }).catch(() => {});
    }
  }, [settings, user, autoSynced, syncCalendar]);

  // Scroll to current hour on mount
  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    const top = Math.max(0, (h - START_HOUR - 1) * HOUR_HEIGHT);
    scrollRef.current.scrollTop = top;
  }, []);

  const lessons           = useQuery(api.lessons.getRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const tests             = useQuery(api.misc.getTests);
  const appointments      = useQuery(api.misc.getAppointments);
  const homework          = useQuery(api.homework.getAll);
  const allLessons        = useQuery(api.lessons.getAll);
  const homeworkSessions  = useQuery(studyApi.getHomeworkSessionsInRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const rehearsalSessions = useQuery(studyApi.getRehearsalSessionsInRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const studySessions     = useQuery(studyApi.getStudySessionsInRange, { from: weekStart.getTime(), to: weekEnd.getTime() });

  const homeworkLessonIds = useMemo(
    () => new Set((homework ?? []).filter((h: any) => h.lessonId).map((h: any) => String(h.lessonId))),
    [homework]
  );
  const testLessonIds = useMemo(
    () => new Set((tests ?? []).filter((tt: any) => tt.lessonId).map((tt: any) => String(tt.lessonId))),
    [tests]
  );

  const weekTests = (tests ?? []).filter((tt) => {
    const d = new Date(tt.date);
    return d >= weekStart && d <= weekEnd;
  });

  // ── Build event chips per day ───────────────────────────────────────────
  function getChipsForDay(day: Date, dayIdx: number): EventChip[] {
    const chips: EventChip[] = [];

    // Lessons
    (lessons ?? [])
      .filter((l) => isSameDay(new Date(l.startTime), day))
      .forEach((l) => {
        const start = new Date(l.startTime);
        const end   = new Date(l.endTime);
        const top    = toTopPx(start);
        const height = Math.max(durationPx(l.startTime, l.endTime), 22);
        const period = lessonPeriod(l.startTime);
        chips.push({
          key: `lesson-${l._id}`,
          top, height, dayIdx,
          node: (
            <Link key={l._id} to={`/lesson/${l._id}`} className="block h-full">
              <div className={clsx(
                "h-full rounded border border-border bg-surface px-1.5 py-1 flex flex-col gap-0.5 hover:bg-bg hover:border-border-strong transition-colors overflow-hidden",
                l.isEvent && "border-l-4 border-l-purple-400"
              )}>
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-semibold text-ink leading-tight truncate">
                    {subjectDisplay(l.subject)}
                  </span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {homeworkLessonIds.has(String(l._id)) && (
                      <span className="h-2 w-2 rounded-full bg-purple-500 flex-shrink-0" title="Huiswerk" />
                    )}
                    {testLessonIds.has(String(l._id)) && (
                      <span title="Toets">
                        <FlaskConical size={9} className="text-purple-500 flex-shrink-0" />
                      </span>
                    )}
                  </div>
                </div>
                {period && <span className="text-[9px] text-ink-light leading-none">{period}</span>}
                {l.location && (
                  <span className="text-[9px] text-ink-muted leading-tight flex items-center gap-0.5 truncate">
                    <MapPin size={7} className="shrink-0" />{l.location}
                  </span>
                )}
                <span className="text-[9px] text-ink-light leading-none mt-auto">
                  {format(start, "HH:mm")}–{format(end, "HH:mm")}
                </span>
              </div>
            </Link>
          ),
        });
      });

    // Appointments
    (appointments ?? []).forEach((a) => {
      let startMs: number;
      if (a.isRecurring) {
        if (a.recurringDayOfWeek !== day.getDay()) return;
        const parts = String(a.recurringTimeHHMM ?? "0:00").split(":");
        const [hh, mm] = parts.map((v: string) => parseInt(v, 10));
        const d = new Date(day);
        d.setHours(hh, mm, 0, 0);
        startMs = d.getTime();
      } else {
        if (!isSameDay(new Date(a.startTime), day)) return;
        startMs = a.startTime;
      }
      const endMs = a.endTime ?? startMs + 50 * 60_000;
      const start = new Date(startMs);
      const top    = toTopPx(start);
      const height = Math.max(durationPx(startMs, endMs), 22);
      chips.push({
        key: `appt-${a._id}-${dayIdx}`,
        top, height, dayIdx,
        node: (
          <div
            className="h-full rounded border px-1.5 py-1 flex flex-col gap-0.5 overflow-hidden"
            style={{ backgroundColor: (a.color ?? "#6B7280") + "18", borderColor: (a.color ?? "#6B7280") + "66" }}
          >
            <span className="text-[11px] font-semibold leading-tight truncate" style={{ color: a.color ?? "#6B7280" }}>
              {a.title}
            </span>
            {a.location && (
              <span className="text-[9px] leading-tight flex items-center gap-0.5 text-ink-muted truncate">
                <MapPin size={7} className="shrink-0" />{a.location}
              </span>
            )}
            <span className="text-[9px] text-ink-light leading-none mt-auto">{format(start, "HH:mm")}</span>
          </div>
        ),
      });
    });

    // Study sessions
    (studySessions ?? [])
      .filter((s: any) => isSameDay(new Date(s.startTime), day))
      .forEach((s: any) => {
        const start = new Date(s.startTime);
        const top    = toTopPx(start);
        const height = Math.max(durationPx(s.startTime, s.endTime), 22);
        chips.push({
          key: `study-${s._id}`,
          top, height, dayIdx,
          node: (
            <div className={clsx("h-full rounded border border-purple-200 bg-purple-50/60 px-1.5 py-1 flex flex-col gap-0.5 overflow-hidden", s.done && "opacity-50")}>
              <div className="flex items-center gap-1">
                <BookOpen size={8} className="text-purple-500 flex-shrink-0" />
                <span className="text-[11px] font-semibold leading-tight truncate text-purple-800">{s.title}</span>
              </div>
              <span className="text-[9px] text-purple-600 leading-none mt-auto">
                {format(start, "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}{s.done && " ✓"}
              </span>
            </div>
          ),
        });
      });

    // Homework sessions
    (homeworkSessions ?? [])
      .filter((s: any) => isSameDay(new Date(s.startTime), day))
      .forEach((s: any) => {
        const start = new Date(s.startTime);
        const top    = toTopPx(start);
        const height = Math.max(durationPx(s.startTime, s.endTime), 22);
        chips.push({
          key: `hw-${s._id}`,
          top, height, dayIdx,
          node: (
            <div className={clsx("h-full rounded border border-emerald-200 bg-emerald-50/60 px-1.5 py-1 flex flex-col gap-0.5 overflow-hidden", s.done && "opacity-50")}>
              <div className="flex items-center gap-1">
                <ClipboardList size={8} className="text-emerald-500 flex-shrink-0" />
                <span className="text-[11px] font-semibold leading-tight truncate text-emerald-800">{s.title}</span>
              </div>
              <span className="text-[9px] text-emerald-600 leading-none mt-auto">
                {format(start, "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}{s.done && " ✓"}
              </span>
            </div>
          ),
        });
      });

    // Rehearsal sessions
    (rehearsalSessions ?? [])
      .filter((s: any) => isSameDay(new Date(s.startTime), day))
      .forEach((s: any) => {
        const start = new Date(s.startTime);
        const top    = toTopPx(start);
        const height = Math.max(durationPx(s.startTime, s.endTime), 22);
        chips.push({
          key: `reh-${s._id}`,
          top, height, dayIdx,
          node: (
            <div className={clsx("h-full rounded border border-amber-200 bg-amber-50/60 px-1.5 py-1 flex flex-col gap-0.5 overflow-hidden", s.done && "opacity-50")}>
              <div className="flex items-center gap-1">
                <RefreshCw size={8} className="text-amber-500 flex-shrink-0" />
                <span className="text-[11px] font-semibold leading-tight truncate text-amber-800">{s.title}</span>
              </div>
              <span className="text-[9px] text-amber-600 leading-none mt-auto">
                {format(start, "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}{s.done && " ✓"}
              </span>
            </div>
          ),
        });
      });

    return chips;
  }

  const totalGridHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);

  return (
    <div className="animate-fade-in flex flex-col h-full">
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

      {/* Sticky day-header row */}
      <div className="overflow-x-auto flex-shrink-0">
        <div className="min-w-[500px]">
          <div className="grid" style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(5, 1fr)` }}>
            <div /> {/* time gutter */}
            {days.map((day) => (
              <div key={day.toISOString()} className="text-center py-2 border-b border-border">
                <p className="text-[11px] text-ink-muted font-medium uppercase tracking-wider">
                  {format(day, "EEE")}
                </p>
                <p className={clsx(
                  "text-sm font-semibold mt-0.5 w-7 h-7 rounded-full flex items-center justify-center mx-auto",
                  isToday(day) ? "bg-accent text-white" : "text-ink"
                )}>
                  {format(day, "d")}
                </p>
                {/* test/study badges */}
                <div className="flex items-center justify-center gap-1 mt-0.5 min-h-[14px]">
                  {weekTests.filter((tt) => isSameDay(new Date(tt.date), day)).map((tt) => (
                    <span key={tt._id} title={`Toets: ${tt.topic}`}>
                      <FlaskConical size={11} className="text-purple-500" />
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable time grid */}
      <div ref={scrollRef} className="overflow-y-auto overflow-x-auto flex-1">
        <div className="min-w-[500px]">
          <div
            className="grid relative"
            style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(5, 1fr)`, height: totalGridHeight }}
          >
            {/* Hour labels column */}
            <div className="relative">
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute w-full flex items-start justify-end pr-2"
                  style={{ top: i * HOUR_HEIGHT - 8, height: HOUR_HEIGHT }}
                >
                  <span className="text-[10px] text-ink-light font-medium leading-none">
                    {String(h).padStart(2, "0")}:00
                  </span>
                </div>
              ))}
            </div>

            {/* 5 day columns */}
            {days.map((day, dayIdx) => {
              const chips = getChipsForDay(day, dayIdx);
              return (
                <div
                  key={day.toISOString()}
                  className={clsx(
                    "relative border-l border-border/30",
                    dayIdx === 0 && "border-l-0"
                  )}
                  style={{ height: totalGridHeight }}
                >
                  {/* Horizontal hour lines */}
                  {hours.map((h, i) => (
                    <div
                      key={h}
                      className={clsx(
                        "absolute w-full border-t",
                        i === 0 ? "border-border/60" : "border-border/25"
                      )}
                      style={{ top: i * HOUR_HEIGHT }}
                    />
                  ))}

                  {/* Half-hour ticks */}
                  {hours.map((h, i) => (
                    <div
                      key={`half-${h}`}
                      className="absolute w-full border-t border-border/10 border-dashed"
                      style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                    />
                  ))}

                  {/* Event chips */}
                  {chips.map((chip) => (
                    <div
                      key={chip.key}
                      className="absolute px-0.5"
                      style={{
                        top: chip.top,
                        height: chip.height,
                        left: 2,
                        right: 2,
                      }}
                    >
                      {chip.node}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Now line overlay — spans full grid width */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: 0,
                left: TIME_COL_W,
                right: 0,
                height: totalGridHeight,
              }}
            >
              <NowLine days={days} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}