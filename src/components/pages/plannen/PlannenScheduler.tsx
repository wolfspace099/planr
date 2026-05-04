/**
 * PlannenScheduler – VS Code-themed week grid.
 *
 * Two modes:
 *   single – click to place one chip (homework / rehearsal)
 *   multi  – click to add chips, click existing to remove, drag to reposition (tests)
 */
import { useRef, useState, useCallback } from "react";
import {
  startOfWeek, endOfWeek, eachDayOfInterval,
  format, isSameDay, isToday, addWeeks, subWeeks,
} from "date-fns";
import { nl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import clsx from "clsx";

export type ScheduledSlot = { startTime: number; durationMinutes: number };

const SLOT_H   = 40;
const HOURS    = Array.from({ length: 16 }, (_, i) => i + 7); // 07–22
const DUR_OPTS = [15, 30, 45, 60, 90, 120];

const ACCENT: Record<string, { chip: string; border: string; btn: string }> = {
  test:      { chip: "#7c3aed", border: "#6d28d9", btn: "#7c3aed" },
  homework:  { chip: "#16a34a", border: "#15803d", btn: "#16a34a" },
  rehearsal: { chip: "#b45309", border: "#92400e", btn: "#b45309" },
};

// ── helpers ─────────────────────────────────────────────────────────────────
function tsFromDayHour(day: Date, h: number, m: number): number {
  const d = new Date(day); d.setHours(h, m, 0, 0); return d.getTime();
}
function topPct(h: number, m: number): number {
  return ((h - 7) + m / 60) / HOURS.length * 100;
}
function heightPct(dur: number): number {
  return (dur / 60) / HOURS.length * 100;
}
function snapToHalf(ts: number): number {
  const d = new Date(ts);
  d.setMinutes(d.getMinutes() < 30 ? 0 : 30, 0, 0);
  return d.getTime();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Single-slot scheduler (homework / rehearsal)
// ─────────────────────────────────────────────────────────────────────────────
export function PlannenScheduler({
  value,
  onChange,
  kind = "homework",
}: {
  value: ScheduledSlot;
  onChange: (s: ScheduledSlot) => void;
  kind?: "homework" | "rehearsal";
}) {
  const accent   = ACCENT[kind];
  const gridRef  = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOff  = useRef(0);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(value.startTime ? new Date(value.startTime) : new Date(), { weekStartsOn: 1 })
  );
  const days = eachDayOfInterval({
    start: weekStart,
    end:   endOfWeek(weekStart, { weekStartsOn: 1 }),
  }).slice(0, 5);

  const hitTest = useCallback((e: MouseEvent | React.MouseEvent, fallbackDay?: Date) => {
    const grid = gridRef.current; if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const rawH = pct * HOURS.length + 7;
    const h    = Math.floor(rawH);
    const m    = (rawH % 1) < 0.5 ? 0 : 30;
    if (h < 7 || h >= 23) return null;
    let day = fallbackDay;
    if (!day) {
      const di = Math.min(4, Math.max(0, Math.floor((e.clientX - rect.left) / (rect.width / 5))));
      day = days[di];
    }
    return tsFromDayHour(day, h, m);
  }, [days]);

  const handleClick = (e: React.MouseEvent, day: Date) => {
    if (dragging.current) return;
    const ts = hitTest(e, day); if (!ts) return;
    onChange({ startTime: ts, durationMinutes: value.durationMinutes });
  };

  const handleChipDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    dragging.current = true;
    const chip = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const totalPx = gridRef.current?.getBoundingClientRect().height ?? 1;
    dragOff.current = ((e.clientY - chip.top) / totalPx) * HOURS.length * 60;

    const onMove = (me: MouseEvent) => {
      const grid = gridRef.current; if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const adj  = me.clientY - rect.top - (dragOff.current / (HOURS.length * 60)) * rect.height;
      const pct  = Math.max(0, Math.min(1, adj / rect.height));
      const rawH = pct * HOURS.length + 7;
      const h    = Math.floor(rawH);
      const m    = (rawH % 1) < 0.5 ? 0 : 30;
      const di   = Math.min(4, Math.max(0, Math.floor((me.clientX - rect.left) / (rect.width / 5))));
      onChange({ startTime: tsFromDayHour(days[di], h, m), durationMinutes: value.durationMinutes });
    };
    const onUp = () => {
      setTimeout(() => { dragging.current = false; }, 0);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const selDate  = value.startTime ? new Date(value.startTime) : null;
  const selDayI  = selDate ? days.findIndex((d) => isSameDay(d, selDate)) : -1;

  return (
    <SchedulerShell
      weekStart={weekStart} setWeekStart={setWeekStart} days={days}
      accent={accent} value={value} onChange={onChange} kind={kind}
    >
      {/* click zones */}
      {days.map((day, di) => (
        <div
          key={day.toISOString()}
          className={clsx("absolute top-0 bottom-0", di > 0 && "border-l border-[#e7e7e7] dark:border-[#2d2d30]")}
          style={{ left: `${(di / 5) * 100}%`, width: "20%" }}
          onClick={(e) => handleClick(e, day)}
        />
      ))}

      {/* chip */}
      {selDayI !== -1 && selDate && (
        <Chip
          top={topPct(selDate.getHours(), selDate.getMinutes())}
          height={heightPct(value.durationMinutes)}
          col={selDayI}
          label={format(selDate, "HH:mm")}
          sub={`${value.durationMinutes}m`}
          color={accent.chip}
          border={accent.border}
          onMouseDown={handleChipDown}
        />
      )}
    </SchedulerShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Multi-slot scheduler (tests) — click to add, click chip to remove, drag
// ─────────────────────────────────────────────────────────────────────────────
export function PlannenMultiScheduler({
  slots,
  onChange,
  durationMinutes,
  onDurationChange,
  deadlineDate,
}: {
  slots: number[];          // array of startTime ms values
  onChange: (slots: number[]) => void;
  durationMinutes: number;
  onDurationChange: (d: number) => void;
  deadlineDate?: number;   // test date – shades days after it
}) {
  const accent   = ACCENT.test;
  const gridRef  = useRef<HTMLDivElement>(null);
  const dragging = useRef<{ idx: number; offset: number } | null>(null);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const days = eachDayOfInterval({
    start: weekStart,
    end:   endOfWeek(weekStart, { weekStartsOn: 1 }),
  }).slice(0, 5);

  // Find which column a slot belongs to
  const slotDayIndex = (ts: number) =>
    days.findIndex((d) => isSameDay(d, new Date(ts)));

  const hitTs = useCallback((e: MouseEvent | React.MouseEvent): { ts: number; di: number } | null => {
    const grid = gridRef.current; if (!grid) return null;
    const rect = grid.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    const rawH = pct * HOURS.length + 7;
    const h    = Math.floor(rawH);
    const m    = (rawH % 1) < 0.5 ? 0 : 30;
    if (h < 7 || h >= 23) return null;
    const di   = Math.min(4, Math.max(0, Math.floor((e.clientX - rect.left) / (rect.width / 5))));
    return { ts: tsFromDayHour(days[di], h, m), di };
  }, [days]);

  const handleGridClick = (e: React.MouseEvent) => {
    if (dragging.current) return;
    const hit = hitTs(e); if (!hit) return;
    // check if clicking an existing chip
    const existIdx = slots.findIndex((s) => {
      const sd = new Date(s); const hd = new Date(hit.ts);
      return isSameDay(sd, hd) && sd.getHours() === hd.getHours() && sd.getMinutes() === hd.getMinutes();
    });
    if (existIdx !== -1) {
      onChange(slots.filter((_, i) => i !== existIdx));
    } else {
      onChange([...slots, hit.ts].sort((a, b) => a - b));
    }
  };

  const handleChipDown = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const chip    = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const totalPx = gridRef.current?.getBoundingClientRect().height ?? 1;
    const offset  = ((e.clientY - chip.top) / totalPx) * HOURS.length * 60;
    dragging.current = { idx, offset };

    const onMove = (me: MouseEvent) => {
      const grid = gridRef.current; if (!grid) return;
      const rect = grid.getBoundingClientRect();
      const adj  = me.clientY - rect.top - (offset / (HOURS.length * 60)) * rect.height;
      const pct  = Math.max(0, Math.min(1, adj / rect.height));
      const rawH = pct * HOURS.length + 7;
      const h    = Math.floor(rawH);
      const m    = (rawH % 1) < 0.5 ? 0 : 30;
      const di   = Math.min(4, Math.max(0, Math.floor((me.clientX - rect.left) / (rect.width / 5))));
      const newTs = tsFromDayHour(days[di], h, m);
      const next  = [...slots];
      next[idx]   = newTs;
      onChange(next.sort((a, b) => a - b));
    };
    const onUp = () => {
      setTimeout(() => { dragging.current = null; }, 0);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const fakeSlot: ScheduledSlot = { startTime: 0, durationMinutes };
  const fakeOnChange = (s: ScheduledSlot) => onDurationChange(s.durationMinutes);

  return (
    <SchedulerShell
      weekStart={weekStart} setWeekStart={setWeekStart} days={days}
      accent={accent} value={fakeSlot} onChange={fakeOnChange} kind="test"
      hideChip
    >
      {/* click zone over the whole grid */}
      <div
        className="absolute inset-0 cursor-crosshair"
        onClick={handleGridClick}
      />

      {/* shade days after deadline */}
      {deadlineDate && days.map((day, di) => {
        const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
        if (dayStart.getTime() < deadlineDate) return null;
        return (
          <div
            key={`shade-${di}`}
            className="absolute top-0 bottom-0 pointer-events-none bg-[#f48771]/10 dark:bg-[#f48771]/5"
            style={{ left: `${(di / 5) * 100}%`, width: "20%" }}
          />
        );
      })}

      {/* existing chips */}
      {slots.map((ts, idx) => {
        const d = new Date(ts);
        const di = slotDayIndex(ts);
        if (di === -1) return null;
        return (
          <Chip
            key={`${ts}-${idx}`}
            top={topPct(d.getHours(), d.getMinutes())}
            height={heightPct(durationMinutes)}
            col={di}
            label={format(d, "HH:mm")}
            sub={`${durationMinutes}m`}
            color={accent.chip}
            border={accent.border}
            onMouseDown={(e) => handleChipDown(e, idx)}
          />
        );
      })}
    </SchedulerShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared grid shell
// ─────────────────────────────────────────────────────────────────────────────
function SchedulerShell({
  weekStart, setWeekStart, days, accent, value, onChange, kind, hideChip, children,
}: {
  weekStart: Date;
  setWeekStart: (fn: (w: Date) => Date) => void;
  days: Date[];
  accent: { chip: string; border: string; btn: string };
  value: ScheduledSlot;
  onChange: (s: ScheduledSlot) => void;
  kind: string;
  hideChip?: boolean;
  children?: React.ReactNode;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const selDate = !hideChip && value.startTime ? new Date(value.startTime) : null;

  return (
    <div className="flex flex-col select-none min-w-0">
      {/* Week nav */}
      <div className="flex items-center h-[26px] border-b border-[#e7e7e7] dark:border-[#3e3e42] bg-[#f3f3f3] dark:bg-[#2d2d30] px-1 gap-px flex-shrink-0">
        <button
          onClick={() => setWeekStart((w) => subWeeks(w, 1))}
          className="h-5 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:bg-[#e8e8e8] dark:hover:bg-[#3e3e42] focus:outline-none"
        >
          <ChevronLeft size={12} strokeWidth={2} />
        </button>
        <span className="flex-1 text-center text-[11px] font-mono text-[#6c6c6c] dark:text-[#969696] tabular-nums">
          {format(weekStart, "d MMM", { locale: nl })} – {format(endOfWeek(weekStart, { weekStartsOn: 1 }), "d MMM yyyy", { locale: nl })}
        </span>
        <button
          onClick={() => setWeekStart((w) => addWeeks(w, 1))}
          className="h-5 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:bg-[#e8e8e8] dark:hover:bg-[#3e3e42] focus:outline-none"
        >
          <ChevronRight size={12} strokeWidth={2} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid flex-shrink-0" style={{ gridTemplateColumns: "28px repeat(5, 1fr)" }}>
        <div className="bg-[#f3f3f3] dark:bg-[#252526] border-b border-r border-[#e7e7e7] dark:border-[#3e3e42]" />
        {days.map((day, i) => (
          <div
            key={day.toISOString()}
            className={clsx(
              "py-1 text-center border-b border-[#e7e7e7] dark:border-[#3e3e42] bg-[#f3f3f3] dark:bg-[#252526]",
              i < 4 && "border-r"
            )}
          >
            <div className={clsx(
              "text-[10px] uppercase tracking-wide font-mono",
              isToday(day) ? "text-[#7c3aed] font-semibold" : "text-[#6c6c6c] dark:text-[#969696]"
            )}>
              {format(day, "EEE", { locale: nl })}
            </div>
            <div className={clsx(
              "text-[11px] tabular-nums font-mono leading-tight",
              isToday(day) ? "text-[#7c3aed] font-semibold" : "text-[#333333] dark:text-[#cccccc]"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex border border-[#e7e7e7] dark:border-[#3e3e42]" style={{ height: `${HOURS.length * SLOT_H}px` }}>
        {/* Hour labels */}
        <div className="flex-shrink-0 w-7 bg-[#f8f8f8] dark:bg-[#252526] border-r border-[#e7e7e7] dark:border-[#3e3e42] relative">
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute w-full flex items-start justify-end pr-0.5"
              style={{ top: `${((h - 7) / HOURS.length) * 100}%`, height: `${(1 / HOURS.length) * 100}%` }}
            >
              <span className="text-[9px] font-mono text-[#969696] leading-none mt-px">{String(h).padStart(2, "0")}</span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        <div ref={gridRef} className="flex-1 relative bg-white dark:bg-[#1e1e1e]">
          {/* Hour lines */}
          {HOURS.map((_, hi) => (
            <div key={hi} className="absolute w-full border-t border-[#ebebeb] dark:border-[#2a2a2a]" style={{ top: `${(hi / HOURS.length) * 100}%` }} />
          ))}
          {/* Half-hour lines */}
          {HOURS.map((_, hi) => (
            <div key={`h-${hi}`} className="absolute w-full border-t border-[#f5f5f5] dark:border-[#232323]" style={{ top: `${((hi + 0.5) / HOURS.length) * 100}%` }} />
          ))}
          {/* Vertical dividers */}
          {days.map((_, di) => di > 0 && (
            <div key={di} className="absolute top-0 bottom-0 border-l border-[#ebebeb] dark:border-[#2a2a2a]" style={{ left: `${(di / 5) * 100}%` }} />
          ))}

          {/* Now line */}
          {(() => {
            const now = new Date();
            const ti  = days.findIndex((d) => isToday(d));
            if (ti === -1) return null;
            const top = topPct(now.getHours(), now.getMinutes());
            if (top < 0 || top > 100) return null;
            return (
              <div className="absolute h-px pointer-events-none z-20" style={{ top: `${top}%`, left: `${(ti / 5) * 100}%`, width: "20%", background: "#f48771" }}>
                <div className="w-1.5 h-1.5 rounded-full -mt-[3px] -ml-0.5" style={{ background: "#f48771" }} />
              </div>
            );
          })()}

          {children}
        </div>
      </div>

      {/* Duration bar */}
      <div className="flex items-center h-[26px] border-t border-[#e7e7e7] dark:border-[#3e3e42] bg-[#f3f3f3] dark:bg-[#2d2d30] px-2 gap-px flex-shrink-0">
        <span className="text-[10px] font-mono text-[#6c6c6c] dark:text-[#969696] mr-2 uppercase tracking-wide">Duur</span>
        {DUR_OPTS.map((d) => (
          <button
            key={d}
            onClick={() => onChange({ ...value, durationMinutes: d })}
            className={clsx(
              "h-[18px] px-1.5 text-[10px] font-mono focus:outline-none transition-colors",
              value.durationMinutes === d
                ? "text-white"
                : "text-[#6c6c6c] dark:text-[#969696] hover:bg-[#e8e8e8] dark:hover:bg-[#3e3e42] hover:text-[#333333] dark:hover:text-[#cccccc]"
            )}
            style={value.durationMinutes === d ? { background: accent.btn } : undefined}
          >
            {d < 60 ? `${d}m` : `${d / 60}h`}
          </button>
        ))}

        {selDate && (
          <span className="ml-auto text-[10px] font-mono text-[#6c6c6c] dark:text-[#969696] tabular-nums">
            {format(selDate, "EEE d MMM · HH:mm", { locale: nl })} → {format(new Date(selDate.getTime() + value.durationMinutes * 60000), "HH:mm")}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Chip
// ─────────────────────────────────────────────────────────────────────────────
function Chip({ top, height, col, label, sub, color, border, onMouseDown }: {
  top: number; height: number; col: number;
  label: string; sub: string;
  color: string; border: string;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      className="absolute z-10 cursor-grab active:cursor-grabbing overflow-hidden flex flex-col justify-center px-1.5"
      style={{
        top: `${top}%`,
        height: `${Math.max(height, 2.5)}%`,
        left: `${(col / 5) * 100 + 0.3}%`,
        width: `${(1 / 5) * 100 - 0.6}%`,
        background: color,
        borderLeft: `2px solid ${border}`,
      }}
      onMouseDown={onMouseDown}
    >
      <span className="text-[10px] font-semibold text-white font-mono leading-none">{label}</span>
      <span className="text-[9px] text-white/70 font-mono leading-none mt-0.5">{sub}</span>
    </div>
  );
}
