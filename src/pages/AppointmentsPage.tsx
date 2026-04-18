import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format, isFuture, isPast } from "date-fns";
import { Plus, Trash2, MapPin, Calendar as CalendarIcon, Clock, X, Check } from "lucide-react";
import { PageHeader, Modal, Input, Textarea, Button } from "../components/ui/primitives";
import { useLang } from "../i18n";
import clsx from "clsx";

const CALENDAR_COLORS = [
  "#8B5CF6", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#06B6D4", "#84CC16",
  "#F97316", "#6366F1",
];

function CreateModal({ open, onClose, calendars }: { open: boolean; onClose: () => void; calendars: any[] }) {
  const create = useMutation(api.misc.createAppointment);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [calendarId, setCalendarId] = useState("");
  const [done, setDone] = useState(false);

  const reset = () => { setTitle(""); setDesc(""); setLocation(""); setDate(format(new Date(), "yyyy-MM-dd")); setStartTime("09:00"); setEndTime("10:00"); setCalendarId(""); setDone(false); };

  const submit = async () => {
    if (!title.trim()) return;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(date); start.setHours(sh, sm, 0, 0);
    const end   = new Date(date); end.setHours(eh, em, 0, 0);
    const cal = calendars.find((c) => c._id === calendarId);
    await create({
      title, description: desc || undefined, location: location || undefined,
      startTime: start.getTime(), endTime: end.getTime(),
      isRecurring: false,
      color: cal?.color ?? "#8B5CF6",
      calendarId: calendarId ? calendarId as any : undefined,
    });
    setDone(true);
    setTimeout(() => { reset(); onClose(); }, 800);
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Afspraak aanmaken">
      <div className="space-y-3">
        {done ? (
          <div className="flex items-center gap-2 text-success py-2"><Check size={16} /> Aangemaakt</div>
        ) : (
          <>
            <Input label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Naam van de afspraak" autoFocus />
            <div>
              <label className="text-xs font-medium text-ink-muted block mb-1">Datum</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded border border-border bg-bg text-sm text-ink focus:outline-none focus:border-accent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Start</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-sm text-ink focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Einde</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-border bg-bg text-sm text-ink focus:outline-none focus:border-accent" />
              </div>
            </div>
            <Input label="Locatie (optioneel)" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="bijv. Lokaal 3A" />
            <Textarea label="Omschrijving (optioneel)" value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} />
            {calendars.filter((c) => !c.isSchedule).length > 0 && (
              <div>
                <label className="text-xs font-medium text-ink-muted block mb-1">Agenda</label>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setCalendarId("")}
                    className={clsx("flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors",
                      !calendarId ? "bg-ink text-white border-ink" : "border-border text-ink-muted hover:border-border-strong")}>
                    Geen
                  </button>
                  {calendars.filter((c) => !c.isSchedule).map((cal) => (
                    <button key={cal._id} onClick={() => setCalendarId(cal._id)}
                      className={clsx("flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border transition-colors",
                        calendarId === cal._id ? "border-transparent text-white" : "border-border text-ink-muted hover:border-border-strong")}
                      style={calendarId === cal._id ? { backgroundColor: cal.color } : {}}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                      {cal.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" onClick={() => { reset(); onClose(); }}>Annuleren</Button>
              <Button variant="primary" onClick={submit} disabled={!title.trim()}>Aanmaken</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function AppointmentsPage() {
  const { t } = useLang();
  const appointments = useQuery(api.misc.getAppointments) ?? [];
  const calendars    = useQuery(api.calendars.getAll) ?? [];
  const deleteAppt   = useMutation(api.misc.deleteAppointment);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  const filtered = appointments.filter((a) => {
    if (filter === "all") return true;
    if (filter === "upcoming") return isFuture(new Date(a.startTime));
    if (filter === "past") return isPast(new Date(a.startTime ?? 0));
    return a.calendarId === filter;
  }).sort((a, b) => a.startTime - b.startTime);

  const getCalendar = (id?: string) => id ? calendars.find((c) => c._id === id) : null;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title={t.appointments}
        actions={
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <Plus size={13} /> Afspraak
          </Button>
        }
      />

      <div className="w-full max-w-5xl space-y-5">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: "all", label: "Alles" },
            { key: "upcoming", label: "Aankomend" },
            { key: "past", label: "Voorbij" },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className={clsx("px-3 py-1.5 text-xs rounded-full border transition-colors",
                filter === key ? "bg-accent text-white border-accent" : "border-border text-ink-muted hover:border-border-strong")}>
              {label}
            </button>
          ))}
          {calendars.filter((c) => !c.isSchedule).map((cal) => (
            <button key={cal._id} onClick={() => setFilter(cal._id)}
              className={clsx("flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-colors",
                filter === cal._id ? "border-transparent text-white" : "border-border text-ink-muted hover:border-border-strong")}
              style={filter === cal._id ? { backgroundColor: cal.color } : {}}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
              {cal.name}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-border rounded-xl">
            <CalendarIcon size={24} className="text-ink-muted mx-auto mb-2" />
            <p className="text-sm text-ink-muted">Geen afspraken gevonden.</p>
            <p className="text-xs text-ink-light mt-1">Klik op "+ Afspraak" om een afspraak aan te maken, of klik op de kalender om direct in te plannen.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((a) => {
              const cal = getCalendar(a.calendarId);
              const color = cal?.color ?? a.color ?? "#6B7280";
              const isPastAppt = a.startTime && isPast(new Date(a.startTime));
              return (
                <div key={a._id}
                  className={clsx("p-4 bg-surface border border-border rounded-xl flex items-start gap-3 transition-colors hover:border-border-strong",
                    isPastAppt && "opacity-60")}
                  style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">{a.title}</p>
                      {cal && (
                        <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 text-white"
                          style={{ backgroundColor: color }}>
                          {cal.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {a.startTime && (
                        <span className="text-xs text-ink-muted flex items-center gap-1">
                          <CalendarIcon size={10} />
                          {format(new Date(a.startTime), "EEE d MMM")}
                        </span>
                      )}
                      {a.startTime && (
                        <span className="text-xs text-ink-muted flex items-center gap-1">
                          <Clock size={10} />
                          {format(new Date(a.startTime), "HH:mm")}
                          {a.endTime && ` – ${format(new Date(a.endTime), "HH:mm")}`}
                        </span>
                      )}
                      {a.location && (
                        <span className="text-xs text-ink-muted flex items-center gap-1">
                          <MapPin size={10} />{a.location}
                        </span>
                      )}
                    </div>
                    {a.description && <p className="text-xs text-ink-muted mt-1">{a.description}</p>}
                  </div>
                  <button onClick={() => deleteAppt({ id: a._id })}
                    className="p-1.5 text-ink-muted hover:text-danger transition-colors flex-shrink-0 mt-0.5">
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateModal open={showCreate} onClose={() => setShowCreate(false)} calendars={calendars} />
    </div>
  );
}
