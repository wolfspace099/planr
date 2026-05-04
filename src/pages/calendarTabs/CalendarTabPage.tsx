import { Bell, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, isSameDay, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import clsx from "clsx";
import { useEffect, useState } from "react";

import { DetailPanelState, EventChip } from "./types";

const HOUR_HEIGHT = 68;
const START_HOUR = 7;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_COL_W = 64;

function toTopPx(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  return (h - START_HOUR) * HOUR_HEIGHT;
}

function durationPx(startMs: number, endMs: number): number {
  return ((endMs - startMs) / 3_600_000) * HOUR_HEIGHT;
}

export default function CalendarTabPage({
  viewMode,
  setViewMode,
  weekDays,
  selectedDate,
  setSelectedDate,
  monthLabel,
  countItemsForDay,
  todayEvents,
  getEventsForDay,
  dayLessonCount,
  dayStudyCount,
  dayTotalHours,
  scrollRef,
  onSlotClick,
  onSelect,
  onQuickAdd,
  goPrev,
  goToday,
  goNext,
}: {
  viewMode: "day" | "week";
  setViewMode: (next: "day" | "week") => void;
  weekDays: Date[];
  selectedDate: Date;
  setSelectedDate: (next: Date) => void;
  monthLabel: string;
  countItemsForDay: (day: Date) => { count: number; alerts: number };
  todayEvents: EventChip[];
  getEventsForDay: (day: Date) => EventChip[];
  dayLessonCount: number;
  dayStudyCount: number;
  dayTotalHours: number;
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  onSlotClick: (date: Date, hour: number) => void;
  onSelect: (state: DetailPanelState) => void;
  onQuickAdd: () => void;
  goPrev: () => void;
  goToday: () => void;
  goNext: () => void;
}) {
  return (
    <>
      <div className="flex-shrink-0 flex items-center h-[28px] bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] px-1 select-none">
        <button
          onClick={() => setViewMode("week")}
          className={clsx(
            "h-[28px] px-3 text-[11px] uppercase tracking-wide border-r border-[#e7e7e7] dark:border-[#1e1e1e] transition-colors focus:outline-none",
            viewMode === "week"
              ? "bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#ffffff] border-t-2 border-t-[#7c3aed] -mt-px"
              : "text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e]",
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
              : "text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e]",
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
          onClick={onQuickAdd}
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
                  : "hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]",
              )}
            >
              <div className="flex items-baseline gap-1.5">
                <p
                  className={clsx(
                    "text-[10px] uppercase tracking-wide",
                    today ? "text-[#7c3aed] font-semibold" : "text-[#6c6c6c] dark:text-[#969696]",
                  )}
                >
                  {format(day, "EEEEEE", { locale: nl })}
                </p>
                <p
                  className={clsx(
                    "text-[15px] font-semibold leading-none tabular-nums",
                    today && "text-[#7c3aed]",
                  )}
                >
                  {format(day, "d")}
                </p>
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
          onSlotClick={(date, hour) => onSlotClick(date, hour)}
          onSelect={onSelect}
        />
      ) : (
        <WeekView
          scrollRef={scrollRef}
          days={weekDays}
          getEventsForDay={getEventsForDay}
          onSlotClick={(date, hour) => onSlotClick(date, hour)}
          onSelect={onSelect}
        />
      )}
    </>
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
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  selectedDate: Date;
  events: EventChip[];
  dayLessonCount: number;
  dayStudyCount: number;
  dayTotalHours: number;
  onSlotClick: (date: Date, hour: number) => void;
  onSelect: (state: DetailPanelState) => void;
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

            {events.map((event) => {
              const top = toTopPx(new Date(event.startMs));
              const height = Math.max(durationPx(event.startMs, event.endMs), 24);
              const start = new Date(event.startMs);
              const end = new Date(event.endMs);

              return (
                <div
                  key={event.key}
                  data-event="1"
                  className="absolute"
                  style={{ top, height, left: 4, right: 4 }}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    if (event.select) onSelect(event.select);
                  }}
                >
                  <button type="button" className="block h-full w-full text-left focus:outline-none">
                    <div
                      className="h-full px-2 py-1 flex flex-col gap-0.5 overflow-hidden transition-colors bg-white dark:bg-[#252526] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] border border-[#e7e7e7] dark:border-[#2d2d30]"
                      style={{ borderLeft: `2px solid ${event.color}` }}
                    >
                      <span className="text-[12px] font-semibold leading-tight truncate text-[#333333] dark:text-[#cccccc]">
                        {event.title}
                      </span>
                      {event.subtitle && (
                        <span className="text-[11px] text-[#6c6c6c] dark:text-[#969696] leading-tight truncate">
                          {event.subtitle}
                        </span>
                      )}
                      <span className="text-[10px] text-[#6c6c6c] dark:text-[#858585] font-mono leading-none mt-auto tabular-nums">
                        {format(start, "HH:mm")}-{format(end, "HH:mm")}
                      </span>
                    </div>
                  </button>
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
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  days: Date[];
  getEventsForDay: (day: Date) => EventChip[];
  onSlotClick: (date: Date, hour: number) => void;
  onSelect: (state: DetailPanelState) => void;
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
              {events.map((event) => {
                const top = toTopPx(new Date(event.startMs));
                const height = Math.max(durationPx(event.startMs, event.endMs), 24);
                return (
                  <div
                    key={event.key}
                    data-event="1"
                    className="absolute"
                    style={{ top, height, left: 2, right: 2 }}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      if (event.select) onSelect(event.select);
                    }}
                  >
                    <button type="button" className="block h-full w-full text-left focus:outline-none">
                      <div
                        className="h-full px-1.5 py-0.5 flex flex-col gap-0.5 overflow-hidden transition-colors bg-white dark:bg-[#252526] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] border border-[#e7e7e7] dark:border-[#2d2d30]"
                        style={{ borderLeft: `2px solid ${event.color}` }}
                      >
                        <span className="text-[11px] font-semibold leading-tight truncate text-[#333333] dark:text-[#cccccc]">
                          {event.title}
                        </span>
                        <span className="text-[9.5px] text-[#6c6c6c] dark:text-[#858585] font-mono leading-none mt-auto tabular-nums">
                          {format(new Date(event.startMs), "HH:mm")}
                        </span>
                      </div>
                    </button>
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
