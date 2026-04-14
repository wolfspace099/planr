import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
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
} from "lucide-react";
import clsx from "clsx";

const nav = [
  { label: "Today", to: "/", icon: LayoutDashboard, exact: true },
  { label: "Calendar", to: "/calendar", icon: Calendar },
  { label: "Notebook", to: "/notebook", icon: BookOpen },
  { label: "Homework", to: "/homework", icon: ClipboardList },
  { label: "Tasks", to: "/tasks", icon: CheckSquare },
  { label: "Tests", to: "/tests", icon: FlaskConical },
  { label: "Habits", to: "/habits", icon: Repeat2 },
  { label: "Appointments", to: "/appointments", icon: CalendarClock },
];

export default function Sidebar({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const location = useLocation();
  const subjects = useQuery(api.lessons.getSubjects);

  return (
    <aside
      className={clsx(
        "h-screen bg-sidebar flex flex-col flex-shrink-0 fixed left-0 top-0 z-30 transition-all duration-200 overflow-hidden",
        collapsed ? "w-16" : "w-56"
      )}
    >
      {/* Logo */}
      <div className={clsx(
        "flex items-center py-4 border-b border-sidebar-border transition-all duration-200",
        collapsed ? "justify-center px-2" : "justify-between px-4"
      )}>
        <span
          className={clsx(
            "inline-block text-white font-semibold tracking-tight transition-all duration-200",
            collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
          )}
        >
          planr
        </span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="rounded-full p-1.5 text-sidebar-text hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map(({ label, to, icon: Icon, exact }) => {
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
              <span
                className={clsx(
                  "inline-block truncate transition-all duration-200",
                  collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
                )}
              >
                {label}
              </span>
            </NavLink>
          );
        })}

        {/* Subjects divider */}
        {!collapsed && subjects && subjects.length > 0 && (
          <div className="pt-4 pb-1 px-3">
            <span className="text-xs font-medium text-sidebar-text/60 uppercase tracking-wider">
              Subjects
            </span>
          </div>
        )}
        {!collapsed &&
          subjects?.map((subject) => (
            <NavLink
              key={subject}
              to={`/notebook/${encodeURIComponent(subject)}`}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-2.5 px-3 py-1.5 rounded text-sm transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-sidebar-text hover:text-white hover:bg-white/5"
                )
              }
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sidebar-text/50 flex-shrink-0" />
              <span className="truncate">{subject}</span>
            </NavLink>
          ))}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-sidebar-border flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-full p-1.5 text-sidebar-text hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle theme"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <NavLink
          to="/settings"
          className={clsx(
            "p-1.5 rounded transition-colors",
            location.pathname === "/settings"
              ? "text-white"
              : "text-sidebar-text hover:text-white"
          )}
        >
          <Settings size={15} />
        </NavLink>
        <div className={clsx(collapsed ? "opacity-0 w-0" : "opacity-100")}> 
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-7 h-7",
              },
            }}
          />
        </div>
      </div>
    </aside>
  );
}
