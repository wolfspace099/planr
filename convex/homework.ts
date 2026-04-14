import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject as string;
}

export const getAll = query({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("homework")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const getByLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    await requireUser(ctx);
    return await ctx.db
      .query("homework")
      .withIndex("by_lesson", (q: any) => q.eq("lessonId", lessonId))
      .collect();
  },
});

export const getDueRange = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, { from, to }) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("homework")
      .withIndex("by_user_due", (q: any) =>
        q.eq("userId", userId).gte("dueDate", from).lte("dueDate", to)
      )
      .collect();
  },
});

export const create = mutation({
  args: {
    lessonId: v.optional(v.id("lessons")),
    subject: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("homework", {
      userId,
      ...args,
      done: false,
      createdAt: Date.now(),
    });
  },
});

export const toggle = mutation({
  args: { id: v.id("homework") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const hw = await ctx.db.get(id);
    if (!hw || hw.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { done: !hw.done });
  },
});

export const update = mutation({
  args: {
    id: v.id("homework"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    lessonId: v.optional(v.id("lessons")),
  },
  handler: async (ctx, { id, ...fields }) => {
    const userId = await requireUser(ctx);
    const hw = await ctx.db.get(id);
    if (!hw || hw.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("homework") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const hw = await ctx.db.get(id);
    if (!hw || hw.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});
