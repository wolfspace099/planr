import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

type UserIds = {
  userId: string;
  legacyUserId: string | null;
};

async function getUserIds(ctx: QueryCtx | MutationCtx): Promise<UserIds> {
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

function isOwnedByUser(
  doc: { userId: string } | null,
  userIds: UserIds,
): doc is { userId: string } {
  if (!doc) return false;
  return doc.userId === userIds.userId || doc.userId === userIds.legacyUserId;
}

async function getOwnedPageOrThrow(
  ctx: QueryCtx | MutationCtx,
  userIds: UserIds,
  pageId: Id<"notebookPages">,
): Promise<Doc<"notebookPages">> {
  const page = await ctx.db.get(pageId);
  if (!isOwnedByUser(page, userIds)) {
    throw new Error("Not found");
  }
  return page;
}

function sanitizeTags(tags: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= 20) break;
  }
  return result;
}

export const listPagesBySubject = query({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    const userIds = await getUserIds(ctx);

    const primary = await ctx.db
      .query("notebookPages")
      .withIndex("by_user_subject_and_updatedAt", (q) =>
        q.eq("userId", userIds.userId).eq("subject", subject),
      )
      .order("desc")
      .take(200);

    if (!userIds.legacyUserId) return primary;

    const legacy = await ctx.db
      .query("notebookPages")
      .withIndex("by_user_subject_and_updatedAt", (q) =>
        q.eq("userId", userIds.legacyUserId!).eq("subject", subject),
      )
      .order("desc")
      .take(200);

    return [...primary, ...legacy].sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

export const getPageBundle = query({
  args: { pageId: v.id("notebookPages") },
  handler: async (ctx, { pageId }) => {
    const userIds = await getUserIds(ctx);
    const page = await getOwnedPageOrThrow(ctx, userIds, pageId);

    const photoDocs = await ctx.db
      .query("notebookPagePhotos")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .take(200);

    const photos = await Promise.all(
      photoDocs
        .filter((p) => isOwnedByUser(p, userIds))
        .map(async (photo) => ({
          ...photo,
          url: await ctx.storage.getUrl(photo.storageId),
        })),
    );

    const links = (await ctx.db
      .query("notebookPageLinks")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .take(200))
      .filter((link) => isOwnedByUser(link, userIds));

    return { page, photos, links };
  },
});

export const createPage = mutation({
  args: {
    subject: v.string(),
    title: v.optional(v.string()),
    chapter: v.optional(v.string()),
    noteDate: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userIds = await getUserIds(ctx);
    const now = Date.now();

    return await ctx.db.insert("notebookPages", {
      userId: userIds.userId,
      subject: args.subject,
      title: args.title?.trim() || "Nieuwe pagina",
      chapter: args.chapter?.trim() || undefined,
      noteDate: args.noteDate,
      tags: sanitizeTags(args.tags ?? []),
      typedContent: "<p></p>",
      drawingStrokes: "[]",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updatePageMeta = mutation({
  args: {
    pageId: v.id("notebookPages"),
    title: v.optional(v.string()),
    chapter: v.optional(v.string()),
    noteDate: v.optional(v.number()),
    clearNoteDate: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userIds = await getUserIds(ctx);
    await getOwnedPageOrThrow(ctx, userIds, args.pageId);

    const patch: Partial<Doc<"notebookPages">> = { updatedAt: Date.now() };

    if (args.title !== undefined) patch.title = args.title.trim() || "Nieuwe pagina";
    if (args.chapter !== undefined) patch.chapter = args.chapter.trim() || undefined;
    if (args.clearNoteDate) patch.noteDate = undefined;
    else if (args.noteDate !== undefined) patch.noteDate = args.noteDate;
    if (args.tags !== undefined) patch.tags = sanitizeTags(args.tags);

    await ctx.db.patch(args.pageId, patch);
  },
});

export const updateTypedContent = mutation({
  args: { pageId: v.id("notebookPages"), typedContent: v.string() },
  handler: async (ctx, { pageId, typedContent }) => {
    const userIds = await getUserIds(ctx);
    await getOwnedPageOrThrow(ctx, userIds, pageId);
    await ctx.db.patch(pageId, { typedContent, updatedAt: Date.now() });
  },
});

export const updateDrawingStrokes = mutation({
  args: { pageId: v.id("notebookPages"), drawingStrokes: v.string() },
  handler: async (ctx, { pageId, drawingStrokes }) => {
    const userIds = await getUserIds(ctx);
    await getOwnedPageOrThrow(ctx, userIds, pageId);
    await ctx.db.patch(pageId, { drawingStrokes, updatedAt: Date.now() });
  },
});

export const deletePage = mutation({
  args: { pageId: v.id("notebookPages") },
  handler: async (ctx, { pageId }) => {
    const userIds = await getUserIds(ctx);
    await getOwnedPageOrThrow(ctx, userIds, pageId);

    const photos = await ctx.db
      .query("notebookPagePhotos")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .take(200);
    for (const photo of photos) {
      if (!isOwnedByUser(photo, userIds)) continue;
      await ctx.storage.delete(photo.storageId);
      await ctx.db.delete(photo._id);
    }

    const links = await ctx.db
      .query("notebookPageLinks")
      .withIndex("by_page", (q) => q.eq("pageId", pageId))
      .take(200);
    for (const link of links) {
      if (!isOwnedByUser(link, userIds)) continue;
      await ctx.db.delete(link._id);
    }

    await ctx.db.delete(pageId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getUserIds(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const attachPhoto = mutation({
  args: {
    pageId: v.id("notebookPages"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userIds = await getUserIds(ctx);
    await getOwnedPageOrThrow(ctx, userIds, args.pageId);

    await ctx.db.insert("notebookPagePhotos", {
      userId: userIds.userId,
      pageId: args.pageId,
      storageId: args.storageId,
      caption: args.caption?.trim() || undefined,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.pageId, { updatedAt: Date.now() });
  },
});

export const removePhoto = mutation({
  args: { photoId: v.id("notebookPagePhotos") },
  handler: async (ctx, { photoId }) => {
    const userIds = await getUserIds(ctx);
    const photo = await ctx.db.get(photoId);
    if (!isOwnedByUser(photo, userIds)) throw new Error("Not found");

    await ctx.storage.delete(photo.storageId);
    await ctx.db.delete(photoId);
    await ctx.db.patch(photo.pageId, { updatedAt: Date.now() });
  },
});

export const upsertLink = mutation({
  args: {
    pageId: v.id("notebookPages"),
    kind: v.union(v.literal("homework"), v.literal("test")),
    homeworkId: v.optional(v.id("homework")),
    testId: v.optional(v.id("tests")),
  },
  handler: async (ctx, args) => {
    const userIds = await getUserIds(ctx);
    await getOwnedPageOrThrow(ctx, userIds, args.pageId);

    if (args.kind === "homework") {
      if (!args.homeworkId) throw new Error("homeworkId is required");
      const hw = await ctx.db.get(args.homeworkId);
      if (!isOwnedByUser(hw, userIds)) throw new Error("Homework not found");
    } else {
      if (!args.testId) throw new Error("testId is required");
      const test = await ctx.db.get(args.testId);
      if (!isOwnedByUser(test, userIds)) throw new Error("Test not found");
    }

    const links = await ctx.db
      .query("notebookPageLinks")
      .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
      .take(200);

    const existing = links.find((link) => {
      if (!isOwnedByUser(link, userIds)) return false;
      if (args.kind === "homework") {
        return link.kind === "homework" && link.homeworkId === args.homeworkId;
      }
      return link.kind === "test" && link.testId === args.testId;
    });

    if (existing) return existing._id;

    const id = await ctx.db.insert("notebookPageLinks", {
      userId: userIds.userId,
      pageId: args.pageId,
      kind: args.kind,
      homeworkId: args.kind === "homework" ? args.homeworkId : undefined,
      testId: args.kind === "test" ? args.testId : undefined,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.pageId, { updatedAt: Date.now() });
    return id;
  },
});

export const removeLink = mutation({
  args: { linkId: v.id("notebookPageLinks") },
  handler: async (ctx, { linkId }) => {
    const userIds = await getUserIds(ctx);
    const link = await ctx.db.get(linkId);
    if (!isOwnedByUser(link, userIds)) throw new Error("Not found");

    await ctx.db.delete(linkId);
    await ctx.db.patch(link.pageId, { updatedAt: Date.now() });
  },
});

export const listLinkablesBySubject = query({
  args: { subject: v.string() },
  handler: async (ctx, { subject }) => {
    const userIds = await getUserIds(ctx);

    const bySubject = (value: string) => value.trim().toLowerCase() === subject.trim().toLowerCase();

    const homeworkPrimary = await ctx.db
      .query("homework")
      .withIndex("by_user", (q) => q.eq("userId", userIds.userId))
      .take(400);
    const testsPrimary = await ctx.db
      .query("tests")
      .withIndex("by_user", (q) => q.eq("userId", userIds.userId))
      .take(400);

    let homework = homeworkPrimary;
    let tests = testsPrimary;

    if (userIds.legacyUserId) {
      const homeworkLegacy = await ctx.db
        .query("homework")
        .withIndex("by_user", (q) => q.eq("userId", userIds.legacyUserId!))
        .take(400);
      const testsLegacy = await ctx.db
        .query("tests")
        .withIndex("by_user", (q) => q.eq("userId", userIds.legacyUserId!))
        .take(400);

      homework = [...homeworkPrimary, ...homeworkLegacy];
      tests = [...testsPrimary, ...testsLegacy];
    }

    return {
      homework: homework
        .filter((item) => bySubject(item.subject))
        .sort((a, b) => a.dueDate - b.dueDate)
        .slice(0, 200),
      tests: tests
        .filter((item) => bySubject(item.subject))
        .sort((a, b) => a.date - b.date)
        .slice(0, 200),
    };
  },
});
