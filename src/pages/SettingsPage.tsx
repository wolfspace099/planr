import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";
import {
  RefreshCw,
  Link2,
  CheckCircle,
  AlertCircle,
  Moon,
  Sun,
  Globe,
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Settings,
} from "lucide-react";
import { useLang, type Lang } from "../i18n";
import clsx from "clsx";

const CALENDAR_COLORS = [
  "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#84CC16",
  "#F97316", "#6366F1",
];

const sectionTitleCls = "text-[11px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696] mb-2";
const cardCls = "bg-white dark:bg-[#252526] border border-[#e7e7e7] dark:border-[#2d2d30]";
const inputCls = "w-full h-8 px-2 text-[12px] bg-white dark:bg-[#1e1e1e] border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] focus:outline-none";
const btnNeutralCls = "h-8 px-3 text-[12px] border border-[#cccccc] dark:border-[#3c3c3c] bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#cccccc] hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e]";
const btnPrimaryCls = "h-8 px-3 text-[12px] bg-[#7c3aed] text-white hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed";

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-[#6c6c6c] dark:text-[#969696]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(inputCls, "mt-1")}
      />
    </label>
  );
}

function CalendarsSection() {
  const calendars = useQuery(api.calendars.getAll) ?? [];
  const createCal = useMutation(api.calendars.create);
  const removeCal = useMutation(api.calendars.remove);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(CALENDAR_COLORS[0]);
  const [isSchedule, setIsSchedule] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await createCal({ name, color, isSchedule, order: calendars.length });
    setName("");
    setColor(CALENDAR_COLORS[0]);
    setIsSchedule(false);
    setShowForm(false);
    setSaving(false);
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className={sectionTitleCls}>Agenda's</h2>
        <button type="button" onClick={() => setShowForm((v) => !v)} className={btnNeutralCls}>
          <span className="inline-flex items-center gap-1"><Plus size={12} /> Nieuwe agenda</span>
        </button>
      </div>

      {calendars.length > 0 && (
        <div className="space-y-2 mb-3">
          {calendars.map((cal) => (
            <div key={cal._id} className={clsx(cardCls, "p-3 flex items-center gap-3")}>
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#333333] dark:text-[#cccccc] truncate">{cal.name}</p>
                {cal.isSchedule && <p className="text-[10px] text-[#6c6c6c] dark:text-[#969696]">Roosteragenda</p>}
              </div>
              <button
                type="button"
                onClick={() => removeCal({ id: cal._id })}
                className="text-[#a31515] dark:text-[#f48771] hover:opacity-80"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {calendars.length === 0 && !showForm && (
        <div className={clsx(cardCls, "p-4 text-center text-[12px] text-[#6c6c6c] dark:text-[#969696]")}>
          <CalendarIcon size={18} className="mx-auto mb-2 text-[#7c7c7c]" />
          Nog geen agenda's.
        </div>
      )}

      {showForm && (
        <div className={clsx(cardCls, "p-4 space-y-3")}>
          <Field label="Naam" value={name} onChange={setName} placeholder="bijv. Persoonlijk" />
          <div>
            <p className="text-[11px] text-[#6c6c6c] dark:text-[#969696] mb-1">Kleur</p>
            <div className="flex flex-wrap gap-2">
              {CALENDAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={clsx("w-6 h-6 rounded-full border", color === c ? "border-[#333333]" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-[12px] text-[#333333] dark:text-[#cccccc]">
            <input type="checkbox" checked={isSchedule} onChange={(e) => setIsSchedule(e.target.checked)} />
            Dit is een roosteragenda
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className={btnNeutralCls}>Annuleren</button>
            <button type="button" onClick={handleCreate} disabled={!name.trim() || saving} className={btnPrimaryCls}>
              {saving ? "Aanmaken..." : "Aanmaken"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function SettingsPage({ embedded = false }: { embedded?: boolean }) {
  const { user } = useUser();
  const settings = useQuery(api.userSettings.get);
  const upsert = useMutation(api.userSettings.upsert);
  const syncCalendar = useAction(api.ical.syncCalendar);
  const { t, lang, setLang } = useLang();

  const [externalAppCode, setExternalAppCode] = useState("");
  const [zermeloSchool, setZermeloSchool] = useState("");
  const [zermeloUsername, setZermeloUsername] = useState("");
  const [zermeloPassword, setZermeloPassword] = useState("");
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
  const currentSchool = settings?.zermeloSchool ?? "";
  const currentUsername = settings?.zermeloUsername ?? "";

  const handleSaveUrl = async () => {
    await upsert({
      externalAppCode: externalAppCode || currentCode,
      zermeloSchool: zermeloSchool || currentSchool,
      zermeloUsername: zermeloUsername || currentUsername,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
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
          ? `${result.count} lessen gesynchroniseerd (week ${result.week}, ±4 weken).`
          : `Synced ${result.count} lessons (week ${result.week}, +/-4 weeks).`,
      );
    } catch (e: any) {
      setSyncError(e.message ?? "Sync mislukt");
    } finally {
      setSyncing(false);
    }
  };

  const handleLoginSync = async () => {
    const school = zermeloSchool || currentSchool;
    const username = zermeloUsername || currentUsername;
    const password = zermeloPassword;
    if (!school || !username || !password) return;
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const result = await syncCalendar({
        zermeloSchool: school,
        zermeloUsername: username,
        zermeloPassword: password,
      });
      setZermeloPassword("");
      setSyncResult(
        lang === "nl"
          ? `${result.count} lessen gesynchroniseerd (week ${result.week}, ±4 weken).`
          : `Synced ${result.count} lessons (week ${result.week}, +/-4 weeks).`,
      );
    } catch (e: any) {
      setSyncError(e.message ?? "Sync mislukt");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className={clsx(embedded ? "p-4 md:p-5" : "mx-auto w-full max-w-[1100px] px-4 py-6 md:px-8 md:py-8")}>
      <div className="flex items-center h-[28px] px-3 mb-4 bg-[#f3f3f3] dark:bg-[#252526] border border-[#e7e7e7] dark:border-[#1e1e1e]">
        <Settings size={12} className="text-[#7c3aed] mr-2" />
        <span className="text-[11px] uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]">Settings</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-4">
        <section className={clsx(cardCls, "p-4") }>
          <h2 className={sectionTitleCls}>{t.account}</h2>
          <div className="flex items-center gap-3">
            {user?.imageUrl && <img src={user.imageUrl} className="w-9 h-9 rounded-full" />}
            <div>
              <p className="text-[12px] font-semibold text-[#333333] dark:text-[#cccccc]">{user?.fullName}</p>
              <p className="text-[11px] text-[#6c6c6c] dark:text-[#969696]">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
        </section>

        <section className={clsx(cardCls, "p-4") }>
          <h2 className={sectionTitleCls}>{t.appearance}</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-semibold text-[#333333] dark:text-[#cccccc]">{t.darkMode}</p>
              <p className="text-[11px] text-[#6c6c6c] dark:text-[#969696]">{t.darkModeDesc}</p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className={clsx("relative inline-flex items-center h-8 w-14 rounded-full transition-colors", theme === "dark" ? "bg-[#7c3aed]" : "bg-[#cfcfcf]")}
            >
              <span className={clsx("inline-flex items-center justify-center h-7 w-7 rounded-full bg-white shadow transition-transform", theme === "dark" ? "translate-x-6" : "translate-x-0.5")}>
                {theme === "dark" ? <Moon size={13} className="text-[#7c3aed]" /> : <Sun size={13} className="text-[#f59e0b]" />}
              </span>
            </button>
          </div>
        </section>

        <section className={clsx(cardCls, "p-4") }>
          <h2 className={sectionTitleCls}>{t.language}</h2>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-[#6c6c6c] dark:text-[#969696]" />
              <p className="text-[12px] text-[#333333] dark:text-[#cccccc]">{t.languageDesc}</p>
            </div>
            <div className="flex border border-[#cccccc] dark:border-[#3c3c3c]">
              {(["nl", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLang(l)}
                  className={clsx("px-3 h-8 text-[11px] font-semibold", lang === l ? "bg-[#7c3aed] text-white" : "bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#cccccc]")}
                >
                  {l === "nl" ? "NL" : "EN"}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={clsx(cardCls, "p-4 xl:col-span-2") }>
          <h2 className={sectionTitleCls}>{t.zermeloCalendar}</h2>
          <p className="text-[11px] text-[#6c6c6c] dark:text-[#969696] mb-3">{t.zermeloDesc} <em>{t.zermeloDescLink}</em>.</p>
          <p className="text-[11px] text-[#6c6c6c] dark:text-[#969696] mb-3 inline-flex items-center gap-1.5">
            <RefreshCw size={11} className="text-[#7c3aed]" /> {t.autoSyncNote}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="School" value={zermeloSchool || currentSchool} onChange={setZermeloSchool} placeholder="bijv. tabor" />
            <Field label="Gebruikersnaam" value={zermeloUsername || currentUsername} onChange={setZermeloUsername} placeholder="leerlingnummer" />
          </div>
          <div className="mt-3">
            <Field label="Wachtwoord" type="password" value={zermeloPassword} onChange={setZermeloPassword} placeholder="Wordt niet opgeslagen" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Link2 size={13} className="text-[#6c6c6c] dark:text-[#969696] flex-shrink-0" />
            <input
              value={externalAppCode || currentCode}
              onChange={(e) => setExternalAppCode(e.target.value)}
              placeholder="schoolnaam:koppelcode"
              className={inputCls}
            />
          </div>

          {(settings?.lastScheduleSync || settings?.lastIcalSync) && (
            <p className="mt-2 text-[11px] text-[#6c6c6c] dark:text-[#969696]">
              {t.lastSynced}: {format(new Date(settings?.lastScheduleSync ?? settings!.lastIcalSync!), "d MMM yyyy, HH:mm")}
            </p>
          )}

          {syncResult && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#15803d]">
              <CheckCircle size={12} /> {syncResult}
            </div>
          )}
          {syncError && (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-[#b42318]">
              <AlertCircle size={12} /> {syncError}
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={handleSaveUrl} className={btnNeutralCls}>{saved ? t.saved : t.saveUrl}</button>
            <button
              type="button"
              onClick={handleLoginSync}
              disabled={syncing || !(zermeloPassword && (zermeloSchool || currentSchool) && (zermeloUsername || currentUsername))}
              className={clsx(btnNeutralCls, "disabled:opacity-50 disabled:cursor-not-allowed")}
            >
              {syncing ? "Inloggen..." : "Inloggen + sync"}
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing || (!externalAppCode && !currentCode)}
              className={btnPrimaryCls}
            >
              <span className="inline-flex items-center gap-1">
                <RefreshCw size={12} className={syncing ? "animate-spin" : ""} />
                {syncing ? t.syncing : t.syncNow}
              </span>
            </button>
          </div>
        </section>

        <section className="xl:col-span-2">
          <CalendarsSection />
        </section>
      </div>
    </div>
  );
}
