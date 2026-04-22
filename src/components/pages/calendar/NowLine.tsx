import { isToday } from "date-fns";
import { useEffect, useState } from "react";

const hour_height = 68;
const start_hour  = 7;
const end_hour    = 23;

export function NowLine({ days }: { days: Date[] }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const todayIdx = days.findIndex((d) => isToday(d));
  if (todayIdx === -1) return null;
  const h = now.getHours() + now.getMinutes() / 60;
  if (h < start_hour || h >= end_hour) return null;
  const top = (h - start_hour) * hour_height;
  const leftPct = (todayIdx / 5) * 100;
  const widthPct = ((5 - todayIdx) / 5) * 100;
  return (
    <div className="absolute z-30 pointer-events-none flex items-center"
      style={{ top: top - 1, left: `${leftPct}%`, width: `${widthPct}%` }}>
      <div className="w-2.5 h-2.5 rounded-full bg-white flex-shrink-0 -ml-1.5 shadow-sm" />
      <div className="flex-1 h-[2px] bg-white opacity-80" />
    </div>
  );
}