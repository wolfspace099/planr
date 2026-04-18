import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      <Sidebar collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} />
      <main className={collapsed ? "ml-16 flex-1 overflow-y-auto transition-all duration-200" : "ml-56 flex-1 overflow-y-auto transition-all duration-200"}>
        <div className="mx-auto w-full max-w-[1700px] px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
