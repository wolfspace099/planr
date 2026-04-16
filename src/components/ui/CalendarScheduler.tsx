/**
 * CalendarScheduler
 * A Google Calendar-style week-view used for scheduling/rescheduling study sessions.
 * Supports:
 *  - Click on an empty slot to place a session
 *  - Drag an existing chip to a new slot
 *  - Navigate weeks
 *  - Duration stepper
 */

import { useRef, useState, useCallback, useEffect } from "react";
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameDay, isToday, addWeeks, subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

export type ScheduledSlot = {
  startTime: number;   // ms timestamp
  durationMinutes: number;
};

type ExistingEvent = {
  startTime: number;
  endTime: number;
  label: string;
  color: string; // tailwind bg class or hex
};

type Props = {
  value: ScheduledSlot;
  onChange: (slot: ScheduledSlot) => void;
  accentColor: string;       // e.g. "purple" | "emerald" | "amber"
  existingEvents?: ExistingEvent[];
  minHour?: number;
  maxHour?: number;
};

const SLOT_HEIGHT = 44; // px per hour slot
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00 – 22:00

function snapToHalfHour(ts: number): number {
  const d = new Date(ts);
  const mins = d.getMinutes();
  const snapped = mins < 15 ? 0 : mins < 45 ? 30 : 60;
  d.setMinutes(snapped, 0, 0);
  return d.getTime();
}

function tsFromDayHour(day: Date, hour: number, minute = 0): number {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d.getTime();
}

function topPct(hour: number, minute: number, minHour: number): number {
  return ((hour - minHour) + minute / 60) / HOURS.length * 100;
}

function heightPct(durationMinutes: number): number {
  return (durationMinutes / 60) / HOURS.length * 100;
}

const ACCENT_STYLES: Record<string, { bg: string; border: string; text: string; light: string }> = {
  purple:  { bg: "bg-purple-500",  border: "border-purple-400",  text: "text-purple-700",  light: "bg-purple-100" },
  emerald: { bg: "bg-emerald-500", border: "border-emerald-400", text: "text-emerald-700", light: "bg-emerald-100" },
  amber:   { bg: "bg-amber-500",   border: "border-amber-400",   text: "text-amber-700",   light: "bg-amber-100" },
};

