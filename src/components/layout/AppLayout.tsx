import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Calendar manages its own navigation sidebar — hide the global one entirely
  const isCalendar = location.pathname.startsWith("/calendar");
  const isFullScreen = isCalendar || location.pathname.startsWith("/ink");

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {!isCalendar && (
        <Sidebar
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((value) => !value)}
        />
      )}

      <main
        className={clsx(
          !isCalendar && (collapsed ? "ml-16" : "ml-56"),
          "flex-1 transition-all duration-200",
          isFullScreen ? "overflow-hidden" : "overflow-y-auto"
        )}
      >
        {isFullScreen ? (
          <Outlet />
        ) : (
          <div className="mx-auto w-full max-w-[1700px] px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        )}
      </main>
    </div>
  );
}