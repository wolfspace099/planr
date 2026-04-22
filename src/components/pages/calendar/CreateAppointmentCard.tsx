import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useEffect } from "react";

export function CreateAppointmentCard({
  open,
  onClose,
  initialDate,
  initialHour,
  calendars,
}: {
  open: boolean;
  onClose: () => void;
  initialDate: Date | null;
  initialHour: number;
  calendars: any[];
}) {
  const create = useMutation(api.misc.createAppointment);

  const defaultCal = calendars.find((c) => !c.isSchedule);

  const [draft, setDraft] = useState<null | {
    title: string;
    start: number;
    end: number;
    calendarId: string;
    color: string;
  }>(null);

  const slotMinutes = 15;

  const snapMinutes = (mins: number) =>
    Math.round(mins / slotMinutes) * slotMinutes;

  const buildDate = (day: Date, mins: number) => {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    d.setMinutes(mins);
    return d;
  };

  useEffect(() => {
    if (!open || !initialDate) return;

    const startMins = snapMinutes(initialHour * 60);
    const start = buildDate(initialDate, startMins);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const cal = defaultCal;

    setDraft({
      title: "",
      start: start.getTime(),
      end: end.getTime(),
      calendarId: cal?._id ?? "",
      color: cal?.color ?? "#8B5CF6",
    });
  }, [open, initialDate, initialHour]);

  const updateTitle = (title: string) => {
    if (!draft) return;
    setDraft({ ...draft, title });
  };

  const commit = async () => {
  if (!draft) return;

  const title = draft.title.trim();
  if (!title) return;

  const calendar = calendars.find((c) => c._id === draft.calendarId);
  if (!calendar) {
    console.warn("No calendar selected");
    return;
  }

  await create({
    title,
    startTime: draft.start,
    endTime: draft.end,
    isRecurring: false,
    color: calendar.color,
    calendarId: calendar._id as any,
  });

  setDraft(null);
  onClose();
};

  if (!open || !draft) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="absolute w-[280px] pointer-events-auto"
        style={{
          left: "50%",
          top: "20%",
          transform: "translate(-50%, 0)",
        }}
      >
        <div className="rounded-xl border border-white/10 bg-black/90 shadow-2xl p-3 text-white">
          <input
            autoFocus
            value={draft.title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Nieuwe afspraak..."
            className="w-full bg-transparent text-sm font-medium outline-none text-white placeholder-white/30"
          />
          <div className="mt-2 text-[11px] text-white/40">
            {new Date(draft.start).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            –{" "}
            {new Date(draft.end).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={onClose}
              className="text-xs text-white/50 hover:text-white"
            >
              Cancel
            </button>

            <button
              onClick={commit}
              className="text-xs px-3 py-1 rounded bg-white text-black font-medium"
            >
              Save
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}