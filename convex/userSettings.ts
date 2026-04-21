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
    externalAppCode: v.optional(v.string()),
    zermeloSchool: v.optional(v.string()),
    zermeloUsername: v.optional(v.string()),
    zermeloAccessToken: v.optional(v.string()),
    zermeloTokenUpdatedAt: v.optional(v.number()),
    syncLockId: v.optional(v.string()),
    syncLockUntil: v.optional(v.number()),
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
      await ctx.db.patch(existing._id, {
        lastIcalSync: Date.now(),
        lastScheduleSync: Date.now(),
      });
    }
  },
});

export const acquireSyncLock = mutation({
  args: {
    lockId: v.string(),
    ttlMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    const now = Date.now();
    const lockUntil = now + (args.ttlMs ?? 120_000);

    if (!existing) {
      await ctx.db.insert("userSettings", {
        userId,
        syncLockId: args.lockId,
        syncLockUntil: lockUntil,
      });
      return { acquired: true };
    }

    const currentUntil = existing.syncLockUntil ?? 0;
    const currentId = existing.syncLockId ?? "";
    if (currentUntil > now && currentId !== args.lockId) {
      return { acquired: false, lockedUntil: currentUntil };
    }

    await ctx.db.patch(existing._id, {
      syncLockId: args.lockId,
      syncLockUntil: lockUntil,
    });
    return { acquired: true };
  },
});

export const releaseSyncLock = mutation({
  args: { lockId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUser(ctx);
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .first();
    if (!existing) return;
    if (existing.syncLockId !== args.lockId) return;
    await ctx.db.patch(existing._id, {
      syncLockId: undefined,
      syncLockUntil: undefined,
    });
  },
});
