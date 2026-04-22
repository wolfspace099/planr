import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { studyApi } from "../studyApi";
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval,
  format, isSameDay, isToday,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, MapPin, FlaskConical, BookOpen,
  ClipboardList, RefreshCw, Plus, X, ClipboardCheck, CheckSquare,
  Check, Calendar as CalendarIcon,
  LayoutDashboard, Repeat2, CalendarClock, GraduationCap, Settings,
} from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { PageHeader, Modal, Input, Textarea, Button } from "../components/ui/primitives";
import { useLang } from "../i18n";
import clsx from "clsx";

const HOUR_HEIGHT = 68;
const START_HOUR  = 7;
const END_HOUR    = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_COL_W  = 64;

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

const SCHOOL_PERIODS = [
  { label: "u1", startHH: 8,  startMM: 30 },
  { label: "u2", startHH: 9,  startMM: 20 },
  { label: "u3", startHH: 10, startMM: 25 },
  { label: "u4", startHH: 11, startMM: 15 },
  { label: "u5", startHH: 12, startMM: 30 },
  { label: "u6", startHH: 13, startMM: 20 },
  { label: "u7", startHH: 14, startMM: 25 },
  { label: "u8", startHH: 15, startMM: 15 },
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

// ─── Create Appointment Modal ────────────────────────────────────────────────
function CreateAppointmentModal({
  open, onClose, initialDate, initialHour, calendars,
}: {
  open: boolean;
  onClose: () => void;
  initialDate: Date | null;
  initialHour: number;
  calendars: any[];
}) {
  const create = useMutation(api.misc.createAppointment);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [calendarId, setCalendarId] = useState<string>("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      const h = initialHour;
      setStartTime(`${String(h).padStart(2, "0")}:00`);
      setEndTime(`${String(Math.min(h + 1, 22)).padStart(2, "0")}:00`);
      setTitle(""); setDesc(""); setLocation(""); setDone(false);
      const defaultCal = calendars.find((c) => !c.isSchedule);
      setCalendarId(defaultCal?._id ?? "");
    }
  }, [open, initialHour, calendars]);

  const submit = async () => {
    if (!title.trim() || !initialDate) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(initialDate); start.setHours(sh, sm, 0, 0);
    const end   = new Date(initialDate); end.setHours(eh, em, 0, 0);
    const cal = calendars.find((c) => c._id === calendarId);
    await create({
      title, description: desc || undefined, location: location || undefined,
      startTime: start.getTime(), endTime: end.getTime(),
      isRecurring: false,
      color: cal?.color ?? "#8B5CF6",
      calendarId: calendarId ? calendarId as any : undefined,
    });
    setDone(true);
    setTimeout(onClose, 800);
  };

  return (
    <Modal open={open} onClose={onClose} title="Afspraak aanmaken">
      <div className="space-y-3">
        {done ? (
          <div className="flex items-center gap-2 text-success py-2"><Check size={16} /> Aangemaakt</div>
        ) : (
          <>
            <Input label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naam van de afspraak" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Start</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-sm text-ink focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Einde</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-sm text-ink focus:outline-none focus:border-accent" />
              </div>
            </div>
            {initialDate && (
              <p className="text-xs text-ink-muted">📅 {format(initialDate, "EEEE d MMMM")}</p>
            )}
            <Input label="Locatie (optioneel)" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="bijv. Lokaal 3A" />
            <Textarea label="Omschrijving (optioneel)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
            {calendars.filter((c) => !c.isSchedule).length > 0 && (
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Agenda</label>
                <div className="flex flex-wrap gap-2">
                  {calendars.filter((c) => !c.isSchedule).map((cal) => (
                    <button key={cal._id} onClick={() => setCalendarId(cal._id)}
                      className={clsx("flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors",
                        calendarId === cal._id ? "border-transparent text-white" : "border-border text-ink-muted hover:border-border-strong"
                      )}
                      style={calendarId === cal._id ? { backgroundColor: cal.color } : {}}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                      {cal.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>Annuleren</Button>
              <Button variant="primary" onClick={submit} disabled={!title.trim()}>Aanmaken</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

// ─── Lesson Picker Modal ────────────────────────────────────────────────────
function LessonPickerModal({ open, onClose, lessons, onSelect, title: modalTitle }: {
  open: boolean; onClose: () => void; lessons: any[]; onSelect: (l: any) => void; title: string;
}) {
  const { t } = useLang();
  const byDay = useMemo(() => {
    return lessons.slice().sort((a, b) => a.startTime - b.startTime)
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
              {dayLessons.map((lesson) => (
                <button key={lesson._id} onClick={() => onSelect(lesson)}
                  className="w-full text-left px-3 py-2 rounded border border-border bg-surface hover:border-accent hover:bg-accent/5 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-ink">{lesson.subject}</p>
                      <p className="text-xs text-ink-muted">{format(new Date(lesson.startTime), "HH:mm")} – {format(new Date(lesson.endTime), "HH:mm")}</p>
                    </div>
                    {lesson.location && <span className="text-xs text-ink-muted">{lesson.location}</span>}
                  </div>
                </button>
              ))}
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
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const [lesson, setLesson] = useState<any>(null); const [lessonPicker, setLessonPicker] = useState(false);
  const [done, setDone] = useState(false);
  const reset = () => { setTitle(""); setDesc(""); setLesson(null); setDone(false); };
  const submit = async () => {
    if (!title.trim() || !lesson) return;
    await create({ lessonId: lesson._id, title, description: desc || undefined, subject: lesson.subject, dueDate: lesson.startTime });
    setDone(true); setTimeout(() => { reset(); onClose(); }, 900);
  };
  return (
    <>
      <Modal open={open} onClose={() => { reset(); onClose(); }} title={t.addHomework}>
        <div className="space-y-3">
          {done ? <div className="flex items-center gap-2 text-success py-2"><ClipboardCheck size={16} /> {t.homeworkAdded}</div> : (
            <>
              <Input label={t.title} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.exampleHomework} />
              <Textarea label={t.description} value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">{t.subject} / Les</label>
                {lesson ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded border border-accent/40 bg-accent/5 text-sm text-ink">{lesson.subject} · {format(new Date(lesson.startTime), "EEE d MMM · HH:mm")}</div>
                    <button onClick={() => setLesson(null)} className="p-1.5 text-ink-muted hover:text-danger"><X size={14} /></button>
                  </div>
                ) : <Button variant="secondary" size="sm" onClick={() => setLessonPicker(true)}>{t.selectLesson}</Button>}
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
      <LessonPickerModal open={lessonPicker} onClose={() => setLessonPicker(false)} lessons={lessons} onSelect={(l) => { setLesson(l); setLessonPicker(false); }} title={t.pickLesson} />
    </>
  );
}

// ─── Add Task Modal ─────────────────────────────────────────────────────────
function AddTaskModal({ open, onClose, lessons }: { open: boolean; onClose: () => void; lessons: any[] }) {
  const { t } = useLang();
  const create = useMutation(api.tasks.create);
  const [title, setTitle] = useState(""); const [lesson, setLesson] = useState<any>(null);
  const [lessonPicker, setLessonPicker] = useState(false);
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [done, setDone] = useState(false);
  const reset = () => { setTitle(""); setLesson(null); setPriority("medium"); setDone(false); };
  const submit = async () => {
    if (!title.trim()) return;
    await create({ title, subject: lesson?.subject || undefined, dueDate: lesson?.startTime || undefined, priority });
    setDone(true); setTimeout(() => { reset(); onClose(); }, 900);
  };
  return (
    <>
      <Modal open={open} onClose={() => { reset(); onClose(); }} title={t.addTask}>
        <div className="space-y-3">
          {done ? <div className="flex items-center gap-2 text-success py-2"><CheckSquare size={16} /> {t.taskAdded}</div> : (
            <>
              <Input label={t.title} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="bijv. Samenvatting maken" />
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">{t.priority}</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as const).map((p) => (
                    <button key={p} onClick={() => setPriority(p)}
                      className={clsx("px-3 py-1 text-xs rounded-full border transition-colors capitalize",
                        priority === p ? "bg-ink text-white border-ink" : "border-border text-ink-muted hover:border-border-strong"
                      )}>{t[p]}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Les koppelen (optioneel)</label>
                {lesson ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded border border-accent/40 bg-accent/5 text-sm text-ink">{lesson.subject} · {format(new Date(lesson.startTime), "EEE d MMM · HH:mm")}</div>
                    <button onClick={() => setLesson(null)} className="p-1.5 text-ink-muted hover:text-danger"><X size={14} /></button>
                  </div>
                ) : <Button variant="secondary" size="sm" onClick={() => setLessonPicker(true)}>{t.selectLesson}</Button>}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => { reset(); onClose(); }}>{t.cancel}</Button>
                <Button variant="primary" onClick={submit} disabled={!title.trim()}>{t.add}</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
      <LessonPickerModal open={lessonPicker} onClose={() => setLessonPicker(false)} lessons={lessons} onSelect={(l) => { setLesson(l); setLessonPicker(false); }} title={t.pickLesson} />
    </>
  );
}

// ─── Add Test Modal ─────────────────────────────────────────────────────────
function AddTestModal({ open, onClose, lessons }: { open: boolean; onClose: () => void; lessons: any[] }) {
  const { t } = useLang();
  const create = useMutation(api.misc.createTest);
  const [topic, setTopic] = useState(""); const [lesson, setLesson] = useState<any>(null);
  const [lessonPicker, setLessonPicker] = useState(false); const [done, setDone] = useState(false);
  const reset = () => { setTopic(""); setLesson(null); setDone(false); };
  const submit = async () => {
    if (!topic.trim() || !lesson) return;
    await create({ topic, subject: lesson.subject, date: lesson.startTime, lessonId: lesson._id });
    setDone(true); setTimeout(() => { reset(); onClose(); }, 900);
  };
  return (
    <>
      <Modal open={open} onClose={() => { reset(); onClose(); }} title={t.addTest}>
        <div className="space-y-3">
          {done ? <div className="flex items-center gap-2 text-success py-2"><FlaskConical size={16} /> {t.testAdded}</div> : (
            <>
              <Input label={t.topic} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="bijv. Hoofdstuk 4" />
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">{t.selectLesson}</label>
                {lesson ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-3 py-2 rounded border border-accent/40 bg-accent/5 text-sm text-ink">{lesson.subject} · {format(new Date(lesson.startTime), "EEE d MMM · HH:mm")}</div>
                    <button onClick={() => setLesson(null)} className="p-1.5 text-ink-muted hover:text-danger"><X size={14} /></button>
                  </div>
                ) : <Button variant="secondary" size="sm" onClick={() => setLessonPicker(true)}>{t.selectLesson}</Button>}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" onClick={() => { reset(); onClose(); }}>{t.cancel}</Button>
                <Button variant="primary" onClick={submit} disabled={!lesson || !topic.trim()}>{t.add}</Button>
              </div>
            </>
          )}
        </div>
      </Modal>
      <LessonPickerModal open={lessonPicker} onClose={() => setLessonPicker(false)} lessons={lessons} onSelect={(l) => { setLesson(l); setLessonPicker(false); }} title={t.pickLesson} />
    </>
  );
}

// ─── + Dropdown Button ──────────────────────────────────────────────────────
function AddDropdown({ lessons, calendars, fullWidth }: { lessons: any[]; calendars: any[]; fullWidth?: boolean }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"homework" | "task" | "test" | "appointment" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = [
    { key: "appointment", label: "Afspraak",    icon: CalendarIcon,  color: "text-blue-400" },
    { key: "homework",    label: t.addHomework, icon: ClipboardList, color: "text-emerald-400" },
    { key: "task",        label: t.addTask,     icon: CheckSquare,   color: "text-blue-400" },
    { key: "test",        label: t.addTest,     icon: FlaskConical,  color: "text-purple-400" },
  ] as const;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          "flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-semibold bg-white/10 text-white hover:bg-white/20 transition-colors border border-white/10",
          fullWidth && "w-full justify-center"
        )}
      >
        <Plus size={13} />{t.addToCalendar}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-[#1e1e1e] border border-white/10 rounded-xl shadow-2xl w-52 py-1.5 animate-slide-up">
          {items.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => { setModal(key); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors">
              <Icon size={14} className={color} />{label}
            </button>
          ))}
        </div>
      )}
      <AddHomeworkModal    open={modal === "homework"}    onClose={() => setModal(null)} lessons={lessons} />
      <AddTaskModal        open={modal === "task"}        onClose={() => setModal(null)} lessons={lessons} />
      <AddTestModal        open={modal === "test"}        onClose={() => setModal(null)} lessons={lessons} />
      <CreateAppointmentModal
        open={modal === "appointment"} onClose={() => setModal(null)}
        initialDate={new Date()} initialHour={9} calendars={calendars}
      />
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
  const leftPct = (todayIdx / 5) * 100;
  const widthPct = ((5 - todayIdx) / 5) * 100;
  return (
    <div className="absolute z-30 pointer-events-none flex items-center"
      style={{ top: top - 1, left: `${leftPct}%`, width: `${widthPct}%` }}>
      <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 -ml-1.5 shadow-sm" />
      <div className="flex-1 h-[2px] bg-red-500 opacity-80" />
    </div>
  );
}

// ─── Calendar Side Panel ─────────────────────────────────────────────────────
function CalendarSidePanel({ calendars }: { calendars: any[] }) {
  const toggleVisible = useMutation(api.calendars.toggleVisible);
  const regular  = calendars.filter((c) => !c.isSchedule);
  const schedule = calendars.filter((c) => c.isSchedule);

  const builtIn = [
    { label: "Lessen",    color: "#6B7280" },
    { label: "Studie",    color: "#8B5CF6" },
    { label: "Huiswerk",  color: "#10B981" },
    { label: "Herhaling", color: "#F59E0B" },
  ];

  return (
    <div className="w-44 flex-shrink-0 border-r border-white/[0.06] bg-[#0f0f0f] flex flex-col overflow-y-auto">
      {/* Spacer that matches the day-header height so columns line up */}
      <div className="flex-shrink-0 h-[88px] border-b border-white/[0.06] flex items-end px-4 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/20">Agenda's</p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {regular.length > 0 && (
          <div className="pb-2">
            {regular.map((cal) => (
              <button key={cal._id} onClick={() => toggleVisible({ id: cal._id })}
                className="flex items-center gap-2.5 w-full px-4 py-1.5 hover:bg-white/5 transition-colors">
                <div className="w-3 h-3 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors"
                  style={{ backgroundColor: cal.visible ? cal.color : "transparent", borderColor: cal.color }}>
                  {cal.visible && <Check size={7} className="text-white" strokeWidth={3.5} />}
                </div>
                <span className="text-xs text-white/60 truncate">{cal.name}</span>
              </button>
            ))}
          </div>
        )}

        {schedule.length > 0 && (
          <>
            <div className="px-4 pt-2 pb-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-white/20">Rooster</p>
            </div>
            <div className="pb-2">
              {schedule.map((cal) => (
                <button key={cal._id} onClick={() => toggleVisible({ id: cal._id })}
                  className="flex items-center gap-2.5 w-full px-4 py-1.5 hover:bg-white/5 transition-colors">
                  <div className="w-3 h-3 rounded flex items-center justify-center flex-shrink-0 border-2"
                    style={{ backgroundColor: cal.visible ? cal.color : "transparent", borderColor: cal.color }}>
                    {cal.visible && <Check size={7} className="text-white" strokeWidth={3.5} />}
                  </div>
                  <span className="text-xs text-white/60 truncate">{cal.name}</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div className="px-4 pt-2 pb-1">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/20">Ingebouwd</p>
        </div>
        <div className="pb-4">
          {builtIn.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 px-4 py-1.5">
              <div className="w-3 h-3 rounded border-2 flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: item.color, borderColor: item.color }}>
                <Check size={7} className="text-white" strokeWidth={3.5} />
              </div>
              <span className="text-xs text-white/40">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Event chip interface ────────────────────────────────────────────────────
interface EventChip { key: string; top: number; height: number; node: React.ReactNode; }

type CalendarViewMode = "week" | "studyPlanner";

type PlannerBlock = {
  id: string;
  title: string;
  subtitle: string;
  tone: "test" | "homework" | "study" | "task";
};

function StudyPlannerBoard({
  days,
  weekLabel,
  weekFocus,
  dayBlocks,
}: {
  days: Date[];
  weekLabel: string;
  weekFocus: PlannerBlock[];
  dayBlocks: Record<string, PlannerBlock[]>;
}) {
  const toneClasses: Record<PlannerBlock["tone"], string> = {
    test:     "border-purple-500/30 bg-purple-500/10 text-purple-300",
    homework: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    study:    "border-blue-500/30 bg-blue-500/10 text-blue-300",
    task:     "border-amber-500/30 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className="h-full overflow-auto">
      <div className="min-w-[1080px]">
        {/* Header row */}
        <div className="grid border-b border-white/[0.06]" style={{ gridTemplateColumns: "280px repeat(5, minmax(0, 1fr))" }}>
          <div className="px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">Week focus</p>
            <p className="mt-1 text-sm font-semibold text-white">{weekLabel}</p>
          </div>
          {days.map((day) => (
            <div key={`header-${day.toISOString()}`} className="border-l border-white/[0.06] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-white/30">{format(day, "EEEE")}</p>
              <p className={clsx("mt-1 text-2xl font-semibold", isToday(day) ? "text-white" : "text-white/60")}>{format(day, "d")}</p>
            </div>
          ))}
        </div>

        {/* Content rows */}
        <div className="grid min-h-[640px]" style={{ gridTemplateColumns: "280px repeat(5, minmax(0, 1fr))" }}>
          <div className="space-y-3 border-r border-white/[0.06] p-4">
            {weekFocus.length === 0 ? (
              <p className="text-sm text-white/30">No tests or homework due this week.</p>
            ) : (
              weekFocus.map((item) => (
                <div key={item.id} className={clsx("rounded-xl border p-3", toneClasses[item.tone])}>
                  <p className="text-sm font-semibold leading-tight">{item.title}</p>
                  <p className="mt-1 text-xs opacity-70">{item.subtitle}</p>
                </div>
              ))
            )}
          </div>

          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const items = dayBlocks[key] ?? [];
            return (
              <div key={`column-${day.toISOString()}`} className="space-y-3 border-l border-white/[0.06] p-4">
                {items.length === 0 ? (
                  <p className="pt-1 text-sm text-white/30">No blocks planned.</p>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className={clsx("rounded-xl border p-3.5", toneClasses[item.tone])}>
                      <p className="text-sm font-semibold leading-tight">{item.title}</p>
                      <p className="mt-1 text-xs opacity-70">{item.subtitle}</p>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Calendar Right Sidebar ──────────────────────────────────────────────────
function CalendarRightSidebar({
  weekStart,
  setWeekStart,
  viewMode,
  setViewMode,
  lessons,
  calendars,
}: {
  weekStart: Date;
  setWeekStart: (d: Date) => void;
  viewMode: CalendarViewMode;
  setViewMode: (v: CalendarViewMode) => void;
  lessons: any[];
  calendars: any[];
}) {
  const { t } = useLang();
  const location = useLocation();

  const navSections = [
    {
      label: t.planner,
      items: [
        { label: t.today, to: "/", icon: LayoutDashboard, exact: true },
        { label: t.calendar, to: "/calendar", icon: CalendarIcon },
        { label: t.notebook, to: "/notebook", icon: BookOpen },
      ],
    },
    {
      label: t.school,
      items: [
        { label: t.homework, to: "/homework", icon: ClipboardList },
        { label: t.tasks,    to: "/tasks",    icon: CheckSquare },
        { label: t.tests,    to: "/tests",    icon: FlaskConical },
        { label: t.study,    to: "/study",    icon: GraduationCap },
        { label: t.habits,   to: "/habits",   icon: Repeat2 },
        { label: t.appointments, to: "/appointments", icon: CalendarClock },
      ],
    },
  ];

  const weekLabel = `${format(weekStart, "d MMM")} – ${format(
    endOfWeek(weekStart, { weekStartsOn: 1 }),
    "d MMM"
  )}`;

  return (
    <aside className="w-52 flex-shrink-0 border-l border-white/[0.06] bg-[#111111] flex flex-col h-full overflow-hidden">

      {/* ── Logo / top spacer — aligns with day headers ───────────────── */}
      <div className="flex-shrink-0 h-[88px] border-b border-white/[0.06] flex items-center px-4">
        <span className="text-white/80 font-semibold tracking-tight text-sm">planr</span>
      </div>

      {/* ── Week nav ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 py-3 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setWeekStart(subWeeks(weekStart, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="text-[11px] font-medium text-white/40 hover:text-white/80 transition-colors tabular-nums"
          >
            {weekLabel}
          </button>
          <button
            onClick={() => setWeekStart(addWeeks(weekStart, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("week")}
            className={clsx(
              "flex-1 rounded-md py-1 text-[11px] font-medium transition-all",
              viewMode === "week" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"
            )}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode("studyPlanner")}
            className={clsx(
              "flex-1 rounded-md py-1 text-[11px] font-medium transition-all",
              viewMode === "studyPlanner" ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"
            )}
          >
            Studie
          </button>
        </div>
      </div>

      {/* ── Add button ────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 py-2.5 border-b border-white/[0.06]">
        <AddDropdown lessons={lessons} calendars={calendars} fullWidth />
      </div>

      {/* ── Nav links ─────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-3">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-0.5">
            <div className="px-2 pb-1 text-[9px] uppercase tracking-wider text-white/20 font-semibold">
              {section.label}
            </div>
            {section.items.map(({ label, to, icon: Icon, exact }) => {
              const active = exact
                ? location.pathname === to
                : location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={clsx(
                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.04]"
                  )}
                >
                  <Icon size={13} strokeWidth={1.75} />
                  <span className="truncate">{label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* ── Settings ──────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 px-3 py-3 border-t border-white/[0.06]">
        <NavLink
          to="/settings"
          className={clsx(
            "flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] transition-colors w-full",
            location.pathname === "/settings"
              ? "bg-white/10 text-white"
              : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
          )}
        >
          <Settings size={13} strokeWidth={1.75} />
          <span>Instellingen</span>
        </NavLink>
      </div>
    </aside>
  );
}

// ─── Main Calendar Page ─────────────────────────────────────────────────────
export default function CalendarPage() {
  const { t } = useLang();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5);

  const settings     = useQuery(api.userSettings.get);
  const syncCalendar = useAction(api.ical.syncCalendar);
  const hasSynced    = useRef(false);
  const [createModal, setCreateModal] = useState<{ date: Date; hour: number } | null>(null);

  useEffect(() => {
    if (hasSynced.current) return;
    const syncSeed =
      settings?.externalAppCode ||
      (settings?.zermeloSchool && settings?.zermeloAccessToken
        ? `${settings.zermeloSchool}:${settings.zermeloTokenUpdatedAt ?? ""}`
        : "");
    if (!syncSeed) return;
    hasSynced.current = true;
    syncCalendar({
      externalAppCode: settings?.externalAppCode,
      zermeloSchool: settings?.zermeloSchool,
      weekStartMs: weekStart.getTime(),
    }).catch(() => {});
  }, [settings, syncCalendar, weekStart]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    scrollRef.current.scrollTop = Math.max(0, (h - START_HOUR - 1) * HOUR_HEIGHT);
  }, []);

  const lessons           = useQuery(api.lessons.getRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const tests             = useQuery(api.misc.getTests);
  const appointments      = useQuery(api.misc.getAppointments);
  const homework          = useQuery(api.homework.getAll);
  const tasks             = useQuery(api.tasks.getAll);
  const allLessons        = useQuery(api.lessons.getAll);
  const homeworkSessions  = useQuery(studyApi.getHomeworkSessionsInRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const rehearsalSessions = useQuery(studyApi.getRehearsalSessionsInRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const studySessions     = useQuery(studyApi.getStudySessionsInRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const calendars         = useQuery(api.calendars.getAll) ?? [];

  const homeworkLessonIds = useMemo(
    () => new Set((homework ?? []).filter((h: any) => h.lessonId).map((h: any) => String(h.lessonId))), [homework]);
  const testLessonIds = useMemo(
    () => new Set((tests ?? []).filter((tt: any) => tt.lessonId).map((tt: any) => String(tt.lessonId))), [tests]);

  const weekTests = (tests ?? []).filter((tt) => {
    const d = new Date(tt.date); return d >= weekStart && d <= weekEnd;
  });
  const weekHomework = (homework ?? []).filter((hw: any) => {
    const d = new Date(hw.dueDate);
    return d >= weekStart && d <= weekEnd;
  });
  const weekTasks = (tasks ?? []).filter((task: any) => {
    if (!task.dueDate) return false;
    const d = new Date(task.dueDate);
    return d >= weekStart && d <= weekEnd;
  });

  const plannerDayBlocks = useMemo(() => {
    const blocks: Record<string, PlannerBlock[]> = {};
    const keyFor = (date: Date) => format(date, "yyyy-MM-dd");
    days.forEach((day) => { blocks[keyFor(day)] = []; });

    (weekTests ?? []).forEach((test) => {
      const d = new Date(test.date);
      const key = keyFor(d);
      if (!blocks[key]) return;
      blocks[key].push({ id: `test-${test._id}`, title: test.topic, subtitle: `Test · ${test.subject}`, tone: "test" });
    });

    (weekHomework ?? []).forEach((hw: any) => {
      const d = new Date(hw.dueDate);
      const key = keyFor(d);
      if (!blocks[key]) return;
      blocks[key].push({ id: `homework-${hw._id}`, title: hw.title, subtitle: `Homework · ${hw.subject}`, tone: "homework" });
    });

    (weekTasks ?? []).forEach((task: any) => {
      const d = new Date(task.dueDate);
      const key = keyFor(d);
      if (!blocks[key]) return;
      blocks[key].push({ id: `task-${task._id}`, title: task.title, subtitle: `Task${task.subject ? ` · ${task.subject}` : ""}`, tone: "task" });
    });

    (studySessions ?? []).forEach((session: any) => {
      const d = new Date(session.startTime);
      const key = keyFor(d);
      if (!blocks[key]) return;
      blocks[key].push({ id: `study-${session._id}`, title: session.title, subtitle: `Study · ${format(d, "HH:mm")} - ${format(new Date(session.endTime), "HH:mm")}`, tone: "study" });
    });

    (homeworkSessions ?? []).forEach((session: any) => {
      const d = new Date(session.startTime);
      const key = keyFor(d);
      if (!blocks[key]) return;
      blocks[key].push({ id: `homework-session-${session._id}`, title: session.title, subtitle: `Homework session · ${format(d, "HH:mm")}`, tone: "homework" });
    });

    (rehearsalSessions ?? []).forEach((session: any) => {
      const d = new Date(session.startTime);
      const key = keyFor(d);
      if (!blocks[key]) return;
      blocks[key].push({ id: `rehearsal-${session._id}`, title: session.title, subtitle: `Rehearsal · ${format(d, "HH:mm")}`, tone: "study" });
    });

    Object.keys(blocks).forEach((dayKey) => {
      blocks[dayKey] = blocks[dayKey].sort((a, b) => a.title.localeCompare(b.title));
    });

    return blocks;
  }, [days, weekTests, weekHomework, weekTasks, studySessions, homeworkSessions, rehearsalSessions]);

  const plannerWeekFocus = useMemo(() => {
    const focus = [
      ...(weekTests ?? []).map((test) => ({
        id: `week-focus-test-${test._id}`,
        title: test.topic,
        subtitle: `${format(new Date(test.date), "EEE d MMM")} · ${test.subject}`,
        tone: "test" as const,
      })),
      ...(weekHomework ?? []).map((hw: any) => ({
        id: `week-focus-homework-${hw._id}`,
        title: hw.title,
        subtitle: `${format(new Date(hw.dueDate), "EEE d MMM")} · ${hw.subject}`,
        tone: "homework" as const,
      })),
    ];
    return focus.sort((a, b) => a.subtitle.localeCompare(b.subtitle));
  }, [weekTests, weekHomework]);

  const calendarVisible = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const cal of calendars) map[cal._id] = cal.visible;
    return map;
  }, [calendars]);

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    if ((e.target as HTMLElement).closest("[data-event]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const hour = Math.floor(relY / HOUR_HEIGHT) + START_HOUR;
    setCreateModal({ date: day, hour });
  };

  function getChipsForDay(day: Date): EventChip[] {
    const chips: EventChip[] = [];

    (lessons ?? []).filter((l) => isSameDay(new Date(l.startTime), day)).forEach((l) => {
      const start = new Date(l.startTime); const end = new Date(l.endTime);
      const period = lessonPeriod(l.startTime);
      chips.push({
        key: `lesson-${l._id}`,
        top: toTopPx(start),
        height: Math.max(durationPx(l.startTime, l.endTime), 22),
        node: (
          <Link to={`/lesson/${l._id}`} className="block h-full">
            <div className={clsx(
              "h-full rounded-md border border-white/10 bg-white/[0.06] px-2 py-1 flex flex-col gap-0.5 hover:bg-white/10 hover:border-white/20 transition-colors overflow-hidden",
              l.isEvent && "border-l-2 border-l-purple-400"
            )}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold text-white leading-tight truncate">{subjectDisplay(l.subject)}</span>
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  {homeworkLessonIds.has(String(l._id)) && <span className="h-1.5 w-1.5 rounded-full bg-purple-400 flex-shrink-0" />}
                  {testLessonIds.has(String(l._id)) && <FlaskConical size={9} className="text-purple-400 flex-shrink-0" />}
                </div>
              </div>
              {period && <span className="text-[9px] text-white/30 leading-none">{period}</span>}
              {(l.location || l.teachers) && (
                <span className="text-[9px] text-white/40 leading-tight flex items-center gap-0.5 truncate">
                  {l.location && <><MapPin size={7} className="shrink-0" />{l.location}</>}
                  {l.location && l.teachers && <span className="text-white/20 mx-0.5">·</span>}
                  {l.teachers && <span className="truncate">{l.teachers}</span>}
                </span>
              )}
              <span className="text-[9px] text-white/30 leading-none mt-auto">{format(start, "HH:mm")}–{format(end, "HH:mm")}</span>
            </div>
          </Link>
        ),
      });
    });

    (appointments ?? []).forEach((a) => {
      if (a.calendarId && calendarVisible[a.calendarId] === false) return;
      let startMs: number;
      if (a.isRecurring) {
        if (a.recurringDayOfWeek !== day.getDay()) return;
        const parts = String(a.recurringTimeHHMM ?? "0:00").split(":");
        const [hh, mm] = parts.map((v: string) => parseInt(v, 10));
        const d = new Date(day); d.setHours(hh, mm, 0, 0); startMs = d.getTime();
      } else {
        if (!isSameDay(new Date(a.startTime), day)) return;
        startMs = a.startTime;
      }
      const endMs = a.endTime ?? startMs + 50 * 60_000;
      const start = new Date(startMs);
      const cal = a.calendarId ? calendars.find((c) => c._id === a.calendarId) : null;
      const color = cal?.color ?? a.color ?? "#6B7280";
      chips.push({
        key: `appt-${a._id}`,
        top: toTopPx(start),
        height: Math.max(durationPx(startMs, endMs), 22),
        node: (
          <div className="h-full rounded-md border px-2 py-1 flex flex-col gap-0.5 overflow-hidden"
            style={{ backgroundColor: color + "18", borderColor: color + "40", borderLeftColor: color, borderLeftWidth: 2 }}>
            <span className="text-[11px] font-semibold leading-tight truncate" style={{ color }}>{a.title}</span>
            {a.location && <span className="text-[9px] leading-tight flex items-center gap-0.5 text-white/40 truncate"><MapPin size={7} className="shrink-0" />{a.location}</span>}
            <span className="text-[9px] text-white/30 leading-none mt-auto">{format(start, "HH:mm")}</span>
          </div>
        ),
      });
    });

    (studySessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).forEach((s: any) => {
      const start = new Date(s.startTime);
      chips.push({ key: `study-${s._id}`, top: toTopPx(start), height: Math.max(durationPx(s.startTime, s.endTime), 22),
        node: <div className={clsx("h-full rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-1 flex flex-col gap-0.5 overflow-hidden", s.done && "opacity-40")}><div className="flex items-center gap-1"><BookOpen size={8} className="text-purple-400 flex-shrink-0" /><span className="text-[11px] font-semibold leading-tight truncate text-purple-300">{s.title}</span></div><span className="text-[9px] text-purple-400/70 leading-none mt-auto">{format(start, "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}{s.done && " ✓"}</span></div>
      });
    });

    (homeworkSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).forEach((s: any) => {
      const start = new Date(s.startTime);
      chips.push({ key: `hw-${s._id}`, top: toTopPx(start), height: Math.max(durationPx(s.startTime, s.endTime), 22),
        node: <div className={clsx("h-full rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 flex flex-col gap-0.5 overflow-hidden", s.done && "opacity-40")}><div className="flex items-center gap-1"><ClipboardList size={8} className="text-emerald-400 flex-shrink-0" /><span className="text-[11px] font-semibold leading-tight truncate text-emerald-300">{s.title}</span></div><span className="text-[9px] text-emerald-400/70 leading-none mt-auto">{format(start, "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}{s.done && " ✓"}</span></div>
      });
    });

    (rehearsalSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).forEach((s: any) => {
      const start = new Date(s.startTime);
      chips.push({ key: `reh-${s._id}`, top: toTopPx(start), height: Math.max(durationPx(s.startTime, s.endTime), 22),
        node: <div className={clsx("h-full rounded-md border border-amber-500/20 bg-amber-500/10 px-2 py-1 flex flex-col gap-0.5 overflow-hidden", s.done && "opacity-40")}><div className="flex items-center gap-1"><RefreshCw size={8} className="text-amber-400 flex-shrink-0" /><span className="text-[11px] font-semibold leading-tight truncate text-amber-300">{s.title}</span></div><span className="text-[9px] text-amber-400/70 leading-none mt-auto">{format(start, "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}{s.done && " ✓"}</span></div>
      });
    });

    return chips;
  }

  const totalGridHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0f0f0f]">

      {/* ── Main content area ────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left: calendar toggles panel */}
        <CalendarSidePanel calendars={calendars} />

        {/* Centre: grid */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {viewMode === "studyPlanner" ? (
            <StudyPlannerBoard
              days={days}
              weekLabel={`${format(weekStart, "d MMM")} - ${format(weekEnd, "d MMM yyyy")}`}
              weekFocus={plannerWeekFocus}
              dayBlocks={plannerDayBlocks}
            />
          ) : (
            <>
              {/* ── Day headers ─────────────────────────────────────────── */}
              <div className="flex-shrink-0 border-b border-white/[0.08] overflow-x-auto bg-[#161616]">
                <div className="min-w-[700px]">
                  <div className="grid" style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(5, 1fr)` }}>
                    <div className="flex items-end pb-3 pl-2">
                      <span className="text-[10px] font-medium text-white/20 leading-none">GMT+1</span>
                    </div>
                    {days.map((day) => (
                      <div key={day.toISOString()} className="py-3 text-center">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                          {format(day, "EEE")}
                        </p>
                        <p className={clsx(
                          "mx-auto mt-1.5 flex h-9 w-9 items-center justify-center rounded-full text-xl font-bold tracking-tight",
                          isToday(day) ? "bg-white text-[#0f0f0f]" : "text-white"
                        )}>
                          {format(day, "d")}
                        </p>
                        <div className="mt-2 mx-2 h-[5px] rounded-full bg-white/[0.04]">
                          {weekTests.filter((tt) => isSameDay(new Date(tt.date), day)).map((tt) => (
                            <span key={tt._id} className="inline-block" title={`Toets: ${tt.topic}`}>
                              <FlaskConical size={10} className="text-purple-400" />
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Scrollable time grid ─────────────────────────────────── */}
              <div ref={scrollRef} className="overflow-y-auto overflow-x-auto flex-1">
                <div className="min-w-[700px]">
                  <div
                    className="grid relative"
                    style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(5, 1fr)`, height: totalGridHeight }}
                  >
                    <div className="relative">
                      {hours.map((h, i) => (
                        <div
                          key={h}
                          className="absolute w-full flex items-start justify-end pr-3"
                          style={{ top: i * HOUR_HEIGHT - 8, height: HOUR_HEIGHT }}
                        >
                          <span className="text-[11px] text-white/20 font-medium leading-none tabular-nums">
                            {String(h).padStart(2, "0")}:00
                          </span>
                        </div>
                      ))}
                    </div>

                    {days.map((day, dayIdx) => {
                      const chips = getChipsForDay(day);
                      return (
                        <div
                          key={day.toISOString()}
                          className={clsx(
                            "relative cursor-pointer group",
                            dayIdx !== 0 && "border-l border-white/[0.04]",
                            isToday(day) && "bg-white/[0.015]"
                          )}
                          style={{ height: totalGridHeight }}
                          onClick={(e) => handleColumnClick(e, day)}
                        >
                          {hours.map((h, i) => (
                            <div
                              key={h}
                              className={clsx(
                                "absolute w-full border-t",
                                i === 0 ? "border-white/[0.08]" : "border-white/[0.04]"
                              )}
                              style={{ top: i * HOUR_HEIGHT }}
                            />
                          ))}
                          {hours.map((h, i) => (
                            <div
                              key={`half-${h}`}
                              className="absolute w-full border-t border-white/[0.02] border-dashed"
                              style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                            />
                          ))}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-150">
                            <div className="absolute inset-0 bg-white/[0.015]" />
                          </div>
                          {chips.map((chip) => (
                            <div
                              key={chip.key}
                              data-event="1"
                              className="absolute px-0.5"
                              style={{ top: chip.top, height: chip.height, left: 2, right: 2 }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {chip.node}
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    <div
                      className="absolute pointer-events-none"
                      style={{ top: 0, left: TIME_COL_W, right: 0, height: totalGridHeight }}
                    >
                      <NowLine days={days} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: nav + controls sidebar */}
        <CalendarRightSidebar
          weekStart={weekStart}
          setWeekStart={setWeekStart}
          viewMode={viewMode}
          setViewMode={setViewMode}
          lessons={allLessons ?? []}
          calendars={calendars}
        />
      </div>

      <CreateAppointmentModal
        open={createModal !== null}
        onClose={() => setCreateModal(null)}
        initialDate={createModal?.date ?? null}
        initialHour={createModal?.hour ?? 9}
        calendars={calendars}
      />
    </div>
  );
}