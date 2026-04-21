import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

async function requireUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return {
    userId: identity.tokenIdentifier,
    legacyUserId:
      identity.subject && identity.subject !== identity.tokenIdentifier
        ? identity.subject
        : null,
  };
}

async function getExistingInk(
  ctx: QueryCtx | MutationCtx,
  userIds: Awaited<ReturnType<typeof requireUser>>,
  subject: string
) {
  const currentRecord = await ctx.db
    .query("inkStrokes")
    .withIndex("by_user_subject", (q) =>
      q.eq("userId", userIds.userId).eq("subject", subject)
    )
    .unique();

  if (currentRecord || !userIds.legacyUserId) {
    return currentRecord;
  }

  return await ctx.db
    .query("inkStrokes")
    .withIndex("by_user_subject", (q) =>
      q.eq("userId", userIds.legacyUserId!).eq("subject", subject)
    )
    .unique();
}

export const get = query({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    const userIds = await requireUser(ctx);
    return await getExistingInk(ctx, userIds, subject);
  },
});

export const save = mutation({
  args: { subject: v.string(), strokes: v.string() },
  handler: async (ctx, { subject, strokes }) => {
    const userIds = await requireUser(ctx);
    const existing = await getExistingInk(ctx, userIds, subject);

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: userIds.userId,
        subject,
        strokes,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("inkStrokes", {
        userId: userIds.userId,
        subject,
        strokes,
        updatedAt: Date.now(),
      });
    }
  },
});
