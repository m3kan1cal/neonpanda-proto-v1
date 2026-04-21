import {
  convertUtcToUserDate,
  getUserTimezoneOrDefault,
  parseCompletedAt,
} from "./date-utils";
import {
  daysUntil,
  diffInCalendarDays,
  weekdayLabelForIsoDate,
} from "./date-math";

/**
 * Unified temporal context for AI prompts.
 *
 * Every AI prompt surface that reasons about "today", "tomorrow", "this week",
 * "last message", "days until a meet", etc. should embed `promptBlock` into its
 * dynamic (non-cached) prompt section. This guarantees the model sees one
 * authoritative representation of now — in the user's timezone — and is told
 * explicitly how to interpret relative and future date references.
 */

export interface UpcomingAnchor {
  label: string;
  date: string; // YYYY-MM-DD
}

export interface ResolvedUpcomingAnchor extends UpcomingAnchor {
  daysUntil: number;
  dayOfWeek: string;
}

export interface TemporalContextInput {
  userTimezone?: string | null;
  now?: Date;
  lastInteractionAt?: string | number | Date | null;
  upcomingAnchors?: UpcomingAnchor[];
}

export interface TemporalContext {
  /** The Date instance used as "now" */
  now: Date;
  /** IANA timezone used to format user-facing values */
  timezone: string;
  /** YYYY-MM-DD in the user's timezone */
  isoDate: string;
  /** Full ISO timestamp in UTC */
  isoTimestamp: string;
  /** "Monday" */
  weekday: string;
  /** "April 20, 2026" */
  localDate: string;
  /** "4:32 PM" */
  localTime: string;
  /** Yesterday's YYYY-MM-DD in the user's timezone */
  yesterdayIso: string;
  /** Tomorrow's YYYY-MM-DD in the user's timezone */
  tomorrowIso: string;
  /** Calendar days in the user's timezone since last interaction, if known */
  daysSinceLastInteraction: number | null;
  /** Last interaction date in user-local YYYY-MM-DD, if known */
  lastInteractionDate: string | null;
  /** Resolved upcoming anchors with day counts */
  upcomingAnchors: ResolvedUpcomingAnchor[];
  /** The canonical string to embed into system prompts */
  promptBlock: string;
}

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

/**
 * Build the authoritative temporal context for an AI prompt.
 *
 * This is the single source of truth for "today" across every agent, builder,
 * summary, and profile generation path. Callers embed `result.promptBlock` into
 * their dynamic system prompt section. Prompt caching is unaffected because
 * this content is already expected to change per-turn.
 */
export const buildTemporalContext = (
  input: TemporalContextInput = {},
): TemporalContext => {
  const now = input.now ?? new Date();
  const timezone = getUserTimezoneOrDefault(input.userTimezone ?? null);

  const isoDate = convertUtcToUserDate(now, timezone);
  const isoTimestamp = now.toISOString();

  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: timezone,
  }).format(now);

  const localDate = new Intl.DateTimeFormat("en-US", {
    ...DATE_OPTIONS,
    timeZone: timezone,
  }).format(now);

  const localTime = new Intl.DateTimeFormat("en-US", {
    ...TIME_OPTIONS,
    timeZone: timezone,
  }).format(now);

  const yesterdayIso = shiftDate(isoDate, -1);
  const tomorrowIso = shiftDate(isoDate, 1);

  let daysSinceLastInteraction: number | null = null;
  let lastInteractionDate: string | null = null;
  if (
    input.lastInteractionAt !== undefined &&
    input.lastInteractionAt !== null
  ) {
    try {
      const lastDate = parseCompletedAt(
        input.lastInteractionAt as string | number | Date,
        "buildTemporalContext.lastInteractionAt",
      );
      lastInteractionDate = convertUtcToUserDate(lastDate, timezone);
      // Clamp negatives to 0: a future-dated lastInteractionAt (clock skew,
      // test/seed data, or a caller passing a forward-dated value) is
      // semantically nonsense. Treat it as "earlier today" so the prompt
      // block still renders a coherent recency line instead of silently
      // dropping it.
      daysSinceLastInteraction = Math.max(
        0,
        diffInCalendarDays(lastInteractionDate, isoDate),
      );
    } catch {
      daysSinceLastInteraction = null;
      lastInteractionDate = null;
    }
  }

  const upcomingAnchors: ResolvedUpcomingAnchor[] = (
    input.upcomingAnchors ?? []
  )
    .filter((a) => a && a.date && /^\d{4}-\d{2}-\d{2}$/.test(a.date))
    .map((a) => ({
      label: a.label,
      date: a.date,
      daysUntil: daysUntil(a.date, now, timezone),
      dayOfWeek: weekdayLabelForIsoDate(a.date, timezone),
    }));

  const promptBlock = formatPromptBlock({
    isoDate,
    isoTimestamp,
    weekday,
    localTime,
    timezone,
    yesterdayIso,
    tomorrowIso,
    daysSinceLastInteraction,
    lastInteractionDate,
    upcomingAnchors,
  });

  return {
    now,
    timezone,
    isoDate,
    isoTimestamp,
    weekday,
    localDate,
    localTime,
    yesterdayIso,
    tomorrowIso,
    daysSinceLastInteraction,
    lastInteractionDate,
    upcomingAnchors,
    promptBlock,
  };
};

