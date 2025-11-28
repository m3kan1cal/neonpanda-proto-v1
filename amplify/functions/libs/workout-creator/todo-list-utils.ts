/**
 * Workout Creator To-Do List Utilities
 *
 * Helper functions for analyzing workout creator to-do list progress
 * and determining when enough information has been collected.
 *
 * Pattern: Same structure as coach-creator/todo-list-utils.ts
 */

import {
  WorkoutCreatorTodoList,
  REQUIRED_WORKOUT_FIELDS,
  HIGH_PRIORITY_RECOMMENDED,
  LOW_PRIORITY_RECOMMENDED,
} from "./types";
import { TodoItem } from "../todo-types";

/**
 * Creates an empty workout to-do list with all items set to 'pending'
 */
export function createEmptyWorkoutTodoList(): WorkoutCreatorTodoList {
  const emptyItem: TodoItem = {
    status: "pending",
    value: null,
  };

  return {
    // Core required fields
    exercises: { ...emptyItem },
    setsOrRounds: { ...emptyItem },
    repsOrTime: { ...emptyItem },
    workoutDate: { ...emptyItem },

    // Recommended fields (improve data completeness)
    discipline: { ...emptyItem },
    weights: { ...emptyItem },
    restPeriods: { ...emptyItem },
    workoutType: { ...emptyItem },
    duration: { ...emptyItem },
    sessionDuration: { ...emptyItem },
    intensity: { ...emptyItem },
    rpe: { ...emptyItem },
    enjoyment: { ...emptyItem },
    difficulty: { ...emptyItem },

    // Optional metadata
    location: { ...emptyItem },
    performanceNotes: { ...emptyItem },
    heartRate: { ...emptyItem },
    caloriesBurned: { ...emptyItem },
    temperature: { ...emptyItem },
    sleepHours: { ...emptyItem },
  };
}

/**
 * Check if all REQUIRED fields are collected (minimum to log a workout)
 * This does NOT check recommended fields - those are optional
 *
 * Returns true when the 6 required fields are complete:
 * - exercises, setsOrRounds, repsOrTime, workoutDate, discipline, duration
 */
export function isSessionComplete(todoList: WorkoutCreatorTodoList): boolean {
  return REQUIRED_WORKOUT_FIELDS.every(
    (field) => todoList[field]?.status === "complete"
  );
}

/**
 * Check if session has enough data to allow user-initiated completion
 * More lenient than isSessionComplete - allows finish with substantial progress
 *
 * Returns true if ANY of these conditions are met:
 * - 5/6 or more required fields complete (83%+)
 * - 4/6 required fields (67%+) AND all high-priority fields complete
 *
 * This prevents users from being stuck in endless questioning when they have
 * sufficient workout data to create a meaningful log entry.
 */
export function hasSubstantialProgress(todoList: WorkoutCreatorTodoList): boolean {
  const requiredCompleted = REQUIRED_WORKOUT_FIELDS.filter(
    (field) => todoList[field]?.status === "complete"
  ).length;
  const requiredTotal = REQUIRED_WORKOUT_FIELDS.length;

  const highPriorityComplete = HIGH_PRIORITY_RECOMMENDED.every(
    (field) => todoList[field]?.status === "complete"
  );

  // Condition 1: 5 or 6 out of 6 required fields (83%+)
  if (requiredCompleted >= 5) {
    return true;
  }

  // Condition 2: 4+ required fields (67%+) AND all high-priority fields
  if (requiredCompleted >= 4 && highPriorityComplete) {
    return true;
  }

  return false;
}

/**
 * Check if user should be prompted for HIGH-PRIORITY recommended fields
 * Returns true if required fields are done but high-priority recommended fields are incomplete
 */
