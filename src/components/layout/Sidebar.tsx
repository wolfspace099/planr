import { NavLink, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  ClipboardList,
  CheckSquare,
  FlaskConical,
  Repeat2,
  CalendarClock,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { useLang } from "../../i18n";

export default function Sidebar({
  collapsed: _ignored,
  onToggleCollapsed: _ignoredCb,
}: {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}) {
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();
  const { t } = useLang();

  const navSections = [
    {
      label: t.planner,
      items: [
        { label: t.today, to: "/", icon: LayoutDashboard, exact: true },
        { label: t.calendar, to: "/calendar", icon: Calendar },
        { label: t.notebook, to: "/notebook", icon: BookOpen },
      ],
    },
    {
      label: t.school,
      items: [
        { label: t.homework, to: "/homework", icon: ClipboardList },
        { label: t.tasks, to: "/tasks", icon: CheckSquare },
        { label: t.tests, to: "/tests", icon: FlaskConical },
        { label: t.study, to: "/study", icon: GraduationCap },
        { label: t.habits, to: "/habits", icon: Repeat2 },
        { label: t.appointments, to: "/appointments", icon: CalendarClock },
      ],
    },
  ];

  return (
    <aside
      className={clsx(
        "h-screen bg-sidebar flex flex-col flex-shrink-0 fixed left-0 top-0 z-30 transition-all duration-200 overflow-hidden",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo + toggle */}
      <div className={clsx(
        "flex items-center py-4 border-b border-sidebar-border transition-all duration-200",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        {!collapsed && (
          <span className="text-white font-semibold tracking-tight">
            planr
          </span>
        )}
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="rounded-full p-1.5 text-sidebar-text hover:text-white hover:bg-white/10 transition-colors flex-shrink-0 cursor-pointer"
          aria-label={collapsed ? "Sidebar uitklappen" : "Sidebar inklappen"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-2">
        {navSections.map((section) => (
          <div key={section.label} className="space-y-1">
            {!collapsed && (
              <div className="px-3 text-[10px] uppercase tracking-wider text-sidebar-text/60 font-semibold">
                {section.label}
              </div>
            )}
            {section.items.map(({ label, to, icon: Icon, exact }) => {
              const active = exact
                ? location.pathname === to
                : location.pathname.startsWith(to);
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={clsx(
                    "flex items-center",
                    collapsed ? "justify-center px-2 py-3" : "gap-2.5 px-3 py-2",
                    "rounded text-sm transition-colors",
                    active
                      ? "bg-white/10 text-white"
                      : "text-sidebar-text hover:text-white hover:bg-white/5"
                  )}
                >
                  <Icon size={15} strokeWidth={1.75} />
                  {!collapsed && (
                    <span className="truncate">{label}</span>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className={clsx(
        "py-4 border-t border-sidebar-border flex items-center gap-2",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <NavLink
          to="/settings"
          className={clsx(
            "p-1.5 rounded transition-colors flex-shrink-0",
            location.pathname === "/settings"
              ? "text-white"
              : "text-sidebar-text hover:text-white"
          )}
        >
          <Settings size={15} />
        </NavLink>
        {!collapsed && (
          <UserButton
            appearance={{
              elements: { avatarBox: "w-7 h-7" },
            }}
          />
        )}
      </div>
    </aside>
  );
}