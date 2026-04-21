import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

type ParsedCode = {
  school: string;
  accessToken: string;
  student: string;
};

type LiveScheduleAppointment = {
  icalUid: string;
  subject: string;
  startTime: number;
  endTime: number;
  location?: string;
  isEvent: boolean;
};

async function requireUserId(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject as string;
}

function toIsoWeekString(sourceDate: Date): string {
  const date = new Date(Date.UTC(sourceDate.getFullYear(), sourceDate.getMonth(), sourceDate.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7);
  return `${date.getUTCFullYear()}${String(week).padStart(2, "0")}`;
}

function normalizeTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1_000_000_000_000) return value;
    if (value > 1_000_000_000) return value * 1000;
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return normalizeTimestamp(numeric);
    const parsed = Date.parse(trimmed);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

function normalizeString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (entry == null) return "";
        if (typeof entry === "string") return entry.trim();
        if (typeof entry === "number" || typeof entry === "boolean") return String(entry);
        if (typeof entry === "object") {
          const maybeObj = entry as Record<string, unknown>;
          const text = maybeObj.name ?? maybeObj.label ?? maybeObj.code ?? maybeObj.value;
          return normalizeString(text);
        }
        return "";
      })
      .filter(Boolean);
  }
  const single = normalizeString(value);
  return single ? [single] : [];
}

function parseExternalAppCode(input: string): ParsedCode {
  const raw = input.trim();
  if (!raw) {
    throw new Error("External application code is required.");
  }

  // Accept JSON payloads as well as compact strings.
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const school = normalizeString(parsed.school ?? parsed.schoolName ?? parsed.portal);
      const accessToken = normalizeString(parsed.accessToken ?? parsed.token ?? parsed.externalAppCode);
      const student = normalizeString(parsed.student ?? parsed.teacher ?? "~me") || "~me";
      if (school && accessToken) {
        return { school, accessToken, student };
      }
    } catch {
      // Fall through to compact parsing.
    }
  }

  // Accept URLs that contain token params.
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      const school = url.hostname.split(".")[0] ?? "";
      const accessToken =
        url.searchParams.get("access_token") ??
        url.searchParams.get("token") ??
        url.searchParams.get("externalAppCode") ??
        "";
      const student = url.searchParams.get("student") ?? url.searchParams.get("teacher") ?? "~me";
      if (school && accessToken) {
        return { school, accessToken, student };
      }
    } catch {
      // Fall through to compact parsing.
    }
  }

  // Accept compact format: "school:token:student" (or teacher code).
  const compactWithUserMatch = raw.match(/^([a-z0-9-]+)\s*[:|]\s*([^:|]+)\s*[:|]\s*([^:|]+)$/i);
  if (compactWithUserMatch) {
    const school = compactWithUserMatch[1].trim();
    const accessToken = compactWithUserMatch[2].trim();
    const student = compactWithUserMatch[3].trim() || "~me";
    return { school, accessToken, student };
  }

  // Accept compact format: "school:token" or "school|token".
  const compactMatch = raw.match(/^([a-z0-9-]+)\s*[:|]\s*(.+)$/i);
  if (compactMatch) {
    const school = compactMatch[1].trim();
    const accessToken = compactMatch[2].trim();
    return { school, accessToken, student: "~me" };
  }

  throw new Error(
    "Invalid external application code format. Use 'school:token' (for example: myschool:abc123).",
  );
}

function unwrapLiveScheduleData(payload: unknown): Array<Record<string, unknown>> {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data =
    (root.response as Record<string, unknown> | undefined)?.data ??
    root.data ??
    [];

  if (!Array.isArray(data)) return [];

  const flattened: Array<Record<string, unknown>> = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;

    if (Array.isArray(obj.appointments)) {
      for (const appt of obj.appointments) {
        if (appt && typeof appt === "object") flattened.push(appt as Record<string, unknown>);
      }
      continue;
    }

    flattened.push(obj);
  }

  return flattened;
}

function mapAppointmentToLesson(item: Record<string, unknown>): LiveScheduleAppointment | null {
  const status = typeof item.status === "number" ? item.status : undefined;
  const cancelled = item.cancelled === true || status === 4007;
  if (cancelled) return null;

  const startTime =
    normalizeTimestamp(item.startTime) ??
    normalizeTimestamp(item.start) ??
    normalizeTimestamp(item.begin);
  const endTime =
    normalizeTimestamp(item.endTime) ??
    normalizeTimestamp(item.end) ??
    normalizeTimestamp(item.finish);
  if (!startTime || !endTime || endTime <= startTime) return null;

  const subjects = toStringList(item.subjects);
  const locations = toStringList(item.locations);
  const teachers = toStringList(item.teachers);

  const subject =
    normalizeString(item.subject) ||
    subjects.join(" /") ||
    normalizeString(item.title) ||
    normalizeString(item.description) ||
    "Lesson";

  const location = normalizeString(item.location) || locations.join(", ") || undefined;
  const teacherLabel = teachers.length > 0 ? ` (${teachers.join(", ")})` : "";

  const idBits = [
    normalizeString(item.id),
    normalizeString(item.appointmentInstance),
    String(startTime),
    String(endTime),
    subject,
    location ?? "",
  ].filter(Boolean);

  return {
    icalUid: idBits.join("|"),
    subject: `${subject}${teacherLabel}`,
    startTime,
    endTime,
    location,
    isEvent: false,
  };
}

export const syncCalendar = action({
  args: {
    externalAppCode: v.optional(v.string()),
    icalUrl: v.optional(v.string()),
    userId: v.optional(v.string()),
    weekStartMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const code = args.externalAppCode ?? args.icalUrl;
    if (!code) {
      throw new Error("Missing external application code.");
    }
    const parsed = parseExternalAppCode(code);
    const week = toIsoWeekString(new Date(args.weekStartMs ?? Date.now()));

    const buildEndpoint = (withAccessTokenQuery: boolean) => {
      const endpoint = new URL(`https://${parsed.school}.zportal.nl/api/v3/liveschedule`);
      endpoint.searchParams.set("week", week);
      endpoint.searchParams.set(parsed.student === "~me" ? "student" : "teacher", parsed.student);
      if (withAccessTokenQuery) {
        endpoint.searchParams.set("access_token", parsed.accessToken);
      }
      return endpoint;
    };

    let response = await fetch(buildEndpoint(false).toString(), {
      headers: {
        Authorization: `Bearer ${parsed.accessToken}`,
      },
    });

    // Some portals expect token in query instead of Authorization header.
    if (response.status === 401) {
      response = await fetch(buildEndpoint(true).toString());
    }

    if (!response.ok) {
      const details = (await response.text()).slice(0, 220);
      throw new Error(
        `Failed to fetch Zermelo liveschedule (${response.status}). ${details || "Authorization failed."}`,
      );
    }

    const payload = await response.json();
    const appointments = unwrapLiveScheduleData(payload);
    const lessons = appointments
      .map(mapAppointmentToLesson)
      .filter((lesson): lesson is LiveScheduleAppointment => lesson !== null);

    await ctx.runMutation(internal.lessons.deleteAllForUser, { userId });

    let upserted = 0;
    for (const lesson of lessons) {
      await ctx.runMutation(internal.lessons.upsert, {
        userId,
        ...lesson,
      });
      upserted += 1;
    }

    await ctx.runMutation(api.userSettings.markSynced);

    return {
      count: upserted,
      week,
    };
  },
});
