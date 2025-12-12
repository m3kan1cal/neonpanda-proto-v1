/**
 * Program Designer Agent Types
 *
 * Specific type definitions for the program design agent.
 * Extends the core agent types with program-specific context.
 */

import type { AgentContext } from "../core/types";
import type { BuildProgramEvent } from "../../program/types";

/**
 * Program Designer Context
 *
 * Contains all data needed for program design tools.
 * Based on BuildProgramEvent - no fields need to be omitted since BuildProgramEvent
 * doesn't contain any fields that should be passed separately to agent.converse().
 */
export interface ProgramDesignerContext
  extends AgentContext, BuildProgramEvent {
  // Inherits from AgentContext:
  // - userId (required)
  // Inherits from BuildProgramEvent:
  // - coachId
  // - conversationId
  // - programId
  // - sessionId
  // - todoList
  // - conversationContext
}

/**
 * Result from program design process
 */
export interface ProgramDesignResult {
  success: boolean;

  // Success case
  programId?: string;
  programName?: string;
  totalDays?: number;
  phases?: number;
  totalWorkouts?: number;
  trainingFrequency?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
  summary?: string;
  pineconeStored?: boolean;
  pineconeRecordId?: string | null;
  normalizationApplied?: boolean;
  generationMethod?: string;
  s3DetailKey?: string;

  // Failure case
  skipped?: boolean;
  reason?: string;
  blockingFlags?: string[];
}
