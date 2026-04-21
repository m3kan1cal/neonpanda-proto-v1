import { convertUtcToUserDate } from "./date-utils";

/**
 * Deterministic date math helpers for AI agents.
 *
 * These helpers exist so the LLM never has to count days. They resolve
 * user-provided date references (absolute ISO, "tomorrow", "this saturday",
 * "in 3 weeks", etc.) to concrete YYYY-MM-DD strings in the user's timezone
 * and compute day-count deltas.
 *
 * All math operates on **calendar days in the user's timezone** — not elapsed
 * milliseconds — so "1 day from now" is always "tomorrow's date" even if the
 * caller is at 11:59pm.
 */

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const MONTH_NAMES: Record<string, number> = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sept: 9,
  sep: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

/**
 * Parse a YYYY-MM-DD string into a Date representing 12:00 UTC on that day.
 * Using noon UTC avoids off-by-one issues when formatting back in any TZ.
 */
const isoDateToNoonUtc = (isoDate: string): Date => {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
};

/**
 * Add N calendar days to a YYYY-MM-DD string and return a new YYYY-MM-DD.
 * Operates in UTC so it's independent of the caller's timezone.
 */
export const addDays = (isoDate: string, days: number): string => {
  const base = isoDateToNoonUtc(isoDate);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
};

/**
 * Return the day-of-week (0 = Sunday, 6 = Saturday) for a YYYY-MM-DD string.
 *
 * The weekday of an ISO calendar date is globally fixed — 2026-04-20 is
 * Monday everywhere — so this is intentionally timezone-independent. We
 * parse to noon UTC (same as every other helper in this module) and read
 * the weekday directly via getUTCDay().
 *
 * An earlier version formatted the noon-UTC Date via Intl.DateTimeFormat
 * with a timezone, which silently returned the wrong weekday for users at
 * UTC+12 and above (Pacific/Auckland, Pacific/Tongatapu, Pacific/Kiritimati,
 * etc.) because noon UTC lands on the following local calendar day there.
 *
 * The timezone parameter is retained on the signature for call-site
 * compatibility but is unused; a future cleanup can drop it.
 */
const weekdayForIsoDate = (isoDate: string, _timezone: string): number => {
  return isoDateToNoonUtc(isoDate).getUTCDay();
};

/**
 * Calendar-day difference between two YYYY-MM-DD strings: (target - base).
 * Positive = target is in the future.
 */
export const diffInCalendarDays = (
  baseIsoDate: string,
  targetIsoDate: string,
): number => {
  const base = isoDateToNoonUtc(baseIsoDate).getTime();
  const target = isoDateToNoonUtc(targetIsoDate).getTime();
  return Math.round((target - base) / (24 * 60 * 60 * 1000));
};

/**
 * Days-until a target date, in calendar days, from `now` in the user's TZ.
 * Negative values indicate a past date.
 */
export const daysUntil = (
  targetIsoDate: string,
  now: Date,
  timezone: string,
): number => {
  const today = convertUtcToUserDate(now, timezone);
  return diffInCalendarDays(today, targetIsoDate);
};

/**
 * Return the weekday label ("Monday", etc.) for a YYYY-MM-DD string.
 */
export const weekdayLabelForIsoDate = (
  isoDate: string,
  timezone: string,
): string => {
  return WEEKDAY_LABELS[weekdayForIsoDate(isoDate, timezone)];
};

/**
 * Attempt to resolve a natural-language or ISO date reference into a concrete
 * YYYY-MM-DD string in the user's timezone.
 *
 * Supported shapes (case-insensitive):
 * - `2026-05-03` — ISO passthrough (validated)
 * - `today`, `tonight`, `this morning`, `this afternoon`, `this evening`
 * - `tomorrow`, `yesterday`
 * - `this monday` / `this sat` — the occurrence of that weekday in the current week
 *   (past if already passed, or today/future if not yet reached)
 * - `next monday` / `next sat` — the following week's occurrence (always 7-13 days out)
 * - `last monday` — the previous occurrence
 * - `in 3 days`, `in 2 weeks`, `in 1 month`
 * - `3 days ago`, `2 weeks ago`
 * - `may 3`, `may 3 2026`, `3 may`, `may 3rd` — month/day, with optional year
 *
 * Returns null if the phrase cannot be confidently resolved. Callers should
 * then ask the user for clarification rather than guess.
 */
