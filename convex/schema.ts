import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  userSettings: defineTable({
    userId: v.string(),
    icalUrl: v.optional(v.string()),
    lastIcalSync: v.optional(v.number()),
    externalAppCode: v.optional(v.string()),
    zermeloSchool: v.optional(v.string()),
    zermeloUsername: v.optional(v.string()),
    zermeloAccessToken: v.optional(v.string()),
    zermeloTokenUpdatedAt: v.optional(v.number()),
    lastScheduleSync: v.optional(v.number()),
    syncLockId: v.optional(v.string()),
    syncLockUntil: v.optional(v.number()),
    displayName: v.optional(v.string()),
  }).index("by_user", ["userId"]),

  lessons: defineTable({
    userId: v.string(),
    icalUid: v.string(),
    subject: v.string(),
    teachers: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    isEvent: v.optional(v.boolean()),
    chapterId: v.optional(v.id("chapters")),
  })
    .index("by_user", ["userId"])
    .index("by_user_time", ["userId", "startTime"])
    .index("by_ical_uid", ["userId", "icalUid"]),

  chapters: defineTable({
    userId: v.string(),
    subject: v.string(),
    name: v.string(),
    order: v.number(),
  }).index("by_user_subject", ["userId", "subject"]),

  notes: defineTable({
    userId: v.string(),
    lessonId: v.optional(v.id("lessons")), // optional — null for subject notebook notes
    subject: v.optional(v.string()),        // for subject-level notebook notes
    content: v.string(),
    updatedAt: v.number(),
  })
    .index("by_lesson", ["lessonId"])
    .index("by_user", ["userId"])
    .index("by_user_subject", ["userId", "subject"]),

  notebookPages: defineTable({
    userId: v.string(),
    subject: v.string(),
    title: v.string(),
    chapter: v.optional(v.string()),
    noteDate: v.optional(v.number()),
    tags: v.array(v.string()),
    typedContent: v.string(),
    drawingStrokes: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_subject_and_updatedAt", ["userId", "subject", "updatedAt"]),

  notebookPagePhotos: defineTable({
    userId: v.string(),
    pageId: v.id("notebookPages"),
    storageId: v.id("_storage"),
    caption: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_page", ["pageId"])
    .index("by_user", ["userId"]),

  notebookPageLinks: defineTable({
    userId: v.string(),
    pageId: v.id("notebookPages"),
    kind: v.union(v.literal("homework"), v.literal("test")),
    homeworkId: v.optional(v.id("homework")),
    testId: v.optional(v.id("tests")),
    createdAt: v.number(),
  })
    .index("by_page", ["pageId"])
    .index("by_user", ["userId"]),

  homework: defineTable({
    userId: v.string(),
    lessonId: v.optional(v.id("lessons")),
    subject: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.number(),
    done: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_lesson", ["lessonId"])
    .index("by_user_due", ["userId", "dueDate"]),

  tasks: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    lessonId: v.optional(v.id("lessons")),
    subject: v.optional(v.string()),
    priority: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
    done: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_due", ["userId", "dueDate"]),

  tests: defineTable({
    userId: v.string(),
    subject: v.string(),
    topic: v.string(),
    date: v.number(),
    lessonId: v.optional(v.id("lessons")),
    description: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_date", ["userId", "date"]),

  testSubtasks: defineTable({
    userId: v.string(),
    testId: v.id("tests"),
    title: v.string(),
    done: v.boolean(),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_test", ["testId"])
    .index("by_user", ["userId"]),

  studySessions: defineTable({
    userId: v.string(),
    testId: v.id("tests"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    done: v.boolean(),
    color: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_test", ["testId"])
    .index("by_user_time", ["userId", "startTime"]),

  homeworkSessions: defineTable({
    userId: v.string(),
    homeworkId: v.id("homework"),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    done: v.boolean(),
    color: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_homework", ["homeworkId"])
    .index("by_user_time", ["userId", "startTime"]),

  rehearsalSessions: defineTable({
    userId: v.string(),
    subject: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    done: v.boolean(),
    color: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_time", ["userId", "startTime"]),

  habits: defineTable({
    userId: v.string(),
    name: v.string(),
    emoji: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.number(),
    active: v.boolean(),
  }).index("by_user", ["userId"]),

  habitCompletions: defineTable({
    userId: v.string(),
    habitId: v.id("habits"),
    date: v.string(),
  })
    .index("by_habit_date", ["habitId", "date"])
    .index("by_user_date", ["userId", "date"]),

  appointments: defineTable({
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    location: v.optional(v.string()),
    isRecurring: v.boolean(),
    recurringDayOfWeek: v.optional(v.number()),
    recurringTimeHHMM: v.optional(v.string()),
    recurringEndDate: v.optional(v.number()),
    color: v.optional(v.string()),
    calendarId: v.optional(v.id("calendars")),
  }).index("by_user", ["userId"]),

  calendars: defineTable({
    userId: v.string(),
    name: v.string(),
    color: v.string(),
    visible: v.boolean(),
    isSchedule: v.optional(v.boolean()),
    icalUrl: v.optional(v.string()),
    order: v.number(),
  }).index("by_user", ["userId"]),

  inkStrokes: defineTable({
    userId: v.string(),
    subject: v.string(),
    strokes: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_subject", ["userId", "subject"]),
});
