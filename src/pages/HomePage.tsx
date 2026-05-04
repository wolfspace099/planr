import { useQuery, useMutation } from "convex/react";
import { useUser, UserButton } from "@clerk/clerk-react";
import { format, startOfDay, endOfDay, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { Link } from "react-router-dom";
import {
  Home,
  BookOpen,
  ClipboardList,
  FlaskConical,
  MapPin,
  Repeat2,
  CheckSquare,
  Calendar as CalendarIcon,
} from "lucide-react";
import clsx from "clsx";

import { api } from "../../convex/_generated/api";
import { ActivityBar } from "../components/layout/ActivityBar";
import { AIToggleButton } from "../components/ai/AIToggleButton";

function timeStr(ts: number) {
  return format(new Date(ts), "HH:mm");
}

export default function HomePage() {
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

  const toggleHabit = useMutation(api.misc.toggleCompletion);
  const toggleTask = useMutation(api.tasks.toggle);
  const toggleHw = useMutation(api.homework.toggle);

  const todayTasks = tasks?.filter((t) => !t.done && (!t.dueDate || t.dueDate <= todayEnd)) ?? [];
  const todayTests = tests?.filter((t) => isToday(new Date(t.date))) ?? [];
  const completedIds = new Set(completions?.map((c) => c.habitId) ?? []);

  const sortedLessons = (lessons ?? []).slice().sort((a: any, b: any) => a.startTime - b.startTime);
  const lessonCount = sortedLessons.length;
  const homeworkCount = homework?.length ?? 0;
  const taskCount = todayTasks.length;
  const testCount = todayTests.length;

  const hour = now.getHours();
  const greeting = hour < 12 ? "Goedemorgen" : hour < 17 ? "Goedemiddag" : "Goedenavond";

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#cccccc]">
      <div className="flex-shrink-0 flex items-center h-[30px] bg-[#dddddd] dark:bg-[#3c3c3c] border-b border-[#cccccc] dark:border-[#252526] select-none">
        <div className="flex items-center gap-2 px-3 w-56 flex-shrink-0">
          <Home size={13} className="text-[#7c3aed]" strokeWidth={2} />
          <span className="text-[12px] font-normal text-[#333333] dark:text-[#cccccc]">cognoto</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-2 h-[22px] bg-white dark:bg-[#252526] border border-[#cccccc] dark:border-[#1e1e1e] min-w-[280px] justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7c3aed]" />
            <span className="text-[12px] text-[#333333] dark:text-[#cccccc] tabular-nums">
              cognoto — {format(now, "EEE d MMM yyyy", { locale: nl })}
            </span>
          </div>
        </div>
        <div className="flex items-center w-56 flex-shrink-0 justify-end">
          <AIToggleButton />
          <UserButton appearance={{ elements: { avatarBox: "w-5 h-5 mr-3 bg-[#7c3aed]" } }} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
       <ActivityBar homeActive />
       <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <div className="flex-shrink-0 flex items-center h-[26px] px-3 bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] text-[11px] text-[#6c6c6c] dark:text-[#969696] select-none gap-1.5">
        <Home size={11} strokeWidth={2} className="text-[#7c3aed]" />
        <span className="uppercase tracking-wide">Home</span>
        <span className="opacity-40">|</span>
        <span className="font-mono tabular-nums">{format(now, "d MMMM yyyy", { locale: nl })}</span>
        <span className="ml-auto flex items-center gap-3 font-mono tabular-nums">
          <span>{lessonCount} lessen</span>
          <span className="opacity-30">|</span>
          <span>{homeworkCount + taskCount} taken</span>
          <span className="opacity-30">|</span>
          <span>{testCount} toetsen</span>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] [scrollbar-width:thin]">
        <div className="px-6 py-6 max-w-[1400px] mx-auto">
          <div className="mb-6">
            <p className="text-[11px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696] mb-1 font-mono tabular-nums">
              {format(now, "EEEE d MMMM", { locale: nl })}
            </p>
            <h1 className="text-[22px] font-semibold text-[#333333] dark:text-[#ffffff] tracking-tight">
              {greeting}, {user?.firstName ?? "daar"}
            </h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
            <Panel title="Lessen vandaag" icon={<CalendarIcon size={11} strokeWidth={2} />}>
              {sortedLessons.length === 0 ? (
                <EmptyRow label="Geen lessen vandaag" />
              ) : (
                <div className="divide-y divide-[#e7e7e7] dark:divide-[#2d2d30]">
                  {sortedLessons.map((l: any) => (
                    <Link
                      key={l._id}
                      to={`/lesson/${l._id}`}
                      className="block px-3 py-2 hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] transition-colors"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] font-semibold text-[#333333] dark:text-[#cccccc] truncate">
                          {l.subject}
                        </span>
                        <span className="text-[10px] text-[#6c6c6c] dark:text-[#858585] font-mono tabular-nums whitespace-nowrap">
                          {timeStr(l.startTime)}–{timeStr(l.endTime)}
                        </span>
                      </div>
                      {l.location && (
                        <span className="text-[10px] text-[#6c6c6c] dark:text-[#969696] flex items-center gap-1 mt-0.5">
                          <MapPin size={9} /> {l.location}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </Panel>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 content-start">
              <Panel title="Huiswerk vandaag" icon={<ClipboardList size={11} strokeWidth={2} />}>
                {homework && homework.length > 0 ? (
                  <div className="divide-y divide-[#e7e7e7] dark:divide-[#2d2d30]">
                    {homework.map((hw) => (
                      <CheckRow
                        key={hw._id}
                        done={hw.done}
                        label={hw.title}
                        sub={hw.subject}
                        onToggle={() => toggleHw({ id: hw._id })}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyRow label="Niets te doen" />
                )}
              </Panel>

              <Panel title="Taken" icon={<CheckSquare size={11} strokeWidth={2} />}>
                {todayTasks.length > 0 ? (
                  <div className="divide-y divide-[#e7e7e7] dark:divide-[#2d2d30]">
                    {todayTasks.slice(0, 8).map((t) => (
                      <CheckRow
                        key={t._id}
                        done={t.done}
                        label={t.title}
                        sub={t.subject}
                        priority={t.priority}
                        onToggle={() => toggleTask({ id: t._id })}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyRow label="Geen taken" />
                )}
              </Panel>

              {todayTests.length > 0 && (
                <Panel
                  className="lg:col-span-2"
                  title="Toetsen vandaag"
                  icon={<FlaskConical size={11} strokeWidth={2} />}
                >
                  <div className="divide-y divide-[#e7e7e7] dark:divide-[#2d2d30]">
                    {todayTests.map((t) => {
                      const inner = (
                        <div className="flex items-center gap-2 px-3 py-2">
                          <FlaskConical size={12} className="text-[#7c3aed] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-semibold text-[#333333] dark:text-[#cccccc] truncate">
                              {t.topic}
                            </p>
                            <p className="text-[10px] text-[#6c6c6c] dark:text-[#969696] truncate">{t.subject}</p>
                          </div>
                        </div>
                      );
                      return t.lessonId ? (
                        <Link
                          key={t._id}
                          to={`/lesson/${t.lessonId}`}
                          className="block hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] transition-colors"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div key={t._id}>{inner}</div>
                      );
                    })}
                  </div>
                </Panel>
              )}

              {(habits?.length ?? 0) > 0 && (
                <Panel
                  className="lg:col-span-2"
                  title="Gewoontes"
                  icon={<Repeat2 size={11} strokeWidth={2} />}
                >
                  <div className="flex flex-wrap gap-1.5 p-2">
                    {habits?.filter((h) => h.active).map((h) => {
                      const done = completedIds.has(h._id);
                      return (
                        <button
                          key={h._id}
                          type="button"
                          onClick={() => toggleHabit({ habitId: h._id, date: todayStr })}
                          className={clsx(
                            "flex items-center gap-1.5 px-2.5 h-[24px] text-[11px] border transition-colors focus:outline-none",
                            done
                              ? "bg-[#7c3aed] text-white border-[#7c3aed]"
                              : "bg-[#f3f3f3] dark:bg-[#252526] text-[#333333] dark:text-[#cccccc] border-[#cccccc] dark:border-[#2d2d30] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e]",
                          )}
                        >
                          {h.emoji && <span>{h.emoji}</span>}
                          <span>{h.name}</span>
                          {done && <span className="text-[10px]">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </Panel>
              )}

              <Panel className="lg:col-span-2" title="Notities" icon={<BookOpen size={11} strokeWidth={2} />}>
                <Link
                  to="/calendar?tab=notebook"
                  className="block px-3 py-2 hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] text-[12px] text-[#333333] dark:text-[#cccccc] transition-colors"
                >
                  Open notebook →
                </Link>
              </Panel>
            </div>
          </div>
        </div>
      </div>
       </div>
      </div>

      <div className="flex-shrink-0 flex items-center h-[22px] bg-[#7c3aed] text-white text-[11px] font-medium select-none">
        <div className="flex items-center h-full">
          <span className="px-2 flex items-center gap-1">
            <Home size={11} strokeWidth={2} />
            <span>home</span>
          </span>
          <span className="px-2 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            <span>synced</span>
          </span>
          <span className="px-2 font-mono tabular-nums">{format(now, "yyyy-MM-dd")}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center h-full">
          <span className="px-2 font-mono tabular-nums">
            {lessonCount}L · {homeworkCount}H · {taskCount}T
          </span>
          <span className="px-2 font-mono tabular-nums">{format(now, "HH:mm")}</span>
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "border border-[#e7e7e7] dark:border-[#2d2d30] bg-white dark:bg-[#252526] flex flex-col",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 px-3 h-[24px] bg-[#f3f3f3] dark:bg-[#2d2d30] border-b border-[#e7e7e7] dark:border-[#1e1e1e] select-none">
        {icon && <span className="text-[#7c3aed]">{icon}</span>}
        <span className="text-[10px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]">{title}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function EmptyRow({ label }: { label: string }) {
  return <p className="px-3 py-2 text-[11px] text-[#6c6c6c] dark:text-[#858585] italic">{label}</p>;
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
    <button
      type="button"
      onClick={onToggle}
      className={clsx(
        "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]",
        done && "opacity-50",
      )}
    >
      <span
        className={clsx(
          "w-3.5 h-3.5 border flex items-center justify-center flex-shrink-0",
          done ? "bg-[#7c3aed] border-[#7c3aed]" : "border-[#cccccc] dark:border-[#858585]",
        )}
      >
        {done && <span className="text-white text-[9px]">✓</span>}
      </span>
      <div className="flex-1 min-w-0">
        <p className={clsx("text-[12px] text-[#333333] dark:text-[#cccccc] truncate", done && "line-through")}>
          {label}
        </p>
        {sub && <p className="text-[10px] text-[#6c6c6c] dark:text-[#969696] truncate">{sub}</p>}
      </div>
      {priority === "high" && !done && <span className="w-1.5 h-1.5 bg-[#f48771] flex-shrink-0" />}
    </button>
  );
}