export function CalendarScheduler({
  value,
  onChange,
  accentColor,
  existingEvents = [],
  minHour = 7,
}: Props) {
  const accent = ACCENT_STYLES[accentColor] ?? ACCENT_STYLES.purple;
  const gridRef = useRef<HTMLDivElement>(null);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(value.startTime ? new Date(value.startTime) : new Date(), { weekStartsOn: 1 })
  );
  const days = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(weekStart, { weekStartsOn: 1 }),
  }).slice(0, 5); // Mon–Fri

  // Drag state
  const dragging = useRef(false);
  const dragOffset = useRef(0); // minutes from top of chip the user grabbed

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getSlotFromPointer = useCallback(
    (e: MouseEvent | React.MouseEvent, dayIndex: number): number | null => {
      const grid = gridRef.current;
      if (!grid) return null;
      const rect = grid.getBoundingClientRect();
      const relY = e.clientY - rect.top;
      const pct = relY / rect.height;
      const totalHours = HOURS.length;
      const hour = Math.floor(pct * totalHours) + minHour;
      const minuteFrac = (pct * totalHours) % 1;
      const minute = minuteFrac < 0.5 ? 0 : 30;
      if (hour < minHour || hour >= minHour + totalHours) return null;
      return tsFromDayHour(days[dayIndex], hour, minute);
    },
    [days, minHour]
  );

  // ── Click on empty slot ───────────────────────────────────────────────────

  const handleCellClick = (e: React.MouseEvent, day: Date) => {
    if (dragging.current) return;
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    const pct = relY / rect.height;
    const totalHours = HOURS.length;
    const hour = Math.floor(pct * totalHours) + minHour;
    const minuteFrac = (pct * totalHours) % 1;
    const minute = minuteFrac < 0.5 ? 0 : 30;
    const d = new Date(day);
    d.setHours(hour, minute, 0, 0);
    onChange({ startTime: d.getTime(), durationMinutes: value.durationMinutes });
  };

  // ── Drag chip ─────────────────────────────────────────────────────────────

  const handleChipMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    dragging.current = true;

    // How many minutes from top of chip was the grab?
    const chip = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pxFromTop = e.clientY - chip.top;
    const totalGridPx = gridRef.current?.getBoundingClientRect().height ?? 1;
    dragOffset.current = (pxFromTop / totalGridPx) * HOURS.length * 60; // minutes

    const onMouseMove = (me: MouseEvent) => {
      const grid = gridRef.current;
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const relY = me.clientY - rect.top - (dragOffset.current / (HOURS.length * 60)) * rect.height;
      const pct = Math.max(0, Math.min(1, relY / rect.height));
      const totalHours = HOURS.length;
      const rawHour = pct * totalHours + minHour;
      const hour = Math.floor(rawHour);
      const minute = (rawHour % 1) < 0.5 ? 0 : 30;

      // Determine which day column
      const dayWidth = rect.width / 5;
      const dayIndex = Math.min(4, Math.max(0, Math.floor((me.clientX - rect.left) / dayWidth)));
      const d = new Date(days[dayIndex]);
      d.setHours(hour, minute, 0, 0);
      onChange({ startTime: d.getTime(), durationMinutes: value.durationMinutes });
    };

    const onMouseUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  // ── Derived placement of the selected chip ────────────────────────────────

  const selDate = value.startTime ? new Date(value.startTime) : null;
  const selDayIndex = selDate
    ? days.findIndex((d) => isSameDay(d, selDate))
    : -1;
  const selTop = selDate
    ? topPct(selDate.getHours(), selDate.getMinutes(), minHour)
    : 0;
  const selH = heightPct(value.durationMinutes);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-2 select-none">
      {/* Week nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          className="p-1 rounded hover:bg-border transition-colors"
        >
          <ChevronLeft size={14} className="text-ink-muted" />
        </button>
        <span className="text-xs font-semibold text-ink">
          {format(weekStart, "d MMM")} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d MMM yyyy")}
        </span>
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="p-1 rounded hover:bg-border transition-colors"
        >
          <ChevronRight size={14} className="text-ink-muted" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid gap-px" style={{ gridTemplateColumns: "32px repeat(5, 1fr)" }}>
        <div />
        {days.map((day) => (
          <div key={day.toISOString()}
            className={clsx(
              "text-center py-1 text-[11px] font-semibold rounded",
              isToday(day) ? "text-accent" : "text-ink-muted"
            )}>
            <div>{format(day, "EEE")}</div>
            <div className={clsx(
              "w-6 h-6 rounded-full flex items-center justify-center mx-auto text-[11px]",
              isToday(day) && "bg-accent text-white"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-px overflow-hidden rounded-lg border border-border" style={{ gridTemplateColumns: "32px repeat(5, 1fr)" }}>
        {/* Hour labels */}
        <div className="relative bg-bg">
          {HOURS.map((h) => (
            <div key={h}
              className="absolute w-full flex items-start justify-end pr-1"
              style={{ top: `${((h - minHour) / HOURS.length) * 100}%`, height: `${(1 / HOURS.length) * 100}%` }}>
              <span className="text-[9px] text-ink-light leading-none mt-0.5">
                {String(h).padStart(2, "0")}
              </span>
            </div>
          ))}
        </div>

        {/* Day columns – rendered as a single relative container spanning all 5 cols */}
        <div
          ref={gridRef}
          className="relative col-span-5 bg-bg cursor-pointer"
          style={{ height: `${HOURS.length * SLOT_HEIGHT}px` }}
        >
          {/* Hour grid lines + day column clicks */}
          {HOURS.map((h, hi) => (
            <div key={h}
              className="absolute w-full border-t border-border/40"
              style={{ top: `${(hi / HOURS.length) * 100}%`, height: `${(1 / HOURS.length) * 100}%` }}
            />
          ))}

          {/* Vertical day dividers + click zones */}
          {days.map((day, di) => (
            <div
              key={day.toISOString()}
              className={clsx(
                "absolute top-0 bottom-0 border-l border-border/30",
                di === 0 && "border-l-0"
              )}
              style={{ left: `${(di / 5) * 100}%`, width: "20%" }}
              onClick={(e) => handleCellClick(e, day)}
            />
          ))}

          {/* Existing events (read-only backdrop) */}
          {existingEvents.map((ev, i) => {
            const evDate = new Date(ev.startTime);
            const dayIdx = days.findIndex((d) => isSameDay(d, evDate));
            if (dayIdx === -1) return null;
            const top = topPct(evDate.getHours(), evDate.getMinutes(), minHour);
            const evDur = (ev.endTime - ev.startTime) / 60000;
            const h = heightPct(evDur);
            return (
              <div key={i}
                className="absolute rounded opacity-40 px-1 overflow-hidden pointer-events-none"
                style={{
                  top: `${top}%`,
                  height: `${Math.max(h, 2)}%`,
                  left: `${(dayIdx / 5) * 100 + 0.5}%`,
                  width: `${(1 / 5) * 100 - 1}%`,
                  backgroundColor: ev.color,
                }}>
                <span className="text-[9px] text-white font-medium leading-tight truncate block">{ev.label}</span>
              </div>
            );
          })}

          {/* Selected session chip */}
          {selDayIndex !== -1 && selDate && (
            <div
              className={clsx(
                "absolute rounded-md border-2 shadow-md flex flex-col px-2 py-1 cursor-grab active:cursor-grabbing z-10 overflow-hidden",
                accent.bg, accent.border,
              )}
              style={{
                top: `${selTop}%`,
                height: `${Math.max(selH, 3)}%`,
                left: `${(selDayIndex / 5) * 100 + 0.5}%`,
                width: `${(1 / 5) * 100 - 1}%`,
              }}
              onMouseDown={handleChipMouseDown}
            >
              <span className="text-[10px] font-bold text-white leading-tight truncate">
                {format(selDate, "HH:mm")}
              </span>
              <span className="text-[9px] text-white/80 leading-tight truncate">
                {value.durationMinutes} min
              </span>
            </div>
          )}

          {/* Now line */}
          {(() => {
            const now = new Date();
            const todayIdx = days.findIndex((d) => isToday(d));
            if (todayIdx === -1) return null;
            const nowTop = topPct(now.getHours(), now.getMinutes(), minHour);
            if (nowTop < 0 || nowTop > 100) return null;
            return (
              <div
                className="absolute h-[2px] bg-red-400/70 z-20 pointer-events-none"
                style={{ top: `${nowTop}%`, left: `${(todayIdx / 5) * 100}%`, width: "20%" }}
              >
                <div className="w-2 h-2 rounded-full bg-red-400 -mt-[3px] -ml-1" />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Duration stepper */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-ink-muted">Duration</span>
        <div className="flex items-center gap-2">
          {[15, 30, 45, 60, 90, 120].map((d) => (
            <button
              key={d}
              onClick={() => onChange({ ...value, durationMinutes: d })}
              className={clsx(
                "px-2 py-0.5 text-[11px] rounded border font-medium transition-colors",
                value.durationMinutes === d
                  ? `${accent.bg} text-white border-transparent`
                  : "bg-surface border-border text-ink-muted hover:border-border-strong"
              )}
            >
              {d < 60 ? `${d}m` : `${d / 60}h`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {selDate && (
        <div className={clsx("text-xs px-3 py-2 rounded-lg border", accent.light, accent.border, accent.text)}>
          <strong>{format(selDate, "EEEE d MMMM")}</strong> at <strong>{format(selDate, "HH:mm")}</strong>
          {" "}for <strong>{value.durationMinutes} min</strong>
          {" "}→ done at <strong>{format(new Date(selDate.getTime() + value.durationMinutes * 60000), "HH:mm")}</strong>
        </div>
      )}
    </div>
  );
}