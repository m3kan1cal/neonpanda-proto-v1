/**
 * Workout Creator Types
 *
 * Type definitions for multi-turn conversational workout logging.
 * Following the same pattern as coach-creator and program-creator sessions.
 */

import { TodoItem, ConversationMessage } from '../todo-types';

/**
 * Workout Creator To-Do List
 * Tracks all the information needed to log a workout
 */
export interface WorkoutCreatorTodoList {
  // Core workout information (REQUIRED)
  exercises: TodoItem;        // Exercise names/descriptions (value: string)
  setsOrRounds: TodoItem;     // Number of sets/rounds (value: number | string)
  repsOrTime: TodoItem;       // Reps per set, time duration, or distance (value: string)

  // Timing information (REQUIRED)
  workoutDate: TodoItem;      // When was it completed (value: string - YYYY-MM-DD or relative)

  // Optional but recommended (improve data completeness)
  discipline: TodoItem;       // crossfit, functional_bodybuilding, running, etc. (value: string)
  weights: TodoItem;          // Weights used (value: string)
  restPeriods: TodoItem;      // Rest between sets/rounds (value: string)
  workoutType: TodoItem;      // AMRAP, EMOM, For Time, Strength, etc. (value: string)
  duration: TodoItem;         // Actual working time in minutes (value: number)
  sessionDuration: TodoItem;  // Total time including warmup/cooldown in minutes (value: number)
  intensity: TodoItem;        // Workout intensity level 1-10 (value: number)
  rpe: TodoItem;              // Rate of Perceived Exertion 1-10 (value: number)
  enjoyment: TodoItem;        // How much they enjoyed it 1-10 (value: number)
  difficulty: TodoItem;       // How challenging it felt 1-10 (value: number)

  // Optional metadata
  location: TodoItem;         // Where they worked out (value: string)
  performanceNotes: TodoItem; // How they felt, modifications, PRs, etc. (value: string)
  heartRate: TodoItem;        // Average heart rate (value: number)
  caloriesBurned: TodoItem;   // Estimated calories burned (value: number)
  temperature: TodoItem;      // Temperature during workout (value: number)
  sleepHours: TodoItem;       // Hours of sleep before workout (value: number)
}

/**
 * Workout Creator Session
 * Tracks the conversational state while collecting workout information
 */
export interface WorkoutCreatorSession {
  sessionId: string;
  userId: string;
  coachId: string;
  conversationId: string;

  // Workout data collection
  todoList: WorkoutCreatorTodoList;
  conversationHistory: ConversationMessage[];

  // Session metadata
  isComplete: boolean;
  startedAt: Date;
  completedAt?: Date;
  lastActivity: Date;
  turnCount: number; // Track conversation turns to prevent infinite loops

  // If user provided images during workout logging
  imageS3Keys?: string[];

  // Workout generation status (similar to coach-creator pattern)
  workoutGeneration?: {
    status: 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
    workoutId?: string;
    startedAt: Date;
    completedAt?: Date;
    failedAt?: Date;
    error?: string;
  };

  // DynamoDB timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Required fields that MUST be collected before triggering workout creation
 */
export const REQUIRED_WORKOUT_FIELDS: (keyof WorkoutCreatorTodoList)[] = [
  'exercises',
  'setsOrRounds',
  'repsOrTime',
  'workoutDate',
  'discipline',  // Critical for proper classification and analytics
  'duration',
];

/**
 * High-priority recommended fields (ask first if time permits)
 * These provide the most value for training analysis and progress tracking
*/
export const HIGH_PRIORITY_RECOMMENDED: (keyof WorkoutCreatorTodoList)[] = [
  'weights',     // Can be "bodyweight" or "none" if not applicable
  'workoutType',  // AMRAP, EMOM, For Time, etc. - critical for workout classification
  'intensity',    // 1-10 scale - key training metric
  'rpe',          // Rate of Perceived Exertion - key training metric
  'location',     // Helps establish patterns
];

/**
 * Lower-priority recommended fields (nice to have)
 * These add detail but aren't critical for basic workout logging
 */
export const LOW_PRIORITY_RECOMMENDED: (keyof WorkoutCreatorTodoList)[] = [
  'sessionDuration', // Total time including warmup/cooldown (optional enhancement)
  'enjoyment',       // 1-10 scale - subjective quality metric
  'difficulty',      // 1-10 scale - subjective quality metric
  'restPeriods',     // Rest between sets/rounds
  'performanceNotes', // How they felt, PRs, modifications, etc.
  'heartRate',       // Average heart rate during workout
  'caloriesBurned',  // Estimated calories burned
  'temperature',     // Temperature during workout
  'sleepHours',      // Hours of sleep before workout
];

/**
 * All recommended fields combined (for backward compatibility)
 */
export const RECOMMENDED_WORKOUT_FIELDS: (keyof WorkoutCreatorTodoList)[] = [
  ...HIGH_PRIORITY_RECOMMENDED,
  ...LOW_PRIORITY_RECOMMENDED,
];

