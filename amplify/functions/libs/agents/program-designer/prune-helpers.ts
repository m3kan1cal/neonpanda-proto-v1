/**
 * Pure helpers used by pruneExcessWorkoutsTool.
 *
 * Extracted to a separate module so the day-grouping / per-day summary logic
 * can be unit-tested without standing up the Bedrock agent harness.
 */

import type { WorkoutTemplate } from "../../program/types";
import { isPrimaryTemplate } from "../../program/template-linking";

export interface DayPruneSummary {
  dayNumber: number;
  phaseId: string | undefined;
  primary:
    | {
        name: string;
        type: WorkoutTemplate["type"];
        estimatedDuration: number;
      }
    | null;
  optionals: Array<{
    name: string;
    type: WorkoutTemplate["type"];
    estimatedDuration: number;
  }>;
  totalDuration: number;
}

/**
 * Group a flat list of workout templates by `dayNumber` and produce a
 * sessionRole-aware per-day summary suitable for the pruner LLM prompt.
 *
 * - The day's primary is whichever template is identified by
 *   `isPrimaryTemplate` (sessionRole-aware with legacy alphabetic-sort
 *   fallback). Single-template days always have that template as primary.
 * - Optionals are every other template on the day, in their original order.
 * - `totalDuration` sums `estimatedDuration` across all of the day's
 *   templates (treats missing values as 0).
 *
 * Returned summaries are sorted by `dayNumber` ascending so the LLM sees a
 * stable, chronological view of the program.
 */
export const buildDayPruneSummaries = (
  workoutTemplates: readonly WorkoutTemplate[],
): DayPruneSummary[] => {
  const dayGroups = new Map<number, WorkoutTemplate[]>();
  for (const w of workoutTemplates) {
    const bucket = dayGroups.get(w.dayNumber) ?? [];
    bucket.push(w);
    dayGroups.set(w.dayNumber, bucket);
  }

  return Array.from(dayGroups.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, dayTemplates]) => {
      const primary = dayTemplates.find((t) =>
        isPrimaryTemplate(t, dayTemplates),
      );
      const optionals = dayTemplates.filter(
        (t) => t.templateId !== primary?.templateId,
      );
      return {
        dayNumber,
        phaseId: primary?.phaseId,
        primary: primary
          ? {
              name: primary.name,
              type: primary.type,
              estimatedDuration: primary.estimatedDuration,
            }
          : null,
        optionals: optionals.map((o) => ({
          name: o.name,
          type: o.type,
          estimatedDuration: o.estimatedDuration,
        })),
        totalDuration: dayTemplates.reduce(
          (sum, t) => sum + (t.estimatedDuration || 0),
          0,
        ),
      };
    });
};
