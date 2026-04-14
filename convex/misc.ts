import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject as string;
}

// ─── Chapters ────────────────────────────────────────────────────────────────

export const getBySubject = query({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("chapters")
      .withIndex("by_user_subject", (q: any) =>
        q.eq("userId", userId).eq("subject", subject)
      )
      .collect();
  },
});

export const createChapter = mutation({
  args: { subject: v.string(), name: v.string(), order: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("chapters", { userId, ...args });
  },
});

export const deleteChapter = mutation({
  args: { id: v.id("chapters") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const ch = await ctx.db.get(id);
    if (!ch || ch.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

// ─── Habits ──────────────────────────────────────────────────────────────────

export const getHabits = query({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("habits")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const createHabit = mutation({
  args: {
    name: v.string(),
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("habits", { userId, active: true, ...args });
  },
});

export const getCompletions = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("habitCompletions")
      .withIndex("by_user_date", (q: any) =>
        q.eq("userId", userId).eq("date", date)
      )
      .collect();
  },
});

export const toggleCompletion = mutation({
  args: { habitId: v.id("habits"), date: v.string() },
  handler: async (ctx, { habitId, date }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("habitCompletions")
      .withIndex("by_habit_date", (q: any) =>
        q.eq("habitId", habitId).eq("date", date)
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("habitCompletions", { userId, habitId, date });
    }
  },
});

// ─── Appointments ─────────────────────────────────────────────────────────────

export const getAppointments = query({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("appointments")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const createAppointment = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    location: v.optional(v.string()),
    isRecurring: v.boolean(),
    recurringDayOfWeek: v.optional(v.number()),
    recurringTimeHHMM: v.optional(v.string()),
    recurringEndDate: v.optional(v.number()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("appointments", { userId, ...args });
  },
});

export const deleteAppointment = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const appt = await ctx.db.get(id);
    if (!appt || appt.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

// ─── Tests ────────────────────────────────────────────────────────────────────

export const getTests = query({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("tests")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const createTest = mutation({
  args: {
    subject: v.string(),
    topic: v.string(),
    date: v.number(),
    description: v.optional(v.string()),
    lessonId: v.optional(v.id("lessons")),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("tests", { userId, ...args });
  },
});

function parseTimeHHMM(value: string | undefined) {
  if (!value) return { hours: 18, minutes: 0 };
  const [hours, minutes] = value.split(":").map((part) => parseInt(part, 10));
  return { hours: Number.isNaN(hours) ? 18 : hours, minutes: Number.isNaN(minutes) ? 0 : minutes };
}

export const scheduleLearningForTest = mutation({
  args: {
    testId: v.id("tests"),
    sessions: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    preferredTime: v.optional(v.string()),
  },
  handler: async (ctx, { testId, sessions, durationMinutes, preferredTime }) => {
    const userId = await requireUser(ctx);
    const test = await ctx.db.get(testId);
    if (!test || test.userId !== userId) throw new Error("Not found");

    const sessionCount = sessions ?? 3;
    const duration = durationMinutes ?? 60;
    const { hours, minutes } = parseTimeHHMM(preferredTime);
    const testDate = new Date(test.date);

    const createdAppointments: any[] = [];
    for (let i = 1; i <= sessionCount; i++) {
      const sessionDate = new Date(testDate);
      sessionDate.setDate(sessionDate.getDate() - i);
      sessionDate.setHours(hours, minutes, 0, 0);

      createdAppointments.push(
        await ctx.db.insert("appointments", {
          userId,
          title: `Study for ${test.topic}`,
          description: `Prepare for the ${test.subject} test on ${new Date(test.date).toLocaleDateString()}`,
          startTime: sessionDate.getTime(),
          endTime: sessionDate.getTime() + duration * 60 * 1000,
          location: undefined,
          isRecurring: false,
          color: "#8B5CF6",
        })
      );
    }

    return createdAppointments;
  },
});

export const deleteTest = mutation({
  args: { id: v.id("tests") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const test = await ctx.db.get(id);
    if (!test || test.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});
