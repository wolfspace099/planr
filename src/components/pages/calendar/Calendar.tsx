import { NowLine } from "./NowLine";
import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarTab } from "./CalendarTopBar";
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameDay, isToday,
} from "date-fns";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { studyApi } from "../../../studyApi";
import { Link } from "react-router-dom";
import { BookOpen, ClipboardList, FlaskConical, MapPin, RefreshCw } from "lucide-react";
import clsx from "clsx";

const hour_height = 68;
const start_hour  = 7;
const end_hour    = 23;
const total_hours = end_hour - start_hour;
const time_col_width = 64;


function toTopPx(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  return (h - start_hour) * hour_height;
}
function durationPx(startMs: number, endMs: number): number {
  return ((endMs - startMs) / 3_600_000) * hour_height;
}
function subjectDisplay(subject: string): string {
  return subject.length > 12 ? subject.slice(0, 10) + "…" : subject;
}

const school_periods = [
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
  for (const p of school_periods) {
    const pMins = p.startHH * 60 + p.startMM;
    if (Math.abs(mins - pMins) <= 5) return p.label;
  }
  return null;
}

interface EventChip { key: string; top: number; height: number; node: React.ReactNode; }
type CalendarViewMode = "week" | "studyPlanner";

export function Calendar() {
    const scrollRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [activeTab, setActiveTab] = useState<CalendarTab>("calendar");

  const handleTabChange = (tab: CalendarTab) => {
    setActiveTab(tab);
    if (tab === "calendar") setViewMode("week");
    if (tab === "studyPlanner") setViewMode("studyPlanner");
  };
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5);

  const settings     = useQuery(api.userSettings.get);
  const syncCalendar = useAction(api.ical.syncCalendar);
  const hasSynced    = useRef(false);
  const [createModal, setCreateModal] = useState<{ date: Date; hour: number } | null>(null);

  useEffect(() => {
    if (hasSynced.current) return;
    if (!settings) return;

    const hasZermelo =
        settings.zermeloSchool && settings.zermeloAccessToken;

    const syncSeed =
        settings.externalAppCode ||
        (hasZermelo
        ? `${settings.zermeloSchool}:${settings.zermeloTokenUpdatedAt ?? ""}`
        : "");

    if (!syncSeed) return;

    hasSynced.current = true;

    syncCalendar({
        externalAppCode: settings.externalAppCode,
        zermeloSchool: settings.zermeloSchool,
        weekStartMs: weekStart.getTime(),
    }).catch(() => {});
    }, [settings, syncCalendar, weekStart]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    scrollRef.current.scrollTop = Math.max(0, (h - start_hour - 1) * hour_height);
  }, []);

  const lessons           = useQuery(api.lessons.getRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const tests             = useQuery(api.misc.getTests);
  const appointments      = useQuery(api.misc.getAppointments);
  const homework          = useQuery(api.homework.getAll);
  const tasks             = useQuery(api.tasks.getAll);
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

  const calendarVisible = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const cal of calendars) map[cal._id] = cal.visible;
    return map;
  }, [calendars]);

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    if ((e.target as HTMLElement).closest("[data-event]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const hour = Math.floor(relY / hour_height) + start_hour;
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

  const totalGridHeight = total_hours * hour_height;
  const hours = Array.from({ length: total_hours }, (_, i) => i + start_hour);

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-w-0">
    <div className="flex-shrink-0 border-b border-white/[0.08] overflow-x-auto bg-[#161616]">
      <div className="min-w-[700px]">
        <div className="grid" style={{ gridTemplateColumns: `${time_col_width}px repeat(5, 1fr)` }}>
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
              <div ref={scrollRef} className="overflow-y-auto overflow-x-auto flex-1">
                <div className="min-w-[700px]">
                  <div
                    className="grid relative"
                    style={{ gridTemplateColumns: `${time_col_width}px repeat(5, 1fr)`, height: totalGridHeight }}
                  >
                    <div className="relative">
                      {hours.map((h, i) => (
                        <div
                          key={h}
                          className="absolute w-full flex items-start justify-end pr-3"
                          style={{ top: i * hour_height - 8, height: hour_height }}
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
                              style={{ top: i * hour_height }}
                            />
                          ))}
                          {hours.map((h, i) => (
                            <div
                              key={`half-${h}`}
                              className="absolute w-full border-t border-white/[0.02] border-dashed"
                              style={{ top: i * hour_height + hour_height / 2 }}
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
                      style={{ top: 0, left: time_col_width, right: 0, height: totalGridHeight }}
                    >
                      <NowLine days={days} />
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}