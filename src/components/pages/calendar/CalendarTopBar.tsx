import { ChevronLeft, ChevronRight } from "lucide-react";
import { addWeeks, getISOWeek, startOfWeek, subWeeks } from "date-fns";
import clsx from "clsx";
import { useLang } from "../../../i18n";

export type CalendarTab = "calendar" | "studyPlanner" | "grades" | "messages" | "notebook";

export function CalendarTopBar({weekStart, setWeekStart, activeTab, setActiveTab, }: {
  weekStart: Date;
  setWeekStart: (d: Date) => void;
  activeTab: CalendarTab;
  setActiveTab: (t: CalendarTab) => void;
}) {
  const { t } = useLang();
  const weekNumber = getISOWeek(weekStart);

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

  return (
    <div className="flex-shrink-0 flex items-center h-11 bg-[#111111] border-b border-white/[0.07] px-4 gap-4">
      <span className="text-white font-semibold tracking-tight text-sm w-44 flex-shrink-0">planr</span>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={clsx(
                  "relative flex items-center gap-1.5 px-3 h-11 text-[12.5px] font-medium transition-colors",
                  active ? "text-white" : "text-white/40 hover:text-white/70"
                )}
              >
                <span className={clsx("transition-colors", active ? "text-white" : "text-white/35")}>
                  {tab.icon}
                </span>
                {tab.label}
                {/* Active underline */}
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-1.5 w-44 flex-shrink-0 justify-end">
        <span className="text-[12px] font-semibold text-white/50 tabular-nums mr-2 whitespace-nowrap">
          Week  {weekNumber}
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
      </div>
    </div>
  );
}
