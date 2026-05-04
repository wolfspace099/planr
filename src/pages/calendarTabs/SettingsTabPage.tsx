import SettingsPage from "../SettingsPage";

export default function SettingsTabPage() {
  return (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
      <SettingsPage embedded />
    </div>
  );
}
