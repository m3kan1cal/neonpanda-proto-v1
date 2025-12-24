/**
 * Utilities for managing the program designer to-do list
 * Tracks what information has been collected vs. what's still needed
 *
 * Pattern: Matches coach-creator/todo-list-utils.ts exactly
 * Naming: Uses "program" in code, "training program" in user-facing text
 */

import {
  ProgramDesignerTodoList,
  TodoItem,
  REQUIRED_PROGRAM_FIELDS,
} from "./types";

/**
 * Creates an empty to-do list with all items set to 'pending'
 */
export function createEmptyProgramTodoList(): ProgramDesignerTodoList {
  const emptyItem: TodoItem = {
    status: "pending",
    value: null,
  };

  return {
    // Core Program Definition
    trainingGoals: { ...emptyItem },
    targetEvent: { ...emptyItem },
    programDuration: { ...emptyItem },

    // Schedule & Logistics
    trainingFrequency: { ...emptyItem },
    sessionDuration: { ...emptyItem },
    startDate: { ...emptyItem },
    restDaysPreference: { ...emptyItem },

    // Equipment & Environment
    equipmentAccess: { ...emptyItem },
    trainingEnvironment: { ...emptyItem },

    // User Context
    experienceLevel: { ...emptyItem },
    currentFitnessBaseline: { ...emptyItem },
    injuryConsiderations: { ...emptyItem },
    movementPreferences: { ...emptyItem },
    movementDislikes: { ...emptyItem },

    // Program Structure Preferences
    trainingMethodology: { ...emptyItem },
    programFocus: { ...emptyItem },
    intensityPreference: { ...emptyItem },
    volumeTolerance: { ...emptyItem },

    // Optional Advanced
    deloadPreference: { ...emptyItem },
    progressionStyle: { ...emptyItem },
  };
}

/**
 * Get list of pending items (not yet collected)
 */
export function getPendingItems(todoList: ProgramDesignerTodoList): string[] {
  const pending: string[] = [];

  for (const [key, item] of Object.entries(todoList)) {
    if (item.status === "pending" || item.status === "in_progress") {
      pending.push(key);
    }
  }

  return pending;
}

/**
 * Get list of required pending items (must be collected before generation)
 */
export function getRequiredPendingItems(
  todoList: ProgramDesignerTodoList,
): string[] {
  return [...REQUIRED_PROGRAM_FIELDS].filter((field) => {
    const item = todoList[field];
    return item.status === "pending" || item.status === "in_progress";
  });
}

/**
 * Get progress information for the to-do list
 */
export function getTodoProgress(todoList: ProgramDesignerTodoList): {
  completed: number;
  total: number;
  percentage: number;
  requiredCompleted: number;
  requiredTotal: number;
  requiredPercentage: number;
} {
  const allItems = Object.values(todoList);
  const completed = allItems.filter(
    (item) => item.status === "complete",
  ).length;
  const total = allItems.length;

  const requiredItems = [...REQUIRED_PROGRAM_FIELDS].map(
    (field) => todoList[field],
  );
  const requiredCompleted = requiredItems.filter(
    (item) => item.status === "complete",
  ).length;
  const requiredTotal = REQUIRED_PROGRAM_FIELDS.length;

  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100),
    requiredCompleted,
    requiredTotal,
    requiredPercentage: Math.round((requiredCompleted / requiredTotal) * 100),
  };
}

/**
 * Check if session is complete (all required items collected)
 */
export function isSessionComplete(todoList: ProgramDesignerTodoList): boolean {
  return [...REQUIRED_PROGRAM_FIELDS].every(
    (field) => todoList[field].status === "complete",
  );
}

/**
 * Get human-readable labels for to-do list items
 * Note: These are user-facing, so they say "training program"
 */
export function getTodoItemLabel(key: keyof ProgramDesignerTodoList): string {
  const labels: Record<keyof ProgramDesignerTodoList, string> = {
    trainingGoals: "Training Goals",
    targetEvent: "Target Event/Competition",
    programDuration: "Program Duration",
    trainingFrequency: "Training Frequency",
    sessionDuration: "Session Duration",
    startDate: "Start Date",
    restDaysPreference: "Rest Days Preference",
    equipmentAccess: "Equipment Access",
    trainingEnvironment: "Training Environment",
    experienceLevel: "Experience Level",
    currentFitnessBaseline: "Current Fitness Baseline",
    injuryConsiderations: "Injury Considerations",
    movementPreferences: "Movement Preferences",
    movementDislikes: "Movement Dislikes",
    trainingMethodology: "Training Methodology",
    programFocus: "Program Focus",
    intensityPreference: "Intensity Preference",
    volumeTolerance: "Volume Tolerance",
    deloadPreference: "Deload Preference",
    progressionStyle: "Progression Style",
  };

  return labels[key];
}

/**
 * Check if a field is required
 */
export function isRequiredField(key: keyof ProgramDesignerTodoList): boolean {
  return REQUIRED_PROGRAM_FIELDS.includes(key as any);
}

/**
 * Get a summary of what's been collected and what's missing
 */
export function getTodoSummary(todoList: ProgramDesignerTodoList): {
  completed: string[];
  pending: string[];
  requiredPending: string[];
  optionalPending: string[];
} {
  const completed: string[] = [];
  const pending: string[] = [];
  const requiredPending: string[] = [];
  const optionalPending: string[] = [];

  for (const [key, item] of Object.entries(todoList)) {
    const label = getTodoItemLabel(key as keyof ProgramDesignerTodoList);

    if (item.status === "complete") {
      completed.push(label);
    } else {
      pending.push(label);

      if (isRequiredField(key as keyof ProgramDesignerTodoList)) {
        requiredPending.push(label);
      } else {
        optionalPending.push(label);
      }
    }
  }

  return {
    completed,
    pending,
    requiredPending,
    optionalPending,
  };
}