export const resolveRelativeDate = (
  phrase: string,
  now: Date,
  timezone: string,
): string | null => {
  if (!phrase || typeof phrase !== "string") return null;

  const trimmed = phrase.trim().toLowerCase();
  if (!trimmed) return null;

  const today = convertUtcToUserDate(now, timezone);

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return isValidIsoDate(trimmed) ? trimmed : null;
  }

  if (
    [
      "today",
      "tonight",
      "this morning",
      "this afternoon",
      "this evening",
    ].includes(trimmed)
  ) {
    return today;
  }

  if (trimmed === "tomorrow") return addDays(today, 1);
  if (trimmed === "yesterday") return addDays(today, -1);

  const thisDow = matchWeekdayPhrase(trimmed, "this");
  if (thisDow !== null) {
    const todayDow = weekdayForIsoDate(today, timezone);
    const delta = thisDow - todayDow;
    return addDays(today, delta);
  }

  const nextDow = matchWeekdayPhrase(trimmed, "next");
  if (nextDow !== null) {
    const todayDow = weekdayForIsoDate(today, timezone);
    const delta = ((nextDow - todayDow + 7) % 7) + 7;
    return addDays(today, delta);
  }

  const lastDow = matchWeekdayPhrase(trimmed, "last");
  if (lastDow !== null) {
    const todayDow = weekdayForIsoDate(today, timezone);
    const delta = (todayDow - lastDow + 7) % 7 || 7;
    return addDays(today, -delta);
  }

  const inMatch = trimmed.match(
    /^in\s+(\d+)\s+(day|days|week|weeks|month|months)$/,
  );
  if (inMatch) {
    const n = parseInt(inMatch[1], 10);
    const unit = inMatch[2];
    if (unit.startsWith("day")) return addDays(today, n);
    if (unit.startsWith("week")) return addDays(today, n * 7);
    if (unit.startsWith("month")) return addMonths(today, n);
  }

  const agoMatch = trimmed.match(
    /^(\d+)\s+(day|days|week|weeks|month|months)\s+ago$/,
  );
  if (agoMatch) {
    const n = parseInt(agoMatch[1], 10);
    const unit = agoMatch[2];
    if (unit.startsWith("day")) return addDays(today, -n);
    if (unit.startsWith("week")) return addDays(today, -n * 7);
    if (unit.startsWith("month")) return addMonths(today, -n);
  }

  const monthDay = parseMonthDay(trimmed, today);
  if (monthDay) return monthDay;

  return null;
};

const matchWeekdayPhrase = (
  phrase: string,
  prefix: "this" | "next" | "last",
): number | null => {
  const m = phrase.match(
    new RegExp(
      `^${prefix}\\s+(sunday|sun|monday|mon|tuesday|tue|tues|wednesday|wed|thursday|thu|thurs|friday|fri|saturday|sat)$`,
    ),
  );
  if (!m) return null;
  return normalizeWeekday(m[1]);
};

const normalizeWeekday = (name: string): number => {
  const n = name.toLowerCase();
  if (n.startsWith("sun")) return 0;
  if (n.startsWith("mon")) return 1;
  if (n.startsWith("tue")) return 2;
  if (n.startsWith("wed")) return 3;
  if (n.startsWith("thu")) return 4;
  if (n.startsWith("fri")) return 5;
  return 6;
};

const addMonths = (isoDate: string, months: number): string => {
  const [y, m, d] = isoDate.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 + months, d, 12, 0, 0));
  return base.toISOString().slice(0, 10);
};

const isValidIsoDate = (iso: string): boolean => {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
};

const parseMonthDay = (phrase: string, today: string): string | null => {
  // "may 3", "may 3rd", "may 3 2026", "3 may", "3 may 2026"
  const clean = phrase.replace(/(\d+)(st|nd|rd|th)/, "$1");

  let m = clean.match(/^([a-z]+)\s+(\d{1,2})(?:[,\s]+(\d{4}))?$/);
  if (!m) {
    m = clean.match(/^(\d{1,2})\s+([a-z]+)(?:[,\s]+(\d{4}))?$/);
    if (m) {
      const day = parseInt(m[1], 10);
      const monthNum = MONTH_NAMES[m[2]];
      const year = m[3] ? parseInt(m[3], 10) : undefined;
      return buildMonthDay(monthNum, day, year, today);
    }
    return null;
  }

  const monthNum = MONTH_NAMES[m[1]];
  const day = parseInt(m[2], 10);
  const year = m[3] ? parseInt(m[3], 10) : undefined;
  return buildMonthDay(monthNum, day, year, today);
};

const buildMonthDay = (
  monthNum: number | undefined,
  day: number,
  explicitYear: number | undefined,
  today: string,
): string | null => {
  if (!monthNum || !day || day < 1 || day > 31) return null;

  const [currentYear] = today.split("-").map(Number);

  let year = explicitYear ?? currentYear;
  const candidate = `${String(year).padStart(4, "0")}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  if (!isValidIsoDate(candidate)) return null;

  if (!explicitYear) {
    // If the date has already passed this year, it's ambiguous without an explicit year.
    // Return null rather than confidently rolling forward to next year.
    // This is critical for past-tense contexts like workout logging where "march 15"
    // almost always means the recent past, not next year.
    if (diffInCalendarDays(today, candidate) < 0) {
      return null;
    }
  }

  return candidate;
};

export interface ResolvedDate {
  input: string;
  isoDate: string | null;
  dayOfWeek: string | null;
  daysFromToday: number | null;
  resolved: boolean;
}

/**
 * Resolve a batch of date references. Convenience wrapper for agent tools.
 */
export const resolveDateReferences = (
  references: string[],
  now: Date,
  timezone: string,
): ResolvedDate[] => {
  return references.map((ref) => {
    const iso = resolveRelativeDate(ref, now, timezone);
    if (!iso) {
      return {
        input: ref,
        isoDate: null,
        dayOfWeek: null,
        daysFromToday: null,
        resolved: false,
      };
    }
    return {
      input: ref,
      isoDate: iso,
      dayOfWeek: weekdayLabelForIsoDate(iso, timezone),
      daysFromToday: daysUntil(iso, now, timezone),
      resolved: true,
    };
  });
};
