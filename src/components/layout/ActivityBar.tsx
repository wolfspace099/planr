import { Link } from "react-router-dom";
import { Home, Settings } from "lucide-react";
import clsx from "clsx";

export type CalendarTabKey = "calendar" | "studyPlanner" | "plannen" | "notebook" | "settings" | "grades" | "messages";

export const CALENDAR_TABS: { key: CalendarTabKey; label: string; icon: React.ReactNode }[] = [
  {
    key: "calendar",
    label: "Rooster",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    key: "studyPlanner",
    label: "Studiewijzer",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4V4z" />
        <path d="M4 4v12a4 4 0 004 4" />
      </svg>
    ),
  },
  {
    key: "plannen",
    label: "Plannen",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
        <path d="M16 17H8M16 13H8M16 9H8" />
      </svg>
    ),
  },
  {
    key: "notebook",
    label: "Notities",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5V4a2 2 0 012-2h10a2 2 0 012 2v15.5" />
        <path d="M4 19.5a2.5 2.5 0 002.5 2.5H20" />
        <path d="M8 7h8M8 11h8M8 15h6" />
      </svg>
    ),
  },
  {
    key: "settings",
    label: "Instellingen",
    icon: <Settings strokeWidth={1.75} />,
  },
  {
    key: "grades",
    label: "Cijfers",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12l4-9 5 18 4-12 5 6" />
      </svg>
    ),
  },
  {
    key: "messages",
    label: "Berichten",
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
      </svg>
    ),
  },
];

interface ActivityBarProps {
  homeActive?: boolean;
  activeTab?: CalendarTabKey;
  onTabChange?: (key: CalendarTabKey) => void;
}

const ITEM_BASE =
  "relative flex items-center justify-center w-12 h-12 transition-colors focus:outline-none [&_svg]:w-[22px] [&_svg]:h-[22px]";

function itemClass(active: boolean) {
  return clsx(
    ITEM_BASE,
    active
      ? "text-[#333333] dark:text-white"
      : "text-[#424242]/60 dark:text-[#858585] hover:text-[#333333] dark:hover:text-white",
  );
}

function ActiveBar() {
  return <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#7c3aed]" />;
}

export function ActivityBar({ homeActive, activeTab, onTabChange }: ActivityBarProps) {
  const mainTabs = CALENDAR_TABS.filter((tab) => tab.key !== "settings");
  const settingsTab = CALENDAR_TABS.find((tab) => tab.key === "settings");

  const renderTab = (tab: (typeof CALENDAR_TABS)[number]) => {
    const active = activeTab === tab.key;
    const className = itemClass(active);
    const inner = (
      <>
        {active && <ActiveBar />}
        {tab.icon}
      </>
    );

    if (onTabChange) {
      return (
        <button
          key={tab.key}
          type="button"
          onClick={() => onTabChange(tab.key)}
          title={tab.label}
          aria-label={tab.label}
          className={className}
        >
          {inner}
        </button>
      );
    }

    return (
      <Link
        key={tab.key}
        to={`/calendar?tab=${tab.key}`}
        title={tab.label}
        aria-label={tab.label}
        className={className}
      >
        {inner}
      </Link>
    );
  };

  return (
    <aside className="flex-shrink-0 w-12 bg-[#dddddd] dark:bg-[#333333] border-r border-[#cccccc] dark:border-[#252526] flex flex-col py-1 select-none">
      <Link to="/" title="Home" aria-label="Home" className={itemClass(!!homeActive)}>
        {homeActive && <ActiveBar />}
        <Home strokeWidth={1.75} />
      </Link>
      <div className="mx-2 my-1 border-t border-[#cccccc] dark:border-[#2d2d30]" />
      {mainTabs.map(renderTab)}
      <div className="mt-auto" />
      {settingsTab && (
        <>
          <div className="mx-2 my-1 border-t border-[#cccccc] dark:border-[#2d2d30]" />
          {renderTab(settingsTab)}
        </>
      )}
    </aside>
  );
}
