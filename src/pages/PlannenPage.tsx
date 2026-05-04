import { PlannenContent } from "../components/pages/plannen/PlannenContent";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { Calendar } from "lucide-react";

export default function PlannenPage() {
  const now = new Date();

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#cccccc]">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center h-[30px] bg-[#dddddd] dark:bg-[#3c3c3c] border-b border-[#cccccc] dark:border-[#252526] select-none">
        <div className="flex items-center gap-2 px-3 w-56 flex-shrink-0">
          <Calendar size={13} className="text-[#7c3aed]" strokeWidth={2} />
          <span className="text-[12px] font-normal text-[#333333] dark:text-[#cccccc]">plannen</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1.5 px-2 h-[22px] bg-white dark:bg-[#252526] border border-[#cccccc] dark:border-[#1e1e1e] min-w-[280px] justify-center">
            <span className="h-1.5 w-1.5 rounded-full bg-[#7c3aed]" />
            <span className="text-[12px] text-[#333333] dark:text-[#cccccc] tabular-nums">
              plannen — {format(now, "EEE d MMM yyyy", { locale: nl })}
            </span>
          </div>
        </div>
        <div className="w-56 flex-shrink-0" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <PlannenContent />
      </div>
    </div>
  );
}
