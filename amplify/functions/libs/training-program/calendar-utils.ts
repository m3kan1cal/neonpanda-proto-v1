/**
 * Calendar and Date Utilities for Training Programs
 *
 * Handles all date calculations, scheduling, pause/resume logic
 * Timezone-aware to ensure accurate date handling across global users
 */

import { TrainingProgram, WorkoutTemplate } from './types';
import { convertUtcToUserDate } from '../analytics/date-utils';

/**
 * Calculate the end date of a training program based on start date and total days
 */
export function calculateEndDate(startDate: string, totalDays: number): string {
  const start = new Date(startDate);
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
  userTimezone: string
): number {
  const start = new Date(startDate);
  const now = new Date();

  // Get "today" in user's timezone (not server timezone)
  const todayInUserTz = convertUtcToUserDate(now, userTimezone);
  const today = new Date(todayInUserTz);

  today.setHours(0, 0, 0, 0); // Normalize to midnight
  start.setHours(0, 0, 0, 0);

  // Calculate days since start
  const daysSinceStart = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
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
  pausedDuration: number
): string {
  const start = new Date(startDate);
  // dayNumber is 1-indexed, so day 1 = startDate
  const daysToAdd = dayNumber - 1 + pausedDuration;
  const scheduled = new Date(start);
  scheduled.setDate(scheduled.getDate() + daysToAdd);
  return formatDate(scheduled);
}

/**
 * Calculate pause duration in days
 */
export function calculatePauseDuration(pausedAt: Date, resumedAt: Date): number {
  const paused = new Date(pausedAt);
  const resumed = new Date(resumedAt);
  paused.setHours(0, 0, 0, 0);
  resumed.setHours(0, 0, 0, 0);

  const durationMs = resumed.getTime() - paused.getTime();
  return Math.floor(durationMs / (1000 * 60 * 60 * 24));
}

/**
 * Update all workout template scheduled dates after pause/resume
 */
export function recalculateWorkoutDates(
  workouts: WorkoutTemplate[],
  startDate: string,
  pausedDuration: number
): WorkoutTemplate[] {
  return workouts.map((workout) => ({
    ...workout,
    scheduledDate: calculateScheduledDate(
      startDate,
      workout.dayNumber,
      pausedDuration
    ),
  }));
}

/**
 * Check if a workout template is overdue (scheduled date has passed and not completed)
 */
export function isWorkoutOverdue(
  scheduledDate: string,
  status: WorkoutTemplate['status']
): boolean {
  if (status === 'completed' || status === 'skipped') {
    return false;
  }

  const scheduled = new Date(scheduledDate);
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
  weekStartDate: string
): WorkoutTemplate[] {
  const weekStart = new Date(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  return workouts.filter((workout) => {
    const workoutDate = new Date(workout.scheduledDate);
    return workoutDate >= weekStart && workoutDate <= weekEnd;
  });
}

/**
 * Get upcoming workout templates (next N templates that are pending)
 */
export function getUpcomingWorkouts(
  workouts: WorkoutTemplate[],
  count: number
): WorkoutTemplate[] {
  const pending = workouts
    .filter((w) => w.status === 'pending')
    .sort((a, b) => a.dayNumber - b.dayNumber);

  return pending.slice(0, count);
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
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
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if training program is currently active based on dates
 * Timezone-aware: Uses user's timezone to determine "today"
 */
export function isTrainingProgramActive(
  status: TrainingProgram['status'],
  startDate: string,
  endDate: string,
  userTimezone: string
): boolean {
  if (status !== 'active') {
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
  program: TrainingProgram,
  dayNumber: number
): TrainingProgram['phases'][0] | null {
  return (
    program.phases.find(
      (phase) => dayNumber >= phase.startDay && dayNumber <= phase.endDay
    ) || null
  );
}

/**
 * Calculate days remaining in training program
 */
export function getDaysRemaining(currentDay: number, totalDays: number): number {
  return Math.max(0, totalDays - currentDay + 1);
}

/**
 * Calculate training program progress percentage
 */
export function getProgressPercentage(currentDay: number, totalDays: number): number {
  if (totalDays === 0) return 0;
  return Math.min(100, Math.round((currentDay / totalDays) * 100));
}

/**
 * Generate day-by-day calendar for training program
 */
export interface TrainingProgramCalendarDay {
  dayNumber: number;
  date: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  workout: WorkoutTemplate | null;
  isRestDay: boolean;
}

export function generateTrainingProgramCalendar(
  workouts: WorkoutTemplate[],
  startDate: string,
  totalDays: number,
  pausedDuration: number,
  userTimezone: string
): TrainingProgramCalendarDay[] {
  const calendar: TrainingProgramCalendarDay[] = [];
  const today = getTodayDate(userTimezone);

  for (let dayNumber = 1; dayNumber <= totalDays; dayNumber++) {
    const scheduledDate = calculateScheduledDate(
      startDate,
      dayNumber,
      pausedDuration
    );
    const workout = workouts.find((w) => w.dayNumber === dayNumber) || null;

    calendar.push({
      dayNumber,
      date: scheduledDate,
      isToday: scheduledDate === today,
      isPast: scheduledDate < today,
      isFuture: scheduledDate > today,
      workout,
      isRestDay: !workout || workout.name.toLowerCase().includes('rest'),
    });
  }

  return calendar;
}
