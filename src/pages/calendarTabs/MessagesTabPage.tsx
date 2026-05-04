import { MessageSquare } from "lucide-react";

export default function MessagesTabPage() {
  return (
    <div className="flex-1 flex items-center justify-center bg-white dark:bg-[#1e1e1e] text-[#6c6c6c] dark:text-[#969696]">
      <div className="text-center">
        <MessageSquare size={18} className="mx-auto mb-2 text-[#7c3aed]" />
        <p className="text-[12px]">Berichten pagina volgt binnenkort.</p>
      </div>
    </div>
  );
}
