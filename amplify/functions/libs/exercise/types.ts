/**
 * Exercise Log Types
 *
 * This module contains TypeScript interfaces and types for exercise-level
 * tracking and progression analysis. ExerciseLogs are extracted from workouts
 * to enable querying exercise history across all workout types.
 */

import type { UniversalWorkoutSchema } from "../workout/types";

/**
 * Supported disciplines for exercise extraction
 */
export type ExerciseDiscipline =
  | "crossfit"
  | "powerlifting"
  | "bodybuilding"
  | "running"
  | "hyrox"
  | "olympic_weightlifting"
  | "functional_bodybuilding"
  | "calisthenics";

/**
 * Exercise metrics - discipline-agnostic structure capturing all possible metrics
 * Null/undefined values indicate metric not applicable for this discipline
 */
export interface ExerciseMetrics {
  // === Strength metrics ===
  weight?: number;
  weightUnit?: string; // "lbs" | "kg"
  reps?: number; // Average reps per set (for display: "4x10" not "4x40")
  sets?: number;
  repsPerSet?: number[]; // Actual reps for each set [12, 10, 8, 6] (for detailed display)
  weightsPerSet?: number[]; // Actual weight for each set [135, 155, 175, 185] (for detailed display)
  totalVolume?: number; // weight * reps * sets (calculated)
  maxWeight?: number; // heaviest set weight
  rpe?: number; // 1-10
  percentage1rm?: number;

  // === Powerlifting-specific ===
  barSpeed?: string; // "slow" | "moderate" | "fast" | "explosive"
  competitionCommands?: boolean;
  attempts?: {
    opener?: number;
    second?: number;
    third?: number;
    successful?: number[];
    missed?: number[];
  };

  // === Bodybuilding-specific ===
  tempo?: string; // "3-1-2-0" format (eccentric-pause-concentric-rest)
  timeUnderTension?: number; // seconds
  failure?: boolean; // went to failure
  supersetWith?: string; // exercise name if part of superset

  // === Cardio/distance metrics (running, rowing, etc.) ===
  distance?: number;
  distanceUnit?: string; // "miles" | "km" | "m"
  time?: number; // seconds
  pace?: string; // "MM:SS" per mile/km
  calories?: number;
  elevationGain?: number;
  surface?: string; // "road" | "trail" | "track" | "treadmill"

  // === Calisthenics/skill metrics ===
  holdTime?: number; // seconds (for static holds)
  qualityRating?: number; // 1-10
  progressionLevel?: string; // e.g., "assisted", "strict", "weighted"
  assistanceMethod?: string; // e.g., "band", "box"

  // === Hyrox-specific ===
  stationNumber?: number; // 1-8

  // === Context (all disciplines) ===
  movementType?: string; // "barbell" | "dumbbell" | "kettlebell" | "bodyweight" | "machine" | "cable"
  movementCategory?: string; // "main_lift" | "compound" | "isolation" | "accessory" | "mobility"
  variation?: string; // e.g., "butterfly", "kipping", "strict"
  rxStatus?: string; // "rx" | "scaled" | "modified"
  equipment?: string[]; // ["belt", "sleeves", "wraps"]
  targetMuscles?: string[]; // ["chest", "triceps", "shoulders"]
  setType?: string; // "warmup" | "working" | "drop" | "rest_pause" | "amrap"
}

/**
 * Exercise metadata
 */
export interface ExerciseMetadata {
  extractedAt: Date;
  normalizationConfidence: number; // 0-1, from AI normalization
  sourceRound?: number; // for CrossFit rounds
  sourceSet?: number; // for powerlifting/bodybuilding sets
  sourceSegment?: number; // for running segments
  notes?: string; // form_notes, technique_notes, etc.
}

/**
 * Core exercise record stored in DynamoDB
 *
 * Each record represents a single exercise occurrence from a workout.
 * Multiple records can exist for the same exercise in one workout (sequence handles this).
 */
export interface Exercise {
  exerciseId: string; // exercise_{userId}_{timestamp}_{shortId}
  userId: string;
  coachId: string; // Coach context when workout was logged
  workoutId: string;
  exerciseName: string; // AI-normalized canonical name (e.g., "back_squat", "tempo_run")
  originalName: string; // Original name from workout (e.g., "Barbell Back Squat")
  discipline: ExerciseDiscipline;
  completedAt: Date;
  sequence: number; // Handles same exercise multiple times in one workout (1, 2, 3...)

  // Discipline-agnostic metrics
  metrics: ExerciseMetrics;

  // Metadata
  metadata: ExerciseMetadata;

  // DynamoDB timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Event structure for the build-exercise async Lambda
 * Follows BuildWorkoutEvent and BuildProgramEvent patterns
 */
export interface BuildExerciseEvent {
  userId: string;
  coachId: string;
  workoutId: string;
  workoutData: UniversalWorkoutSchema;
  completedAt: string; // ISO date string
}

/**
 * Result from exercise name normalization
 */
export interface NormalizedExerciseName {
  originalName: string;
  normalizedName: string; // snake_case canonical name
  confidence: number; // 0-1
}

/**
 * Batch normalization result
 */
export interface BatchNormalizationResult {
  normalizations: NormalizedExerciseName[];
  processingTimeMs: number;
}

/**
 * Extracted exercise before normalization
 */
export interface ExtractedExercise {
  originalName: string;
  discipline: ExerciseDiscipline;
  metrics: ExerciseMetrics;
  sourceRound?: number;
  sourceSet?: number;
  sourceSegment?: number;
  notes?: string;
}

/**
 * Result from exercise extraction
 */
export interface ExerciseExtractionResult {
  exercises: ExtractedExercise[];
  discipline: ExerciseDiscipline;
  extractionMethod: string;
}

/**
 * Query result for exercise history
 */
export interface ExerciseHistoryQueryResult {
  exercises: Exercise[];
  aggregations?: ExerciseAggregations;
  pagination?: {
    lastEvaluatedKey?: string;
    hasMore: boolean;
  };
}

/**
 * Aggregated statistics for exercise history
 */
export interface ExerciseAggregations {
  totalOccurrences: number;
  prWeight?: number; // Personal record max weight
  prReps?: number; // Personal record max reps at any weight
  prVolume?: number; // Personal record total volume in one session
  averageWeight?: number;
  averageReps?: number;
  lastPerformed: Date;
  firstPerformed: Date;
  disciplines: ExerciseDiscipline[];
}

/**
 * Exercise name entry for distinct names query
 */
export interface ExerciseNameEntry {
  exerciseName: string; // Normalized name
  displayName: string; // Human-readable display name
  count: number; // Number of logs
  lastPerformed: Date;
  disciplines: ExerciseDiscipline[];
}

/**
 * Query result for distinct exercise names
 */
export interface ExerciseNamesQueryResult {
  exercises: ExerciseNameEntry[];
  totalCount: number;
}
