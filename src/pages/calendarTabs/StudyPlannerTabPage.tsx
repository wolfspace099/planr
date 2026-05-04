import { StudyPlannerBoard } from "../../components/pages/calendar/StudyPlannerBoard";
import { DetailPanelState } from "./types";

export default function StudyPlannerTabPage({
  weekStart,
  onSelect,
  onQuickAdd,
}: {
  weekStart: Date;
  onSelect: (state: DetailPanelState) => void;
  onQuickAdd: () => void;
}) {
  return (
    <div className="flex-1 overflow-hidden">
      <StudyPlannerBoard weekStart={weekStart} onSelect={onSelect} onQuickAdd={onQuickAdd} />
    </div>
  );
}
