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

async function getCurrentSettings(ctx: any): Promise<any | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return await ctx.runQuery(api.userSettings.get, {});
}

function addWeeks(date: Date, weeks: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
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

function looksLikeAccessToken(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  if (v.includes(".")) return true;
  return v.length >= 24;
}

async function exchangeKoppelCodeForToken(school: string, koppelCode: string): Promise<string | null> {
  const endpoint = `https://${school}.zportal.nl/api/v3/oauth/token`;
  const body = new URLSearchParams({
    code: koppelCode,
    client_id: "ZermeloPortal",
    client_secret: "42",
    grant_type: "authorization_code",
    rememberMe: "false",
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) return null;

  const payload = await response.json();
  const token =
    normalizeString((payload as Record<string, unknown>).access_token) ||
    normalizeString((payload as Record<string, unknown>).token);
  return token || null;
}

async function exchangeLoginForToken(
  school: string,
  username: string,
  password: string,
): Promise<string | null> {
  const authEndpoint = `https://${school}.zportal.nl/api/v3/oauth`;
  const authBody = new URLSearchParams({
    username,
    password,
    client_id: "OAuthPage",
    redirect_uri: "/main/",
    scope: "",
    state: "planr",
    response_type: "code",
    tenant: school,
  });

  const authResponse = await fetch(authEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: authBody.toString(),
  });

  const authText = await authResponse.text();
  const fromText = authText.match(/(?:\?|&)code=([^&]+)/i)?.[1] ?? "";
  const fromUrl = new URL(authResponse.url).searchParams.get("code") ?? "";
  const code = decodeURIComponent(fromText || fromUrl);
  if (!code) return null;

  return await exchangeKoppelCodeForToken(school, code);
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
    zermeloSchool: v.optional(v.string()),
    zermeloUsername: v.optional(v.string()),
    zermeloPassword: v.optional(v.string()),
    icalUrl: v.optional(v.string()),
    userId: v.optional(v.string()),
    weekStartMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lockId = `sync_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const lock = await ctx.runMutation(api.userSettings.acquireSyncLock, {
      lockId,
      ttlMs: 180_000,
    });
    if (!lock.acquired) {
      return {
        count: 0,
        week: toIsoWeekString(new Date(args.weekStartMs ?? Date.now())),
        skipped: true,
      };
    }

    try {
    const userId = await requireUserId(ctx);
    const code = args.externalAppCode ?? args.icalUrl;
    const settings = await getCurrentSettings(ctx);
    const parsed = code ? parseExternalAppCode(code) : null;
    const school = normalizeString(args.zermeloSchool) || normalizeString(settings?.zermeloSchool) || parsed?.school;
    if (!school) throw new Error("Missing school name.");

    const persistedToken = normalizeString(settings?.zermeloAccessToken);
    let activeToken = persistedToken || normalizeString(parsed?.accessToken);

    const inputUsername = normalizeString(args.zermeloUsername) || normalizeString(settings?.zermeloUsername);
    const inputPassword = normalizeString(args.zermeloPassword);
    if (inputUsername && inputPassword) {
      const loginToken = await exchangeLoginForToken(school, inputUsername, inputPassword);
      if (!loginToken) throw new Error("Zermelo login failed. Check username/password.");
      activeToken = loginToken;
    }

    const parsedStudent = parsed?.student ?? "~me";
    const weekCenter = new Date(args.weekStartMs ?? Date.now());
    const weeksToFetch = Array.from({ length: 9 }, (_, i) => toIsoWeekString(addWeeks(weekCenter, i - 4)));

    const fetchWeekPayload = async (week: string) => {
      const buildEndpoint = () => {
        const endpoint = new URL(`https://${school}.zportal.nl/api/v3/liveschedule`);
        endpoint.searchParams.set("week", week);
        endpoint.searchParams.set(parsedStudent === "~me" ? "student" : "teacher", parsedStudent);
        return endpoint;
      };

      if (!activeToken) throw new Error("No token available. Login or koppelcode required.");
      let response = await fetch(buildEndpoint().toString(), {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (response.status === 401) {
        const queryEndpoint = buildEndpoint();
        queryEndpoint.searchParams.set("access_token", activeToken);
        response = await fetch(queryEndpoint.toString());
      }

      if (response.status === 401 && parsed?.accessToken && !looksLikeAccessToken(parsed.accessToken)) {
        const exchanged = await exchangeKoppelCodeForToken(school, parsed.accessToken);
        if (exchanged) {
          activeToken = exchanged;
          response = await fetch(buildEndpoint().toString(), {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
          });
          if (response.status === 401) {
            const queryEndpoint = buildEndpoint();
            queryEndpoint.searchParams.set("access_token", activeToken);
            response = await fetch(queryEndpoint.toString());
          }
        }
      }

      if (!response.ok) {
        const details = (await response.text()).slice(0, 220);
        throw new Error(
          `Failed to fetch Zermelo liveschedule (${response.status}) for week ${week}. ${details || "Authorization failed."}`,
        );
      }

      return await response.json();
    };

    const allLessons: LiveScheduleAppointment[] = [];
    for (const week of weeksToFetch) {
      const payload = await fetchWeekPayload(week);
      const lessonsForWeek = unwrapLiveScheduleData(payload)
        .map(mapAppointmentToLesson)
        .filter((lesson): lesson is LiveScheduleAppointment => lesson !== null);
      allLessons.push(...lessonsForWeek);
    }

    await ctx.runMutation(internal.lessons.deleteAllForUser, { userId });

    let upserted = 0;
    for (const lesson of allLessons) {
      await ctx.runMutation(internal.lessons.upsert, {
        userId,
        ...lesson,
      });
      upserted += 1;
    }

    await ctx.runMutation(api.userSettings.markSynced);
    if (activeToken && activeToken !== persistedToken) {
      await ctx.runMutation(api.userSettings.upsert, {
        zermeloSchool: school,
        zermeloUsername: inputUsername || undefined,
        zermeloAccessToken: activeToken,
        zermeloTokenUpdatedAt: Date.now(),
      });
    }

    return {
      count: upserted,
      week: toIsoWeekString(weekCenter),
    };
    } finally {
      await ctx.runMutation(api.userSettings.releaseSyncLock, { lockId });
    }
  },
});