export function shouldPromptHighPriorityRecommendedFields(
  todoList: WorkoutCreatorTodoList
): boolean {
  const requiredComplete = REQUIRED_WORKOUT_FIELDS.every(
    (field) => todoList[field]?.status === "complete"
  );

  const highPriorityComplete = HIGH_PRIORITY_RECOMMENDED.every(
    (field) => todoList[field]?.status === "complete"
  );

  // Prompt for high-priority recommended fields if required are done but high-priority are not
  return requiredComplete && !highPriorityComplete;
}

/**
 * Check if user should be prompted for LOW-PRIORITY recommended fields
 * Returns true if required + high-priority fields are done but low-priority fields are incomplete
 */
export function shouldPromptLowPriorityRecommendedFields(
  todoList: WorkoutCreatorTodoList
): boolean {
  const requiredComplete = REQUIRED_WORKOUT_FIELDS.every(
    (field) => todoList[field]?.status === "complete"
  );

  const highPriorityComplete = HIGH_PRIORITY_RECOMMENDED.every(
    (field) => todoList[field]?.status === "complete"
  );

  const lowPriorityComplete = LOW_PRIORITY_RECOMMENDED.every(
    (field) => todoList[field]?.status === "complete"
  );

  // Prompt for low-priority fields if required + high-priority are done but low-priority are not
  return requiredComplete && highPriorityComplete && !lowPriorityComplete;
}

/**
 * Calculate progress statistics for the workout creator session
 */
export function getTodoProgress(todoList: WorkoutCreatorTodoList): {
  requiredCompleted: number;
  requiredTotal: number;
  requiredPercentage: number;
  highPriorityCompleted: number;
  highPriorityTotal: number;
  highPriorityPercentage: number;
  lowPriorityCompleted: number;
  lowPriorityTotal: number;
  lowPriorityPercentage: number;
  totalCompleted: number;
  totalFields: number;
  totalPercentage: number;
} {
  // Count required fields
  const requiredCompleted = REQUIRED_WORKOUT_FIELDS.filter(
    (field) => todoList[field]?.status === "complete"
  ).length;
  const requiredTotal = REQUIRED_WORKOUT_FIELDS.length;
  const requiredPercentage = Math.round(
    (requiredCompleted / requiredTotal) * 100
  );

  // Count high-priority recommended fields
  const highPriorityCompleted = HIGH_PRIORITY_RECOMMENDED.filter(
    (field) => todoList[field]?.status === "complete"
  ).length;
  const highPriorityTotal = HIGH_PRIORITY_RECOMMENDED.length;
  const highPriorityPercentage = Math.round(
    (highPriorityCompleted / highPriorityTotal) * 100
  );

  // Count low-priority recommended fields
  const lowPriorityCompleted = LOW_PRIORITY_RECOMMENDED.filter(
    (field) => todoList[field]?.status === "complete"
  ).length;
  const lowPriorityTotal = LOW_PRIORITY_RECOMMENDED.length;
  const lowPriorityPercentage = Math.round(
    (lowPriorityCompleted / lowPriorityTotal) * 100
  );

  // Count all fields
  const allFields = Object.keys(todoList) as (keyof WorkoutCreatorTodoList)[];
  const totalCompleted = allFields.filter(
    (field) => todoList[field]?.status === "complete"
  ).length;
  const totalFields = allFields.length;
  const totalPercentage = Math.round((totalCompleted / totalFields) * 100);

  return {
    requiredCompleted,
    requiredTotal,
    requiredPercentage,
    highPriorityCompleted,
    highPriorityTotal,
    highPriorityPercentage,
    lowPriorityCompleted,
    lowPriorityTotal,
    lowPriorityPercentage,
    totalCompleted,
    totalFields,
    totalPercentage,
  };
}

/**
 * Get a list of pending required fields
 */
export function getPendingRequiredFields(
  todoList: WorkoutCreatorTodoList
): (keyof WorkoutCreatorTodoList)[] {
  return REQUIRED_WORKOUT_FIELDS.filter(
    (field) => todoList[field]?.status !== "complete"
  );
}

