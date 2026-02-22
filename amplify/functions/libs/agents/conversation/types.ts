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
}

/**
 * Streaming events yielded by callBedrockApiStreamForAgent.
 * The agent consumes these to implement the streaming ReAct loop.
 */
export type StreamAgentEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_use_start"; toolUseId: string; toolName: string }
  | { type: "tool_use_delta"; toolUseId: string; inputFragment: string }
  | { type: "tool_use_stop"; toolUseId: string }
  | {
      type: "message_complete";
      stopReason: string;
      assistantContent: any[];
      usage: { inputTokens: number; outputTokens: number };
    };

/**
 * Result returned by StreamingConversationAgent.converseStream()
 * after the generator is fully consumed.
 */
export interface ConversationAgentResult {
  fullResponseText: string; // Complete AI response text
  toolsUsed: string[]; // Tool IDs that were executed
  modelId: string; // Model used for the final response
  totalInputTokens: number;
  totalOutputTokens: number;
  iterationCount: number; // Number of ReAct loop iterations
}
