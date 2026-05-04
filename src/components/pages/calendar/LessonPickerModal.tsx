import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from "date-fns";
import { nl } from "date-fns/locale";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, X } from "lucide-react";
import clsx from "clsx";

export function LessonPickerModal({
  open,
  onClose,
  lessons,
  days,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  lessons: any[];
  days: Date[];
  onSelect: (lesson: any) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);

  const visibleDays = useMemo(() => {
    if (!days || days.length === 0) return [];
    const baseStart = days[0];
    const start = startOfWeek(addWeeks(baseStart, weekOffset), { weekStartsOn: 1 });
    const end = endOfWeek(start, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end }).slice(0, 5);
  }, [days, weekOffset]);

  const lessonsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const lesson of lessons ?? []) {
      const key = format(new Date(lesson.startTime), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push(lesson);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => a.startTime - b.startTime);
    }
    return map;
  }, [lessons]);

  if (!open) return null;

  const monthRaw = visibleDays[0] ? format(visibleDays[0], "MMMM yyyy", { locale: nl }) : "";
  const monthLabel = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#252526] border border-[#cccccc] dark:border-[#454545] w-[820px] max-h-[80vh] flex flex-col shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-center justify-between h-[28px] px-3 bg-[#f3f3f3] dark:bg-[#2d2d30] border-b border-[#e7e7e7] dark:border-[#1e1e1e]">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]">
            Selecteer les
          </span>
          <button
            onClick={onClose}
            aria-label="Sluiten"
            className="h-5 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
          >
            <X size={13} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-shrink-0 flex items-center h-[28px] bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#1e1e1e] px-1">
          <button
            onClick={() => setWeekOffset((v) => v - 1)}
            aria-label="Vorige week"
            className="w-6 h-[22px] flex items-center justify-center text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
          >
            <ChevronLeft size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="h-[22px] px-2 text-[11px] text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
          >
            Deze week
          </button>
          <button
            onClick={() => setWeekOffset((v) => v + 1)}
            aria-label="Volgende week"
            className="w-6 h-[22px] flex items-center justify-center text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
          >
            <ChevronRight size={13} strokeWidth={2} />
          </button>
          <span className="text-[11px] text-[#6c6c6c] dark:text-[#969696] tabular-nums px-2 font-mono">
            {monthLabel}
          </span>
          <div className="flex-1" />
          <span className="text-[10px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696] px-2">
            Klik op een les om te selecteren
          </span>
        </div>

        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e] [scrollbar-width:thin]">
          <div className="grid grid-cols-5">
            {visibleDays.map((day, idx) => {
              const key = format(day, "yyyy-MM-dd");
              const dayLessons = lessonsByDay[key] ?? [];
              const today = isToday(day);
              return (
                <div
                  key={key}
                  className={clsx(
                    "flex flex-col min-h-[220px]",
                    idx !== 0 && "border-l border-[#e7e7e7] dark:border-[#2d2d30]",
                  )}
                >
                  <div
                    className={clsx(
                      "flex-shrink-0 px-2 py-1.5 bg-[#f3f3f3] dark:bg-[#252526] border-b border-[#e7e7e7] dark:border-[#2d2d30] flex items-baseline gap-1.5",
                      today && "border-b-2 border-b-[#7c3aed]",
                    )}
                  >
                    <span
                      className={clsx(
                        "text-[10px] uppercase tracking-wide",
                        today ? "text-[#7c3aed] font-semibold" : "text-[#6c6c6c] dark:text-[#969696]",
                      )}
                    >
                      {format(day, "EEE", { locale: nl })}
                    </span>
                    <span
                      className={clsx(
                        "text-[13px] font-semibold font-mono tabular-nums",
                        today ? "text-[#7c3aed]" : "text-[#333333] dark:text-[#cccccc]",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    {dayLessons.length > 0 && (
                      <span className="ml-auto text-[10px] text-[#6c6c6c] dark:text-[#858585] font-mono tabular-nums">
                        {dayLessons.length}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 divide-y divide-[#e7e7e7] dark:divide-[#2d2d30]">
                    {dayLessons.length === 0 ? (
                      <p className="px-2 py-2 text-[10px] text-[#6c6c6c] dark:text-[#858585] italic">
                        Geen lessen
                      </p>
                    ) : (
                      dayLessons.map((lesson) => (
                        <button
                          key={lesson._id}
                          type="button"
                          onClick={() => onSelect(lesson)}
                          className="w-full text-left px-2 py-1.5 transition-colors hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] focus:outline-none focus:bg-[#e4e6f1] dark:focus:bg-[#094771] border-l-2 border-l-transparent hover:border-l-[#7c3aed]"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[11.5px] font-semibold text-[#333333] dark:text-[#cccccc] truncate">
                              {lesson.subject}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#6c6c6c] dark:text-[#858585] font-mono tabular-nums mt-0.5">
                            {format(new Date(lesson.startTime), "HH:mm")}–{format(new Date(lesson.endTime), "HH:mm")}
                          </div>
                          {lesson.location && (
                            <div className="text-[10px] text-[#6c6c6c] dark:text-[#969696] flex items-center gap-1 mt-0.5 truncate">
                              <MapPin size={9} strokeWidth={2} className="flex-shrink-0" />
                              <span className="truncate">{lesson.location}</span>
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex-shrink-0 flex items-center h-[22px] bg-[#7c3aed] text-white text-[11px] font-medium select-none">
          <span className="px-2 font-mono tabular-nums">
            {visibleDays[0] && format(visibleDays[0], "yyyy-MM-dd")} →{" "}
            {visibleDays[visibleDays.length - 1] && format(visibleDays[visibleDays.length - 1], "yyyy-MM-dd")}
          </span>
          <div className="flex-1" />
          <span className="px-2 font-mono tabular-nums">
            {visibleDays.reduce((acc, d) => acc + (lessonsByDay[format(d, "yyyy-MM-dd")]?.length ?? 0), 0)} lessen zichtbaar
          </span>
        </div>
      </div>
    </div>
  );
}
