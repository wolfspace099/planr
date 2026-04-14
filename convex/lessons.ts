import { query, internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject as string;
}

export const getRange = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, { from, to }) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("lessons")
      .withIndex("by_user_time", (q: any) =>
        q.eq("userId", userId).gte("startTime", from).lte("startTime", to)
      )
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("lessons") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const lesson = await ctx.db.get(id);
    if (!lesson || lesson.userId !== userId) return null;
    return lesson;
  },
});

export const getBySubject = query({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db
      .query("lessons")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    return all
      .filter((l: any) => l.subject === subject)
      .sort((a: any, b: any) => a.startTime - b.startTime);
  },
});

export const getSubjects = query({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const all = await ctx.db
      .query("lessons")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    const subjects = [...new Set(all.map((l: any) => l.subject as string))];
    return subjects.sort();
  },
});

export const setChapter = mutation({
  args: { lessonId: v.id("lessons"), chapterId: v.optional(v.id("chapters")) },
  handler: async (ctx, { lessonId, chapterId }) => {
    const userId = await requireUser(ctx);
    const lesson = await ctx.db.get(lessonId);
    if (!lesson || lesson.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(lessonId, { chapterId });
  },
});

export const upsert = internalMutation({
  args: {
    userId: v.string(),
    icalUid: v.string(),
    subject: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    isEvent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("lessons")
      .withIndex("by_ical_uid", (q: any) =>
        q.eq("userId", args.userId).eq("icalUid", args.icalUid)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        subject: args.subject,
        startTime: args.startTime,
        endTime: args.endTime,
        location: args.location,
        isEvent: args.isEvent,
      });
    } else {
      await ctx.db.insert("lessons", args);
    }
  },
});

export const deleteAllForUser = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const existingLessons = await ctx.db
      .query("lessons")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
    for (const lesson of existingLessons) {
      await ctx.db.delete(lesson._id);
    }
  },
});
