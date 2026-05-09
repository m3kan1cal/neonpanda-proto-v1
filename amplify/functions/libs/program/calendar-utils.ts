/**
 * Calendar and Date Utilities for Training Programs
 *
 * Handles all date calculations, scheduling, pause/resume logic
 * Timezone-aware to ensure accurate date handling across global users
 */

import { Program, WorkoutTemplate } from "./types";
import { convertUtcToUserDate } from "../analytics/date-utils";
import {
  diffInCalendarDays,
  weekdayLabelForIsoDate,
} from "../analytics/date-math";

/**
 * Calculate the end date of a training program based on start date and total days
 */
export function calculateEndDate(startDate: string, totalDays: number): string {
  const start = parseDate(startDate);
  const end = new Date(start);
  end.setDate(end.getDate() + totalDays - 1); // -1 because day 1 is the start date
  return formatDate(end);
}

/**
 * Calculate today's workout day number based on calendar and pauses
 * Timezone-aware: Uses user's timezone to determine "today"
 */
export function calculateCurrentDay(
  startDate: string,
  pausedDuration: number,
  totalDays: number,
  userTimezone: string,
): number {
  const start = parseDate(startDate);
  const now = new Date();

  // Get "today" in user's timezone (not server timezone)
  const todayInUserTz = convertUtcToUserDate(now, userTimezone);
  const today = new Date(todayInUserTz);

  today.setHours(0, 0, 0, 0); // Normalize to midnight
  start.setHours(0, 0, 0, 0);

  // Calculate days since start
  const daysSinceStart = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Account for pauses
  const effectiveDays = daysSinceStart - pausedDuration;

  // Calculate current day (1-indexed)
  const currentDay = effectiveDays + 1;

  // Ensure it's within training program bounds
  if (currentDay < 1) return 1;
  if (currentDay > totalDays) return totalDays;

  return currentDay;
}

/**
 * Calculate scheduled date for a specific workout day
 */
export function calculateScheduledDate(
  startDate: string,
  dayNumber: number,
  pausedDuration: number,
): string {
  const start = parseDate(startDate);
  // dayNumber is 1-indexed, so day 1 = startDate
  const daysToAdd = dayNumber - 1 + pausedDuration;
  const scheduled = new Date(start);
  scheduled.setDate(scheduled.getDate() + daysToAdd);
  return formatDate(scheduled);
}

/**
 * Calculate pause duration in days
 */
export function calculatePauseDuration(
  pausedAt: Date,
  resumedAt: Date,
): number {
  const paused = new Date(pausedAt);
  const resumed = new Date(resumedAt);
  // Use UTC to avoid DST transitions causing off-by-one errors
  const pausedDay = Date.UTC(
    paused.getFullYear(),
    paused.getMonth(),
    paused.getDate(),
  );
  const resumedDay = Date.UTC(
    resumed.getFullYear(),
    resumed.getMonth(),
    resumed.getDate(),
  );

  return Math.round((resumedDay - pausedDay) / (1000 * 60 * 60 * 24));
}

/**
 * Update all workout template scheduled dates after pause/resume
 */
export function recalculateWorkoutDates(
  workouts: WorkoutTemplate[],
  startDate: string,
  pausedDuration: number,
): WorkoutTemplate[] {
  return workouts.map((workout) => ({
    ...workout,
    scheduledDate: calculateScheduledDate(
      startDate,
      workout.dayNumber,
      pausedDuration,
    ),
  }));
}

/**
 * Check if a workout template is overdue (scheduled date has passed and not completed)
 */
export function isWorkoutOverdue(
  scheduledDate: string,
  status: WorkoutTemplate["status"],
): boolean {
  if (status === "completed" || status === "skipped") {
    return false;
  }

  const scheduled = parseDate(scheduledDate);
  const today = new Date();
  scheduled.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return today > scheduled;
}

/**
 * Get workout templates for a specific week (7-day period)
 */
