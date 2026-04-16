import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, isPast, isToday, isFuture } from "date-fns";
import {
  BookOpen, Plus, Trash2, ChevronDown, ChevronRight,
  CalendarClock, Check, FlaskConical, Clock,
} from "lucide-react";
import {
  PageHeader, Button, Modal, Input, EmptyState, Badge,
} from "../components/ui/primitives";
import clsx from "clsx";

export default function StudyPlannerPage() {
  const tests = useQuery(api.misc.getTests);
  const studySessions = useQuery(api.study.getStudySessions);

  const upcoming = useMemo(
    () => (tests ?? []).filter((t) => !isPast(new Date(t.date)) || isToday(new Date(t.date)))
      .sort((a, b) => a.date - b.date),
    [tests]
  );
  const past = useMemo(
    () => (tests ?? []).filter((t) => isPast(new Date(t.date)) && !isToday(new Date(t.date)))
      .sort((a, b) => b.date - a.date),
    [tests]
  );

  const sessionsByTest = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of studySessions ?? []) {
      if (!map[s.testId]) map[s.testId] = [];
      map[s.testId].push(s);
    }
    return map;
  }, [studySessions]);

  const upcomingSessions = useMemo(
    () => (studySessions ?? [])
      .filter((s) => isFuture(new Date(s.startTime)) || isToday(new Date(s.startTime)))
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 5),
    [studySessions]
  );

  return (
    <div className="animate-fade-in space-y-8">
      <PageHeader
        title="Study Planner"
        subtitle="Plan learning sessions for your tests"
      />

      {/* Upcoming study sessions strip */}
      {upcomingSessions.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
            Upcoming study sessions
          </h2>
          <div className="space-y-2">
            {upcomingSessions.map((s) => (
              <StudySessionRow key={s._id} session={s} />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming tests */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
          Upcoming tests
        </h2>
        {upcoming.length === 0 ? (
          <EmptyState
            icon={<FlaskConical size={28} />}
            title="No upcoming tests"
            description="Add tests from the Tests page first."
          />
        ) : (
          <div className="space-y-3">
            {upcoming.map((t) => (
              <TestStudyCard
                key={t._id}
                test={t}
                sessions={sessionsByTest[t._id] ?? []}
              />
            ))}
          </div>
        )}
      </section>

      {/* Past tests */}
      {past.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
            Past tests
          </h2>
          <div className="space-y-2 opacity-60">
            {past.slice(0, 5).map((t) => (
              <div key={t._id} className="p-3 bg-surface border border-border rounded-lg flex items-center gap-3">
                <FlaskConical size={14} className="text-ink-light" />
                <span className="text-sm text-ink flex-1">{t.topic}</span>
                <Badge color="default">{t.subject}</Badge>
                <span className="text-xs text-ink-light">{format(new Date(t.date), "d MMM")}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StudySessionRow({ session }: { session: any }) {
  const toggle = useMutation(api.study.toggleStudySession);
  const del = useMutation(api.study.deleteStudySession);
  const today = isToday(new Date(session.startTime));
  return (
    <div className={clsx(
      "flex items-center gap-3 p-3 bg-surface border rounded-lg transition-all",
      session.done ? "opacity-50 border-border" : today ? "border-purple-300 bg-purple-50/40" : "border-border hover:border-border-strong"
    )}>
      <button
        onClick={() => toggle({ id: session._id })}
        className={clsx(
          "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
          session.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
        )}
      >
        {session.done && <Check size={10} className="text-white" strokeWidth={3} />}
      </button>
      <BookOpen size={13} className="text-purple-500 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className={clsx("text-sm font-medium text-ink truncate", session.done && "line-through text-ink-muted")}>
          {session.title}
        </p>
        <p className="text-xs text-ink-muted">
          {format(new Date(session.startTime), "EEEE d MMM · HH:mm")}
          {" – "}
          {format(new Date(session.endTime), "HH:mm")}
        </p>
      </div>
      {today && <Badge color="red">Today</Badge>}
      <button onClick={() => del({ id: session._id })} className="p-1 text-ink-light hover:text-danger transition-colors">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function TestStudyCard({ test, sessions }: { test: any; sessions: any[] }) {
  const [expanded, setExpanded] = useState(true);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [addSubtaskModal, setAddSubtaskModal] = useState(false);

  const subtasks = useQuery(api.study.getSubtasksByTest, { testId: test._id });
  const toggleSubtask = useMutation(api.study.toggleSubtask);
  const deleteSubtask = useMutation(api.study.deleteSubtask);

  const today = isToday(new Date(test.date));
  const daysLeft = Math.ceil((new Date(test.date).getTime() - Date.now()) / 86400000);

  const doneSubtasks = (subtasks ?? []).filter((s) => s.done).length;
  const totalSubtasks = (subtasks ?? []).length;
  const doneSessions = sessions.filter((s) => s.done).length;

  return (
    <div className={clsx(
      "bg-surface border rounded-xl overflow-hidden transition-all",
      today ? "border-purple-300" : "border-border"
    )}>
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-bg transition-colors"
        onClick={() => setExpanded((e) => !e)}
      >
        {expanded ? <ChevronDown size={14} className="text-ink-muted flex-shrink-0" /> : <ChevronRight size={14} className="text-ink-muted flex-shrink-0" />}
        <FlaskConical size={15} className={clsx("flex-shrink-0", today ? "text-purple-500" : "text-ink-muted")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-ink">{test.topic}</p>
            <Badge color="default">{test.subject}</Badge>
            {today && <Badge color="red">Today!</Badge>}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            {format(new Date(test.date), "EEEE d MMMM yyyy")}
            {daysLeft > 0 && ` · ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-muted flex-shrink-0">
          {totalSubtasks > 0 && (
            <span className={clsx(doneSubtasks === totalSubtasks ? "text-success" : "")}>
              {doneSubtasks}/{totalSubtasks} topics
            </span>
          )}
          {sessions.length > 0 && (
            <span className={clsx(doneSessions === sessions.length ? "text-success" : "text-purple-500")}>
              {doneSessions}/{sessions.length} sessions
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">

          {/* Subtasks (study topics) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Study topics</p>
              <button
                onClick={() => setAddSubtaskModal(true)}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <Plus size={11} /> Add topic
              </button>
            </div>
            {(subtasks ?? []).length === 0 ? (
              <p className="text-xs text-ink-light italic">No study topics yet. Break down what you need to learn.</p>
            ) : (
              <div className="space-y-1.5">
                {(subtasks ?? []).sort((a, b) => a.order - b.order).map((sub) => (
                  <div key={sub._id} className="flex items-center gap-2">
                    <button
                      onClick={() => toggleSubtask({ id: sub._id })}
                      className={clsx(
                        "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        sub.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
                      )}
                    >
                      {sub.done && <Check size={10} className="text-white" strokeWidth={3} />}
                    </button>
                    <span className={clsx("text-sm flex-1 text-ink", sub.done && "line-through text-ink-muted")}>
                      {sub.title}
                    </span>
                    <button
                      onClick={() => deleteSubtask({ id: sub._id })}
                      className="p-0.5 text-ink-light hover:text-danger transition-colors"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Study sessions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Study sessions in calendar</p>
              <button
                onClick={() => setScheduleModal(true)}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <CalendarClock size={11} /> Plan sessions
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-ink-light italic">No sessions planned yet.</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.sort((a, b) => a.startTime - b.startTime).map((s) => (
                  <StudySessionRow key={s._id} session={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AddSubtaskModal
        open={addSubtaskModal}
        onClose={() => setAddSubtaskModal(false)}
        testId={test._id}
        nextOrder={(subtasks ?? []).length}
      />
      <ScheduleSessionsModal
        open={scheduleModal}
        onClose={() => setScheduleModal(false)}
        test={test}
      />
    </div>
  );
}

function AddSubtaskModal({ open, onClose, testId, nextOrder }: {
  open: boolean; onClose: () => void; testId: any; nextOrder: number;
}) {
  const create = useMutation(api.study.createSubtask);
  const [title, setTitle] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    await create({ testId, title, order: nextOrder });
    setTitle("");
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add study topic">
      <div className="space-y-3">
        <Input
          label="Topic"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 3 – Quadratic equations"
          onKeyDown={(e: any) => e.key === "Enter" && submit()}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}

function ScheduleSessionsModal({ open, onClose, test }: {
  open: boolean; onClose: () => void; test: any;
}) {
  const schedule = useMutation(api.study.scheduleStudySessions);
  const [sessions, setSessions] = useState(3);
  const [duration, setDuration] = useState(60);
  const [time, setTime] = useState("18:00");

  const submit = async () => {
    const [h, m] = time.split(":").map(Number);
    await schedule({
      testId: test._id,
      sessions,
      durationMinutes: duration,
      preferredHour: h,
      preferredMinute: m,
    });
    onClose();
  };

  const daysLeft = Math.ceil((new Date(test.date).getTime() - Date.now()) / 86400000);

  return (
    <Modal open={open} onClose={onClose} title="Plan study sessions">
      <div className="space-y-4">
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
          <p className="font-semibold">{test.topic} — {test.subject}</p>
          <p>{format(new Date(test.date), "EEEE d MMMM yyyy")} · {daysLeft > 0 ? `${daysLeft} days left` : "Today!"}</p>
        </div>

        <p className="text-xs text-ink-muted">
          Sessions will be placed on the days <strong>before</strong> the test at your chosen time. Existing sessions for this test will be replaced.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Number of sessions</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSessions(Math.max(1, sessions - 1))}
                className="w-7 h-7 rounded border border-border text-ink flex items-center justify-center hover:bg-border transition-colors"
              >−</button>
              <span className="text-sm font-semibold text-ink w-4 text-center">{sessions}</span>
              <button
                onClick={() => setSessions(Math.min(14, sessions + 1))}
                className="w-7 h-7 rounded border border-border text-ink flex items-center justify-center hover:bg-border transition-colors"
              >+</button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Duration (minutes)</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDuration(Math.max(15, duration - 15))}
                className="w-7 h-7 rounded border border-border text-ink flex items-center justify-center hover:bg-border transition-colors"
              >−</button>
              <span className="text-sm font-semibold text-ink w-8 text-center">{duration}</span>
              <button
                onClick={() => setDuration(Math.min(240, duration + 15))}
                className="w-7 h-7 rounded border border-border text-ink flex items-center justify-center hover:bg-border transition-colors"
              >+</button>
            </div>
          </div>
        </div>

        <Input label="Preferred time" type="time" value={time} onChange={(e: any) => setTime(e.target.value)} />

        <div className="text-xs text-ink-muted flex items-center gap-1.5">
          <Clock size={11} />
          {sessions} session{sessions !== 1 ? "s" : ""} × {duration} min on the {sessions} day{sessions !== 1 ? "s" : ""} before the test
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Plan sessions</Button>
        </div>
      </div>
    </Modal>
  );
}