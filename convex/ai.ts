import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

const MODEL = "gemini-2.0-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_ITERATIONS = 8;

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

type AgentAction = {
  tool: string;
  args: Record<string, unknown>;
  ok: boolean;
  result?: unknown;
  error?: string;
};

const TOOL_SCHEMAS = [
  {
    name: "list_lessons",
    description:
      "Returns lessons (school schedule) within a date range. Use this to see what is already scheduled. Times are ISO strings.",
    parameters: {
      type: "object",
      properties: {
        fromIso: { type: "string", description: "Start datetime ISO 8601" },
        toIso: { type: "string", description: "End datetime ISO 8601" },
      },
      required: ["fromIso", "toIso"],
    },
  },
  {
    name: "list_homework",
    description: "Returns all homework items for the user (open and done).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_tests",
    description: "Returns all tests (toetsen) for the user.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_appointments",
    description: "Returns all appointments (afspraken) for the user.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_calendars",
    description: "Returns all calendars the user has, with their colors.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_tasks",
    description: "Returns all tasks for the user.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "list_study_sessions",
    description:
      "Returns study/rehearsal/homework sessions in a range. Use BEFORE creating new sessions to avoid duplicates.",
    parameters: {
      type: "object",
      properties: {
        fromIso: { type: "string" },
        toIso: { type: "string" },
      },
      required: ["fromIso", "toIso"],
    },
  },
  {
    name: "find_free_slots",
    description:
      "Returns up to 20 free time slots between fromIso and toIso of the requested length, avoiding lessons, appointments, and existing study/rehearsal/homework sessions. Considers the window 07:00–22:00 only.",
    parameters: {
      type: "object",
      properties: {
        fromIso: { type: "string" },
        toIso: { type: "string" },
        sessionMinutes: { type: "number" },
      },
      required: ["fromIso", "toIso", "sessionMinutes"],
    },
  },
  {
    name: "create_appointment",
    description: "Create a one-off (non-recurring) appointment.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        startIso: { type: "string" },
        endIso: { type: "string", description: "Optional end time" },
        location: { type: "string" },
        description: { type: "string" },
        color: { type: "string", description: "Hex color, e.g. #7c3aed" },
      },
      required: ["title", "startIso"],
    },
  },
  {
    name: "create_homework",
    description: "Create a homework item with a due date.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        subject: { type: "string" },
        dueDateIso: { type: "string" },
        description: { type: "string" },
      },
      required: ["title", "subject", "dueDateIso"],
    },
  },
  {
    name: "create_test",
    description: "Create a test (toets) entry.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string" },
        topic: { type: "string" },
        dateIso: { type: "string" },
        description: { type: "string" },
      },
      required: ["subject", "topic", "dateIso"],
    },
  },
  {
    name: "create_task",
    description: "Create a task (todo).",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
        dueDateIso: { type: "string" },
        subject: { type: "string" },
        description: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "create_rehearsal_session",
    description:
      "Create a study/rehearsal session block in the calendar. Use this to plan study time for tests.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        subject: { type: "string" },
        startIso: { type: "string" },
        durationMinutes: { type: "number" },
        description: { type: "string" },
      },
      required: ["title", "subject", "startIso", "durationMinutes"],
    },
  },
  {
    name: "schedule_test_study_sessions",
    description:
      "Convenience tool: given a testId, create N study sessions of given duration in the days leading up to the test at preferredHour:preferredMinute. Replaces any existing study sessions for that test.",
    parameters: {
      type: "object",
      properties: {
        testId: { type: "string" },
        sessions: { type: "number" },
        durationMinutes: { type: "number" },
        preferredHour: { type: "number" },
        preferredMinute: { type: "number" },
      },
      required: ["testId", "sessions", "durationMinutes", "preferredHour", "preferredMinute"],
    },
  },
];

function isoToMs(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw new Error(`Invalid ISO date: ${iso}`);
  return t;
}

const WORK_START_HOUR = 7;
const WORK_END_HOUR = 22;