const shiftDate = (isoDate: string, days: number): string => {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
};

interface FormatInput {
  isoDate: string;
  isoTimestamp: string;
  weekday: string;
  localTime: string;
  timezone: string;
  yesterdayIso: string;
  tomorrowIso: string;
  daysSinceLastInteraction: number | null;
  lastInteractionDate: string | null;
  upcomingAnchors: ResolvedUpcomingAnchor[];
}

const formatPromptBlock = (input: FormatInput): string => {
  const lines: string[] = [];
  lines.push("## CURRENT DATE & TIME (AUTHORITATIVE)");
  lines.push("");
  lines.push(`- Today's ISO date: ${input.isoDate}`);
  lines.push(`- Day of week: ${input.weekday}`);
  lines.push(`- Local time: ${input.localTime}`);
  lines.push(`- Timezone: ${input.timezone}`);
  lines.push(`- Current ISO timestamp: ${input.isoTimestamp}`);
  lines.push("");

  if (input.daysSinceLastInteraction !== null) {
    const days = input.daysSinceLastInteraction;
    if (days === 0) {
      lines.push(
        `The user's previous message was earlier today (${input.lastInteractionDate}).`,
      );
    } else if (days === 1) {
      lines.push(
        `It has been 1 day since the user's last message (previous message was ${input.lastInteractionDate}).`,
      );
    } else if (days > 1) {
      lines.push(
        `It has been ${days} days since the user's last message (previous message was ${input.lastInteractionDate}).`,
      );
    }
    lines.push("");
  }

  if (input.upcomingAnchors.length > 0) {
    lines.push("Upcoming dates the user has referenced:");
    for (const a of input.upcomingAnchors) {
      const rel =
        a.daysUntil === 0
          ? "today"
          : a.daysUntil === 1
            ? "1 day from today"
            : a.daysUntil > 1
              ? `${a.daysUntil} days from today`
              : `${Math.abs(a.daysUntil)} days ago`;
      lines.push(`- ${a.label} (${a.date}, ${a.dayOfWeek}): ${rel}`);
    }
    lines.push("");
  }

  lines.push("CRITICAL TEMPORAL RULES:");
  lines.push(
    `1. The current date is ${input.isoDate} (${input.weekday}). Never infer today's date from the conversation history, prior summaries, or prior assistant messages.`,
  );
  lines.push(
    `2. "Today", "this morning", "tonight", "right now" all refer to ${input.isoDate}.`,
  );
  lines.push(
    `3. "Yesterday" is ${input.yesterdayIso}. "Tomorrow" is ${input.tomorrowIso}.`,
  );
  if (
    input.daysSinceLastInteraction !== null &&
    input.daysSinceLastInteraction >= 1
  ) {
    lines.push(
      `4. Do NOT assume the user is messaging you the day after their previous message. It has been ${input.daysSinceLastInteraction} day(s). If the user references "my workout" or "that session" ambiguously, ask which date they mean before committing to one.`,
    );
  } else {
    lines.push(
      "4. Do NOT assume continuity of day when the user returns — if a date reference is ambiguous, ask which date they mean before committing to one.",
    );
  }
  lines.push(
    `5. When computing "days until" a future date, subtract ${input.isoDate} from the target ISO date. Do not estimate. If a date math tool is available (e.g. compute_date), call it rather than counting by hand.`,
  );
  lines.push(
    '6. When stating a future or past date in your response, always include both the ISO date and the day-count (e.g. "your meet on 2026-05-03 (13 days from today)"). This makes any mismatch immediately visible and user-correctable.',
  );

  return lines.join("\n");
};
