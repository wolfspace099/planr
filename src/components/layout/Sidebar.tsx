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

export default function Sidebar() {
  const location = useLocation();
  const subjects = useQuery(api.lessons.getSubjects);

  return (
    <aside className="w-56 h-screen bg-sidebar flex flex-col flex-shrink-0 fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <span className="text-white font-semibold text-lg tracking-tight">
          planr
        </span>
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
                "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors",
                active
                  ? "bg-white/10 text-white"
                  : "text-sidebar-text hover:text-white hover:bg-white/5"
              )}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </NavLink>
          );
        })}

        {/* Subjects divider */}
        {subjects && subjects.length > 0 && (
          <div className="pt-4 pb-1 px-3">
            <span className="text-xs font-medium text-sidebar-text/60 uppercase tracking-wider">
              Subjects
            </span>
          </div>
        )}
        {subjects?.map((subject) => (
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
      <div className="px-4 py-4 border-t border-sidebar-border flex items-center justify-between">
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
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-7 h-7",
            },
          }}
        />
      </div>
    </aside>
  );
}
