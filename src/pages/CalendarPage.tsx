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
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { nl } from "date-fns/locale";
import { UserButton } from "@clerk/clerk-react";
import { Settings } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { CreateAppointmentCard } from "../components/pages/calendar/CreateAppointmentCard";
import { DetailPanel } from "../components/pages/calendar/DetailPanel";
import { QuickAddPopup, type QuickAddDraft } from "../components/pages/calendar/QuickAddPopup";
import { LessonPickerModal } from "../components/pages/calendar/LessonPickerModal";
import { ActivityBar, CALENDAR_TABS, type CalendarTabKey } from "../components/layout/ActivityBar";
import { AIToggleButton } from "../components/ai/AIToggleButton";

import CalendarTabPage from "./calendarTabs/CalendarTabPage";
import StudyPlannerTabPage from "./calendarTabs/StudyPlannerTabPage";
import PlannenTabPage from "./calendarTabs/PlannenTabPage";
import NotebookTabPage from "./calendarTabs/NotebookTabPage";
import SettingsTabPage from "./calendarTabs/SettingsTabPage";
import GradesTabPage from "./calendarTabs/GradesTabPage";
import MessagesTabPage from "./calendarTabs/MessagesTabPage";
import { DetailPanelState, EventChip } from "./calendarTabs/types";

type Tab = CalendarTabKey;

type CalendarViewMode = "week" | "day";

