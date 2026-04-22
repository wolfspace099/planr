import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { studyApi } from "../studyApi";
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval,
  format, isSameDay, isToday,
} from "date-fns";
import {
  ChevronLeft, ChevronRight, MapPin, FlaskConical, BookOpen,
  ClipboardList, RefreshCw, Plus, X, ClipboardCheck, CheckSquare,
  Check, Calendar as CalendarIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Modal, Input, Textarea, Button } from "../components/ui/primitives";
import { useLang } from "../i18n";
import clsx from "clsx";

/* ─── layout constants ───────────────────────────── */
const HOUR_HEIGHT = 68;
const START_HOUR = 7;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_COL_W = 64;

/* ─── helpers ───────────────────────────────────── */
function toTopPx(date: Date) {
  const h = date.getHours() + date.getMinutes() / 60;
  return (h - START_HOUR) * HOUR_HEIGHT;
}

function durationPx(startMs: number, endMs: number) {
  return ((endMs - startMs) / 3_600_000) * HOUR_HEIGHT;
}

/* ─── calendar side panel ───────────────────────── */
function CalendarSidePanel({ calendars }: { calendars: any[] }) {
  const toggleVisible = useMutation(api.calendars.toggleVisible);
  const regular = calendars.filter((c) => !c.isSchedule);

  return (
    <div className="w-44 flex-shrink-0 border-r border-white/[0.06] bg-[#0f0f0f] flex flex-col">
      <div className="h-[72px] border-b border-white/[0.06] flex items-end px-4 pb-3">
        <p className="text-[10px] uppercase tracking-wider text-white/20">
          Agenda’s
        </p>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {regular.map((cal) => (
          <button
            key={cal._id}
            onClick={() => toggleVisible({ id: cal._id })}
            className="flex items-center gap-2 w-full px-4 py-2 hover:bg-white/5"
          >
            <div
              className="w-3 h-3 rounded border-2"
              style={{
                backgroundColor: cal.visible ? cal.color : "transparent",
                borderColor: cal.color,
              }}
            />
            <span className="text-xs text-white/60 truncate">{cal.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── now line ───────────────────────────────────── */
function NowLine({ days }: { days: Date[] }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const todayIdx = days.findIndex((d) => isToday(d));
  if (todayIdx === -1) return null;

  const h = now.getHours() + now.getMinutes() / 60;
  if (h < START_HOUR || h >= END_HOUR) return null;

  const top = (h - START_HOUR) * HOUR_HEIGHT;

  return (
    <div
      className="absolute pointer-events-none flex items-center"
      style={{ top }}
    >
      <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
      <div className="h-[2px] bg-red-500 flex-1" />
    </div>
  );
}

/* ─── MAIN PAGE ───────────────────────────────────── */
export default function CalendarPage() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const days = eachDayOfInterval({
    start: weekStart,
    end: weekEnd,
  }).slice(0, 5);

  const lessons = useQuery(api.lessons.getRange, {
    from: weekStart.getTime(),
    to: weekEnd.getTime(),
  });

  const appointments = useQuery(api.misc.getAppointments);
  const calendars = useQuery(api.calendars.getAll) ?? [];

  const calendarVisible = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const c of calendars) map[c._id] = c.visible;
    return map;
  }, [calendars]);

  const hours = Array.from(
    { length: TOTAL_HOURS },
    (_, i) => i + START_HOUR
  );

  function getChipsForDay(day: Date) {
    const chips: any[] = [];

    (lessons ?? [])
      .filter((l) => isSameDay(new Date(l.startTime), day))
      .forEach((l) => {
        const start = new Date(l.startTime);

        chips.push({
          key: l._id,
          top: toTopPx(start),
          height: Math.max(
            durationPx(l.startTime, l.endTime),
            22
          ),
          node: (
            <div className="h-full rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs text-white">
              {l.subject}
            </div>
          ),
        });
      });

    return chips;
  }

  const totalHeight = TOTAL_HOURS * HOUR_HEIGHT;

  return (
    <div className="h-full bg-[#0f0f0f] p-6">
      <div className="h-full rounded-2xl overflow-hidden border border-white/[0.06] bg-[#111111] flex shadow-2xl">

        {/* sidebar */}
        <CalendarSidePanel calendars={calendars} />

        {/* calendar */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* grid */}
          <div ref={scrollRef} className="flex-1 overflow-auto">
            <div
              className="grid relative min-w-[700px]"
              style={{
                gridTemplateColumns: `${TIME_COL_W}px repeat(5, 1fr)`,
                height: totalHeight,
              }}
            >
              {/* time column */}
              <div>
                {hours.map((h, i) => (
                  <div
                    key={h}
                    className="absolute text-white/20 text-xs pr-2 w-full text-right"
                    style={{ top: i * HOUR_HEIGHT }}
                  >
                    {String(h).padStart(2, "0")}:00
                  </div>
                ))}
              </div>

              {/* days */}
              {days.map((day) => {
                const chips = getChipsForDay(day);

                return (
                  <div
                    key={day.toISOString()}
                    className="relative border-l border-white/[0.05]"
                  >
                    {hours.map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-full border-t border-white/[0.03]"
                        style={{ top: i * HOUR_HEIGHT }}
                      />
                    ))}

                    {chips.map((c) => (
                      <div
                        key={c.key}
                        className="absolute left-1 right-1"
                        style={{ top: c.top, height: c.height }}
                      >
                        {c.node}
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* now line */}
              <div
                className="absolute inset-0"
                style={{ left: TIME_COL_W }}
              >
                <NowLine days={days} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}