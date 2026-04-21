import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject as string;
}

export const getByLesson = query({
  args: { lessonId: v.id("lessons") },
  handler: async (ctx, { lessonId }) => {
    await requireUser(ctx);
    return await ctx.db
      .query("notes")
      .withIndex("by_lesson", (q: any) => q.eq("lessonId", lessonId))
      .first();
  },
});

export const save = mutation({
  args: {
    lessonId: v.id("lessons"),
    content: v.string(),
  },
  handler: async (ctx, { lessonId, content }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_lesson", (q: any) => q.eq("lessonId", lessonId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { content, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("notes", {
        userId,
        lessonId,
        content,
        updatedAt: Date.now(),
      });
    }
  },
});

// ─── Get notebook note by subject ────────────────────────────────────────────
export const getNotebook = query({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    const userId = await requireUser(ctx);
    return await ctx.db
      .query("notes")
      .withIndex("by_user_subject", (q: any) =>
        q.eq("userId", userId).eq("subject", subject)
      )
      .unique();
  },
});

// ─── Save notebook note by subject ───────────────────────────────────────────
export const saveNotebook = mutation({
  args: { subject: v.string(), content: v.string() },
  handler: async (ctx, { subject, content }) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_user_subject", (q: any) =>
        q.eq("userId", userId).eq("subject", subject)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { content, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("notes", {
        userId,
        subject,
        content,
        updatedAt: Date.now(),
      });
    }
  },
});