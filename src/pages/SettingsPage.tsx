import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { format } from "date-fns";
import { RefreshCw, Link2, CheckCircle, AlertCircle } from "lucide-react";
import { PageHeader, Input, Button } from "../components/ui/primitives";

export default function SettingsPage() {
  const { user } = useUser();
  const settings = useQuery(api.userSettings.get);
  const upsert = useMutation(api.userSettings.upsert);
  const syncCalendar = useAction(api.ical.syncCalendar);

  const [icalUrl, setIcalUrl] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

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
      </div>
    </div>
  );
}
