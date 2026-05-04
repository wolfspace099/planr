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
import { Bell, ChevronLeft, ChevronRight, Menu, Plus, Settings } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import clsx from "clsx";

import { CreateAppointmentCard } from "../components/pages/calendar/CreateAppointmentCard";
import { StudyPlannerBoard } from "../components/pages/calendar/StudyPlannerBoard";
import { DetailPanel } from "../components/pages/calendar/DetailPanel";
import { QuickAddPopup, type QuickAddDraft } from "../components/pages/calendar/QuickAddPopup";
import { LessonPickerModal } from "../components/pages/calendar/LessonPickerModal";
import { ActivityBar, CALENDAR_TABS, type CalendarTabKey } from "../components/layout/ActivityBar";

const HOUR_HEIGHT = 68;
const START_HOUR = 7;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_COL_W = 64;

type ViewMode = "week" | "day" | "studyPlanner";
type Tab = CalendarTabKey;

export type DetailPanelState =
  | { kind: "lesson"; id: string }
  | { kind: "appointment"; id: string }
  | { kind: "homework"; id: string }
  | { kind: "test"; id: string }
  | { kind: "task"; id: string }
  | null;

type EventChip = {
  key: string;
  startMs: number;
  endMs: number;
  title: string;
  subtitle?: string;
  color: string;
  select?: { kind: "lesson" | "appointment"; id: string };
};

const VALID_TAB_KEYS = new Set<Tab>(CALENDAR_TABS.map((t) => t.key));

function toTopPx(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  return (h - START_HOUR) * HOUR_HEIGHT;
}
function durationPx(startMs: number, endMs: number): number {
  return ((endMs - startMs) / 3_600_000) * HOUR_HEIGHT;
}

