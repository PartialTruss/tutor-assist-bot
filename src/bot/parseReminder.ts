import { calendarDate, isIsoDate, zonedTimeToUtc } from "../time.js";

const MAX_AHEAD_MS = 2 * 366 * 24 * 60 * 60 * 1000;
const INPUT =
  /^(today|tomorrow|\d{4}-\d{2}-\d{2}|\d{1,2}[./-]\d{1,2}(?:[./-]\d{4})?)\s+(?:at\s+)?(\d{1,2}(?:[:.]\d{2})?(?:\s*[ap]m)?)\s+([\s\S]+)$/i;

export type ParsedReminder =
  | { ok: true; dueAt: Date; text: string }
  | { ok: false; error: string; showExamples: boolean };

interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

export function reminderExamples(timeZone: string): string {
  return [
    `Times use ${timeZone}. Send a date, a time, and a note.`,
    "",
    "tomorrow 18:30 Call Sara",
    "02/11 18:30 Prepare the class",
    "2026-11-02 18:30 Submit grades",
  ].join("\n");
}

export function parseReminderInput(
  raw: string,
  timeZone: string,
  now = new Date(),
): ParsedReminder {
  const match = INPUT.exec(raw.trim());
  if (!match) {
    return { ok: false, error: "I need a date, a time, and a note.", showExamples: true };
  }

  const dateToken = match[1] ?? "";
  const timeToken = match[2] ?? "";
  const text = (match[3] ?? "").trim();
  if (!text) {
    return { ok: false, error: "Add a note after the time.", showExamples: true };
  }
  if (text.length > 1000) {
    return { ok: false, error: "Keep the note under 1000 characters.", showExamples: false };
  }

  const clock = parseClock(timeToken);
  if (!clock) {
    return { ok: false, error: "Use a time like 18:30 or 6:30pm.", showExamples: true };
  }

  const day = resolveDay(dateToken, timeZone, now);
  if (!day) {
    return {
      ok: false,
      error: "That date is not valid. Use a day/month like 02/11, or YYYY-MM-DD.",
      showExamples: true,
    };
  }

  const dueAt = clockTime(day, clock.hour, clock.minute, timeZone);
  if (!dueAt) {
    return { ok: false, error: `That time does not exist in ${timeZone}.`, showExamples: false };
  }

  const checked = adjustYear(dateToken, day, dueAt, clock, timeZone, now);
  if ("error" in checked) return { ok: false, error: checked.error, showExamples: false };
  if (checked.dueAt.getTime() - now.getTime() > MAX_AHEAD_MS) {
    return { ok: false, error: "Pick a time within the next two years.", showExamples: false };
  }

  return { ok: true, dueAt: checked.dueAt, text };
}

function parseClock(token: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2})(?:[:.](\d{2}))?\s*([ap]m)?$/i.exec(token.trim());
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const suffix = match[3]?.toLowerCase();
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return null;

  if (suffix) {
    if (hour < 1 || hour > 12) return null;
    if (suffix === "pm" && hour < 12) hour += 12;
    if (suffix === "am" && hour === 12) hour = 0;
  } else if (hour > 23) {
    return null;
  }

  return { hour, minute };
}

function resolveDay(token: string, timeZone: string, now: Date): CalendarDay | null {
  const lower = token.toLowerCase();
  if (lower === "today" || lower === "tomorrow") {
    const iso = lower === "tomorrow" ? shiftIsoDate(calendarDate(timeZone, now), 1) : calendarDate(timeZone, now);
    return parseIsoDay(iso);
  }

  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(token);
  if (full) return isoDay(Number(full[1]), Number(full[2]), Number(full[3]));

  const numeric = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{4}))?$/.exec(token);
  if (!numeric) return null;

  const day = Number(numeric[1]);
  const month = Number(numeric[2]);
  if (numeric[3]) return isoDay(Number(numeric[3]), month, day);

  const thisYear = Number(calendarDate(timeZone, now).slice(0, 4));
  return firstValidYear(thisYear, month, day);
}

/** Day/month with no year rolls forward when that date has already passed. */
function adjustYear(
  dateToken: string,
  day: CalendarDay,
  dueAt: Date,
  clock: { hour: number; minute: number },
  timeZone: string,
  now: Date,
): { dueAt: Date } | { error: string } {
  const dateOnly = /^\d{1,2}[./-]\d{1,2}$/.test(dateToken);
  const status = whenStatus(dueAt, now, timeZone);
  if (status !== "past") return { dueAt };
  if (!dateOnly) return { error: "That time has already passed." };

  const today = calendarDate(timeZone, now);
  const requested = isoFromParts(day.year, day.month, day.day);
  if (requested === today) return { error: "That time has already passed." };

  const next = firstValidYear(day.year + 1, day.month, day.day);
  if (!next) return { error: "That date is not valid." };
  const rolled = clockTime(next, clock.hour, clock.minute, timeZone);
  if (!rolled) return { error: `That time does not exist in ${timeZone}.` };
  if (whenStatus(rolled, now, timeZone) === "past") {
    return { error: "That time has already passed." };
  }
  return { dueAt: rolled };
}

function whenStatus(dueAt: Date, now: Date, timeZone: string): "future" | "now" | "past" {
  if (dueAt.getTime() > now.getTime()) return "future";
  return minuteKey(dueAt, timeZone) === minuteKey(now, timeZone) ? "now" : "past";
}

function minuteKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")} ${read("hour")}:${read("minute")}`;
}

function clockTime(
  day: CalendarDay,
  hour: number,
  minute: number,
  timeZone: string,
): Date | null {
  try {
    return zonedTimeToUtc(day.year, day.month, day.day, hour, minute, timeZone);
  } catch {
    return null;
  }
}

function firstValidYear(startYear: number, month: number, day: number): CalendarDay | null {
  for (let year = startYear; year <= startYear + 4; year += 1) {
    const resolved = isoDay(year, month, day);
    if (resolved) return resolved;
  }
  return null;
}

function isoDay(year: number, month: number, day: number): CalendarDay | null {
  if (!isIsoDate(isoFromParts(year, month, day))) return null;
  return { year, month, day };
}

function parseIsoDay(iso: string): CalendarDay | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return isoDay(Number(match[1]), Number(match[2]), Number(match[3]));
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shiftIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, (day ?? 1) + days));
  return isoFromParts(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}
