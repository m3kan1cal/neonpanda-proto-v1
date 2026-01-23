/**
 * Shared Program Types
 *
 * This module contains TypeScript interfaces for the program sharing feature.
 * SharedProgram represents a publicly shareable link to a user's completed training program.
 *
 * Pattern: Similar to CoachTemplate (publicly accessible, user-created content)
 * Reference: amplify/functions/libs/coach-creator/types.ts (CoachTemplate)
 */

import { ProgramPhase } from "../program/types";

/**
 * Frozen snapshot of program data at share time
 * Contains only the information needed for preview and adaptation
 * Pattern: Similar to CoachTemplate.base_config (frozen configuration)
 */
export interface SharedProgramSnapshot {
  name: string;
  description: string;
  totalDays: number;
  trainingFrequency: number; // Days per week
  phases: ProgramPhase[];
  trainingGoals: string[];
  equipmentConstraints: string[];
  coachNames: string[]; // ["Coach Marcus"] - for "Created with Coach Marcus" attribution
}

/**
 * SharedProgram entity - represents a program shared for public viewing
 *
 * DynamoDB Schema:
 *   pk: sharedProgram#{sharedProgramId}
 *   sk: metadata
 *   entityType: sharedProgram
 *   gsi1pk: user#{creatorUserId}
 *   gsi1sk: sharedProgram#{sharedProgramId}
 *
 * S3 Storage:
 *   sharedPrograms/{creatorUserId}/{sharedProgramId}_{timestamp}.json
 *
 * Pattern: Similar to CoachTemplate but user-owned
 * Reference: amplify/functions/libs/coach-creator/types.ts
 */
export interface SharedProgram {
  // === Identity ===
  sharedProgramId: string; // "sharedProgram_{nanoId}" (no userId for privacy)
  originalProgramId: string; // Reference to source program
  originalCoachId?: string; // First coach from original program (for source program link)
  creatorUserId: string; // User who shared
  creatorUsername: string; // Display name for attribution on preview page

  // === Program Data ===
  // Frozen snapshot of program at share time (immutable after creation)
  programSnapshot: SharedProgramSnapshot;

  // S3 reference for full workout templates (details not shown in preview)
  s3DetailKey: string; // "sharedPrograms/{creatorUserId}/{sharedProgramId}_{timestamp}.json"

  // === Status ===
  isActive: boolean; // False = unshared/deactivated (soft delete)

  // === Engagement Metrics ===
  viewCount: number; // Incremented on each view of the shared program
  copyCount: number; // Incremented on each copy/adaptation of the shared program

  // === DynamoDB Timestamps ===
  // Populated from database metadata (like other entities)
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Shared program details stored in S3
 * Contains full workout templates for adaptation
 *
 * Pattern: Similar to ProgramDetails but for shared programs
 * Reference: amplify/functions/libs/program/types.ts (ProgramDetails)
 */
export interface SharedProgramDetails {
  sharedProgramId: string;
  programSnapshot: SharedProgramSnapshot;
  workoutTemplates: any[]; // WorkoutTemplate[] - using any to avoid circular import
  generationMetadata: {
    sharedAt: string; // ISO timestamp
    originalProgramId: string;
    // Preserve original generation metadata for provenance tracking
    originalGeneratedBy?: string; // Original coach ID
    originalAiModel?: string; // Original AI model used
    originalConfidence?: number; // Original confidence score
    originalGenerationPrompt?: string; // Original generation prompt
  };
}

/**
 * API request body for creating a shared program
 */
export interface CreateSharedProgramRequest {
  coachId: string;
  // programId comes from path parameter, not body
}

/**
 * API response for creating a shared program
 */
export interface CreateSharedProgramResponse {
  sharedProgramId: string;
  shareUrl: string;
  createdAt: string;
}

/**
 * API response for getting a shared program (public preview)
 */
export interface GetSharedProgramResponse {
  sharedProgramId: string;
  creatorUserId: string; // For ownership check on frontend (is this the logged-in user's program?)
  creatorUsername: string;
  programSnapshot: SharedProgramSnapshot;
  sampleWorkouts?: any[]; // Sample workout templates for preview (limited to 3-5)
  createdAt: string;
  // Engagement metrics
  viewCount: number;
  copyCount: number;
}

/**
 * API response for querying user's shared programs
 */
export interface QuerySharedProgramsResponse {
  sharedPrograms: SharedProgram[];
}

/**
 * Request body for starting program adaptation
 */
export interface StartProgramAdaptationRequest {
  coachId: string;
}

/**
 * Response for starting program adaptation
 */
export interface StartProgramAdaptationResponse {
  sessionId: string; // Program designer session ID
  coachId: string;
  coachName: string;
  message: string;
}