/**
 * Get a list of pending HIGH-PRIORITY recommended fields
 */
export function getPendingHighPriorityFields(
  todoList: WorkoutCreatorTodoList
): (keyof WorkoutCreatorTodoList)[] {
  return HIGH_PRIORITY_RECOMMENDED.filter(
    (field) => todoList[field]?.status !== "complete"
  );
}

/**
 * Get a list of pending LOW-PRIORITY recommended fields
 */
export function getPendingLowPriorityFields(
  todoList: WorkoutCreatorTodoList
): (keyof WorkoutCreatorTodoList)[] {
  return LOW_PRIORITY_RECOMMENDED.filter(
    (field) => todoList[field]?.status !== "complete"
  );
}

/**
 * Get collected data summary for display
 */
export function getCollectedDataSummary(
  todoList: WorkoutCreatorTodoList
): Record<string, any> {
  const summary: Record<string, any> = {};

  const allFields = Object.keys(todoList) as (keyof WorkoutCreatorTodoList)[];

  for (const field of allFields) {
    const item = todoList[field];
    if (item?.status === "complete" && item.value !== undefined) {
      summary[field] = item.value;
    }
  }

  return summary;
}

/**
 * Format field name for user-friendly display
 */
export function formatFieldName(field: keyof WorkoutCreatorTodoList): string {
  const fieldNameMap: Record<keyof WorkoutCreatorTodoList, string> = {
    exercises: "exercises",
    setsOrRounds: "sets or rounds",
    repsOrTime: "reps or time/distance",
    workoutDate: "workout date",
    discipline: "discipline",
    weights: "weights used",
    restPeriods: "rest periods",
    workoutType: "workout type",
    duration: "workout duration",
    sessionDuration: "total session time",
    intensity: "intensity level (1-10)",
    rpe: "RPE (1-10)",
    enjoyment: "enjoyment (1-10)",
    difficulty: "difficulty (1-10)",
    location: "location",
    performanceNotes: "performance notes",
    heartRate: "average heart rate",
    caloriesBurned: "calories burned",
    temperature: "temperature",
    sleepHours: "hours of sleep",
  };

  return fieldNameMap[field] || field;
}

/**
 * Get missing fields summary for AI prompt
 */
export function getMissingFieldsSummary(
  todoList: WorkoutCreatorTodoList
): string {
  const pendingRequired = getPendingRequiredFields(todoList);
  const pendingHighPriority = getPendingHighPriorityFields(todoList);
  const pendingLowPriority = getPendingLowPriorityFields(todoList);

  let summary = "";

  if (pendingRequired.length > 0) {
    summary += `Required (must have): ${pendingRequired.map(formatFieldName).join(", ")}\n`;
  }

  if (pendingHighPriority.length > 0) {
    summary += `High-priority recommended (valuable for analysis): ${pendingHighPriority.map(formatFieldName).join(", ")}\n`;
  }

  if (pendingLowPriority.length > 0) {
    summary += `Low-priority optional (nice to have): ${pendingLowPriority.map(formatFieldName).join(", ")}`;
  }

  if (
    pendingRequired.length === 0 &&
    pendingHighPriority.length === 0 &&
    pendingLowPriority.length === 0
  ) {
    summary = "All information collected! Ready to log workout.";
  }

  return summary.trim();
}

/**
 * Determine if we should ask for more details or proceed with logging
 */
export function shouldRequestMoreDetails(
  todoList: WorkoutCreatorTodoList
): boolean {
  const progress = getTodoProgress(todoList);

  // Always need required fields
  if (progress.requiredCompleted < progress.requiredTotal) {
    return true;
  }

  // If we have all required but less than 50% of high-priority recommended, ask for more
  if (progress.highPriorityPercentage < 50) {
    return true;
  }

  // Otherwise, we have enough (don't worry about low-priority fields)
  return false;
}
