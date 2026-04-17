import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";
import { RefreshCw, Link2, CheckCircle, AlertCircle, Moon, Sun, Globe } from "lucide-react";
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
      const result = await syncCalendar({ userId: user!.id, icalUrl: url });
      setSyncResult(lang === "nl" ? `${result.count} lessen gesynchroniseerd.` : `Synced ${result.count} lessons successfully.`);
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
        {/* Profile */}
        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">{t.account}</h2>
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
          <h2 className="text-sm font-semibold text-ink mb-3">{t.appearance}</h2>
          <div className="p-4 bg-surface border border-border rounded-lg flex items-center justify-between">
            <div>
              <p className="font-medium text-sm text-ink">{t.darkMode}</p>
              <p className="text-xs text-ink-muted mt-1">{t.darkModeDesc}</p>
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

        {/* Language */}
        <section>
          <h2 className="text-sm font-semibold text-ink mb-3">{t.language}</h2>
          <div className="p-4 bg-surface border border-border rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-ink-muted" />
              <div>
                <p className="font-medium text-sm text-ink">{t.language}</p>
                <p className="text-xs text-ink-muted mt-0.5">{t.languageDesc}</p>
              </div>
            </div>
            <div className="flex rounded-lg border border-border overflow-hidden">
              {(["nl", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={clsx(
                    "px-3 py-1.5 text-xs font-semibold transition-colors",
                    lang === l ? "bg-accent text-white" : "text-ink-muted hover:bg-border/60"
                  )}
                >
                  {l === "nl" ? "🇳🇱 NL" : "🇬🇧 EN"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* iCal sync */}
        <section>
          <h2 className="text-sm font-semibold text-ink mb-1">{t.zermeloCalendar}</h2>
          <p className="text-xs text-ink-muted mb-3">
            {t.zermeloDesc}{" "}
            <em>{t.zermeloDescLink}</em>.
          </p>
          <p className="text-xs text-ink-muted mb-3 flex items-center gap-1.5">
            <RefreshCw size={11} className="text-accent" />
            {t.autoSyncNote}
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
                onClick={handleSync}
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