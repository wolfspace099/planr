import { useMemo, useState, useRef, useEffect } from "react"; // Added useRef/useEffect
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { studyApi } from "../studyApi";
import {
  startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval,
  format, isSameDay, isToday,
} from "date-fns";
import { 
  ChevronLeft, ChevronRight, MapPin, FlaskConical, BookOpen, 
  ClipboardList, RefreshCw, Plus, Calendar as CalendarIcon, 
  CheckSquare, Activity, GraduationCap 
} from "lucide-react"; // Added new icons
import { Link } from "react-router-dom";
import { PageHeader, Button } from "../components/ui/primitives";
import clsx from "clsx";

const SCHOOL_PERIODS = [
  { label: "u1", startHH: 8,  startMM: 30, endHH: 9,  endMM: 20 },
  { label: "u2", startHH: 9,  startMM: 20, endHH: 10, endMM: 10 },
  { label: "u3", startHH: 10, startMM: 25, endHH: 11, endMM: 15 },
  { label: "u4", startHH: 11, startMM: 15, endHH: 12, endMM: 5  },
  { label: "u5", startHH: 12, startMM: 30, endHH: 13, endMM: 20 },
  { label: "u6", startHH: 13, startMM: 20, endHH: 14, endMM: 10 },
  { label: "u7", startHH: 14, startMM: 15, endHH: 15, endMM: 5  },
  { label: "u8", startHH: 15, startMM: 5,  endHH: 15, endMM: 55 },
];