const VALID_TAB_KEYS = new Set<Tab>(CALENDAR_TABS.map((tab) => tab.key));

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab: Tab = (() => {
    const raw = searchParams.get("tab");
    return raw && VALID_TAB_KEYS.has(raw as Tab) ? (raw as Tab) : "calendar";
  })();

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [calendarView, setCalendarView] = useState<CalendarViewMode>("day");
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
    if (!scrollRef.current || activeTab !== "calendar") return;
    const now = new Date();
    const h = now.getHours() + now.getMinutes() / 60;
    scrollRef.current.scrollTop = Math.max(0, (h - 7 - 1) * 68);
  }, [activeTab, calendarView]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activeTab !== "calendar") return;

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setSelectedDate((d) => (calendarView === "day" ? subDays(d, 1) : subWeeks(d, 1)));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setSelectedDate((d) => (calendarView === "day" ? addDays(d, 1) : addWeeks(d, 1)));
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setSelectedDate(new Date());
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setCalendarView("day");
      } else if (e.key === "w" || e.key === "W") {
        e.preventDefault();
        setCalendarView("week");
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeTab, calendarView]);

  const calendarVisible = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const calendar of calendars) map[calendar._id] = calendar.visible;
    return map;
  }, [calendars]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  function getEventsForDay(day: Date): EventChip[] {
    const items: EventChip[] = [];

    (lessons ?? []).filter((lesson) => isSameDay(new Date(lesson.startTime), day)).forEach((lesson) => {
      items.push({
        key: `lesson-${lesson._id}`,
        startMs: lesson.startTime,
        endMs: lesson.endTime,
        title: lesson.subject,
        subtitle: lesson.subject,
        color: "#7c3aed",
        select: { kind: "lesson", id: String(lesson._id) },
      });
    });

    (appointments ?? []).forEach((appointment) => {
      if (appointment.calendarId && calendarVisible[appointment.calendarId] === false) return;

      let startMs: number;
      if (appointment.isRecurring) {
        if (appointment.recurringDayOfWeek !== day.getDay()) return;
        const [hh, mm] = String(appointment.recurringTimeHHMM ?? "0:00").split(":").map((v) => parseInt(v, 10));
        const d = new Date(day);
        d.setHours(hh, mm, 0, 0);
        startMs = d.getTime();
      } else {
        if (!isSameDay(new Date(appointment.startTime), day)) return;
        startMs = appointment.startTime;
      }

      const endMs = appointment.endTime ?? startMs + 50 * 60_000;
      const calendar = appointment.calendarId ? calendars.find((c) => c._id === appointment.calendarId) : null;
      const color = calendar?.color ?? appointment.color ?? "#7c3aed";

      items.push({
        key: `appt-${appointment._id}`,
        startMs,
        endMs,
        title: appointment.title,
        subtitle: appointment.location ?? undefined,
        color,
        select: { kind: "appointment", id: String(appointment._id) },
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

    count += (lessons ?? []).filter((lesson) => isSameDay(new Date(lesson.startTime), day)).length;
    count += (appointments ?? []).filter((appointment) => {
      if (appointment.calendarId && calendarVisible[appointment.calendarId] === false) return false;
      if (appointment.isRecurring) return appointment.recurringDayOfWeek === day.getDay();
      return isSameDay(new Date(appointment.startTime), day);
    }).length;
    count += (studySessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).length;
    count += (homeworkSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).length;
    count += (rehearsalSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), day)).length;
    alerts += (tests ?? []).filter((test) => isSameDay(new Date(test.date), day)).length;

    return { count, alerts };
  }

  const todayEvents = getEventsForDay(selectedDate);
  const dayLessonCount = (lessons ?? []).filter((lesson) => isSameDay(new Date(lesson.startTime), selectedDate)).length;
  const dayStudyCount =
    (studySessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), selectedDate)).length +
    (homeworkSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), selectedDate)).length +
    (rehearsalSessions ?? []).filter((s: any) => isSameDay(new Date(s.startTime), selectedDate)).length;
  const dayTotalMs = todayEvents.reduce((acc, event) => acc + (event.endMs - event.startMs), 0);
  const dayTotalHours = Math.round((dayTotalMs / 3_600_000) * 10) / 10;

  const monthLabelRaw = format(selectedDate, "MMM yyyy", { locale: nl });
  const monthLabel = monthLabelRaw.charAt(0).toUpperCase() + monthLabelRaw.slice(1);

  const goPrev = () => setSelectedDate((d) => (calendarView === "day" ? subDays(d, 1) : subWeeks(d, 1)));
  const goNext = () => setSelectedDate((d) => (calendarView === "day" ? addDays(d, 1) : addWeeks(d, 1)));
  const goToday = () => setSelectedDate(new Date());

  const renderTabContent = () => {
    if (activeTab === "calendar") {
      return (
        <CalendarTabPage
          viewMode={calendarView}
          setViewMode={setCalendarView}
          weekDays={weekDays}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          monthLabel={monthLabel}
          countItemsForDay={countItemsForDay}
          todayEvents={todayEvents}
          getEventsForDay={getEventsForDay}
          dayLessonCount={dayLessonCount}
          dayStudyCount={dayStudyCount}
          dayTotalHours={dayTotalHours}
          scrollRef={scrollRef}
          onSlotClick={(date, hour) => setCreateModal({ date, hour })}
          onSelect={(state) => setDetailPanel(state)}
          onQuickAdd={() => setQuickAddOpen(true)}
          goPrev={goPrev}
          goToday={goToday}
          goNext={goNext}
        />
      );
    }

    if (activeTab === "studyPlanner") {
      return (
        <StudyPlannerTabPage
          weekStart={weekStart}
          onSelect={(state) => setDetailPanel(state)}
          onQuickAdd={() => setQuickAddOpen(true)}
        />
      );
    }

    if (activeTab === "plannen") return <PlannenTabPage />;
    if (activeTab === "notebook") return <NotebookTabPage />;
    if (activeTab === "settings") return <SettingsTabPage />;
    if (activeTab === "grades") return <GradesTabPage />;
    return <MessagesTabPage />;
  };

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
            <span className="text-[12px] text-[#333333] dark:text-[#cccccc] tabular-nums">cognoto - {format(selectedDate, "EEE d MMM yyyy", { locale: nl })}</span>
          </div>
        </div>
        <div className="flex items-center w-56 flex-shrink-0 justify-end">
          <AIToggleButton />
          <UserButton appearance={{ elements: { avatarBox: "w-5 h-5 mr-3 bg-[#7c3aed]" } }} />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ActivityBar activeTab={activeTab} onTabChange={(key) => handleTabChange(key)} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">{renderTabContent()}</div>
        <DetailPanel state={detailPanel} onClose={() => setDetailPanel(null)} onOpen={(state) => setDetailPanel(state)} />
      </div>

      <div className="flex-shrink-0 flex items-center h-[22px] bg-[#7c3aed] text-white text-[11px] font-medium select-none">
        <div className="flex items-center h-full">
          <span className="px-2">{activeTab}</span>
          <span className="px-2 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white/80" />
            <span>synced</span>
          </span>
          <span className="px-2 font-mono tabular-nums">{format(selectedDate, "yyyy-MM-dd")}</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center h-full">
          {activeTab === "calendar" && (
            <span className="px-2 font-mono tabular-nums">{calendarView === "day" ? "Dag" : "Week"}</span>
          )}
          <span className="px-2 font-mono tabular-nums">{dayLessonCount}L - {dayStudyCount}S - {dayTotalHours}u</span>
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
          setPendingDraft((draft) => (draft ? { ...draft, lessonId: String(lesson._id) } : draft));
          setPickerOpen(false);
          setQuickAddOpen(true);
        }}
      />
    </div>
  );
}
