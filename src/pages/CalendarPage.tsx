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

const HOUR_HEIGHT = 68;
const START_HOUR  = 7;
const END_HOUR    = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const TIME_COL_W  = 64;

function toTopPx(date: Date): number {
  const h = date.getHours() + date.getMinutes() / 60;
  return (h - START_HOUR) * HOUR_HEIGHT;
}
function durationPx(startMs: number, endMs: number): number {
  return ((endMs - startMs) / 3_600_000) * HOUR_HEIGHT;
}
function subjectDisplay(subject: string): string {
  return subject.length > 12 ? subject.slice(0, 10) + "…" : subject;
}

const SCHOOL_PERIODS = [
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
  for (const p of SCHOOL_PERIODS) {
    const pMins = p.startHH * 60 + p.startMM;
    if (Math.abs(mins - pMins) <= 5) return p.label;
  }
  return null;
}

function CreateAppointmentModal({
  open, onClose, initialDate, initialHour, calendars,
}: {
  open: boolean;
  onClose: () => void;
  initialDate: Date | null;
  initialHour: number;
  calendars: any[];
}) {
  const create = useMutation(api.misc.createAppointment);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [calendarId, setCalendarId] = useState<string>("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      const h = initialHour;
      setStartTime(`${String(h).padStart(2, "0")}:00`);
      setEndTime(`${String(Math.min(h + 1, 22)).padStart(2, "0")}:00`);
      setTitle(""); setDesc(""); setLocation(""); setDone(false);
      const defaultCal = calendars.find((c) => !c.isSchedule);
      setCalendarId(defaultCal?._id ?? "");
    }
  }, [open, initialHour, calendars]);

  const submit = async () => {
    if (!title.trim() || !initialDate) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(initialDate); start.setHours(sh, sm, 0, 0);
    const end   = new Date(initialDate); end.setHours(eh, em, 0, 0);
    const cal = calendars.find((c) => c._id === calendarId);
    await create({
      title, description: desc || undefined, location: location || undefined,
      startTime: start.getTime(), endTime: end.getTime(),
      isRecurring: false,
      color: cal?.color ?? "#8B5CF6",
      calendarId: calendarId ? calendarId as any : undefined,
    });
    setDone(true);
    setTimeout(onClose, 800);
  };

  return (
    <Modal open={open} onClose={onClose} title="Afspraak">
      <div className="space-y-3">
        {done ? (
          <div className="flex items-center gap-2 text-green-400 py-2"><Check size={16} /> Aangemaakt</div>
        ) : (
          <>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titel" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full px-3 py-2 rounded border bg-[#111]" />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full px-3 py-2 rounded border bg-[#111]" />
            </div>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Locatie" />
            <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={submit} disabled={!title.trim()}>Create</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function AddDropdown({ lessons, calendars }: { lessons: any[]; calendars: any[] }) {
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState<"appointment" | null>(null);
  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 h-10 px-4 rounded-full bg-blue-600 text-white hover:bg-blue-500">
        <Plus size={16} /> Create
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-[#1a1a1a] rounded-lg shadow-xl">
          <button onClick={() => { setModal("appointment"); setOpen(false); }} className="w-full text-left px-4 py-2 hover:bg-white/10">Event</button>
        </div>
      )}
      <CreateAppointmentModal open={modal === "appointment"} onClose={() => setModal(null)} initialDate={new Date()} initialHour={9} calendars={calendars} />
    </div>
  );
}

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
    <div className="absolute left-0 right-0 h-[2px] bg-red-500" style={{ top }} />
  );
}
function CalendarSidePanel({ calendars }: { calendars: any[] }) {
  const toggleVisible = useMutation(api.calendars.toggleVisible);

  return (
    <div className="w-56 border-r border-white/10 bg-[#0f0f0f] flex flex-col">
      <div className="px-4 py-3 border-b border-white/10 text-sm font-semibold text-white/80">
        Calendars
      </div>

      <div className="flex-1 overflow-y-auto">
        {calendars.map((cal) => (
          <button
            key={cal._id}
            onClick={() => toggleVisible({ id: cal._id })}
            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white/5 transition-colors"
          >
            <div
              className="w-3 h-3 rounded-sm border flex items-center justify-center"
              style={{
                borderColor: cal.color,
                backgroundColor: cal.visible ? cal.color : "transparent",
              }}
            >
              {cal.visible && <Check size={10} className="text-white" />}
            </div>
            <span className="text-sm text-white/70 truncate">
              {cal.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).slice(0, 5);

  const lessons = useQuery(api.lessons.getRange, { from: weekStart.getTime(), to: weekEnd.getTime() });
  const calendars = useQuery(api.calendars.getAll) ?? [];

  const totalGridHeight = TOTAL_HOURS * HOUR_HEIGHT;
  const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => i + START_HOUR);

  function getChipsForDay(day: Date) {
    const chips: any[] = [];
    (lessons ?? []).filter((l) => isSameDay(new Date(l.startTime), day)).forEach((l) => {
      const start = new Date(l.startTime);
      chips.push({
        key: l._id,
        top: toTopPx(start),
        height: 60,
        node: (
          <div className="bg-blue-500/20 border border-blue-400 text-blue-200 rounded px-2 py-1 text-xs">
            {l.subject}
          </div>
        )
      });
    });
    return chips;
  }

  return (
    <div className="flex flex-col h-full bg-[#0b0b0c] text-white">
      <div className="flex items-center justify-between px-6 h-16 border-b border-white/[0.06]">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">{format(weekStart, "MMMM yyyy")}</h1>
          <div className="flex items-center gap-1">
            <button onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft /></button>
            <button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Today</button>
            <button onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight /></button>
          </div>
        </div>
        <AddDropdown lessons={[]} calendars={calendars} />
      </div>

      <div className="flex-1 overflow-auto" ref={scrollRef}>
        <div className="grid" style={{ gridTemplateColumns: `${TIME_COL_W}px repeat(5, 1fr)`, height: totalGridHeight }}>
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} className="text-center py-2 border-b border-white/[0.06]">
              {format(day, "EEE d")}
            </div>
          ))}

          <div className="relative">
            {hours.map((h, i) => (
              <div key={h} className="absolute right-2 text-xs text-white/30" style={{ top: i * HOUR_HEIGHT }}>
                {h}:00
              </div>
            ))}
          </div>

          {days.map((day) => {
            const chips = getChipsForDay(day);
            return (
              <div key={day.toISOString()} className="relative border-l border-white/[0.03]">
                {hours.map((h, i) => (
                  <div key={h} className="absolute w-full border-t border-white/[0.03]" style={{ top: i * HOUR_HEIGHT }} />
                ))}
                {chips.map((chip) => (
                  <div key={chip.key} className="absolute px-1" style={{ top: chip.top }}>
                    {chip.node}
                  </div>
                ))}
              </div>
            );
          })}

          <NowLine days={days} />
        </div>
      </div>
    </div>
  );
}