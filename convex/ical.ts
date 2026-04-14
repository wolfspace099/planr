import { action, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

function extractField(text: string, field: string): string | undefined {
  const regex = new RegExp(`^${field}(?:;[^:]*)?:(.+)$`, "m");
  const match = text.match(regex);
  if (!match) return undefined;
  let value = match[1].trim();
  value = value.replace(/\n[ \t]/g, "");
  return value;
}

function decodeIcalText(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

const SUBJECT_MAP: Record<string, string> = {
  wis: "Wiskunde", wi: "Wiskunde",
  ned: "Nederlands", nl: "Nederlands", dutl: "Nederlands", netl: "Nederlands",
  en: "Engels", eng: "Engels", eng2: "Engels",
  du: "Duits", dui: "Duits",
  fr: "Frans", fra: "Frans",
  bi: "Biologie", bio: "Biologie", biol: "Biologie",
  na: "Natuurkunde", nat: "Natuurkunde",
  sk: "Scheikunde", sch: "Scheikunde", ci: "Scheikunde",
  ak: "Aardrijkskunde", aard: "Aardrijkskunde",
  gs: "Geschiedenis", ges: "Geschiedenis",
  ec: "Economie", eco: "Economie",
  m: "Maatschappijleer", ma: "Maatschappijleer",
  lo: "Lichamelijke Opvoeding", pe: "Lichamelijke Opvoeding", sport: "Lichamelijke Opvoeding",
  ckv: "Ckv", mu: "Muziek", tek: "Tekenen", bk: "Beeldende Kunst",
  inf: "Informatica", in: "Informatica", aco: "Aco", ac: "Aco",
  net: "Netwerken", sc: "Security", sv: "Systeembeheer", sys: "Systeembeheer",
  rs: "Religie", fil: "Filosofie", lat: "Latijn", gri: "Grieks", nask: "Nask",
  lob: "Lob", civ: "Civics", civics: "Civics",
};

const NON_ACADEMIC_KEYWORDS = ["theater", "thea", "s", "drama"];

function extractZermeloSubject(raw: string): { subject: string; location: string | undefined; isEvent: boolean } {
  let s = decodeIcalText(raw).trim();

  // 1. Strip leading time: "09:20 "
  s = s.replace(/^\d{1,2}:\d{2}\s*/, "").trim();

  // 2. Strip all flag tokens: [>], [!], [o], [x], etc.
  s = s.replace(/(\[[^\]]*\]\s*)+/g, "").trim();

  // 3. Extract room code — first token that contains a digit (w107, wsh1, A.101, lok3)
  let location: string | undefined;
  const tokens = s.split(/\s+/);
  const roomIdx = tokens.findIndex((t) => /\d/.test(t));
  if (roomIdx !== -1) {
    location = tokens[roomIdx];
    tokens.splice(roomIdx, 1);
  }

  // 4. First remaining token is the subject abbreviation; last token is class.lesson (ignored)
  const code = tokens[0]?.toLowerCase() ?? "";
  let subject = code;
  let isEvent = false;
  
  if (!code) {
    subject = decodeIcalText(raw);
  } else {
    // Check if it's a non-academic event
    if (NON_ACADEMIC_KEYWORDS.includes(code)) {
      isEvent = true;
      subject = code.charAt(0).toUpperCase() + code.slice(1);
    } else {
      const mapped = SUBJECT_MAP[code];
      if (mapped) {
        subject = mapped;
      } else {
        // For unmapped codes, capitalize first letter only
        subject = code.charAt(0).toUpperCase() + code.slice(1);
      }
    }
  }

  return { subject, location, isEvent };
}

function parseIcalDate(dtStr: string): number {
  const clean = dtStr.replace(/^(?:TZID=[^:]+:)?/, "").trim();
  if (clean.length === 8) {
    const y = clean.slice(0, 4), m = clean.slice(4, 6), d = clean.slice(6, 8);
    return new Date(`${y}-${m}-${d}T00:00:00`).getTime();
  }
  const y = clean.slice(0, 4), mo = clean.slice(4, 6), d = clean.slice(6, 8);
  const h = clean.slice(9, 11), mi = clean.slice(11, 13), s = clean.slice(13, 15);
  if (clean.endsWith("Z")) return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s);
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`).getTime();
}

function parseIcal(icalText: string): Array<{
  icalUid: string; subject: string; startTime: number; endTime: number; location?: string; isEvent: boolean;
}> {
  const normalised = icalText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
  const eventBlocks = normalised.split("BEGIN:VEVENT").slice(1);
  const results = [];
  for (const block of eventBlocks) {
    const endIdx = block.indexOf("END:VEVENT");
    const text = endIdx >= 0 ? block.slice(0, endIdx) : block;
    const uid = extractField(text, "UID");
    const summary = extractField(text, "SUMMARY");
    const dtstart = extractField(text, "DTSTART");
    const dtend = extractField(text, "DTEND");
    const locationField = extractField(text, "LOCATION");
    if (!uid || !summary || !dtstart || !dtend) continue;
    // Skip lessons marked as cancelled with [x]
    if (/\[x\]/i.test(summary)) continue;
    const { subject, location: roomFromSummary, isEvent } = extractZermeloSubject(summary);
    results.push({
      icalUid: uid,
      subject,
      startTime: parseIcalDate(dtstart),
      endTime: parseIcalDate(dtend),
      location: locationField ? decodeIcalText(locationField) : roomFromSummary,
      isEvent,
    });
  }
  return results;
}

export const syncCalendar = action({
  args: { userId: v.string(), icalUrl: v.string() },
  handler: async (ctx, { userId, icalUrl }) => {
    const response = await fetch(icalUrl);
    if (!response.ok) throw new Error(`Failed to fetch iCal: ${response.status}`);
    const icalText = await response.text();
    const events = parseIcal(icalText);

    // Delete all existing lessons for this user before syncing new ones
    await ctx.runMutation(internal.lessons.deleteAllForUser, { userId });

    let upserted = 0;
    for (const event of events) {
      await ctx.runMutation(internal.lessons.upsert, { userId, ...event });
      upserted++;
    }
    await ctx.runMutation(api.userSettings.markSynced);
    return { count: upserted };
  },
});