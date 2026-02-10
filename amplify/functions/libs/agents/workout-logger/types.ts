/**
 * Workout Logger Agent Types
 *
 * Specific type definitions for the workout logging agent.
 * Extends the core agent types with workout-specific context.
 */

import type { AgentContext } from "../core/types";
import type { BuildWorkoutEvent } from "../../workout/types";

/**
 * Workout Logger Context
 *
 * Contains all data needed for workout logging tools.
 * Based on BuildWorkoutEvent but excludes message data (passed separately to agent.converse()).
 */
export interface WorkoutLoggerContext
  extends AgentContext, Omit<BuildWorkoutEvent, "userMessage" | "imageS3Keys"> {
  // Inherits from AgentContext:
  // - userId (required)
  // Inherits from BuildWorkoutEvent:
  // - coachId
  // - conversationId
  // - coachConfig
  // - completedAt?
  // - isSlashCommand?
  // - slashCommand?
  // - messageTimestamp?
  // - userTimezone?
  // - criticalTrainingDirective?
  // - templateContext?
}

/**
 * Result from workout logging process
 */
export interface WorkoutLogResult {
  success: boolean;
  workoutId?: string; // Primary/last workout (backward compat)
  discipline?: string;
  workoutName?: string;
  confidence?: number;
  completeness?: number;
  extractionMetadata?: any;
  normalizationSummary?: string;

  // Failure case
  skipped?: boolean;
  reason?: string;
  blockingFlags?: string[];

  // Multi-workout support
  allWorkouts?: {
    workoutId: string;
    workoutName?: string;
    discipline?: string;
    saved: boolean;
  }[];
}

/**
 * Tool-specific result types
 * (Exported for type safety and reusability)
 */

/**
 * Result from detect_discipline tool
 */
export interface DisciplineDetectionResult {
  discipline: string;
  confidence: number;
  method: "ai_detection";
  reasoning: string;
}

/**
 * Result from extract_workout_data tool
 */
export interface WorkoutExtractionResult {
  workoutData: any; // UniversalWorkoutSchema
  completedAt: Date;
  generationMethod: "tool" | "fallback";
  userMessage: string; // Original user message for qualitative workout validation
}

/**
 * Result from validate_workout_completeness tool
 */
export interface WorkoutValidationResult {
  isValid: boolean;
  shouldNormalize: boolean;
  shouldSave: boolean;
  confidence: number;
  completeness: number;
  validationFlags: string[];
  blockingFlags: string[];
  disciplineClassification: any; // DisciplineClassification
  reason?: string;
}

/**
 * Result from normalize_workout_data tool
 */
export interface WorkoutNormalizationResult {
  normalizedData: any; // UniversalWorkoutSchema
  isValid: boolean;
  issuesFound: number;
  issuesCorrected: number;
  normalizationSummary: string;
  normalizationConfidence: number;
}

/**
 * Result from generate_workout_summary tool
 */
export interface WorkoutSummaryResult {
  summary: string;
}

/**
 * Result from save_workout_to_database tool
 */
export interface WorkoutSaveResult {
  workoutId: string;
  success: boolean;
  pineconeStored: boolean;
  pineconeRecordId: string | null;
  templateLinked: boolean;
}
