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
      .query("calendars")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .collect();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    color: v.string(),
    isSchedule: v.optional(v.boolean()),
    icalUrl: v.optional(v.string()),
    order: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    return await ctx.db.insert("calendars", {
      userId,
      visible: true,
      ...args,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("calendars"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
    visible: v.optional(v.boolean()),
    icalUrl: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const userId = await requireUser(ctx);
    const cal = await ctx.db.get(id);
    if (!cal || cal.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, updates);
  },
});

export const remove = mutation({
  args: { id: v.id("calendars") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const cal = await ctx.db.get(id);
    if (!cal || cal.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(id);
  },
});

export const toggleVisible = mutation({
  args: { id: v.id("calendars") },
  handler: async (ctx, { id }) => {
    const userId = await requireUser(ctx);
    const cal = await ctx.db.get(id);
    if (!cal || cal.userId !== userId) throw new Error("Not found");
    await ctx.db.patch(id, { visible: !cal.visible });
  },
});
