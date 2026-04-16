import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { studyApi } from "../studyApi";
import { format, isPast, isToday, isFuture, addDays } from "date-fns";
import {
  BookOpen, Plus, Trash2, ChevronDown, ChevronRight,
  CalendarClock, Check, FlaskConical, Clock, ClipboardList,
  RefreshCw, Calendar,
} from "lucide-react";
import { PageHeader, Button, Modal, Input, Textarea, EmptyState, Badge } from "../components/ui/primitives";
import { CalendarScheduler, ScheduledSlot } from "../components/ui/CalendarScheduler";
import clsx from "clsx";

type Tab = "tests" | "homework" | "rehearsal";

export default function StudyPlannerPage() {
  const [tab, setTab] = useState<Tab>("tests");

  const studySessions    = useQuery(studyApi.getStudySessions);
  const homeworkSessions = useQuery(studyApi.getHomeworkSessions);
  const rehearsalSessions = useQuery(studyApi.getRehearsalSessions);

  const allUpcoming = useMemo(() => {
    const study = (studySessions ?? []).map((s: any) => ({ ...s, _kind: "study" as const }));
    const hw    = (homeworkSessions ?? []).map((s: any) => ({ ...s, _kind: "homework" as const }));
    const reh   = (rehearsalSessions ?? []).map((s: any) => ({ ...s, _kind: "rehearsal" as const }));
    return [...study, ...hw, ...reh]
      .filter((s) => isFuture(new Date(s.startTime)) || isToday(new Date(s.startTime)))
      .sort((a, b) => a.startTime - b.startTime)
      .slice(0, 6);
  }, [studySessions, homeworkSessions, rehearsalSessions]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "tests",     label: "Tests",     icon: <FlaskConical size={13} /> },
    { id: "homework",  label: "Homework",  icon: <ClipboardList size={13} /> },
    { id: "rehearsal", label: "Rehearsal", icon: <RefreshCw size={13} /> },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="Study Planner" subtitle="Plan your learning, homework and rehearsal sessions" />

      {allUpcoming.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">
            Upcoming sessions
          </h2>
          <div className="space-y-2">
            {allUpcoming.map((s) => (
              <AnySessionRow key={s._id} session={s} />
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-1 border-b border-border pb-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-accent text-accent"
                : "border-transparent text-ink-muted hover:text-ink"
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "tests"     && <TestsTab     studySessions={studySessions ?? []} />}
      {tab === "homework"  && <HomeworkTab  homeworkSessions={homeworkSessions ?? []} />}
      {tab === "rehearsal" && <RehearsalTab rehearsalSessions={rehearsalSessions ?? []} />}
    </div>
  );
}

// ─── Unified session row ──────────────────────────────────────────────────────

function AnySessionRow({ session }: { session: any }) {
  const toggleStudy     = useMutation(studyApi.toggleStudySession);
  const toggleHomework  = useMutation(studyApi.toggleHomeworkSession);
  const toggleRehearsal = useMutation(studyApi.toggleRehearsalSession);
  const delStudy        = useMutation(studyApi.deleteStudySession);
  const delHomework     = useMutation(studyApi.deleteHomeworkSession);
  const delRehearsal    = useMutation(studyApi.deleteRehearsalSession);
  const rescheduleStudy     = useMutation(studyApi.rescheduleStudySession);
  const rescheduleHomework  = useMutation(studyApi.rescheduleHomeworkSession);
  const rescheduleRehearsal = useMutation(studyApi.rescheduleRehearsalSession);

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const durMin = Math.round((session.endTime - session.startTime) / 60000);
  const [slot, setSlot] = useState<ScheduledSlot>({ startTime: session.startTime, durationMinutes: durMin });

  const toggle = () => {
    if (session._kind === "study")    return toggleStudy({ id: session._id });
    if (session._kind === "homework") return toggleHomework({ id: session._id });
    return toggleRehearsal({ id: session._id });
  };
  const del = () => {
    if (session._kind === "study")    return delStudy({ id: session._id });
    if (session._kind === "homework") return delHomework({ id: session._id });
    return delRehearsal({ id: session._id });
  };
  const doReschedule = async () => {
    if (session._kind === "study")    await rescheduleStudy({ id: session._id, ...slot });
    else if (session._kind === "homework") await rescheduleHomework({ id: session._id, ...slot });
    else await rescheduleRehearsal({ id: session._id, ...slot });
    setRescheduleOpen(false);
  };

  const accentColor = session._kind === "study" ? "purple" : session._kind === "homework" ? "emerald" : "amber";
  const kindColor  = session._kind === "study" ? "text-purple-500" : session._kind === "homework" ? "text-emerald-500" : "text-amber-500";
  const KindIcon   = session._kind === "study" ? BookOpen : session._kind === "homework" ? ClipboardList : RefreshCw;
  const today = isToday(new Date(session.startTime));

  return (
    <>
      <div className={clsx(
        "flex items-center gap-3 p-3 bg-surface border rounded-lg transition-all",
        session.done ? "opacity-50 border-border" : today ? "border-accent/40 bg-accent/5" : "border-border hover:border-border-strong"
      )}>
        <button onClick={toggle}
          className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
            session.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
          )}>
          {session.done && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
        <KindIcon size={13} className={clsx(kindColor, "flex-shrink-0")} />
        <div className="flex-1 min-w-0">
          <p className={clsx("text-sm font-medium text-ink truncate", session.done && "line-through text-ink-muted")}>
            {session.title}
          </p>
          <p className="text-xs text-ink-muted">
            {format(new Date(session.startTime), "EEEE d MMM · HH:mm")} – {format(new Date(session.endTime), "HH:mm")}
          </p>
        </div>
        {today && <Badge color="red">Today</Badge>}
        <button onClick={() => { setSlot({ startTime: session.startTime, durationMinutes: durMin }); setRescheduleOpen(true); }}
          className="p-1 text-ink-light hover:text-accent transition-colors" title="Reschedule">
          <Calendar size={12} />
        </button>
        <button onClick={del} className="p-1 text-ink-light hover:text-danger transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      <Modal open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Reschedule session" width="max-w-2xl">
        <div className="space-y-4">
          <CalendarScheduler value={slot} onChange={setSlot} accentColor={accentColor} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={doReschedule}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

// ─── Tests tab ────────────────────────────────────────────────────────────────

function TestsTab({ studySessions }: { studySessions: any[] }) {
  const tests = useQuery(api.misc.getTests);

  const sessionsByTest = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of studySessions) {
      if (!map[s.testId]) map[s.testId] = [];
      map[s.testId].push(s);
    }
    return map;
  }, [studySessions]);

  const upcoming = useMemo(
    () => (tests ?? []).filter((t) => !isPast(new Date(t.date)) || isToday(new Date(t.date))).sort((a, b) => a.date - b.date),
    [tests]
  );
  const past = useMemo(
    () => (tests ?? []).filter((t) => isPast(new Date(t.date)) && !isToday(new Date(t.date))).sort((a, b) => b.date - a.date),
    [tests]
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">Upcoming tests</h3>
        {upcoming.length === 0 ? (
          <EmptyState icon={<FlaskConical size={26} />} title="No upcoming tests" description="Add tests from the Tests page." />
        ) : (
          <div className="space-y-3">
            {upcoming.map((t) => (
              <TestStudyCard key={t._id} test={t} sessions={sessionsByTest[t._id] ?? []} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">Past tests</h3>
          <div className="space-y-1.5 opacity-60">
            {past.slice(0, 5).map((t) => (
              <div key={t._id} className="p-3 bg-surface border border-border rounded-lg flex items-center gap-3">
                <FlaskConical size={13} className="text-ink-light" />
                <span className="text-sm text-ink flex-1 truncate">{t.topic}</span>
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

// ─── Homework tab ─────────────────────────────────────────────────────────────

function HomeworkTab({ homeworkSessions }: { homeworkSessions: any[] }) {
  const homework = useQuery(api.homework.getAll);
  const [scheduleModal, setScheduleModal] = useState<any>(null);

  const sessionsByHw = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const s of homeworkSessions) {
      if (!map[s.homeworkId]) map[s.homeworkId] = [];
      map[s.homeworkId].push(s);
    }
    return map;
  }, [homeworkSessions]);

  const pending = useMemo(
    () => (homework ?? []).filter((h) => !h.done).sort((a, b) => a.dueDate - b.dueDate),
    [homework]
  );
  const done = useMemo(
    () => (homework ?? []).filter((h) => h.done).sort((a, b) => b.dueDate - a.dueDate),
    [homework]
  );

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">Pending homework</h3>
        {pending.length === 0 ? (
          <EmptyState icon={<ClipboardList size={26} />} title="No pending homework" description="Add homework from the Homework page." />
        ) : (
          <div className="space-y-3">
            {pending.map((hw) => (
              <HomeworkStudyCard
                key={hw._id}
                hw={hw}
                sessions={sessionsByHw[hw._id] ?? []}
                onSchedule={() => setScheduleModal(hw)}
              />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">Done</h3>
          <div className="space-y-1.5 opacity-60">
            {done.slice(0, 5).map((hw) => (
              <div key={hw._id} className="p-3 bg-surface border border-border rounded-lg flex items-center gap-3">
                <ClipboardList size={13} className="text-ink-light" />
                <span className="text-sm text-ink flex-1 truncate line-through">{hw.title}</span>
                <Badge color="default">{hw.subject}</Badge>
                <span className="text-xs text-ink-light">{format(new Date(hw.dueDate), "d MMM")}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {scheduleModal && (
        <ScheduleHomeworkModal open={true} onClose={() => setScheduleModal(null)} hw={scheduleModal} />
      )}
    </div>
  );
}

function HomeworkStudyCard({ hw, sessions, onSchedule }: { hw: any; sessions: any[]; onSchedule: () => void }) {
  const [expanded, setExpanded] = useState(true);
  const overdue = isPast(new Date(hw.dueDate)) && !isToday(new Date(hw.dueDate));
  const daysLeft = Math.ceil((new Date(hw.dueDate).getTime() - Date.now()) / 86400000);
  const doneSessions = sessions.filter((s) => s.done).length;

  return (
    <div className={clsx("bg-surface border rounded-xl overflow-hidden", overdue ? "border-red-200" : "border-border")}>
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-bg transition-colors" onClick={() => setExpanded((e) => !e)}>
        {expanded ? <ChevronDown size={14} className="text-ink-muted flex-shrink-0" /> : <ChevronRight size={14} className="text-ink-muted flex-shrink-0" />}
        <ClipboardList size={15} className={clsx("flex-shrink-0", overdue ? "text-danger" : "text-emerald-500")} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm text-ink">{hw.title}</p>
            <Badge color="default">{hw.subject}</Badge>
            {overdue && <Badge color="red">Overdue</Badge>}
          </div>
          <p className="text-xs text-ink-muted mt-0.5">
            Due {format(new Date(hw.dueDate), "EEEE d MMMM")}
            {daysLeft > 0 && ` · ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left`}
            {daysLeft === 0 && " · Due today"}
          </p>
        </div>
        {sessions.length > 0 && (
          <span className={clsx("text-xs flex-shrink-0", doneSessions === sessions.length ? "text-success" : "text-emerald-500")}>
            {doneSessions}/{sessions.length} sessions
          </span>
        )}
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border/40 pt-3 space-y-3">
          {hw.description && <p className="text-xs text-ink-muted">{hw.description}</p>}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Planned sessions</p>
              <button onClick={onSchedule} className="text-xs text-accent hover:underline flex items-center gap-1">
                <CalendarClock size={11} /> Plan session
              </button>
            </div>
            {sessions.length === 0 ? (
              <p className="text-xs text-ink-light italic">No sessions planned yet.</p>
            ) : (
              <div className="space-y-1.5">
                {sessions.sort((a, b) => a.startTime - b.startTime).map((s) => (
                  <HomeworkSessionRow key={s._id} session={s} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HomeworkSessionRow({ session }: { session: any }) {
  const toggle    = useMutation(studyApi.toggleHomeworkSession);
  const del       = useMutation(studyApi.deleteHomeworkSession);
  const reschedule = useMutation(studyApi.rescheduleHomeworkSession);
  const today     = isToday(new Date(session.startTime));
  const durMin    = Math.round((session.endTime - session.startTime) / 60000);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [slot, setSlot] = useState<ScheduledSlot>({ startTime: session.startTime, durationMinutes: durMin });

  return (
    <>
      <div className={clsx(
        "flex items-center gap-3 p-2.5 bg-bg border rounded-lg transition-all",
        session.done ? "opacity-50 border-border" : today ? "border-emerald-300 bg-emerald-50/40" : "border-border hover:border-border-strong"
      )}>
        <button onClick={() => toggle({ id: session._id })}
          className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
            session.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
          )}>
          {session.done && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={clsx("text-sm font-medium text-ink truncate", session.done && "line-through text-ink-muted")}>
            {session.title}
          </p>
          <p className="text-xs text-ink-muted">
            {format(new Date(session.startTime), "EEEE d MMM · HH:mm")} – {format(new Date(session.endTime), "HH:mm")}
          </p>
        </div>
        {today && <Badge color="red">Today</Badge>}
        <button onClick={() => { setSlot({ startTime: session.startTime, durationMinutes: durMin }); setRescheduleOpen(true); }}
          className="p-1 text-ink-light hover:text-accent transition-colors" title="Reschedule">
          <Calendar size={12} />
        </button>
        <button onClick={() => del({ id: session._id })} className="p-1 text-ink-light hover:text-danger transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      <Modal open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Reschedule homework session" width="max-w-2xl">
        <div className="space-y-4">
          <CalendarScheduler value={slot} onChange={setSlot} accentColor="emerald" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={async () => { await reschedule({ id: session._id, ...slot }); setRescheduleOpen(false); }}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function ScheduleHomeworkModal({ open, onClose, hw }: { open: boolean; onClose: () => void; hw: any }) {
  const schedule = useMutation(studyApi.scheduleHomeworkSession);
  const [slot, setSlot] = useState<ScheduledSlot>({
    startTime: addDays(new Date(), 1).setHours(18, 0, 0, 0),
    durationMinutes: 45,
  });

  const submit = async () => {
    await schedule({ homeworkId: hw._id, startTime: slot.startTime, durationMinutes: slot.durationMinutes });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Plan homework session" width="max-w-2xl">
      <div className="space-y-4">
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
          <p className="font-semibold">{hw.title}</p>
          <p>{hw.subject} · Due {format(new Date(hw.dueDate), "EEEE d MMMM")}</p>
        </div>
        <CalendarScheduler value={slot} onChange={setSlot} accentColor="emerald" />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Add to calendar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Rehearsal tab ────────────────────────────────────────────────────────────

function RehearsalTab({ rehearsalSessions }: { rehearsalSessions: any[] }) {
  const [createModal, setCreateModal] = useState(false);
  const subjects = useQuery(api.lessons.getSubjects);

  const upcoming = useMemo(
    () => rehearsalSessions.filter((s) => isFuture(new Date(s.startTime)) || isToday(new Date(s.startTime))).sort((a, b) => a.startTime - b.startTime),
    [rehearsalSessions]
  );
  const past = useMemo(
    () => rehearsalSessions.filter((s) => isPast(new Date(s.startTime)) && !isToday(new Date(s.startTime))).sort((a, b) => b.startTime - a.startTime),
    [rehearsalSessions]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <p className="text-sm text-ink-muted">
          Rehearsal sessions are free practice blocks — review notes, redo exercises, or run through a topic without it being tied to a test or homework assignment.
        </p>
        <Button variant="primary" size="sm" onClick={() => setCreateModal(true)} className="flex-shrink-0 ml-4">
          <Plus size={13} /> Add session
        </Button>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState
          icon={<RefreshCw size={26} />}
          title="No rehearsal sessions"
          description="Plan free practice blocks to review topics at your own pace."
          action={<Button size="sm" onClick={() => setCreateModal(true)}>Add session</Button>}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">Upcoming</h3>
              <div className="space-y-2">
                {upcoming.map((s) => <RehearsalSessionRow key={s._id} session={s} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-muted mb-3">Past</h3>
              <div className="space-y-2 opacity-60">
                {past.slice(0, 10).map((s) => <RehearsalSessionRow key={s._id} session={s} />)}
              </div>
            </section>
          )}
        </>
      )}

      <CreateRehearsalModal open={createModal} onClose={() => setCreateModal(false)} subjects={subjects ?? []} />
    </div>
  );
}

function RehearsalSessionRow({ session }: { session: any }) {
  const toggle     = useMutation(studyApi.toggleRehearsalSession);
  const del        = useMutation(studyApi.deleteRehearsalSession);
  const reschedule = useMutation(studyApi.rescheduleRehearsalSession);
  const today      = isToday(new Date(session.startTime));
  const durMin     = Math.round((session.endTime - session.startTime) / 60000);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [slot, setSlot] = useState<ScheduledSlot>({ startTime: session.startTime, durationMinutes: durMin });

  return (
    <>
      <div className={clsx(
        "flex items-center gap-3 p-3 bg-surface border rounded-lg transition-all",
        session.done ? "opacity-50 border-border" : today ? "border-amber-300 bg-amber-50/40" : "border-border hover:border-border-strong"
      )}>
        <button onClick={() => toggle({ id: session._id })}
          className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
            session.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
          )}>
          {session.done && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
        <RefreshCw size={13} className="text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={clsx("text-sm font-medium text-ink truncate", session.done && "line-through text-ink-muted")}>
              {session.title}
            </p>
            <Badge color="default">{session.subject}</Badge>
          </div>
          <p className="text-xs text-ink-muted">
            {format(new Date(session.startTime), "EEEE d MMM · HH:mm")} – {format(new Date(session.endTime), "HH:mm")}
          </p>
          {session.description && <p className="text-xs text-ink-light mt-0.5">{session.description}</p>}
        </div>
        {today && <Badge color="red">Today</Badge>}
        <button onClick={() => { setSlot({ startTime: session.startTime, durationMinutes: durMin }); setRescheduleOpen(true); }}
          className="p-1 text-ink-light hover:text-accent transition-colors" title="Reschedule">
          <Calendar size={12} />
        </button>
        <button onClick={() => del({ id: session._id })} className="p-1 text-ink-light hover:text-danger transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      <Modal open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Reschedule rehearsal session" width="max-w-2xl">
        <div className="space-y-4">
          <CalendarScheduler value={slot} onChange={setSlot} accentColor="amber" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={async () => { await reschedule({ id: session._id, ...slot }); setRescheduleOpen(false); }}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function CreateRehearsalModal({ open, onClose, subjects }: { open: boolean; onClose: () => void; subjects: string[] }) {
  const create = useMutation(studyApi.createRehearsalSession);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slot, setSlot] = useState<ScheduledSlot>({
    startTime: addDays(new Date(), 1).setHours(18, 0, 0, 0),
    durationMinutes: 60,
  });

  const submit = async () => {
    if (!subject || !title.trim()) return;
    await create({ subject, title, description: description || undefined, startTime: slot.startTime, durationMinutes: slot.durationMinutes });
    setSubject(""); setTitle(""); setDescription(""); onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add rehearsal session" width="max-w-2xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-muted">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded border border-border bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-accent/40">
              <option value="">Select subject…</option>
              {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <Input label="What to rehearse" value={title} onChange={(e: any) => setTitle(e.target.value)} placeholder="e.g. Review chapter 4 formulas" />
        </div>
        <Textarea label="Notes (optional)" value={description} onChange={(e: any) => setDescription(e.target.value)} rows={2} placeholder="Anything specific to focus on…" />

        <CalendarScheduler value={slot} onChange={setSlot} accentColor="amber" />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit} disabled={!subject || !title.trim()}>Add to calendar</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tests sub-components ─────────────────────────────────────────────────────

function TestStudyCard({ test, sessions }: { test: any; sessions: any[] }) {
  const [expanded, setExpanded] = useState(true);
  const [scheduleModal, setScheduleModal] = useState(false);
  const [addSubtaskModal, setAddSubtaskModal] = useState(false);

  const subtasks      = useQuery(studyApi.getSubtasksByTest, { testId: test._id });
  const toggleSubtask = useMutation(studyApi.toggleSubtask);
  const deleteSubtask = useMutation(studyApi.deleteSubtask);

  const today    = isToday(new Date(test.date));
  const daysLeft = Math.ceil((new Date(test.date).getTime() - Date.now()) / 86400000);
  const doneSubtasks  = (subtasks ?? []).filter((s: any) => s.done).length;
  const totalSubtasks = (subtasks ?? []).length;
  const doneSessions  = sessions.filter((s) => s.done).length;

  return (
    <div className={clsx("bg-surface border rounded-xl overflow-hidden transition-all", today ? "border-purple-300" : "border-border")}>
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-bg transition-colors" onClick={() => setExpanded((e) => !e)}>
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
          {totalSubtasks > 0 && <span className={clsx(doneSubtasks === totalSubtasks ? "text-success" : "")}>{doneSubtasks}/{totalSubtasks} topics</span>}
          {sessions.length > 0 && <span className={clsx(doneSessions === sessions.length ? "text-success" : "text-purple-500")}>{doneSessions}/{sessions.length} sessions</span>}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/40 pt-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Study topics</p>
              <button onClick={() => setAddSubtaskModal(true)} className="text-xs text-accent hover:underline flex items-center gap-1">
                <Plus size={11} /> Add topic
              </button>
            </div>
            {(subtasks ?? []).length === 0 ? (
              <p className="text-xs text-ink-light italic">Break down what you need to learn.</p>
            ) : (
              <div className="space-y-1.5">
                {(subtasks ?? []).sort((a: any, b: any) => a.order - b.order).map((sub: any) => (
                  <div key={sub._id} className="flex items-center gap-2">
                    <button onClick={() => toggleSubtask({ id: sub._id })}
                      className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                        sub.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
                      )}>
                      {sub.done && <Check size={10} className="text-white" strokeWidth={3} />}
                    </button>
                    <span className={clsx("text-sm flex-1 text-ink", sub.done && "line-through text-ink-muted")}>{sub.title}</span>
                    <button onClick={() => deleteSubtask({ id: sub._id })} className="p-0.5 text-ink-light hover:text-danger transition-colors">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Study sessions</p>
              <button onClick={() => setScheduleModal(true)} className="text-xs text-accent hover:underline flex items-center gap-1">
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

      <AddSubtaskModal open={addSubtaskModal} onClose={() => setAddSubtaskModal(false)} testId={test._id} nextOrder={(subtasks ?? []).length} />
      <ScheduleStudyModal open={scheduleModal} onClose={() => setScheduleModal(false)} test={test} />
    </div>
  );
}

function StudySessionRow({ session }: { session: any }) {
  const toggle     = useMutation(studyApi.toggleStudySession);
  const del        = useMutation(studyApi.deleteStudySession);
  const reschedule = useMutation(studyApi.rescheduleStudySession);
  const today      = isToday(new Date(session.startTime));
  const durMin     = Math.round((session.endTime - session.startTime) / 60000);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [slot, setSlot] = useState<ScheduledSlot>({ startTime: session.startTime, durationMinutes: durMin });

  return (
    <>
      <div className={clsx(
        "flex items-center gap-3 p-2.5 bg-bg border rounded-lg transition-all",
        session.done ? "opacity-50 border-border" : today ? "border-purple-300 bg-purple-50/40" : "border-border hover:border-border-strong"
      )}>
        <button onClick={() => toggle({ id: session._id })}
          className={clsx("w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
            session.done ? "bg-success border-success" : "border-border-strong hover:border-accent"
          )}>
          {session.done && <Check size={10} className="text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={clsx("text-sm font-medium text-ink truncate", session.done && "line-through text-ink-muted")}>{session.title}</p>
          <p className="text-xs text-ink-muted">
            {format(new Date(session.startTime), "EEEE d MMM · HH:mm")} – {format(new Date(session.endTime), "HH:mm")}
          </p>
        </div>
        {today && <Badge color="red">Today</Badge>}
        <button onClick={() => { setSlot({ startTime: session.startTime, durationMinutes: durMin }); setRescheduleOpen(true); }}
          className="p-1 text-ink-light hover:text-accent transition-colors" title="Reschedule">
          <Calendar size={12} />
        </button>
        <button onClick={() => del({ id: session._id })} className="p-1 text-ink-light hover:text-danger transition-colors">
          <Trash2 size={12} />
        </button>
      </div>

      <Modal open={rescheduleOpen} onClose={() => setRescheduleOpen(false)} title="Reschedule study session" width="max-w-2xl">
        <div className="space-y-4">
          <CalendarScheduler value={slot} onChange={setSlot} accentColor="purple" />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={async () => { await reschedule({ id: session._id, ...slot }); setRescheduleOpen(false); }}>Save</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function AddSubtaskModal({ open, onClose, testId, nextOrder }: { open: boolean; onClose: () => void; testId: any; nextOrder: number }) {
  const create = useMutation(studyApi.createSubtask);
  const [title, setTitle] = useState("");
  const submit = async () => {
    if (!title.trim()) return;
    await create({ testId, title, order: nextOrder });
    setTitle(""); onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Add study topic">
      <div className="space-y-3">
        <Input label="Topic" value={title} onChange={(e: any) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 3 – Quadratic equations"
          onKeyDown={(e: any) => e.key === "Enter" && submit()} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>Add</Button>
        </div>
      </div>
    </Modal>
  );
}

function ScheduleStudyModal({ open, onClose, test }: { open: boolean; onClose: () => void; test: any }) {
  const schedule = useMutation(studyApi.scheduleStudySessions);
  const [sessions, setSessions] = useState(3);
  const [slot, setSlot] = useState<ScheduledSlot>({
    startTime: new Date().setHours(18, 0, 0, 0),
    durationMinutes: 60,
  });
  const daysLeft = Math.ceil((new Date(test.date).getTime() - Date.now()) / 86400000);

  const submit = async () => {
    const d = new Date(slot.startTime);
    await schedule({
      testId: test._id,
      sessions,
      durationMinutes: slot.durationMinutes,
      preferredHour: d.getHours(),
      preferredMinute: d.getMinutes(),
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Plan study sessions" width="max-w-2xl">
      <div className="space-y-4">
        <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-xs text-purple-800">
          <p className="font-semibold">{test.topic} — {test.subject}</p>
          <p>{format(new Date(test.date), "EEEE d MMMM yyyy")} · {daysLeft > 0 ? `${daysLeft} days left` : "Today!"}</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-ink-muted whitespace-nowrap">Number of sessions</label>
          <div className="flex items-center gap-2">
            <button onClick={() => setSessions(Math.max(1, sessions - 1))} className="w-7 h-7 rounded border border-border text-ink flex items-center justify-center hover:bg-border transition-colors">−</button>
            <span className="text-sm font-semibold text-ink w-4 text-center">{sessions}</span>
            <button onClick={() => setSessions(Math.min(14, sessions + 1))} className="w-7 h-7 rounded border border-border text-ink flex items-center justify-center hover:bg-border transition-colors">+</button>
          </div>
          <span className="text-xs text-ink-muted">
            Sessions are placed on the {sessions} day{sessions !== 1 ? "s" : ""} before the test at the time you pick below.
          </span>
        </div>

        <p className="text-xs text-ink-muted -mt-1">Pick the preferred time on the calendar. Existing sessions for this test will be replaced.</p>

        <CalendarScheduler value={slot} onChange={setSlot} accentColor="purple" />

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={submit}>
            <Clock size={13} /> Plan {sessions} session{sessions !== 1 ? "s" : ""}
          </Button>
        </div>
      </div>
    </Modal>
  );
}