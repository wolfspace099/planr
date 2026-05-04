import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject as string;
}

// ─── Test Subtasks ────────────────────────────────────────────────────────────

export const getSubtasksByTest = query({
  args: { testId: v.id("tests") },
  handler: async (ctx, { testId }) => {
    await requireUser(ctx);
    return await ctx.db
      .query("testSubtasks")
      .withIndex("by_test", (q: any) => q.eq("testId", testId))
      .collect();
  },
});

export const createSubtask = mutation({
  args: { testId: v.id("tests"), title: v.string(), order: v.number() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("testSubtasks", { userId, ...args, done: false, createdAt: Date.now() });
  },
});

export const toggleSubtask = mutation({
  args: { id: v.id("testSubtasks") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const sub = await ctx.db.get(id);
    if (!sub || sub.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { done: !sub.done });
  },
});

export const deleteSubtask = mutation({
  args: { id: v.id("testSubtasks") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const sub = await ctx.db.get(id);
    if (!sub || sub.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

// ─── Study Sessions (for tests) ───────────────────────────────────────────────

export const getStudySessions = query({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("studySessions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const getStudySessionsInRange = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, { from, to }) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("studySessions")
      .withIndex("by_user_time", (q: any) =>
        q.eq("userId", userId).gte("startTime", from).lte("startTime", to)
      )
      .collect();
  },
});

export const toggleStudySession = mutation({
  args: { id: v.id("studySessions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const sess = await ctx.db.get(id);
    if (!sess || sess.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { done: !sess.done });
  },
});

export const deleteStudySession = mutation({
  args: { id: v.id("studySessions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const sess = await ctx.db.get(id);
    if (!sess || sess.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const scheduleStudySession = mutation({
  args: {
    testId: v.id("tests"),
    startTime: v.number(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, { testId, startTime, durationMinutes }) => {
    const userId = await requireUser(ctx);
    const test = await ctx.db.get(testId);
    if (!test || test.userId !== userId) throw new Error("Not found");

    return await ctx.db.insert("studySessions", {
      userId,
      testId,
      title: `Studeren: ${test.topic}`,
      description: `Voorbereiding ${test.subject}`,
      startTime,
      endTime: startTime + durationMinutes * 60 * 1000,
      done: false,
      color: "#8B5CF6",
    });
  },
});

export const scheduleStudySessions = mutation({
  args: {
    testId: v.id("tests"),
    sessions: v.number(),
    durationMinutes: v.number(),
    preferredHour: v.number(),
    preferredMinute: v.number(),
  },
  handler: async (ctx, { testId, sessions, durationMinutes, preferredHour, preferredMinute }) => {
    const userId = await requireUser(ctx);
    const test = await ctx.db.get(testId);
    if (!test || test.userId !== userId) throw new Error("Not found");

    const existing = await ctx.db
      .query("studySessions")
      .withIndex("by_test", (q: any) => q.eq("testId", testId))
      .collect();
    for (const s of existing) await ctx.db.delete(s._id);

    const testDate = new Date(test.date);
    const created = [];
    for (let i = 1; i <= sessions; i++) {
      const d = new Date(testDate);
      d.setDate(d.getDate() - i);
      d.setHours(preferredHour, preferredMinute, 0, 0);
      created.push(
        await ctx.db.insert("studySessions", {
          userId,
          testId,
          title: `Study: ${test.topic} (session ${i})`,
          description: `Prepare for ${test.subject} test on ${testDate.toLocaleDateString()}`,
          startTime: d.getTime(),
          endTime: d.getTime() + durationMinutes * 60 * 1000,
          done: false,
          color: "#8B5CF6",
        })
      );
    }
    return created;
  },
});

// ─── Homework Sessions ────────────────────────────────────────────────────────

export const getHomeworkSessions = query({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("homeworkSessions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const getHomeworkSessionsInRange = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, { from, to }) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("homeworkSessions")
      .withIndex("by_user_time", (q: any) =>
        q.eq("userId", userId).gte("startTime", from).lte("startTime", to)
      )
      .collect();
  },
});

export const toggleHomeworkSession = mutation({
  args: { id: v.id("homeworkSessions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const sess = await ctx.db.get(id);
    if (!sess || sess.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { done: !sess.done });
  },
});

export const deleteHomeworkSession = mutation({
  args: { id: v.id("homeworkSessions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const sess = await ctx.db.get(id);
    if (!sess || sess.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const scheduleHomeworkSession = mutation({
  args: {
    homeworkId: v.id("homework"),
    startTime: v.number(),
    durationMinutes: v.number(),
  },
  handler: async (ctx, { homeworkId, startTime, durationMinutes }) => {
    const userId = await requireUser(ctx);
    const hw = await ctx.db.get(homeworkId);
    if (!hw || hw.userId !== userId) throw new Error("Not found");

    return await ctx.db.insert("homeworkSessions", {
      userId,
      homeworkId,
      title: `Do: ${hw.title}`,
      description: hw.description,
      startTime,
      endTime: startTime + durationMinutes * 60 * 1000,
      done: false,
      color: "#10B981",
    });
  },
});

// ─── Rehearsal Sessions ───────────────────────────────────────────────────────

export const getRehearsalSessions = query({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("rehearsalSessions")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const getRehearsalSessionsInRange = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, { from, to }) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("rehearsalSessions")
      .withIndex("by_user_time", (q: any) =>
        q.eq("userId", userId).gte("startTime", from).lte("startTime", to)
      )
      .collect();
  },
});

export const createRehearsalSession = mutation({
  args: {
    subject: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    durationMinutes: v.number(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, { durationMinutes, ...args }) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("rehearsalSessions", {
      userId,
      ...args,
      endTime: args.startTime + durationMinutes * 60 * 1000,
      done: false,
      color: args.color ?? "#F59E0B",
    });
  },
});

export const toggleRehearsalSession = mutation({
  args: { id: v.id("rehearsalSessions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const sess = await ctx.db.get(id);
    if (!sess || sess.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { done: !sess.done });
  },
});

export const deleteRehearsalSession = mutation({
  args: { id: v.id("rehearsalSessions") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const sess = await ctx.db.get(id);
    if (!sess || sess.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});
// ─── Reschedule mutations (for drag-and-drop calendar) ─────────────────────

export const rescheduleStudySession = mutation({
  args: { id: v.id("studySessions"), startTime: v.number(), durationMinutes: v.number() },
  handler: async (ctx, { id, startTime, durationMinutes }) => {
    const userId = await requireUser(ctx);
    const sess = await ctx.db.get(id);
    if (!sess || sess.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { startTime, endTime: startTime + durationMinutes * 60 * 1000 });
  },
});

export const rescheduleHomeworkSession = mutation({
  args: { id: v.id("homeworkSessions"), startTime: v.number(), durationMinutes: v.number() },
  handler: async (ctx, { id, startTime, durationMinutes }) => {
    const userId = await requireUser(ctx);
    const sess = await ctx.db.get(id);
    if (!sess || sess.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { startTime, endTime: startTime + durationMinutes * 60 * 1000 });
  },
});

export const rescheduleRehearsalSession = mutation({
  args: { id: v.id("rehearsalSessions"), startTime: v.number(), durationMinutes: v.number() },
  handler: async (ctx, { id, startTime, durationMinutes }) => {
    const userId = await requireUser(ctx);
    const sess = await ctx.db.get(id);
    if (!sess || sess.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { startTime, endTime: startTime + durationMinutes * 60 * 1000 });
  },
});