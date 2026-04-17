import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";
import { RefreshCw, Link2, CheckCircle, AlertCircle, Moon, Sun, Globe, AlertTriangle } from "lucide-react";
import { PageHeader, Input, Button } from "../components/ui/primitives";
import { useLang, type Lang } from "../i18n";
import clsx from "clsx";

export default function SettingsPage() {
  const { user } = useUser();
  const settings = useQuery(api.userSettings.get);
  const upsert = useMutation(api.userSettings.upsert);
  const syncCalendar = useAction(api.ical.syncCalendar);
  const { t, lang, setLang } = useLang();

  const [icalUrl, setIcalUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showSyncWarning, setShowSyncWarning] = useState(false);

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

  const initiateSync = () => {
    const url = icalUrl || currentUrl;
    if (!url) return;
    
    // Show warning if there is already data or if it's a re-sync
    if (settings?.lastIcalSync) {
      setShowSyncWarning(true);
    } else {
      handleSync();
    }
  };

  const handleSync = async () => {
    const url = icalUrl || currentUrl;
    if (!url) return;
    
    setShowSyncWarning(false);
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    
    try {
      // The back-end action in ical.ts already handles deleting old lessons 
      // before inserting new ones from the feed.
      const result = await syncCalendar({ userId: user!.id, icalUrl: url });
      setSyncResult(lang === "nl" 
        ? `${result.count} lessen gesynchroniseerd.` 
        : `Synced ${result.count} lessons successfully.`
      );
    } catch (e: any) {
      setSyncError(e.message ?? "Sync mislukt");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader title={t.settingsTitle} />

      <div className="max-w-xl space-y-8">
        {/* ... Profile, Theme, and Language sections remain the same ... */}

        {/* iCal sync */}
        <section>
          <h2 className="text-sm font-semibold text-ink mb-1">{t.zermeloCalendar}</h2>
          <p className="text-xs text-ink-muted mb-3">
            {t.zermeloDesc} <em>{t.zermeloDescLink}</em>.
          </p>
          
          <div className="p-4 bg-surface border border-border rounded-lg space-y-3">
            {showSyncWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md mb-4">
                <div className="flex gap-2">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {lang === "nl" ? "Let op: Re-sync waarschuwing" : "Note: Re-sync warning"}
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      {lang === "nl" 
                        ? "Alle bestaande lessen worden verwijderd en opnieuw opgehaald. Onderwerpen en wijzigingen worden gereset." 
                        : "All existing lessons will be removed and fetched again. Subjects and changes will be reset."}
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="primary" onClick={handleSync}>
                        {lang === "nl" ? "Doorgaan" : "Continue"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowSyncWarning(false)}>
                        {lang === "nl" ? "Annuleren" : "Cancel"}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
                {t.lastSynced}: {format(new Date(settings.lastIcalSync), "d MMM yyyy, HH:mm")}
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
                {saved ? t.saved : t.saveUrl}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={initiateSync}
                disabled={syncing || (!icalUrl && !currentUrl)}
              >
                <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
                {syncing ? t.syncing : t.syncNow}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}