import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject as string;
}

export const get = query({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    icalUrl: v.optional(v.string()),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("userSettings", { userId, ...args });
    }
  },
});

export const markSynced = mutation({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { lastIcalSync: Date.now() });
    }
  },
});

export const reset = mutation({
  handler: async (ctx) => {
    const userId = await requireUser(ctx);
    const tables = [
      "notes",
      "homework",
      "tasks",
      "tests",
      "appointments",
      "habits",
      "habitCompletions",
      "lessons",
      "chapters",
    ] as const;

    for (const table of tables) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .collect();

      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }
  },
});
