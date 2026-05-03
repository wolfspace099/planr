import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { studyApi } from "../studyApi";
import {
  addDays,
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { nl } from "date-fns/locale";
import { UserButton } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Bell, ChevronLeft, ChevronRight, Menu, Settings } from "lucide-react";
import clsx from "clsx";

import { CreateAppointmentCard } from "../components/pages/calendar/CreateAppointmentCard";
import { StudyPlannerBoard } from "../components/pages/calendar/StudyPlannerBoard";

const HOUR_HEIGHT = 68;
const START_HOUR = 7;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_COL_W = 64;

type ViewMode = "week" | "day" | "studyPlanner";
type Tab = "calendar" | "studyPlanner" | "notebook" | "grades" | "messages";

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: "calendar",
    label: "Rooster",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    key: "studyPlanner",
    label: "Studiewijzer",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4V4z" />
        <path d="M4 4v12a4 4 0 004 4" />
      </svg>
    ),
  },
  {
    key: "notebook",
    label: "Notities",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5V4a2 2 0 012-2h10a2 2 0 012 2v15.5" />
        <path d="M4 19.5a2.5 2.5 0 002.5 2.5H20" />
        <path d="M8 7h8M8 11h8M8 15h6" />
      </svg>
    ),
  },
  {
    key: "grades",
    label: "Cijfers",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l4-9 5 18 4-12 5 6" />
      </svg>
    ),
  },
  {
    key: "messages",
    label: "Berichten",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
];

function toTopPx(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  return (h - START_HOUR) * HOUR_HEIGHT;
}
function durationPx(startMs: number, endMs: number): number {
  return ((endMs - startMs) / 3_600_000) * HOUR_HEIGHT;
}

