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
  // - coachId (required)
  // - conversationId (optional - not used for program designer sessions)
  // - programId (required)
  // - sessionId (required - primary identifier)
  // - todoList (required)
  // - conversationContext (required)
  // - additionalConsiderations (optional)
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
  phaseCount?: number; // Number of phases in the program
  totalWorkoutTemplates?: number; // Total workout templates (may include multiple sessions per day)
  uniqueTrainingDays?: number; // Number of unique training days covered
  averageSessionsPerDay?: string; // Average sessions per training day
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