export default function CalendarPage() {
  const [searchParams] = useSearchParams();
  const initialTab: Tab = (() => {
    const raw = searchParams.get("tab");
    return raw && VALID_TAB_KEYS.has(raw as Tab) ? (raw as Tab) : "calendar";
  })();

  const [viewMode, setViewMode] = useState<ViewMode>(initialTab === "studyPlanner" ? "studyPlanner" : "day");
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [createModal, setCreateModal] = useState<{ date: Date; hour: number } | null>(null);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<QuickAddDraft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailPanel, setDetailPanel] = useState<DetailPanelState>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hasSynced = useRef(false);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const settings = useQuery(api.userSettings.get);
  const syncCalendar = useAction(api.ical.syncCalendar);
  const calendars = useQuery(api.calendars.getAll) ?? [];
  const lessons = useQuery(api.lessons.getRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const allLessons = useQuery(api.lessons.getAll) ?? [];
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (viewMode === "studyPlanner") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedDate((d) => (viewMode === "day" ? subDays(d, 1) : subWeeks(d, 1)));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedDate((d) => (viewMode === "day" ? addDays(d, 1) : addWeeks(d, 1)));
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setSelectedDate(new Date());
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setViewMode("day");
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        setViewMode("week");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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

  function getEventsForDay(day: Date): EventChip[] {
    const items: EventChip[] = [];

    (lessons ?? []).filter((l) => isSameDay(new Date(l.startTime), day)).forEach((l) => {
      items.push({
        key: `lesson-${l._id}`,
        startMs: l.startTime,
        endMs: l.endTime,
        title: l.subject,
        subtitle: l.subject,
        color: "#7c3aed",
        select: { kind: "lesson", id: String(l._id) },
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
      items.push({
        key: `appt-${a._id}`,
        startMs,
        endMs,
        title: a.title,
        subtitle: a.location ?? undefined,
        color,
        select: { kind: "appointment", id: String(a._id) },
      });
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

  const monthLabelRaw = format(selectedDate, "MMM yyyy", { locale: nl });
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

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
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#cccccc]">
      <div className="flex-shrink-0 flex items-center h-[30px] bg-[#dddddd] dark:bg-[#3c3c3c] border-b border-[#cccccc] dark:border-[#252526] select-none">
        <div className="flex items-center gap-2 px-3 w-56 flex-shrink-0">
          <Settings size={13} className="text-[#7c3aed]" strokeWidth={2} />
          <span className="text-[12px] font-normal text-[#333333] dark:text-[#cccccc]">cognoto</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-2 h-[22px] bg-white dark:bg-[#252526] border border-[#cccccc] dark:border-[#1e1e1e] min-w-[280px] justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7c3aed]" />
            <span className="text-[12px] text-[#333333] dark:text-[#cccccc] tabular-nums">cognoto — {format(selectedDate, "EEE d MMM yyyy", { locale: nl })}</span>
          </div>
        </div>
        <div className="flex items-center w-56 flex-shrink-0 justify-end">
          <UserButton
            appearance={{
              elements: { avatarBox: "w-5 h-5 mr-3 bg-[#7c3aed]" },
            }}
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
       <ActivityBar activeTab={activeTab} onTabChange={(key) => handleTabChange(key)} />
       <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {viewMode === "studyPlanner" ? (
        <div className="flex-1 overflow-hidden">
          <StudyPlannerBoard weekStart={weekStart} onSelect={(s) => setDetailPanel(s)} onQuickAdd={() => setQuickAddOpen(true)} />
        </div>
      ) : (
        <>
          <div className="flex-shrink-0 flex items-center h-[28px] bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] px-1 select-none">
            <button
              onClick={() => setViewMode("week")}
              className={clsx(
                "h-[28px] px-3 text-[11px] uppercase tracking-wide border-r border-[#e7e7e7] dark:border-[#1e1e1e] transition-colors focus:outline-none",
                viewMode === "week"
                  ? "bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#ffffff] border-t-2 border-t-[#7c3aed] -mt-px"
                  : "text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e]"
              )}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode("day")}
              className={clsx(
                "h-[28px] px-3 text-[11px] uppercase tracking-wide border-r border-[#e7e7e7] dark:border-[#1e1e1e] transition-colors focus:outline-none",
                viewMode === "day"
                  ? "bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#ffffff] border-t-2 border-t-[#7c3aed] -mt-px"
                  : "text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e]"
              )}
            >
              Dag
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-px">
              <button onClick={goPrev} aria-label="Vorige" className="w-6 h-[22px] flex items-center justify-center text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none">
                <ChevronLeft size={13} strokeWidth={2} />
              </button>
              <button
                onClick={goToday}
                className="h-[22px] px-2 text-[11px] text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
              >
                Vandaag
              </button>
              <button onClick={goNext} aria-label="Volgende" className="w-6 h-[22px] flex items-center justify-center text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none">
                <ChevronRight size={13} strokeWidth={2} />
              </button>
              <span className="text-[11px] text-[#6c6c6c] dark:text-[#969696] tabular-nums px-2">{monthLabel}</span>
            </div>
            <button
              onClick={() => setQuickAddOpen(true)}
              className="h-[22px] px-2 text-[11px] text-white bg-[#7c3aed] hover:bg-[#6d28d9] focus:outline-none flex items-center gap-1 mr-1"
            >
              <Plus size={12} strokeWidth={2.25} />
              Toevoegen
            </button>
          </div>
          <div className="flex-shrink-0 grid grid-cols-7 border-b border-[#e7e7e7] dark:border-[#252526] select-none">
            {weekDays.map((day, idx) => {
              const { count, alerts } = countItemsForDay(day);
              const selected = isSameDay(day, selectedDate);
              const today = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={clsx(
                    "text-left px-3 py-2 transition-colors focus:outline-none border-r border-[#e7e7e7] dark:border-[#252526]",
                    idx === 6 && "border-r-0",
                    selected
                      ? "bg-[#e4e6f1] dark:bg-[#094771] text-[#333333] dark:text-[#ffffff]"
                      : "hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]"
                  )}
                >
                  <div className="flex items-baseline gap-1.5">
                    <p className={clsx(
                      "text-[10px] uppercase tracking-wide",
                      today ? "text-[#7c3aed] font-semibold" : "text-[#6c6c6c] dark:text-[#969696]"
                    )}>
                      {format(day, "EEEEEE", { locale: nl })}
                    </p>
                    <p className={clsx(
                      "text-[15px] font-semibold leading-none tabular-nums",
                      today && "text-[#7c3aed]"
                    )}>{format(day, "d")}</p>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-[#6c6c6c] dark:text-[#969696] font-mono">
                    <span>{count} items</span>
                    {alerts > 0 && (
                      <span className="flex items-center gap-0.5 text-[#7c3aed]">
                        <Bell size={9} strokeWidth={2.25} />
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
              onSelect={(s) => setDetailPanel(s)}
            />
          ) : (
            <WeekView
              scrollRef={scrollRef}
              days={weekDays}
              getEventsForDay={getEventsForDay}
              onSlotClick={(date, hour) => setCreateModal({ date, hour })}
              onSelect={(s) => setDetailPanel(s)}
            />
          )}
        </>
      )}
       </div>
       <DetailPanel state={detailPanel} onClose={() => setDetailPanel(null)} onOpen={(s) => setDetailPanel(s)} />
      </div>

      <div className="flex-shrink-0 flex items-center h-[22px] bg-[#7c3aed] text-white text-[11px] font-medium select-none">
        <div className="flex items-center h-full">
          <button className="h-full px-2 flex items-center gap-1 hover:bg-white/10 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3v12" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 01-9 9" />
            </svg>
            <span>{activeTab}</span>
          </button>
          <span className="px-2 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            <span>synced</span>
          </span>
          <span className="px-2 font-mono tabular-nums">
            {format(selectedDate, "yyyy-MM-dd")}
          </span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center h-full">
          {viewMode !== "studyPlanner" && (
            <span className="px-2 font-mono tabular-nums">{viewMode === "day" ? "Dag" : "Week"}</span>
          )}
          <span className="px-2 font-mono tabular-nums">{dayLessonCount}L · {dayStudyCount}S · {dayTotalHours}u</span>
          <span className="px-2 font-mono tabular-nums">{format(new Date(), "HH:mm")}</span>
        </div>
      </div>

      <CreateAppointmentCard
        open={createModal !== null}
        onClose={() => setCreateModal(null)}
        initialDate={createModal?.date ?? null}
        initialHour={createModal?.hour ?? 9}
        calendars={calendars}
      />

      <QuickAddPopup
        open={quickAddOpen}
        onClose={() => {
          setQuickAddOpen(false);
          if (!pickerOpen) setPendingDraft(null);
        }}
        initialMode={activeTab === "studyPlanner" ? "task" : "appointment"}
        initialDate={selectedDate}
        initialDraft={pendingDraft}
        onRequestPickLesson={(draft) => {
          setPendingDraft(draft);
          setQuickAddOpen(false);
          setPickerOpen(true);
        }}
      />

      <LessonPickerModal
        open={pickerOpen}
        onClose={() => {
          setPickerOpen(false);
          setQuickAddOpen(true);
        }}
        lessons={allLessons}
        days={weekDays}
        onSelect={(lesson) => {
          setPendingDraft((d) => (d ? { ...d, lessonId: String(lesson._id) } : d));
          setPickerOpen(false);
          setQuickAddOpen(true);
        }}
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
  onSelect,
}: {
  scrollRef: React.RefObject<HTMLDivElement>;
  selectedDate: Date;
  events: EventChip[];
  dayLessonCount: number;
  dayStudyCount: number;
  dayTotalHours: number;
  onSlotClick: (date: Date, hour: number) => void;
  onSelect: (s: DetailPanelState) => void;
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
      <div className="flex-shrink-0 flex items-center h-[26px] px-3 bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] text-[11px] text-[#6c6c6c] dark:text-[#969696] select-none gap-1.5">
        <span className="uppercase tracking-wide">{format(selectedDate, "EEEE", { locale: nl })}</span>
        <ChevronRight size={11} strokeWidth={2} className="opacity-50" />
        <span className="font-mono tabular-nums">{format(selectedDate, "d MMMM yyyy", { locale: nl })}</span>
        <span className="ml-auto flex items-center gap-3 font-mono tabular-nums">
          <span>{dayLessonCount} lessen</span>
          <span className="opacity-30">|</span>
          <span>{dayStudyCount} studie</span>
          <span className="opacity-30">|</span>
          <span>{dayTotalHours}u totaal</span>
        </span>
      </div>

      <div ref={scrollRef} className="overflow-y-auto flex-1 [scrollbar-width:thin] bg-white dark:bg-[#1e1e1e]">
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `${TIME_COL_W}px 1fr`, height: totalGridHeight }}
        >
          <div className="relative border-r border-[#e7e7e7] dark:border-[#2d2d30]">
            {hours.map((h, i) => (
              <div
                key={h}
                className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: i * HOUR_HEIGHT - 5, height: HOUR_HEIGHT }}
              >
                <span className="text-[10px] text-[#6c6c6c] dark:text-[#858585] font-mono tabular-nums leading-none">
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
                className="absolute w-full border-t border-[#e7e7e7] dark:border-[#2d2d30]"
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
                  className="h-full px-2 py-1 flex flex-col gap-0.5 overflow-hidden transition-colors bg-white dark:bg-[#252526] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] border border-[#e7e7e7] dark:border-[#2d2d30]"
                  style={{ borderLeft: `2px solid ${e.color}` }}
                >
                  <span className="text-[12px] font-semibold leading-tight truncate text-[#333333] dark:text-[#cccccc]">{e.title}</span>
                  {e.subtitle && (
                    <span className="text-[11px] text-[#6c6c6c] dark:text-[#969696] leading-tight truncate">{e.subtitle}</span>
                  )}
                  <span className="text-[10px] text-[#6c6c6c] dark:text-[#858585] font-mono leading-none mt-auto tabular-nums">
                    {format(start, "HH:mm")}–{format(end, "HH:mm")}
                  </span>
                </div>
              );
              return (
                <div
                  key={e.key}
                  data-event="1"
                  className="absolute"
                  style={{ top, height, left: 4, right: 4 }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (e.select) onSelect(e.select);
                  }}
                >
                  <button type="button" className="block h-full w-full text-left focus:outline-none">{inner}</button>
                </div>
              );
            })}

            {showNow && nowH >= START_HOUR && nowH < END_HOUR && (
              <div
                className="absolute pointer-events-none flex items-center z-30"
                style={{ top: nowTop, left: -3, right: 0 }}
              >
                <span className="h-1.5 w-1.5 bg-[#f48771]" />
                <div className="flex-1 h-px bg-[#f48771]" />
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
  onSelect,
}: {
  scrollRef: React.RefObject<HTMLDivElement>;
  days: Date[];
  getEventsForDay: (day: Date) => EventChip[];
  onSlotClick: (date: Date, hour: number) => void;
  onSelect: (s: DetailPanelState) => void;
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
    <div ref={scrollRef} className="overflow-y-auto flex-1 [scrollbar-width:thin] bg-white dark:bg-[#1e1e1e]">
      <div
        className="relative grid"
        style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(${days.length}, 1fr)`, height: totalGridHeight }}
      >
        <div className="relative border-r border-[#e7e7e7] dark:border-[#2d2d30]">
          {hours.map((h, i) => (
            <div
              key={h}
              className="absolute w-full flex items-start justify-end pr-2"
              style={{ top: i * HOUR_HEIGHT - 5, height: HOUR_HEIGHT }}
            >
              <span className="text-[10px] text-[#6c6c6c] dark:text-[#858585] font-mono tabular-nums leading-none">
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
              className={clsx("relative cursor-pointer", idx !== 0 && "border-l border-[#e7e7e7] dark:border-[#2d2d30]")}
              style={{ height: totalGridHeight }}
              onClick={(e) => handleColumnClick(e, day)}
            >
              {hours.map((h, i) => (
                <div
                  key={h}
                  className="absolute w-full border-t border-[#e7e7e7] dark:border-[#2d2d30]"
                  style={{ top: i * HOUR_HEIGHT }}
                />
              ))}
              {events.map((e) => {
                const top = toTopPx(new Date(e.startMs));
                const height = Math.max(durationPx(e.startMs, e.endMs), 24);
                const inner = (
                  <div
                    className="h-full px-1.5 py-0.5 flex flex-col gap-0.5 overflow-hidden transition-colors bg-white dark:bg-[#252526] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] border border-[#e7e7e7] dark:border-[#2d2d30]"
                    style={{ borderLeft: `2px solid ${e.color}` }}
                  >
                    <span className="text-[11px] font-semibold leading-tight truncate text-[#333333] dark:text-[#cccccc]">{e.title}</span>
                    <span className="text-[9.5px] text-[#6c6c6c] dark:text-[#858585] font-mono leading-none mt-auto tabular-nums">
                      {format(new Date(e.startMs), "HH:mm")}
                    </span>
                  </div>
                );
                return (
                  <div
                    key={e.key}
                    data-event="1"
                    className="absolute"
                    style={{ top, height, left: 2, right: 2 }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (e.select) onSelect(e.select);
                    }}
                  >
                    <button type="button" className="block h-full w-full text-left focus:outline-none">{inner}</button>
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