export default function CalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [createModal, setCreateModal] = useState<{ date: Date; hour: number } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSynced = useRef(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const settings = useQuery(api.userSettings.get);
  const syncCalendar = useAction(api.ical.syncCalendar);
  const calendars = useQuery(api.calendars.getAll) ?? [];
  const lessons = useQuery(api.lessons.getRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const tests = useQuery(api.misc.getTests);
  const appointments = useQuery(api.misc.getAppointments);
  const homeworkSessions = useQuery(studyApi.getHomeworkSessionsInRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const rehearsalSessions = useQuery(studyApi.getRehearsalSessionsInRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const studySessions = useQuery(studyApi.getStudySessionsInRange, { from: weekStart.getTime(), to: weekEnd.getTime() });

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
  }, [viewMode]);

  const calendarVisible = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const cal of calendars) map[cal._id] = cal.visible;
    return map;
  }, [calendars]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === "calendar") setViewMode((m) => (m === "studyPlanner" ? "day" : m));
    if (tab === "studyPlanner") setViewMode("studyPlanner");
  };

  function getEventsForDay(day: Date) {
    const items: { key: string; startMs: number; endMs: number; title: string; subtitle?: string; color: string; href?: string }[] = [];

    (lessons ?? []).filter((l) => isSameDay(new Date(l.startTime), day)).forEach((l) => {
      items.push({
        key: `lesson-${l._id}`,
        startMs: l.startTime,
        endMs: l.endTime,
        title: l.subject,
        subtitle: l.subject,
        color: "#7c3aed",
        href: `/lesson/${l._id}`,
      });
    });

    (appointments ?? []).forEach((a) => {
      if (a.calendarId && calendarVisible[a.calendarId] === false) return;
      let startMs: number;
      if (a.isRecurring) {
        if (a.recurringDayOfWeek !== day.getDay()) return;
        const [hh, mm] = String(a.recurringTimeHHMM ?? "0:00").split(":").map((v) => parseInt(v, 10));
        const d = new Date(day);
        d.setHours(hh, mm, 0, 0);
        startMs = d.getTime();
      } else {
        if (!isSameDay(new Date(a.startTime), day)) return;
        startMs = a.startTime;
      }
      const endMs = a.endTime ?? startMs + 50 * 60_000;
      const cal = a.calendarId ? calendars.find((c) => c._id === a.calendarId) : null;
      const color = cal?.color ?? a.color ?? "#7c3aed";
      items.push({ key: `appt-${a._id}`, startMs, endMs, title: a.title, subtitle: a.location ?? undefined, color });
    });

    (studySessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).forEach((s: any) => {
      items.push({ key: `study-${s._id}`, startMs: s.startTime, endMs: s.endTime, title: s.title, color: "#9333ea" });
    });
    (homeworkSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).forEach((s: any) => {
      items.push({ key: `hw-${s._id}`, startMs: s.startTime, endMs: s.endTime, title: s.title, color: "#a855f7" });
    });
    (rehearsalSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).forEach((s: any) => {
      items.push({ key: `reh-${s._id}`, startMs: s.startTime, endMs: s.endTime, title: s.title, color: "#6d28d9" });
    });

    return items;
  }

  function countItemsForDay(day: Date) {
    let count = 0;
    let alerts = 0;
    count += (lessons ?? []).filter((l) => isSameDay(new Date(l.startTime), day)).length;
    count += (appointments ?? []).filter((a) => {
      if (a.calendarId && calendarVisible[a.calendarId] === false) return false;
      if (a.isRecurring) return a.recurringDayOfWeek === day.getDay();
      return isSameDay(new Date(a.startTime), day);
    }).length;
    count += (studySessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).length;
    count += (homeworkSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).length;
    count += (rehearsalSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).length;
    alerts += (tests ?? []).filter((t) => isSameDay(new Date(t.date), day)).length;
    return { count, alerts };
  }

  const todayEvents = getEventsForDay(selectedDate);
  const dayLessonCount = (lessons ?? []).filter((l) => isSameDay(new Date(l.startTime), selectedDate)).length;
  const dayStudyCount =
    (studySessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), selectedDate)).length +
    (homeworkSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), selectedDate)).length +
    (rehearsalSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), selectedDate)).length;
  const dayTotalMs = todayEvents.reduce((acc, e) => acc + (e.endMs - e.startMs), 0);
  const dayTotalHours = Math.round((dayTotalMs / 3_600_000) * 10) / 10;

  const monthLabel = format(selectedDate, "MMM yyyy", { locale: nl });

  const goPrev = () => {
    if (viewMode === "day") setSelectedDate((d) => subDays(d, 1));
    else setSelectedDate((d) => subWeeks(d, 1));
  };
  const goNext = () => {
    if (viewMode === "day") setSelectedDate((d) => addDays(d, 1));
    else setSelectedDate((d) => addWeeks(d, 1));
  };
  const goToday = () => setSelectedDate(new Date());

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f6f3fb] dark:bg-[#0d0a14] text-[#1a1a1a] dark:text-[#f6f3fb]">
      <div className="flex-shrink-0 flex items-center h-14 border-b border-[#e3dbef] dark:border-[#2a2138] px-4 gap-4">
        <div className="flex items-center gap-3 w-64 flex-shrink-0">
          <button className="h-8 w-8 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] flex items-center justify-center text-[#1a1a1a]/70 dark:text-[#f6f3fb]/70" aria-label="Open menu">
            <Menu size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            <Settings size={15} className="text-[#7c3aed]" />
            <span className="font-semibold tracking-tight text-[15px]">cognoto</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={clsx(
                    "relative flex items-center gap-1.5 px-4 h-14 text-[13px] font-medium transition-colors",
                    active ? "text-[#1a1a1a] dark:text-[#f6f3fb]" : "text-[#1a1a1a]/45 dark:text-[#f6f3fb]/45 hover:text-[#1a1a1a]/80 dark:text-[#f6f3fb]/80"
                  )}
                >
                  <span>{tab.icon}</span>
                  {tab.label}
                  {active && <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[#7c3aed]" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 w-64 flex-shrink-0 justify-end">
          <span className="text-[12px] font-medium text-[#1a1a1a]/55 dark:text-[#f6f3fb]/55 tabular-nums whitespace-nowrap">{monthLabel}</span>
          <button onClick={goPrev} className="w-7 h-7 flex items-center justify-center text-[#1a1a1a]/40 dark:text-[#f6f3fb]/40 hover:text-[#1a1a1a] dark:hover:text-[#f6f3fb] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={goToday}
            className="h-7 px-3 border border-[#cfc4e0] dark:border-[#3a2f50] text-[12px] font-medium text-[#1a1a1a]/75 dark:text-[#f6f3fb]/75 hover:text-[#1a1a1a] dark:hover:text-[#f6f3fb] hover:border-[#a896c4] dark:hover:border-[#5a4a7c] transition-colors whitespace-nowrap"
          >
            Vandaag
          </button>
          <button onClick={goNext} className="w-7 h-7 flex items-center justify-center text-[#1a1a1a]/40 dark:text-[#f6f3fb]/40 hover:text-[#1a1a1a] dark:hover:text-[#f6f3fb] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors">
            <ChevronRight size={14} />
          </button>
          <div className="ml-1 flex-shrink-0">
            <UserButton
              appearance={{
                elements: { avatarBox: "w-7 h-7 bg-[#2e1f4a] dark:bg-[#7c3aed]" },
              }}
            />
          </div>
        </div>
      </div>

      {viewMode === "studyPlanner" ? (
        <div className="flex-1 overflow-hidden">
          <StudyPlannerBoard weekStart={weekStart} />
        </div>
      ) : (
        <>
          <div className="flex-shrink-0 flex items-center justify-between border-b border-[#e3dbef] dark:border-[#2a2138] px-6 py-2.5">
            <div className="flex items-center border border-[#cfc4e0] dark:border-[#3a2f50] overflow-hidden text-[11px] font-semibold">
              <button
                onClick={() => setViewMode("week")}
                className={clsx(
                  "px-3 h-7 transition-colors",
                  viewMode === "week" ? "bg-[#1a1a1a] text-[#f6f3fb] dark:bg-[#f6f3fb] dark:text-[#1a1a1a]" : "text-[#1a1a1a]/70 dark:text-[#f6f3fb]/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                )}
              >
                Week
              </button>
              <button
                onClick={() => setViewMode("day")}
                className={clsx(
                  "px-3 h-7 transition-colors",
                  viewMode === "day" ? "bg-[#1a1a1a] text-[#f6f3fb] dark:bg-[#f6f3fb] dark:text-[#1a1a1a]" : "text-[#1a1a1a]/70 dark:text-[#f6f3fb]/70 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                )}
              >
                Dag
              </button>
            </div>
          </div>
          <div className="flex-shrink-0 grid grid-cols-7 border-b border-[#e3dbef] dark:border-[#2a2138] px-6 pt-4 pb-3 gap-2">
            {weekDays.map((day) => {
              const { count, alerts } = countItemsForDay(day);
              const selected = isSameDay(day, selectedDate);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={clsx(
                    "text-left px-3 py-2 transition-colors",
                    selected ? "border border-[#1a1a1a]/15 dark:border-[#f6f3fb]/15 bg-[#faf7fd] dark:bg-[#181225]" : "hover:bg-black/[0.025] dark:hover:bg-white/[0.04]"
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1a1a1a]/45 dark:text-[#f6f3fb]/45">
                    {format(day, "EEEEEE", { locale: nl })}
                  </p>
                  <p className="mt-0.5 text-[26px] font-bold leading-none tabular-nums">{format(day, "d")}</p>
                  <div className="mt-2 flex items-center gap-1.5 text-[10.5px] text-[#1a1a1a]/55 dark:text-[#f6f3fb]/55">
                    <span className="underline decoration-dotted underline-offset-2">{count} items</span>
                    {alerts > 0 && (
                      <span className="flex items-center gap-0.5 text-[#7c3aed]">
                        <Bell size={9} />
                        {alerts}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {viewMode === "day" ? (
            <DayView
              scrollRef={scrollRef}
              selectedDate={selectedDate}
              events={todayEvents}
              dayLessonCount={dayLessonCount}
              dayStudyCount={dayStudyCount}
              dayTotalHours={dayTotalHours}
              onSlotClick={(date, hour) => setCreateModal({ date, hour })}
            />
          ) : (
            <WeekView
              scrollRef={scrollRef}
              days={weekDays}
              getEventsForDay={getEventsForDay}
              onSlotClick={(date, hour) => setCreateModal({ date, hour })}
            />
          )}
        </>
      )}

      <CreateAppointmentCard
        open={createModal !== null}
        onClose={() => setCreateModal(null)}
        initialDate={createModal?.date ?? null}
        initialHour={createModal?.hour ?? 9}
        calendars={calendars}
      />
    </div>
  );
}

function DayView({
  scrollRef,
  selectedDate,
  events,
  dayLessonCount,
  dayStudyCount,
  dayTotalHours,
  onSlotClick,
}: {
  scrollRef: React.RefObject<HTMLDivElement>;
  selectedDate: Date;
  events: { key: string; startMs: number; endMs: number; title: string; subtitle?: string; color: string; href?: string }[];
  dayLessonCount: number;
  dayStudyCount: number;
  dayTotalHours: number;
  onSlotClick: (date: Date, hour: number) => void;
}) {
  const totalGridHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);
  const showNow = isToday(selectedDate);
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const nowH = now.getHours() + now.getMinutes() / 60;
  const nowTop = (nowH - START_HOUR) * HOUR_HEIGHT;

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("[data-event]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const hour = Math.floor(relY / HOUR_HEIGHT) + START_HOUR;
    onSlotClick(selectedDate, hour);
  };

  return (
    <>
      <div className="flex-shrink-0 flex items-end justify-between px-8 py-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#1a1a1a]/45 dark:text-[#f6f3fb]/45">Vandaag</p>
          <p className="mt-1 text-[34px] font-bold leading-none tracking-tight">
            {format(selectedDate, "d MMMM", { locale: nl })}
          </p>
        </div>
        <div className="flex items-baseline gap-7 text-[#1a1a1a]/65 dark:text-[#f6f3fb]/65">
          <span className="text-[13px]">
            <span className="text-[18px] font-bold text-[#1a1a1a] dark:text-[#f6f3fb] mr-1.5">{dayLessonCount}</span>lessen
          </span>
          <span className="text-[13px]">
            <span className="text-[18px] font-bold text-[#1a1a1a] dark:text-[#f6f3fb] mr-1.5">{dayStudyCount}</span>studie
          </span>
          <span className="text-[13px]">
            <span className="text-[18px] font-bold text-[#1a1a1a] dark:text-[#f6f3fb] mr-1.5">{dayTotalHours}u</span>totaal
          </span>
        </div>
      </div>

      <div ref={scrollRef} className="overflow-y-auto flex-1">
        <div
          className="relative grid mx-6"
          style={{ gridTemplateColumns: `${TIME_COL_W}px 1fr`, height: totalGridHeight }}
        >
          <div className="relative">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute w-full flex items-start justify-end pr-3"
                style={{ top: i * HOUR_HEIGHT - 7, height: HOUR_HEIGHT }}
              >
                <span className="text-[11px] text-[#1a1a1a]/35 dark:text-[#f6f3fb]/35 font-medium tabular-nums leading-none">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          <div
            className="relative cursor-pointer"
            style={{ height: totalGridHeight }}
            onClick={handleColumnClick}
          >
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute w-full border-t border-[#e3dbef] dark:border-[#2a2138]"
                style={{ top: i * HOUR_HEIGHT }}
              />
            ))}

            {events.map((e) => {
              const top = toTopPx(new Date(e.startMs));
              const height = Math.max(durationPx(e.startMs, e.endMs), 24);
              const start = new Date(e.startMs);
              const end = new Date(e.endMs);
              const inner = (
                <div
                  className="h-full bg-[#faf7fd] dark:bg-[#181225] px-3 py-1.5 flex flex-col gap-0.5 overflow-hidden hover:bg-[#efe7fa] dark:hover:bg-[#221833] transition-colors"
                  style={{ borderLeft: `3px solid ${e.color}`, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}
                >
                  <div className="flex items-center gap-1.5">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={e.color} strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                    <span className="text-[12.5px] font-semibold leading-tight truncate">{e.title}</span>
                  </div>
                  {e.subtitle && (
                    <span className="text-[11px] text-[#1a1a1a]/55 dark:text-[#f6f3fb]/55 leading-tight truncate">{e.subtitle}</span>
                  )}
                  <span className="text-[10.5px] text-[#1a1a1a]/40 dark:text-[#f6f3fb]/40 leading-none mt-auto tabular-nums">
                    {format(start, "HH:mm")}–{format(end, "HH:mm")}
                  </span>
                </div>
              );
              return (
                <div
                  key={e.key}
                  data-event="1"
                  className="absolute"
                  style={{ top, height, left: 8, right: 8 }}
                  onClick={(ev) => ev.stopPropagation()}
                >
                  {e.href ? <Link to={e.href} className="block h-full">{inner}</Link> : inner}
                </div>
              );
            })}

            {showNow && nowH >= START_HOUR && nowH < END_HOUR && (
              <div
                className="absolute pointer-events-none flex items-center z-30"
                style={{ top: nowTop - 5, left: -4, right: 0 }}
              >
                <div className="w-2.5 h-2.5 bg-[#c44545]" />
                <div className="flex-1 h-[2px] bg-[#c44545]" />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function WeekView({
  scrollRef,
  days,
  getEventsForDay,
  onSlotClick,
}: {
  scrollRef: React.RefObject<HTMLDivElement>;
  days: Date[];
  getEventsForDay: (day: Date) => { key: string; startMs: number; endMs: number; title: string; subtitle?: string; color: string; href?: string }[];
  onSlotClick: (date: Date, hour: number) => void;
}) {
  const totalGridHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);

  const handleColumnClick = (e: React.MouseEvent<HTMLDivElement>, day: Date) => {
    if ((e.target as HTMLElement).closest("[data-event]")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const hour = Math.floor(relY / HOUR_HEIGHT) + START_HOUR;
    onSlotClick(day, hour);
  };

  return (
    <div ref={scrollRef} className="overflow-y-auto flex-1">
      <div
        className="relative grid mx-6"
        style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(${days.length}, 1fr)`, height: totalGridHeight }}
      >
        <div className="relative">
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute w-full flex items-start justify-end pr-3"
              style={{ top: i * HOUR_HEIGHT - 7, height: HOUR_HEIGHT }}
            >
              <span className="text-[11px] text-[#1a1a1a]/35 dark:text-[#f6f3fb]/35 font-medium tabular-nums leading-none">
                {String(h).padStart(2, "0")}:00
              </span>
            </div>
          ))}
        </div>

        {days.map((day, idx) => {
          const events = getEventsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={clsx("relative cursor-pointer", idx !== 0 && "border-l border-[#e3dbef] dark:border-[#2a2138]")}
              style={{ height: totalGridHeight }}
              onClick={(e) => handleColumnClick(e, day)}
            >
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-[#e3dbef] dark:border-[#2a2138]"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
              {events.map((e) => {
                const top = toTopPx(new Date(e.startMs));
                const height = Math.max(durationPx(e.startMs, e.endMs), 24);
                const inner = (
                  <div
                    className="h-full bg-[#faf7fd] dark:bg-[#181225] px-2 py-1 flex flex-col gap-0.5 overflow-hidden hover:bg-[#efe7fa] dark:hover:bg-[#221833] transition-colors"
                    style={{ borderLeft: `3px solid ${e.color}` }}
                  >
                    <span className="text-[11px] font-semibold leading-tight truncate">{e.title}</span>
                    <span className="text-[9.5px] text-[#1a1a1a]/45 dark:text-[#f6f3fb]/45 leading-none mt-auto tabular-nums">
                      {format(new Date(e.startMs), "HH:mm")}
                    </span>
                  </div>
                );
                return (
                  <div
                    key={e.key}
                    data-event="1"
                    className="absolute"
                    style={{ top, height, left: 4, right: 4 }}
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    {e.href ? <Link to={e.href} className="block h-full">{inner}</Link> : inner}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
