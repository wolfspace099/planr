import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import clsx from "clsx";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const isFullScreen =
    location.pathname.startsWith("/calendar") ||
    location.pathname.startsWith("/ink");

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((value) => !value)}
      />

      <main
        className={clsx(
          collapsed ? "ml-16" : "ml-56",
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