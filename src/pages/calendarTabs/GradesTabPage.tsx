import { BarChart3 } from "lucide-react";

export default function GradesTabPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#1e1e1e] text-[#6c6c6c] dark:text-[#969696]">
      <div className="text-center">
        <BarChart3 size={18} className="mx-auto mb-2 text-[#7c3aed]" />
        <p className="text-[12px]">Cijfers pagina volgt binnenkort.</p>
      </div>
    </div>
  );
}
