import { useState, useEffect, useRef } from "react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { startOfWeek } from "date-fns";
import { StudyPlannerBoard } from "../components/pages/calendar/StudyPlannerBoard";

import { CreateAppointmentCard } from "../components/pages/calendar/CreateAppointmentCard";
import { CalendarTopBar, CalendarTab } from "../components/pages/calendar/CalendarTopBar";
import { Calendar } from "../components/pages/calendar/Calendar";

const hour_height = 68;
const start_hour  = 7;

type CalendarViewMode = "week" | "studyPlanner";

export default function CalendarPage() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<CalendarViewMode>("week");
  const [activeTab, setActiveTab] = useState<CalendarTab>("calendar");

  const handleTabChange = (tab: CalendarTab) => {
    setActiveTab(tab);
    if (tab === "calendar") setViewMode("week");
    if (tab === "studyPlanner") setViewMode("studyPlanner");
  };
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

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
    scrollRef.current.scrollTop = Math.max(0, (h - start_hour - 1) * hour_height);
  }, []);

  const calendars         = useQuery(api.calendars.getAll) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0f0f0f]">
      <CalendarTopBar
        weekStart={weekStart}
        setWeekStart={setWeekStart}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
      />
      <div className="flex flex-1 overflow-hidden min-h-0">

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          {viewMode === "studyPlanner" ? (
            <StudyPlannerBoard
              weekStart={weekStart}
            />
          ) : (
            <Calendar weekStart={weekStart} />
          )}
        </div>
      </div>

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
