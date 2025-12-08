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
  workoutId?: string;
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
}
