/**
 * Utilities for managing the coach creator to-do list
 * Tracks what information has been collected vs. what's still needed
 */

import { CoachCreatorTodoList, TodoItem } from './types';

/**
 * Creates an empty to-do list with all items set to 'pending'
 */
export function createEmptyTodoList(): CoachCreatorTodoList {
  const emptyItem: TodoItem = {
    status: 'pending',
    value: null,
  };

  return {
    // Question 1: Coach Gender Preference
    coachGenderPreference: { ...emptyItem },

    // Question 2: Goals and Timeline
    primaryGoals: { ...emptyItem },
    goalTimeline: { ...emptyItem },

    // Question 3: Age and Life Stage
    age: { ...emptyItem },
    lifeStageContext: { ...emptyItem },

    // Question 4: Experience Level
    experienceLevel: { ...emptyItem },
    trainingHistory: { ...emptyItem },

    // Question 5: Training Frequency and Time
    trainingFrequency: { ...emptyItem },
    sessionDuration: { ...emptyItem },
    timeOfDayPreference: { ...emptyItem },

    // Question 6: Injuries and Limitations
    injuryConsiderations: { ...emptyItem },
    movementLimitations: { ...emptyItem },

    // Question 7: Equipment and Environment
    equipmentAccess: { ...emptyItem },
    trainingEnvironment: { ...emptyItem },

    // Question 8: Movement Focus and Preferences
    movementPreferences: { ...emptyItem },
    movementDislikes: { ...emptyItem },

    // Question 9: Coaching Style and Motivation
    coachingStylePreference: { ...emptyItem },
    motivationStyle: { ...emptyItem },

    // Question 10: Success Metrics
    successMetrics: { ...emptyItem },
    progressTrackingPreferences: { ...emptyItem },

    // Question 11: Competition Goals (Optional)
    competitionGoals: { ...emptyItem },
    competitionTimeline: { ...emptyItem },
  };
}

/**
 * Required fields that must be collected before coach generation
 * Competition goals are optional
 */
const REQUIRED_FIELDS: (keyof CoachCreatorTodoList)[] = [
  'coachGenderPreference',
  'primaryGoals',
  'goalTimeline',
  'age',
  'lifeStageContext',
  'experienceLevel',
  'trainingHistory',
  'trainingFrequency',
  'sessionDuration',
  'timeOfDayPreference',
  'injuryConsiderations',
  'movementLimitations',
  'equipmentAccess',
  'trainingEnvironment',
  'movementPreferences',
  'movementDislikes',
  'coachingStylePreference',
  'motivationStyle',
  'successMetrics',
  'progressTrackingPreferences',
];

/**
 * Optional fields that enhance coach quality but aren't required
 */
const OPTIONAL_FIELDS: (keyof CoachCreatorTodoList)[] = [
  'competitionGoals',
  'competitionTimeline',
];

/**
 * Get list of pending items (not yet collected)
 */
export function getPendingItems(todoList: CoachCreatorTodoList): string[] {
  const pending: string[] = [];

  for (const [key, item] of Object.entries(todoList)) {
    if (item.status === 'pending' || item.status === 'in_progress') {
      pending.push(key);
    }
  }

  return pending;
}

/**
 * Get list of required pending items (must be collected before generation)
 */
export function getRequiredPendingItems(todoList: CoachCreatorTodoList): string[] {
  return REQUIRED_FIELDS.filter(field => {
    const item = todoList[field];
    return item.status === 'pending' || item.status === 'in_progress';
  });
}

/**
 * Get progress information for the to-do list
 */
export function getTodoProgress(todoList: CoachCreatorTodoList): {
  completed: number;
  total: number;
  percentage: number;
  requiredCompleted: number;
  requiredTotal: number;
  requiredPercentage: number;
} {
  const allItems = Object.values(todoList);
  const completed = allItems.filter(item => item.status === 'complete').length;
  const total = allItems.length;

  const requiredItems = REQUIRED_FIELDS.map(field => todoList[field]);
  const requiredCompleted = requiredItems.filter(item => item.status === 'complete').length;
  const requiredTotal = REQUIRED_FIELDS.length;

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
export function isSessionComplete(todoList: CoachCreatorTodoList): boolean {
  return REQUIRED_FIELDS.every(field => todoList[field].status === 'complete');
}

/**
 * Get human-readable labels for to-do list items
 */
export function getTodoItemLabel(key: keyof CoachCreatorTodoList): string {
  const labels: Record<keyof CoachCreatorTodoList, string> = {
    coachGenderPreference: 'Coach Gender Preference',
    primaryGoals: 'Primary Fitness Goals',
    goalTimeline: 'Goal Timeline',
    age: 'Age',
    lifeStageContext: 'Life Stage Context',
    experienceLevel: 'Experience Level',
    trainingHistory: 'Training History',
    trainingFrequency: 'Training Frequency',
    sessionDuration: 'Session Duration',
    timeOfDayPreference: 'Time of Day Preference',
    injuryConsiderations: 'Injury Considerations',
    movementLimitations: 'Movement Limitations',
    equipmentAccess: 'Equipment Access',
    trainingEnvironment: 'Training Environment',
    movementPreferences: 'Movement Preferences',
    movementDislikes: 'Movement Dislikes',
    coachingStylePreference: 'Coaching Style Preference',
    motivationStyle: 'Motivation Style',
    successMetrics: 'Success Metrics',
    progressTrackingPreferences: 'Progress Tracking Preferences',
    competitionGoals: 'Competition Goals',
    competitionTimeline: 'Competition Timeline',
  };

  return labels[key];
}

/**
 * Check if a field is required
 */
export function isRequiredField(key: keyof CoachCreatorTodoList): boolean {
  return REQUIRED_FIELDS.includes(key);
}

/**
 * Get a summary of what's been collected and what's missing
 */
export function getTodoSummary(todoList: CoachCreatorTodoList): {
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
    const label = getTodoItemLabel(key as keyof CoachCreatorTodoList);

    if (item.status === 'complete') {
      completed.push(label);
    } else {
      pending.push(label);

      if (isRequiredField(key as keyof CoachCreatorTodoList)) {
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

