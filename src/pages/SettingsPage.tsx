import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";
import { RefreshCw, Link2, CheckCircle, AlertCircle, Moon, Sun } from "lucide-react";
import { PageHeader, Input, Button } from "../components/ui/primitives";
import clsx from "clsx";

export default function SettingsPage() {
  const { user } = useUser();
  const settings = useQuery(api.userSettings.get);
  const upsert = useMutation(api.userSettings.upsert);
  const resetData = useMutation(api.userSettings.reset);
  const syncCalendar = useAction(api.ical.syncCalendar);

  const [icalUrl, setIcalUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [resetRequested, setResetRequested] = useState(false);
  const [resetInput, setResetInput] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    const initialTheme = storedTheme
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    document.documentElement.style.colorScheme = newTheme;
    localStorage.setItem("theme", newTheme);
  };

  const currentUrl = settings?.icalUrl ?? "";

  const handleSaveUrl = async () => {
    await upsert({ icalUrl: icalUrl || currentUrl });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSync = async () => {
    const url = icalUrl || currentUrl;
    if (!url) return;
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const result = await syncCalendar({
        userId: user!.id,
        icalUrl: url,
      });
      setSyncResult(`Synced ${result.count} lessons successfully.`);
    } catch (e: any) {
      setSyncError(e.message ?? "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleReset = async () => {
    setResetError(null);
    setResetSuccess(false);
    setResetting(true);
    try {
      await resetData();
      setResetSuccess(true);
      setResetRequested(false);
      setResetInput("");
    } catch (e: any) {
      setResetError(e.message ?? "Failed to reset data.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title="Settings" />

      <div className="max-w-xl space-y-8">
        {/* Profile */}
        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">Account</h2>
          <div className="p-4 bg-surface border border-border rounded-lg flex items-center gap-3">
            {user?.imageUrl && (
              <img src={user.imageUrl} className="w-9 h-9 rounded-full" />
            )}
            <div>
              <p className="font-medium text-sm text-ink">{user?.fullName}</p>
              <p className="text-xs text-ink-muted">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </section>

        {/* Theme */}
        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">Appearance</h2>
          <div className="p-4 bg-surface border border-border rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-ink">Dark mode</p>
              <p className="text-xs text-ink-muted mt-1">Switch between light and dark theme</p>
            </div>
            <button
              onClick={toggleTheme}
              className={clsx(
                "relative inline-flex items-center h-8 w-14 rounded-full transition-colors",
                theme === "dark" ? "bg-accent" : "bg-border-strong"
              )}
            >
              <span className={clsx(
                "inline-flex items-center justify-center h-7 w-7 rounded-full bg-white shadow transition-transform",
                theme === "dark" ? "translate-x-6" : "translate-x-0.5"
              )}>
                {theme === "dark" ? <Moon size={14} className="text-accent" /> : <Sun size={14} className="text-yellow-500" />}
              </span>
            </button>
          </div>
        </section>

        {/* iCal sync */}
        <section>
          <h2 className="text-sm font-semibold text-ink mb-1">Zermelo calendar</h2>
          <p className="text-xs text-ink-muted mb-3">
            Paste your iCal URL from Zermelo. You can find it in Zermelo under{" "}
            <em>Settings → Calendar → iCal link</em>.
          </p>

          <div className="p-4 bg-surface border border-border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Link2 size={14} className="text-ink-muted flex-shrink-0" />
              <Input
                className="flex-1"
                value={icalUrl || currentUrl}
                onChange={(e) => setIcalUrl(e.target.value)}
                placeholder="https://your-school.zermelo.nl/api/v3/feed/ical/…"
              />
            </div>

            {settings?.lastIcalSync && (
              <p className="text-xs text-ink-light">
                Last synced: {format(new Date(settings.lastIcalSync), "d MMM yyyy, HH:mm")}
              </p>
            )}

            {syncResult && (
              <div className="flex items-center gap-2 text-xs text-success">
                <CheckCircle size={13} /> {syncResult}
              </div>
            )}
            {syncError && (
              <div className="flex items-center gap-2 text-xs text-danger">
                <AlertCircle size={13} /> {syncError}
              </div>
            )}

            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleSaveUrl}>
                {saved ? "Saved ✓" : "Save URL"}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSync}
                disabled={syncing || (!icalUrl && !currentUrl)}
              >
                <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                {syncing ? "Syncing…" : "Sync now"}
              </Button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink mb-1">Danger zone</h2>
          <p className="text-xs text-ink-muted mb-3">
            This will delete all your school data from the app, including lessons, notes, homework, tasks, tests, appointments, habits, and calendar imports. Your Clerk account will not be deleted.
          </p>

          <div className="p-4 bg-surface border border-border rounded-lg space-y-4">
            {!resetRequested ? (
              <Button size="sm" variant="danger" onClick={() => setResetRequested(true)}>
                Reset all app data
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-ink">
                  Type <strong>RESET</strong> and confirm to delete your data.
                </p>
                <Input
                  value={resetInput}
                  onChange={(e) => setResetInput(e.target.value)}
                  placeholder="Type RESET to confirm"
                />
                {resetError && (
                  <div className="text-xs text-danger">{resetError}</div>
                )}
                {resetSuccess && (
                  <div className="text-xs text-success">All app data was deleted successfully.</div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleReset}
                    disabled={resetInput !== "RESET" || resetting}
                  >
                    {resetting ? "Resetting…" : "Confirm reset"}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => {
                    setResetRequested(false);
                    setResetInput("");
                    setResetError(null);
                    setResetSuccess(false);
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
