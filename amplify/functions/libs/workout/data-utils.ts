/**
 * Workout Data Utilities
 *
 * Helper functions for extracting and transforming workout data structures.
 */

import {
  queryWorkouts,
  queryWorkoutsByTemplate,
} from "../../../dynamodb/workout";

/**
 * Check if a duplicate workout already exists.
 *
 * Two matching strategies:
 *   1. If `templateId` is provided (program-template logging path), match on
 *      `userId + templateId`. Templates are unique per program day, so a second
 *      save against the same template is unambiguously a duplicate.
 *   2. Otherwise (free-text coach-chat logging), fall back to matching on
 *      `userId + conversationId + completedAt date`. This is coarser but is
 *      the only signal available when there is no template.
 *
 * Returns the duplicate workout if found, undefined otherwise.
 * Swallows errors so callers can treat dedup as non-blocking.
 */
export async function checkDuplicateWorkout(
  userId: string,
  conversationId: string,
  completedAtDate: string | Date,
  templateId?: string,
): Promise<any | undefined> {
  try {
    // Strategy 1: template-scoped dedup (precise)
    if (templateId) {
      const templateWorkouts = await queryWorkoutsByTemplate(templateId);
      return templateWorkouts.find((w) => w.userId === userId);
    }

    // Strategy 2: conversation + date dedup (free-text fallback)
    const dateOnly =
      completedAtDate instanceof Date
        ? completedAtDate.toISOString().split("T")[0]
        : completedAtDate.split("T")[0];

    const recentWorkouts = await queryWorkouts(userId, {
      limit: 10,
      sortBy: "completedAt",
      sortOrder: "desc",
    });

    return recentWorkouts.find(
      (w) =>
        w.conversationId === conversationId &&
        new Date(w.completedAt).toISOString().split("T")[0] === dateOnly,
    );
  } catch (error) {
    console.warn("⚠️ Duplicate workout check failed (non-blocking):", error);
    return undefined;
  }
}

/**
 * Extract exercise names from discipline-specific workout data
 *
 * Traverses all discipline-specific data structures and extracts exercise names.
 * Handles all supported disciplines: bodybuilding, powerlifting, crossfit, calisthenics,
 * circuit training, hybrid, hyrox, olympic weightlifting, functional bodybuilding, and running.
 *
 * @param workoutData - The workout data object containing discipline_specific field
 * @returns Array of unique exercise names from the workout
 */
export function extractExerciseNames(workoutData: any): string[] {
  const names: string[] = [];
  const disciplineSpecific = workoutData?.discipline_specific;
  if (!disciplineSpecific) return names;

  // Bodybuilding, Functional Bodybuilding, Powerlifting, Olympic Weightlifting
  if (
    disciplineSpecific.bodybuilding?.exercises ||
    disciplineSpecific.functional_bodybuilding?.exercises ||
    disciplineSpecific.powerlifting?.exercises ||
    disciplineSpecific.olympic_weightlifting?.exercises
  ) {
    const exercises =
      disciplineSpecific.bodybuilding?.exercises ||
      disciplineSpecific.functional_bodybuilding?.exercises ||
      disciplineSpecific.powerlifting?.exercises ||
      disciplineSpecific.olympic_weightlifting?.exercises ||
      [];
    exercises.forEach((ex: any) => {
      if (ex.name) names.push(ex.name);
    });
  }

  // CrossFit (rounds with exercises)
  if (disciplineSpecific.crossfit?.rounds) {
    disciplineSpecific.crossfit.rounds.forEach((round: any) => {
      round.exercises?.forEach((ex: any) => {
        if (ex.name) names.push(ex.name);
      });
    });
  }

  // Circuit Training (circuits with exercises)
  if (disciplineSpecific.circuit_training?.circuits) {
    disciplineSpecific.circuit_training.circuits.forEach((circuit: any) => {
      circuit.exercises?.forEach((ex: any) => {
        if (ex.name) names.push(ex.name);
      });
    });
  }

  // Calisthenics (exercises array)
  if (disciplineSpecific.calisthenics?.exercises) {
    disciplineSpecific.calisthenics.exercises.forEach((ex: any) => {
      if (ex.name) names.push(ex.name);
    });
  }

  // Hybrid (strength, conditioning, cardio sections)
  if (disciplineSpecific.hybrid) {
    ["strength", "conditioning", "cardio"].forEach((section) => {
      disciplineSpecific.hybrid[section]?.exercises?.forEach((ex: any) => {
        if (ex.name) names.push(ex.name);
      });
    });
  }

  // Hyrox (zones with exercises)
  if (disciplineSpecific.hyrox?.zones) {
    disciplineSpecific.hyrox.zones.forEach((zone: any) => {
      zone.exercises?.forEach((ex: any) => {
        if (ex.name) names.push(ex.name);
      });
    });
  }

  // Running (runs don't have individual exercises)
  // No exercise extraction needed

  return [...new Set(names)]; // Deduplicate
}
