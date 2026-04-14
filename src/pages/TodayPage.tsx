import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { format, startOfDay, endOfDay, isToday } from "date-fns";
import { Link } from "react-router-dom";
import { CheckSquare, BookOpen, ClipboardList, FlaskConical, MapPin, Clock, Repeat2 } from "lucide-react";
import { Badge } from "../components/ui/primitives";
import clsx from "clsx";

function timeStr(ts: number) {
  return format(new Date(ts), "HH:mm");
}

export default function TodayPage() {
  const { user } = useUser();
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");

  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();

  const lessons = useQuery(api.lessons.getRange, { from: todayStart, to: todayEnd });
  const homework = useQuery(api.homework.getDueRange, { from: todayStart, to: todayEnd });
  const tasks = useQuery(api.tasks.getAll);
  const tests = useQuery(api.misc.getTests);
  const habits = useQuery(api.misc.getHabits);
  const completions = useQuery(api.misc.getCompletions, { date: todayStr });
  const appointments = useQuery(api.misc.getAppointments);

  const toggleHabit = useMutation(api.misc.toggleCompletion);
  const toggleTask = useMutation(api.tasks.toggle);
  const toggleHw = useMutation(api.homework.toggle);

  const todayTasks = tasks?.filter((t) => !t.done && (!t.dueDate || t.dueDate <= todayEnd)) ?? [];
  const todayTests = tests?.filter((t) => {
    const d = new Date(t.date);
    return isToday(d);
  }) ?? [];

  // Build today's appointments: one-off today + recurring matching day-of-week
  const todayAppts = (appointments ?? []).filter((a) => {
    if (a.isRecurring) {
      return a.recurringDayOfWeek === now.getDay();
    }
    return a.startTime >= todayStart && a.startTime <= todayEnd;
  });

  const completedIds = new Set(completions?.map((c) => c.habitId) ?? []);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-ink-muted mb-1">{format(now, "EEEE, MMMM d")}</p>
        <h1 className="text-2xl font-semibold text-ink tracking-tight">
          {greeting}, {user?.firstName ?? "there"} 👋
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Today's schedule */}
        <div className="col-span-2">
          <SectionTitle icon={<Clock size={13} />} label="Schedule" />
          <div className="space-y-2">
            {[...(lessons ?? []), ...todayAppts]
              .sort((a, b) => a.startTime - b.startTime)
              .map((item) => {
                const isLesson = "icalUid" in item;
                if (isLesson) {
                  const l = item as any;
                  return (
                    <Link key={l._id} to={`/lesson/${l._id}`}>
                      <div className="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg hover:border-border-strong hover:shadow-card transition-all group">
                        <div className="text-xs font-mono text-ink-muted w-11 flex-shrink-0">
                          {timeStr(l.startTime)}
                        </div>
                        <div className="w-1 h-8 rounded-full bg-accent/70 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-ink truncate group-hover:text-accent transition-colors">
                            {l.subject}
                          </p>
                          {l.location && (
                            <p className="text-xs text-ink-muted flex items-center gap-0.5 mt-0.5">
                              <MapPin size={10} /> {l.location}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-ink-light">{timeStr(l.endTime)}</span>
                      </div>
                    </Link>
                  );
                }
                const a = item as any;
                return (
                  <div key={a._id} className="flex items-center gap-3 p-3 bg-surface border border-border rounded-lg">
                    <div className="text-xs font-mono text-ink-muted w-11 flex-shrink-0">
                      {a.isRecurring ? a.recurringTimeHHMM : timeStr(a.startTime)}
                    </div>
                    <div
                      className="w-1 h-8 rounded-full flex-shrink-0"
                      style={{ backgroundColor: a.color ?? "#6B7280" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-ink truncate">{a.title}</p>
                      {a.location && (
                        <p className="text-xs text-ink-muted flex items-center gap-0.5 mt-0.5">
                          <MapPin size={10} /> {a.location}
                        </p>
                      )}
                    </div>
                    <Badge color="default">Personal</Badge>
                  </div>
                );
              })}
            {(lessons?.length ?? 0) === 0 && todayAppts.length === 0 && (
              <Empty label="No lessons or appointments today" />
            )}
          </div>
        </div>

        {/* Homework due today */}
        <div>
          <SectionTitle icon={<ClipboardList size={13} />} label="Homework due today" />
          <div className="space-y-1.5">
            {homework?.map((hw) => (
              <CheckRow
                key={hw._id}
                done={hw.done}
                label={hw.title}
                sub={hw.subject}
                onToggle={() => toggleHw({ id: hw._id })}
              />
            ))}
            {(homework?.length ?? 0) === 0 && <Empty label="Nothing due today" />}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <SectionTitle icon={<CheckSquare size={13} />} label="Tasks" />
          <div className="space-y-1.5">
            {todayTasks.slice(0, 6).map((t) => (
              <CheckRow
                key={t._id}
                done={t.done}
                label={t.title}
                sub={t.subject}
                priority={t.priority}
                onToggle={() => toggleTask({ id: t._id })}
              />
            ))}
            {todayTasks.length === 0 && <Empty label="No tasks" />}
          </div>
        </div>

        {/* Tests today */}
        {todayTests.length > 0 && (
          <div className="col-span-2">
            <SectionTitle icon={<FlaskConical size={13} />} label="Tests today" />
            <div className="space-y-1.5">
              {todayTests.map((t) => (
                <div key={t._id} className="flex items-center gap-3 p-3 bg-danger-light border border-red-200 rounded-lg">
                  <FlaskConical size={14} className="text-danger flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-ink">{t.topic}</p>
                    <p className="text-xs text-ink-muted">{t.subject}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Habits */}
        {(habits?.length ?? 0) > 0 && (
          <div className="col-span-2">
            <SectionTitle icon={<Repeat2 size={13} />} label="Today's habits" />
            <div className="flex flex-wrap gap-2">
              {habits?.filter((h) => h.active).map((h) => {
                const done = completedIds.has(h._id);
                return (
                  <button
                    key={h._id}
                    onClick={() => toggleHabit({ habitId: h._id, date: todayStr })}
                    className={clsx(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                      done
                        ? "bg-success-light border-green-200 text-success"
                        : "bg-surface border-border text-ink-muted hover:border-border-strong"
                    )}
                  >
                    {h.emoji && <span>{h.emoji}</span>}
                    <span>{h.name}</span>
                    {done && <span className="text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming lessons from notebook */}
        <div className="col-span-2">
          <SectionTitle icon={<BookOpen size={13} />} label="Recent notes" />
          <Link
            to="/notebook"
            className="block p-3 bg-surface border border-border rounded-lg hover:border-border-strong hover:shadow-card transition-all text-sm text-ink-muted"
          >
            Open notebook →
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5">
      <span className="text-ink-light">{icon}</span>
      <h2 className="text-xs font-semibold text-ink-muted uppercase tracking-wider">{label}</h2>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return <p className="text-xs text-ink-light py-2 px-1">{label}</p>;
}

function CheckRow({
  done,
  label,
  sub,
  priority,
  onToggle,
}: {
  done: boolean;
  label: string;
  sub?: string;
  priority?: string;
  onToggle: () => void;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer group",
        done ? "bg-bg border-border/60 opacity-60" : "bg-surface border-border hover:border-border-strong"
      )}
      onClick={onToggle}
    >
      <div
        className={clsx(
          "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
          done ? "bg-success border-success" : "border-border-strong group-hover:border-accent"
        )}
      >
        {done && <span className="text-white text-[10px]">✓</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={clsx("text-sm text-ink truncate", done && "line-through text-ink-muted")}>
          {label}
        </p>
        {sub && <p className="text-xs text-ink-light">{sub}</p>}
      </div>
      {priority === "high" && !done && (
        <span className="w-1.5 h-1.5 rounded-full bg-danger flex-shrink-0" />
      )}
    </div>
  );
}
