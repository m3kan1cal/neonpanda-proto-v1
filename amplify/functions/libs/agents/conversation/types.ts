/**
 * Conversation Agent Types
 *
 * Types for the streaming conversation agent that replaces the procedural
 * Smart Router pipeline. Follows patterns from:
 * - agents/workout-logger/types.ts (context structure)
 * - agents/core/types.ts (Tool, AgentContext interfaces)
 * - streaming/business-types.ts (streaming event types)
 */

import type { AgentContext, Tool } from "../core/types";
import type { CoachConfig } from "../../coach-creator/types";
import type {
  CoachMessage,
  ConversationMode,
} from "../../coach-conversation/types";

/**
 * Context shared across all conversation agent tools.
 *
 * Pattern: Matches WorkoutLoggerContext / ProgramDesignerContext / CoachCreatorContext
 * - extends AgentContext (requires userId)
 * - adds domain-specific fields
 * - message content excluded (passed to converseStream separately)
 */
export interface ConversationAgentContext extends AgentContext {
  userId: string;
  coachId: string;
  conversationId: string;
  coachConfig: CoachConfig;
  userTimezone: string; // From getUserTimezoneOrDefault()
  criticalTrainingDirective?: {
    enabled: boolean;
    directive: string;
  };
  // S3 keys for images attached to the current message
  imageS3Keys?: string[];
  // Active program (loaded in handler, null if no active program)
  activeProgram?: {
    programId: string;
    programName: string;
    currentDay: number;
    totalDays: number;
    status: string;
    completedWorkouts: number;
    totalWorkouts: number;
    s3DetailKey: string; // S3 key for program details JSON
    phases: Array<{
      phaseId: string;
      name: string;
      description: string;
      startDay: number;
      endDay: number;
      durationDays: number;
      focusAreas: string[];
      workoutCount?: number;
    }>;
  } | null;
  // Edit context — present when the conversation is in workout_edit mode
  editContext?: {
    entityType: "workout"; // extensible to "program" later
    entityId: string;
  };
  // Set of content fingerprints for workouts already logged this turn.
  // Prevents duplicate async triggers while allowing distinct workouts through.
  workoutLoggedThisTurn?: Set<string>;
}

// Re-export shared streaming types from core so existing imports continue to work
export type { StreamAgentEvent, ConversationAgentResult } from "../core/types";