export function getWorkoutsForWeek(
  workouts: WorkoutTemplate[],
  programStartDate: string,
  weekStartDate: string,
  pausedDuration: number = 0,
): WorkoutTemplate[] {
  const weekStart = parseDate(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return workouts.filter((workout) => {
    const workoutDate = parseDate(
      calculateScheduledDate(
        programStartDate,
        workout.dayNumber,
        pausedDuration,
      ),
    );
    return workoutDate >= weekStart && workoutDate <= weekEnd;
  });
}

/**
 * Get upcoming workout templates (next N templates that are pending)
 */
export function getUpcomingWorkouts(
  workouts: WorkoutTemplate[],
  count: number,
): WorkoutTemplate[] {
  const pending = workouts
    .filter((w) => w.status === "pending")
    .sort((a, b) => a.dayNumber - b.dayNumber);

  return pending.slice(0, count);
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD in user's timezone
 * This ensures "today" is correct for the user, not the server
 */
export function getTodayDate(userTimezone: string): string {
  return convertUtcToUserDate(new Date(), userTimezone);
}

/**
 * Parse YYYY-MM-DD string to Date object
 */
export function parseDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if training program is currently active based on dates
 * Timezone-aware: Uses user's timezone to determine "today"
 */
export function isProgramActive(
  status: Program["status"],
  startDate: string,
  endDate: string,
  userTimezone: string,
): boolean {
  if (status !== "active") {
    return false;
  }

  const todayInUserTz = convertUtcToUserDate(new Date(), userTimezone);
  const today = new Date(todayInUserTz);
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return today >= start && today <= end;
}

/**
 * Get training program phase for a specific day number
 */
export function getPhaseForDay(
  program: Program,
  dayNumber: number,
): Program["phases"][0] | null {
  return (
    program.phases.find(
      (phase) => dayNumber >= phase.startDay && dayNumber <= phase.endDay,
    ) || null
  );
}

/**
 * Calculate days remaining in training program
 */
export function getDaysRemaining(
  currentDay: number,
  totalDays: number,
): number {
  return Math.max(0, totalDays - currentDay + 1);
}

/**
 * Calculate training program progress percentage
 */
export function getProgressPercentage(
  currentDay: number,
  totalDays: number,
): number {
  if (totalDays === 0) return 0;
  return Math.min(100, Math.round((currentDay / totalDays) * 100));
}

/**
 * Generate day-by-day calendar for training program
 */
export interface ProgramCalendarDay {
  dayNumber: number;
  date: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  workout: WorkoutTemplate | null;
  isRestDay: boolean;
}

/**
 * Compact calendar window mapping program-day numbers to ISO dates and
 * weekdays, intended for direct injection into AI prompts.
 *
 * The conversation agent gives users the wrong date when asked "what day is
 * next bench press?" because it has only the bare `currentDay` integer and
 * no calendar mapping. Pre-computing this window server-side turns the
 * question into a lookup the model can read instead of arithmetic it would
 * have to invent.
 */
export interface ProgramCalendarWindowRow {
  dayNumber: number;
  isoDate: string;
  dayOfWeek: string;
  /**
   * Human-readable relative phrase: "today" | "yesterday" | "tomorrow" |
   * "in N days" | "N days ago".
   */
  relative: string;
}

export interface ProgramCalendarWindow {
  /** The user's "today" expressed as a program-day number (null if today is outside the program range). */
  todayDayNumber: number | null;
  /** The user's "today" ISO date in their timezone (always present). */
  todayIsoDate: string;
  /** Rows ordered by `dayNumber`, ascending. */
  rows: ProgramCalendarWindowRow[];
}

const formatRelative = (daysFromToday: number): string => {
  if (daysFromToday === 0) return "today";
  if (daysFromToday === 1) return "tomorrow";
  if (daysFromToday === -1) return "yesterday";
  if (daysFromToday > 0) return `in ${daysFromToday} days`;
  return `${Math.abs(daysFromToday)} days ago`;
};

/**
 * Build a small program-day calendar window centered on today.
 *
 * - Clamps to the program's range [1, totalDays].
 * - Returns `todayDayNumber: null` if today falls before the program starts
 *   or after it ends.
 * - Reuses `calculateScheduledDate` (already DST-safe and pause-aware) and
 *   `weekdayLabelForIsoDate` so we never invent date arithmetic here.
 */
export function buildProgramCalendarWindow(
  program: {
    startDate: string;
    pausedDuration: number;
    totalDays: number;
  },
  userTimezone: string,
  daysBefore: number = 3,
  daysAfter: number = 10,
  now: Date = new Date(),
): ProgramCalendarWindow {
  const todayIsoDate = convertUtcToUserDate(now, userTimezone);

  // Locate "today" as a program-day number. We do this by ISO-date diff
  // rather than re-running `calculateCurrentDay` so the window stays
  // consistent with `calculateScheduledDate`'s view of program days even
  // when `pausedDuration` > 0.
  const day1IsoDate = calculateScheduledDate(
    program.startDate,
    1,
    program.pausedDuration,
  );
  const programEndIsoDate = calculateScheduledDate(
    program.startDate,
    program.totalDays,
    program.pausedDuration,
  );

  const todayOffsetFromDay1 = diffInCalendarDays(day1IsoDate, todayIsoDate);
  const todayDayNumberRaw = todayOffsetFromDay1 + 1;

  const todayInsideProgram =
    todayIsoDate >= day1IsoDate && todayIsoDate <= programEndIsoDate;
  const todayDayNumber = todayInsideProgram ? todayDayNumberRaw : null;

  // Anchor the window on today's program-day when inside the program;
  // otherwise anchor on the closer endpoint (Day 1 if today is before the
  // program, totalDays if today is after).
  const anchorDayNumber = todayInsideProgram
    ? todayDayNumberRaw
    : todayIsoDate < day1IsoDate
      ? 1
      : program.totalDays;

  const startDay = Math.max(1, anchorDayNumber - daysBefore);
  const endDay = Math.min(program.totalDays, anchorDayNumber + daysAfter);

  const rows: ProgramCalendarWindowRow[] = [];
  for (let dayNumber = startDay; dayNumber <= endDay; dayNumber++) {
    const isoDate = calculateScheduledDate(
      program.startDate,
      dayNumber,
      program.pausedDuration,
    );
    const daysFromToday = diffInCalendarDays(todayIsoDate, isoDate);
    rows.push({
      dayNumber,
      isoDate,
      dayOfWeek: weekdayLabelForIsoDate(isoDate, userTimezone),
      relative: formatRelative(daysFromToday),
    });
  }

  return {
    todayDayNumber,
    todayIsoDate,
    rows,
  };
}

/**
 * Build a small set of "upcoming program anchor" entries suitable for passing
 * as `upcomingAnchors` to `buildTemporalContext`. Used so the model sees the
 * next few prescribed workouts already resolved to ISO date + day-of-week +
 * "days from today" inside the CURRENT DATE & TIME block.
 *
 * Templates with status `completed` or `skipped` are dropped. Day numbers
 * <= todayDayNumber are dropped (the calendar window covers those). The
 * remaining templates are sorted by dayNumber and the first `limit` are
 * returned.
 *
 * The result is deliberately simple: one anchor per template, labeled
 * "Day N: <template name>". We don't try to dedupe by primary lift — that's
 * a guess that's better made by the model from the table.
 */
export function buildUpcomingProgramAnchors(
  workoutTemplates: WorkoutTemplate[],
  program: { startDate: string; pausedDuration: number },
  todayDayNumber: number | null,
  limit: number = 3,
): Array<{ label: string; date: string }> {
  if (!Array.isArray(workoutTemplates) || workoutTemplates.length === 0) {
    return [];
  }
  const minDay = todayDayNumber === null ? 1 : todayDayNumber + 1;
  return workoutTemplates
    .filter(
      (t) =>
        t.dayNumber >= minDay &&
        t.status !== "completed" &&
        t.status !== "skipped",
    )
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .slice(0, limit)
    .map((t) => ({
      label: `Day ${t.dayNumber}: ${t.name || "Workout"}`,
      date: calculateScheduledDate(
        program.startDate,
        t.dayNumber,
        program.pausedDuration,
      ),
    }));
}

/**
 * Format a program calendar window as a markdown block ready to embed in an
 * AI agent's dynamic prompt section.
 */
export function formatProgramCalendarWindowForPrompt(
  window: ProgramCalendarWindow,
): string {
  const lines: string[] = [];
  lines.push("## PROGRAM CALENDAR (AUTHORITATIVE)");
  lines.push("");
  if (window.todayDayNumber !== null) {
    lines.push(
      `Today (${window.todayIsoDate}) is Day ${window.todayDayNumber} of this program.`,
    );
  } else {
    lines.push(
      `Today is ${window.todayIsoDate}. Today falls outside this program's active range.`,
    );
  }
  lines.push("");
  lines.push("| Day | Date       | Weekday   | Relative      |");
  lines.push("| --- | ---------- | --------- | ------------- |");
  for (const row of window.rows) {
    const dayCol = String(row.dayNumber).padStart(3, " ");
    const weekday = row.dayOfWeek.padEnd(9, " ");
    const relative = row.relative.padEnd(13, " ");
    lines.push(`| ${dayCol} | ${row.isoDate} | ${weekday} | ${relative} |`);
  }
  lines.push("");
  lines.push(
    "Read this table whenever the user asks about a specific program day, or whenever you would otherwise have to compute the calendar date or weekday for a program day. Do not infer dates or weekdays for any day shown above — quote the row. If a day falls outside this window, call `compute_date` rather than guessing.",
  );
  return lines.join("\n");
}

export function generateProgramCalendar(
  workouts: WorkoutTemplate[],
  startDate: string,
  totalDays: number,
  pausedDuration: number,
  userTimezone: string,
): ProgramCalendarDay[] {
  const calendar: ProgramCalendarDay[] = [];
  const today = getTodayDate(userTimezone);

  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber++) {
    const scheduledDate = calculateScheduledDate(
      startDate,
      dayNumber,
      pausedDuration,
    );
    const workout = workouts.find((w) => w.dayNumber === dayNumber) || null;

    calendar.push({
      dayNumber,
      date: scheduledDate,
      isToday: scheduledDate === today,
      isPast: scheduledDate < today,
      isFuture: scheduledDate > today,
      workout,
      isRestDay: !workout || workout.name.toLowerCase().includes("rest"),
    });
  }

  return calendar;
}
