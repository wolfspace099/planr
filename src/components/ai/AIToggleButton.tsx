import { Sparkles } from "lucide-react";
import clsx from "clsx";
import { useAIPanel } from "./AIPanelProvider";

export function AIToggleButton({ className }: { className?: string }) {
  const { open, toggle } = useAIPanel();
  return (
    <button
      type="button"
      onClick={toggle}
      title="AI assistent"
      aria-label="AI assistent"
      aria-pressed={open}
      className={clsx(
        "h-[22px] px-2 mr-1 flex items-center gap-1 text-[11px] font-medium border focus:outline-none transition-colors",
        open
          ? "bg-[#7c3aed] text-white border-[#7c3aed]"
          : "bg-white dark:bg-[#252526] text-[#7c3aed] border-[#cccccc] dark:border-[#454545] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]",
        className,
      )}
    >
      <Sparkles size={11} strokeWidth={2.25} />
      <span className="uppercase tracking-wide">AI</span>
    </button>
  );
}
