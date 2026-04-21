import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";
import { RefreshCw, Link2, CheckCircle, AlertCircle, Moon, Sun, Globe, Plus, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { PageHeader, Input, Button } from "../components/ui/primitives";
import { useLang, type Lang } from "../i18n";
import clsx from "clsx";

const CALENDAR_COLORS = [
  "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#84CC16",
  "#F97316", "#6366F1",
];

function CalendarsSection() {
  const calendars = useQuery(api.calendars.getAll) ?? [];
  const createCal = useMutation(api.calendars.create);
  const removeCal = useMutation(api.calendars.remove);
  const updateCal = useMutation(api.calendars.update);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CALENDAR_COLORS[0]);
  const [isSchedule, setIsSchedule] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await createCal({ name, color, isSchedule, order: calendars.length });
    setName(""); setColor(CALENDAR_COLORS[0]); setIsSchedule(false);
    setShowForm(false); setSaving(false);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-ink">Agenda's</h2>
        <Button size="sm" variant="secondary" onClick={() => setShowForm((v) => !v)}>
          <Plus size={13} /> Nieuwe agenda
        </Button>
      </div>

      {/* Existing calendars */}
      {calendars.length > 0 && (
        <div className="space-y-2 mb-4">
          {calendars.map((cal) => (
            <div key={cal._id} className="p-3 bg-surface border border-border rounded-lg flex items-center gap-3">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{cal.name}</p>
                {cal.isSchedule && <p className="text-xs text-ink-muted">Rooster</p>}
              </div>
              <button onClick={() => removeCal({ id: cal._id })}
                className="p-1.5 text-ink-muted hover:text-danger transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {calendars.length === 0 && !showForm && (
        <div className="p-4 bg-surface border border-border rounded-lg text-center">
          <CalendarIcon size={20} className="text-ink-muted mx-auto mb-2" />
          <p className="text-sm text-ink-muted">Nog geen agenda's aangemaakt.</p>
          <p className="text-xs text-ink-light mt-1">Maak een agenda aan om afspraken te organiseren.</p>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="p-4 bg-surface border border-border rounded-lg space-y-3">
          <Input label="Naam" value={name} onChange={(e) => setName(e.target.value)} placeholder="bijv. Persoonlijk, Sport, School" autoFocus />
          <div>
            <label className="text-xs font-medium text-ink-muted block mb-1.5">Kleur</label>
            <div className="flex gap-2 flex-wrap">
              {CALENDAR_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={clsx("w-6 h-6 rounded-full transition-all", color === c && "ring-2 ring-offset-2 ring-offset-surface")}
                  style={{ backgroundColor: c, ...(color === c ? { ringColor: c } as any : {}) }} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isSchedule} onChange={(e) => setIsSchedule(e.target.checked)}
                className="rounded" />
              <span className="text-sm text-ink">Dit is een rooster / lesrooster</span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowForm(false)}>Annuleren</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!name.trim() || saving}>
              {saving ? "Aanmaken…" : "Aanmaken"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function SettingsPage() {
  const { user } = useUser();
  const settings = useQuery(api.userSettings.get);
  const upsert = useMutation(api.userSettings.upsert);
  const syncCalendar = useAction(api.ical.syncCalendar);
  const { t, lang, setLang } = useLang();

  const [externalAppCode, setExternalAppCode] = useState("");
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

  const currentCode = settings?.externalAppCode ?? "";

  const handleSaveUrl = async () => {
    await upsert({ externalAppCode: externalAppCode || currentCode });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSync = async () => {
    const code = externalAppCode || currentCode;
    if (!code) return;
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const result = await syncCalendar({ externalAppCode: code });
      setSyncResult(
        lang === "nl"
          ? `${result.count} lessen gesynchroniseerd (week ${result.week}).`
          : `Synced ${result.count} lessons (week ${result.week}).`
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

        {/* Calendars */}
        <CalendarsSection />

        {/* Zermelo live sync */}
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
                value={externalAppCode || currentCode}
                onChange={(e) => setExternalAppCode(e.target.value)}
                placeholder="schoolnaam:extern_app_code"
              />
            </div>

            {(settings?.lastScheduleSync || settings?.lastIcalSync) && (
              <p className="text-xs text-ink-light">
                {t.lastSynced}: {format(new Date(settings?.lastScheduleSync ?? settings!.lastIcalSync!), "d MMM yyyy, HH:mm")}
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
                disabled={syncing || (!externalAppCode && !currentCode)}
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
