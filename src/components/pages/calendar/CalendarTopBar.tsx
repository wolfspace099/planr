import { UserButton } from "@clerk/clerk-react";
import { ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { addWeeks, endOfWeek, format, getISOWeek, isSameMonth, startOfWeek, subWeeks } from "date-fns";
import { enUS, nl } from "date-fns/locale";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../../../i18n";

export type CalendarTab = "calendar" | "studyPlanner" | "grades" | "messages" | "notebook";

export function CalendarTopBar({weekStart, setWeekStart, activeTab, setActiveTab, }: {
  weekStart: Date;
  setWeekStart: (d: Date) => void;
  activeTab: CalendarTab;
  setActiveTab: (t: CalendarTab) => void;
}) {
  const { t, lang } = useLang();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const weekNumber = getISOWeek(weekStart);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const dateLocale = lang === "nl" ? nl : enUS;
  const monthLabel = isSameMonth(weekStart, weekEnd)
    ? format(weekStart, "LLLL", { locale: dateLocale })
    : `${format(weekStart, "LLL", { locale: dateLocale })}/${format(weekEnd, "LLL", { locale: dateLocale })}`;

  useEffect(() => {
    if (!menuOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const tabs: { key: CalendarTab; label: string; icon: React.ReactNode }[] = [
    {
      key: "calendar",
      label: "Rooster",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
        </svg>
      ),
    },
    {
      key: "studyPlanner",
      label: "Studiewijzer",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 010 6.844L12 14z"/><path d="M12 14v8"/>
        </svg>
      ),
    },
    {
      key: "grades",
      label: "Cijfers",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
        </svg>
      ),
    },
    {
      key: "messages",
      label: "Berichten",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      ),
    },
    {
      key: "notebook",
      label: "Notities",
      icon: (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5V4a2 2 0 012-2h10a2 2 0 012 2v15.5"/>
          <path d="M4 19.5a2.5 2.5 0 002.5 2.5H20"/>
          <path d="M8 7h8M8 11h8M8 15h6"/>
        </svg>
      ),
    },
  ];

  const menuLinks = [
    { to: "/", label: t.today },
    { to: "/calendar", label: t.calendar },
    { to: "/notebook", label: t.notebook },
    { to: "/homework", label: t.homework },
    { to: "/tasks", label: t.tasks },
    { to: "/tests", label: t.tests },
    { to: "/study", label: t.study },
    { to: "/habits", label: t.habits },
    { to: "/appointments", label: t.appointments },
    { to: "/settings", label: t.settings },
  ];

  return (
    <div className="flex-shrink-0 flex items-center h-14 bg-[#111111] border-b border-white/[0.07] px-4 gap-4">
      <div className="relative w-56 flex-shrink-0" ref={menuRef}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="h-8 w-8 rounded-md text-purple-400 hover:text-purple-300 hover:bg-purple-400/[0.10] transition-colors flex items-center justify-center"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <Settings size={16} />
          </button>
          <span className="text-white font-semibold tracking-tight text-sm">planr</span>
        </div>

        {menuOpen && (
          <div className="absolute top-[calc(100%+8px)] left-0 z-40 w-56 rounded-lg border border-white/[0.12] bg-[#151515]/95 backdrop-blur p-1.5 shadow-xl">
            {menuLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="block rounded-md px-2.5 py-2 text-[12px] font-medium text-white/65 hover:text-white hover:bg-white/[0.07] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  "relative flex items-center gap-1.5 px-3 h-14 text-[12.5px] font-medium transition-colors",
                  active ? "text-purple-400" : "text-white/40 hover:text-white/70"
                )}
              >
                <span className={clsx("transition-colors", active ? "text-purple-400" : "text-white/35")}>
                  {tab.icon}
                </span>
                {tab.label}
                {/* Active underline */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-purple-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 w-56 flex-shrink-0 justify-end">
        <span className="text-[12px] font-semibold text-white/50 tabular-nums mr-2 whitespace-nowrap">
          {monthLabel} | {t.week} {weekNumber}
        </span>
        <button
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        <button
          onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
          className="h-7 px-2.5 rounded-md border border-white/[0.12] text-[11px] font-medium text-white/50 hover:text-white/80 hover:border-white/25 transition-colors whitespace-nowrap"
        >
          {t.today2}
        </button>

        <button
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-white/30 hover:text-white hover:bg-white/[0.07] transition-colors"
        >
          <ChevronRight size={14} />
        </button>
        <div className="ml-1 flex-shrink-0">
          <UserButton
            appearance={{
              elements: { avatarBox: "w-7 h-7" },
            }}
          />
        </div>
      </div>
    </div>
  );
}