export default function CalendarPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [showAddMenu, setShowAddMenu] = useState(false); // State for dropdown
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowAddMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const today = new Date();
  const start = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const end = endOfWeek(start, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start, end });

  const lessons = useQuery(api.lessons.getForInterval, {
    start: start.getTime(),
    end: end.getTime(),
  });
  const studySessions = useQuery(studyApi.getStudySessions);
  const rehearsalSessions = useQuery(studyApi.getRehearsalSessions);

  const prevWeek = () => setWeekOffset(weekOffset - 1);
  const nextWeek = () => setWeekOffset(weekOffset + 1);
  const goToToday = () => setWeekOffset(0);

  const addOptions = [
    { label: "Lesson", icon: <BookOpen size={14} />, href: "/timetable" },
    { label: "Appointment", icon: <CalendarIcon size={14} />, href: "/appointments" },
    { label: "Habit", icon: <Activity size={14} />, href: "/habits" },
    { label: "Test", icon: <GraduationCap size={14} />, href: "/tests" },
    { label: "Task", icon: <CheckSquare size={14} />, href: "/tasks" },
    { label: "Homework", icon: <ClipboardList size={14} />, href: "/homework" },
  ];

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <PageHeader 
        title="Calendar" 
        description={format(start, "MMMM yyyy")}
        actions={
          <div className="flex items-center gap-2 relative" ref={menuRef}>
            {/* Nav buttons */}
            <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 mr-2">
              <button onClick={prevWeek} className="p-1.5 hover:bg-bg rounded-md transition-colors"><ChevronLeft size={16}/></button>
              <button onClick={goToToday} className="px-3 py-1 text-xs font-medium hover:bg-bg rounded-md transition-colors border-x border-border">Today</button>
              <button onClick={nextWeek} className="p-1.5 hover:bg-bg rounded-md transition-colors"><ChevronRight size={16}/></button>
            </div>

            {/* NEW: Plus Button with Dropdown */}
            <Button 
              variant="primary" 
              size="sm" 
              className="gap-1.5"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <Plus size={16} />
              <span>Add</span>
            </Button>

            {showAddMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border-strong rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-1">
                  {addOptions.map((option) => (
                    <Link
                      key={option.label}
                      to={option.href}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-ink hover:bg-accent hover:text-white rounded-lg transition-colors"
                      onClick={() => setShowAddMenu(false)}
                    >
                      <span className="opacity-70">{option.icon}</span>
                      {option.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
      />

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="min-w-[800px] h-full flex flex-col gap-4">
          
          {/* Header Row (Days) */}
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4">
            <div />
            {days.map((d) => (
              <div key={d.toString()} className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                  {format(d, "EEE")}
                </span>
                <div className={clsx(
                  "w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold",
                  isToday(d) ? "bg-accent text-white" : "text-ink"
                )}>
                  {format(d, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots / Grid */}
          {SCHOOL_PERIODS.map((p) => (
            <div key={p.label} className="grid grid-cols-[80px_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 min-h-[80px]">
              <div className="flex flex-col justify-center items-end pr-4 border-r border-border-strong/50">
                <span className="text-xs font-bold text-ink-muted uppercase">{p.label}</span>
                <span className="text-[10px] text-ink-light font-medium">
                  {String(p.startHH).padStart(2, "0")}:{String(p.startMM).padStart(2, "0")}
                </span>
              </div>

              {days.map((day) => {
                const dayLessons = (lessons ?? []).filter((l) => {
                  const lDate = new Date(l.startTime);
                  return isSameDay(lDate, day) && 
                         lDate.getHours() === p.startHH && 
                         lDate.getMinutes() === p.startMM;
                });

                const studySess = (studySessions ?? []).filter((s: any) => {
                  const sDate = new Date(s.startTime);
                  return isSameDay(sDate, day) && 
                         sDate.getHours() === p.startHH && 
                         sDate.getMinutes() === p.startMM;
                });

                const rehSess = (rehearsalSessions ?? []).filter((s: any) => {
                  const sDate = new Date(s.startTime);
                  return isSameDay(sDate, day) && 
                         sDate.getHours() === p.startHH && 
                         sDate.getMinutes() === p.startMM;
                });

                return (
                  <div key={day.toString()} className="relative rounded-xl border border-border bg-bg/30 p-1.5 flex flex-col gap-1.5 min-h-[90px]">
                    {dayLessons.map((l) => (
                      <Link key={l._id} to={`/lesson/${l._id}`}
                        className="group flex flex-col gap-1 p-2 rounded-lg bg-surface border border-border hover:border-accent hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[11px] font-bold text-ink leading-tight truncate">
                            {l.subject}
                          </span>
                          {l.location && <MapPin size={10} className="text-ink-muted flex-shrink-0 mt-0.5" />}
                        </div>
                        {l.location && (
                          <span className="text-[10px] text-ink-muted truncate leading-none">
                            {l.location}
                          </span>
                        )}
                      </Link>
                    ))}

                    {studySess.map((s) => (
                      <div key={s._id}
                        className={clsx(
                          "rounded border border-emerald-200 bg-emerald-50/60 px-1.5 py-1 min-h-[40px] flex flex-col gap-0.5",
                          s.done && "opacity-50"
                        )}
                        title={s.title}
                      >
                        <div className="flex items-center gap-1">
                          <FlaskConical size={9} className="text-emerald-500 flex-shrink-0" />
                          <span className="text-[11px] font-semibold leading-tight truncate text-emerald-800">
                            {s.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-600 leading-tight">
                          {format(new Date(s.startTime), "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}
                          {s.done && " ✓"}
                        </span>
                      </div>
                    ))}
                    
                    {rehSess.map((s) => (
                      <div key={s._id}
                        className={clsx(
                          "rounded border border-amber-200 bg-amber-50/60 px-1.5 py-1 min-h-[40px] flex flex-col gap-0.5",
                          s.done && "opacity-50"
                        )}
                        title={s.title}
                      >
                        <div className="flex items-center gap-1">
                          <RefreshCw size={9} className="text-amber-500 flex-shrink-0" />
                          <span className="text-[11px] font-semibold leading-tight truncate text-amber-800">
                            {s.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-amber-600 leading-tight">
                          {format(new Date(s.startTime), "HH:mm")}–{format(new Date(s.endTime), "HH:mm")}
                          {s.done && " ✓"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}