async function executeTool(
  ctx: any,
  name: string,
  args: Record<string, any>,
): Promise<unknown> {
  switch (name) {
    case "list_lessons": {
      const lessons: any[] = await ctx.runQuery(api.lessons.getRange, {
        from: isoToMs(args.fromIso),
        to: isoToMs(args.toIso),
      });
      return lessons.map((l) => ({
        id: l._id,
        subject: l.subject,
        location: l.location ?? null,
        teachers: l.teachers ?? null,
        startIso: new Date(l.startTime).toISOString(),
        endIso: new Date(l.endTime).toISOString(),
      }));
    }
    case "list_homework": {
      const items: any[] = await ctx.runQuery(api.homework.getAll, {});
      return items.map((h) => ({
        id: h._id,
        title: h.title,
        subject: h.subject,
        description: h.description ?? null,
        dueDateIso: new Date(h.dueDate).toISOString(),
        done: h.done,
      }));
    }
    case "list_tests": {
      const items: any[] = await ctx.runQuery(api.misc.getTests, {});
      return items.map((t) => ({
        id: t._id,
        subject: t.subject,
        topic: t.topic,
        description: t.description ?? null,
        dateIso: new Date(t.date).toISOString(),
      }));
    }
    case "list_appointments": {
      const items: any[] = await ctx.runQuery(api.misc.getAppointments, {});
      return items.map((a) => ({
        id: a._id,
        title: a.title,
        location: a.location ?? null,
        description: a.description ?? null,
        startIso: a.startTime ? new Date(a.startTime).toISOString() : null,
        endIso: a.endTime ? new Date(a.endTime).toISOString() : null,
        recurring: a.isRecurring,
      }));
    }
    case "list_calendars": {
      const items: any[] = await ctx.runQuery(api.calendars.getAll, {});
      return items.map((c) => ({ id: c._id, name: c.name, color: c.color, visible: c.visible }));
    }
    case "list_tasks": {
      const items: any[] = await ctx.runQuery(api.tasks.getAll, {});
      return items.map((t) => ({
        id: t._id,
        title: t.title,
        subject: t.subject ?? null,
        priority: t.priority,
        done: t.done,
        dueDateIso: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      }));
    }
    case "list_study_sessions": {
      const from = isoToMs(args.fromIso);
      const to = isoToMs(args.toIso);
      const [study, hw, reh]: [any[], any[], any[]] = await Promise.all([
        ctx.runQuery(api.study.getStudySessionsInRange, { from, to }),
        ctx.runQuery(api.study.getHomeworkSessionsInRange, { from, to }),
        ctx.runQuery(api.study.getRehearsalSessionsInRange, { from, to }),
      ]);
      const fmt = (s: any, kind: string) => ({
        id: s._id,
        kind,
        title: s.title,
        startIso: new Date(s.startTime).toISOString(),
        endIso: new Date(s.endTime).toISOString(),
        done: s.done,
      });
      return [
        ...study.map((s) => fmt(s, "study")),
        ...hw.map((s) => fmt(s, "homework")),
        ...reh.map((s) => fmt(s, "rehearsal")),
      ].sort((a, b) => a.startIso.localeCompare(b.startIso));
    }
    case "find_free_slots": {
      const fromMs = isoToMs(args.fromIso);
      const toMs = isoToMs(args.toIso);
      const minutes = Number(args.sessionMinutes);
      if (!Number.isFinite(minutes) || minutes <= 0) {
        throw new Error("sessionMinutes must be a positive number");
      }

      const [lessons, appts, study, hw, reh]: [any[], any[], any[], any[], any[]] = await Promise.all([
        ctx.runQuery(api.lessons.getRange, { from: fromMs, to: toMs }),
        ctx.runQuery(api.misc.getAppointments, {}),
        ctx.runQuery(api.study.getStudySessionsInRange, { from: fromMs, to: toMs }),
        ctx.runQuery(api.study.getHomeworkSessionsInRange, { from: fromMs, to: toMs }),
        ctx.runQuery(api.study.getRehearsalSessionsInRange, { from: fromMs, to: toMs }),
      ]);

      const busy: { start: number; end: number }[] = [];
      const pushBusy = (start: number, end: number) => {
        if (end > start) busy.push({ start, end });
      };
      for (const l of lessons) pushBusy(l.startTime, l.endTime);
      for (const a of appts) {
        if (a.isRecurring) continue; // skip recurring for simplicity
        if (!a.startTime) continue;
        pushBusy(a.startTime, a.endTime ?? a.startTime + 60 * 60 * 1000);
      }
      for (const s of [...study, ...hw, ...reh]) pushBusy(s.startTime, s.endTime);

      busy.sort((a, b) => a.start - b.start);

      const slotMs = minutes * 60 * 1000;
      const slots: { startIso: string; endIso: string }[] = [];
      const dayMs = 24 * 60 * 60 * 1000;

      for (let dayStart = startOfDay(fromMs); dayStart < toMs && slots.length < 20; dayStart += dayMs) {
        const workStart = dayStart + WORK_START_HOUR * 60 * 60 * 1000;
        const workEnd = dayStart + WORK_END_HOUR * 60 * 60 * 1000;
        const dayBusy = busy
          .filter((b) => b.end > workStart && b.start < workEnd)
          .map((b) => ({ start: Math.max(b.start, workStart), end: Math.min(b.end, workEnd) }))
          .sort((a, b) => a.start - b.start);

        let cursor = Math.max(workStart, fromMs);
        for (const b of dayBusy) {
          if (b.start - cursor >= slotMs) {
            slots.push({
              startIso: new Date(cursor).toISOString(),
              endIso: new Date(cursor + slotMs).toISOString(),
            });
            if (slots.length >= 20) break;
          }
          cursor = Math.max(cursor, b.end);
        }
        if (slots.length < 20 && workEnd - cursor >= slotMs && cursor >= fromMs) {
          slots.push({
            startIso: new Date(cursor).toISOString(),
            endIso: new Date(cursor + slotMs).toISOString(),
          });
        }
      }
      return { slots };
    }
    case "create_appointment": {
      const id = await ctx.runMutation(api.misc.createAppointment, {
        title: String(args.title),
        startTime: isoToMs(args.startIso),
        endTime: args.endIso ? isoToMs(args.endIso) : undefined,
        location: args.location || undefined,
        description: args.description || undefined,
        color: args.color || undefined,
        isRecurring: false,
      });
      return { id, ok: true };
    }
    case "create_homework": {
      const id = await ctx.runMutation(api.homework.create, {
        title: String(args.title),
        subject: String(args.subject),
        dueDate: isoToMs(args.dueDateIso),
        description: args.description || undefined,
      });
      return { id, ok: true };
    }
    case "create_test": {
      const id = await ctx.runMutation(api.misc.createTest, {
        subject: String(args.subject),
        topic: String(args.topic),
        date: isoToMs(args.dateIso),
        description: args.description || undefined,
      });
      return { id, ok: true };
    }
    case "create_task": {
      const id = await ctx.runMutation(api.tasks.create, {
        title: String(args.title),
        priority: (args.priority as "low" | "medium" | "high") || "medium",
        dueDate: args.dueDateIso ? isoToMs(args.dueDateIso) : undefined,
        subject: args.subject || undefined,
        description: args.description || undefined,
      });
      return { id, ok: true };
    }
    case "create_rehearsal_session": {
      const id = await ctx.runMutation(api.study.createRehearsalSession, {
        title: String(args.title),
        subject: String(args.subject),
        startTime: isoToMs(args.startIso),
        durationMinutes: Number(args.durationMinutes),
        description: args.description || undefined,
      });
      return { id, ok: true };
    }
    case "schedule_test_study_sessions": {
      const created = await ctx.runMutation(api.study.scheduleStudySessions, {
        testId: args.testId,
        sessions: Number(args.sessions),
        durationMinutes: Number(args.durationMinutes),
        preferredHour: Number(args.preferredHour),
        preferredMinute: Number(args.preferredMinute),
      });
      return { createdIds: created, count: created.length };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export const ask = action({
  args: {
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
    todayIso: v.string(),
  },
  handler: async (ctx, { messages, todayIso }): Promise<{ reply: string; actions: AgentAction[] }> => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        reply:
          "GEMINI_API_KEY ontbreekt. Voeg de key toe in het Convex dashboard (Settings → Environment Variables) — gratis key te halen op https://aistudio.google.com/apikey.",
        actions: [],
      };
    }

    const systemInstruction =
      `Je bent een Nederlandstalige studieplanner-assistent in cognoto. Vandaag is ${todayIso}. ` +
      `Help de gebruiker met afspraken, huiswerk, toetsen, taken en studieplanning. ` +
      `Voor je items aanmaakt: gebruik eerst de list_* tools om te zien wat er al staat, en find_free_slots om vrije tijd te vinden. ` +
      `Gebruik altijd ISO 8601 datumstrings. Werk in Europe/Amsterdam tijdzone tenzij anders gevraagd. ` +
      `Hou antwoorden kort en zakelijk. Bevestig kort wat je gedaan hebt.`;

    const history: GeminiContent[] = messages.map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.content }],
    }));

    const actions: AgentAction[] = [];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: history,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          tools: [{ functionDeclarations: TOOL_SCHEMAS }],
          generationConfig: { temperature: 0.4 },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return {
          reply: `Gemini API fout (${res.status}): ${errText.slice(0, 400)}`,
          actions,
        };
      }

      const data: any = await res.json();
      const candidate = data.candidates?.[0];
      const parts: GeminiPart[] = candidate?.content?.parts ?? [];

      history.push({ role: "model", parts });

      const fnCalls = parts.filter((p): p is { functionCall: { name: string; args: Record<string, unknown> } } => "functionCall" in p);

      if (fnCalls.length === 0) {
        const text = parts
          .map((p) => ("text" in p ? p.text : ""))
          .join("")
          .trim();
        return { reply: text || "OK.", actions };
      }

      const responseParts: GeminiPart[] = [];
      for (const part of fnCalls) {
        const { name, args: toolArgs } = part.functionCall;
        const safeArgs = (toolArgs ?? {}) as Record<string, unknown>;
        try {
          const result = await executeTool(ctx, name, safeArgs);
          actions.push({ tool: name, args: safeArgs, ok: true, result });
          responseParts.push({
            functionResponse: { name, response: { result } as Record<string, unknown> },
          });
        } catch (err: any) {
          const message = err?.message ?? String(err);
          actions.push({ tool: name, args: safeArgs, ok: false, error: message });
          responseParts.push({
            functionResponse: { name, response: { error: message } as Record<string, unknown> },
          });
        }
      }

      history.push({ role: "user", parts: responseParts });
    }

    return {
      reply: "Gestopt na 8 iteraties. Probeer een eenvoudiger verzoek of splits het op.",
      actions,
    };
  },
});
