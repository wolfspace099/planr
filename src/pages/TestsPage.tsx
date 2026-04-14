// ─── Tests Page ──────────────────────────────────────────────────────────────
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, isPast, isToday } from "date-fns";
import { Plus, Trash2, FlaskConical, Repeat2, CalendarClock, MapPin } from "lucide-react";
import { PageHeader, Button, Modal, Input, Textarea, EmptyState, Badge } from "../components/ui/primitives";
import clsx from "clsx";

export function TestsPage() {
  const tests = useQuery(api.misc.getTests);
  const subjects = useQuery(api.lessons.getSubjects);
  const lessons = useQuery(api.lessons.getAll);
  const lessonsByDay = useMemo(() => {
    return (lessons ?? [])
      .slice()
      .sort((a: any, b: any) => a.startTime - b.startTime)
      .reduce((acc: Record<string, any[]>, lesson: any) => {
        const day = format(new Date(lesson.startTime), "EEEE d MMM");
        if (!acc[day]) acc[day] = [];
        acc[day].push(lesson);
        return acc;
      }, {});
  }, [lessons]);
  const createTest = useMutation(api.misc.createTest);
  const deleteTest = useMutation(api.misc.deleteTest);

  const [modal, setModal] = useState(false);
  const [lessonModal, setLessonModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<any>(null);
  const [testMode, setTestMode] = useState<"lesson" | "date">("date");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");

  const sorted = (tests ?? []).sort((a, b) => a.date - b.date);

  const submit = async () => {
    if (!subject || !topic) return;
    if (testMode === "lesson" && !selectedLesson) return;
    await createTest({
      subject,
      topic,
      date: new Date(date).getTime(),
      description: description || undefined,
      lessonId: testMode === "lesson" ? selectedLesson?._id : undefined,
    });
    setSelectedLesson(null);
    setTestMode("date");
    setSubject(""); setTopic(""); setDescription(""); setModal(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Tests" actions={
        <Button variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13} /> Add test</Button>
      } />

      {sorted.length === 0 ? (
        <EmptyState icon={<FlaskConical size={28} />} title="No tests planned" action={<Button size="sm" onClick={() => setModal(true)}>Add test</Button>} />
      ) : (
        <div className="space-y-2">
          {sorted.map((t) => {
            const past = isPast(new Date(t.date));
            const today = isToday(new Date(t.date));
            return (
              <div key={t._id} className={clsx("flex items-start gap-3 p-4 bg-surface border rounded-lg",
                today ? "border-danger bg-danger-light/20" : past ? "border-border opacity-60" : "border-border hover:border-border-strong"
              )}>
                <FlaskConical size={16} className={clsx("flex-shrink-0 mt-0.5", today ? "text-danger" : "text-ink-muted")} />
                {t.lessonId ? (
                  <Link to={`/lesson/${t.lessonId}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-ink">{t.topic}</p>
                      <Badge color="default">{t.subject}</Badge>
                      {today && <Badge color="red">Today!</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-ink-muted mt-1">{t.description}</p>}
                    <p className="text-xs text-ink-light mt-1">{format(new Date(t.date), "EEEE d MMMM yyyy")}</p>
                  </Link>
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-ink">{t.topic}</p>
                      <Badge color="default">{t.subject}</Badge>
                      {today && <Badge color="red">Today!</Badge>}
                    </div>
                    {t.description && <p className="text-xs text-ink-muted mt-1">{t.description}</p>}
                    <p className="text-xs text-ink-light mt-1">{format(new Date(t.date), "EEEE d MMMM yyyy")}</p>
                  </div>
                )}
                <button onClick={() => deleteTest({ id: t._id })} className="p-1 rounded text-ink-light hover:text-danger transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add test">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTestMode("lesson");
                if (!selectedLesson) setSubject("");
              }}
              className={clsx(
                "rounded-full px-3 py-1 text-sm transition-all",
                testMode === "lesson" ? "bg-accent text-white" : "bg-surface text-ink"
              )}
            >
              Link to lesson
            </button>
            <button
              type="button"
              onClick={() => {
                setTestMode("date");
                setSelectedLesson(null);
              }}
              className={clsx(
                "rounded-full px-3 py-1 text-sm transition-all",
                testMode === "date" ? "bg-accent text-white" : "bg-surface text-ink"
              )}
            >
              Set by date
            </button>
          </div>

          {testMode === "date" ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-muted">Subject</label>
                <select value={subject} onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40">
                  <option value="">Select subject…</option>
                  {subjects?.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-medium text-ink-muted">Lesson</label>
                    <p className="text-sm text-ink">
                      {selectedLesson
                        ? `${selectedLesson.subject} · ${format(new Date(selectedLesson.startTime), "EEEE d MMM · HH:mm")}`
                        : "No lesson selected"}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => {
                    setLessonModal(true);
                    setTestMode("lesson");
                  }}>
                    Select lesson
                  </Button>
                </div>
                {selectedLesson && (
                  <button type="button" className="inline-flex items-center gap-1 text-xs text-danger" onClick={() => {
                    setSelectedLesson(null);
                    setSubject("");
                  }}>
                    Clear selected lesson
                  </button>
                )}
              </div>
            </div>
          )}

          <Input label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Chapter 3 — Quadratics" />
          <Textarea label="Notes (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          <div className="text-xs text-ink-muted">
            {testMode === "lesson"
              ? "Link this test to a lesson so it opens directly from the list and uses the lesson date."
              : "Set a standalone test date without linking to a lesson."}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>
              Add
            </Button>
          </div>
        </div>
      </Modal>
      <LessonPickerModal
        open={lessonModal}
        onClose={() => setLessonModal(false)}
        lessonsByDay={lessonsByDay}
        onSelect={(lesson) => {
          setSelectedLesson(lesson);
          setSubject(lesson.subject);
          setDate(format(new Date(lesson.startTime), "yyyy-MM-dd"));
          setTestMode("lesson");
          setLessonModal(false);
        }}
      />
    </div>
  );
}

function LessonPickerModal({
  open,
  onClose,
  lessonsByDay,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  lessonsByDay: Record<string, any[]>;
  onSelect: (lesson: any) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Select lesson">
      <div className="space-y-3 max-h-[70vh] overflow-y-auto">
        {Object.entries(lessonsByDay).length === 0 ? (
          <p className="text-sm text-ink-muted">No lessons available to assign.</p>
        ) : (
          Object.entries(lessonsByDay).map(([day, lessons]) => (
            <div key={day} className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{day}</p>
              <div className="space-y-2">
                {lessons.map((lesson) => (
                  <button
                    key={lesson._id}
                    onClick={() => onSelect(lesson)}
                    className="w-full text-left px-3 py-2 rounded border border-border bg-surface hover:border-accent hover:bg-accent/5 transition-colors"
                  >
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
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}

export function HabitsPage() {
  const habits = useQuery(api.misc.getHabits);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const completions = useQuery(api.misc.getCompletions, { date: todayStr });
  const toggle = useMutation(api.misc.toggleCompletion);
  const createHabit = useMutation(api.misc.createHabit);

  const [modal, setModal] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("");

  const completedIds = new Set(completions?.map((c) => c.habitId) ?? []);

  const submit = async () => {
    if (!name.trim()) return;
    await createHabit({ name, emoji: emoji || undefined, order: (habits?.length ?? 0) });
    setName(""); setEmoji(""); setModal(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Habits" subtitle="Track your daily habits" actions={
        <Button variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13} /> New habit</Button>
      } />

      {(habits?.length ?? 0) === 0 ? (
        <EmptyState icon={<Repeat2 size={28} />} title="No habits yet" action={<Button size="sm" onClick={() => setModal(true)}>Add a habit</Button>} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {habits?.filter((h) => h.active).map((h) => {
            const done = completedIds.has(h._id);
            return (
              <button key={h._id} onClick={() => toggle({ habitId: h._id, date: todayStr })}
                className={clsx("p-4 rounded-xl border text-left transition-all",
                  done ? "bg-success-light border-green-200" : "bg-surface border-border hover:border-border-strong hover:shadow-card"
                )}>
                <div className="text-2xl mb-2">{h.emoji ?? "✓"}</div>
                <p className="font-medium text-sm text-ink">{h.name}</p>
                <p className={clsx("text-xs mt-1", done ? "text-success" : "text-ink-muted")}>
                  {done ? "Done today ✓" : "Not yet"}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New habit">
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Read 20 minutes" />
          <Input label="Emoji (optional)" value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="📚" maxLength={2} />
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={submit}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Appointments Page ────────────────────────────────────────────────────────

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const COLORS = ["#3B6FFF", "#10B981", "#F59E0B", "#EC4899", "#8B5CF6", "#EF4444", "#6B7280"];

export function AppointmentsPage() {
  const appointments = useQuery(api.misc.getAppointments);
  const createAppt = useMutation(api.misc.createAppointment);
  const deleteAppt = useMutation(api.misc.deleteAppointment);

  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurDay, setRecurDay] = useState(1);
  const [recurTime, setRecurTime] = useState("18:30");
  const [startTime, setStartTime] = useState("");
  const [color, setColor] = useState(COLORS[0]);

  const submit = async () => {
    if (!title.trim()) return;
    if (isRecurring) {
      await createAppt({
        title, description: description || undefined, location: location || undefined,
        startTime: Date.now(), isRecurring: true,
        recurringDayOfWeek: recurDay, recurringTimeHHMM: recurTime,
        color,
      });
    } else {
      if (!startTime) return;
      await createAppt({
        title, description: description || undefined, location: location || undefined,
        startTime: new Date(startTime).getTime(), isRecurring: false, color,
      });
    }
    setTitle(""); setDescription(""); setLocation(""); setModal(false);
  };

  const recurring = (appointments ?? []).filter((a) => a.isRecurring).sort((a, b) => (a.recurringDayOfWeek ?? 0) - (b.recurringDayOfWeek ?? 0));
  const oneOff = (appointments ?? []).filter((a) => !a.isRecurring).sort((a, b) => a.startTime - b.startTime);

  return (
    <div className="animate-fade-in">
      <PageHeader title="Appointments" actions={
        <Button variant="primary" size="sm" onClick={() => setModal(true)}><Plus size={13} /> Add</Button>
      } />

      {recurring.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">Weekly recurring</h2>
          <div className="space-y-2">
            {recurring.map((a) => (
              <ApptRow key={a._id} appt={a} onDelete={() => deleteAppt({ id: a._id })} />
            ))}
          </div>
        </div>
      )}

      {oneOff.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">One-off</h2>
          <div className="space-y-2">
            {oneOff.map((a) => (
              <ApptRow key={a._id} appt={a} onDelete={() => deleteAppt({ id: a._id })} />
            ))}
          </div>
        </div>
      )}

      {(appointments?.length ?? 0) === 0 && (
        <EmptyState icon={<CalendarClock size={28} />} title="No appointments" description="Add your tennis, doctor visits, and other events here." action={<Button size="sm" onClick={() => setModal(true)}>Add appointment</Button>} />
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Add appointment">
        <div className="space-y-3">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Tennis" />
          <Input label="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Tennis club" />
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-ink-muted">Recurring weekly?</label>
            <button onClick={() => setIsRecurring(!isRecurring)}
              className={clsx("w-8 h-4 rounded-full transition-colors relative",
                isRecurring ? "bg-accent" : "bg-border-strong"
              )}>
              <span className={clsx("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform shadow",
                isRecurring ? "translate-x-4" : "translate-x-0.5"
              )} />
            </button>
          </div>
          {isRecurring ? (
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col gap-1">
                <label className="text-xs font-medium text-ink-muted">Day</label>
                <select value={recurDay} onChange={(e) => setRecurDay(+e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <Input label="Time" type="time" value={recurTime} onChange={(e) => setRecurTime(e.target.value)} className="w-28" />
            </div>
          ) : (
            <Input label="Date & time" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={clsx("w-6 h-6 rounded-full transition-transform", color === c && "scale-125 ring-2 ring-offset-1 ring-ink/20")}
                  style={{ backgroundColor: c }} />
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

function ApptRow({ appt, onDelete }: { appt: any; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg hover:border-border-strong transition-all">
      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: appt.color ?? "#6B7280" }} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-ink">{appt.title}</p>
        <p className="text-xs text-ink-muted">
          {appt.isRecurring
            ? `Every ${DAYS[appt.recurringDayOfWeek]} at ${appt.recurringTimeHHMM}`
            : format(new Date(appt.startTime), "EEEE d MMMM · HH:mm")}
        </p>
        {appt.location && (
          <p className="text-xs text-ink-light flex items-center gap-0.5 mt-0.5">
            <MapPin size={10} /> {appt.location}
          </p>
        )}
      </div>
      <button onClick={onDelete} className="p-1 rounded text-ink-light hover:text-danger transition-colors">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

export default TestsPage;
