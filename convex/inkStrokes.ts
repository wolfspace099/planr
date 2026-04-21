import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject as string;
}

export const get = query({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("inkStrokes")
      .withIndex("by_user_subject", (q: any) =>
        q.eq("userId", userId).eq("subject", subject)
      )
      .unique();
  },
});

export const save = mutation({
  args: { subject: v.string(), strokes: v.string() },
  handler: async (ctx, { subject, strokes }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("inkStrokes")
      .withIndex("by_user_subject", (q: any) =>
        q.eq("userId", userId).eq("subject", subject)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { strokes, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("inkStrokes", { userId, subject, strokes, updatedAt: Date.now() });
    }
  },
});