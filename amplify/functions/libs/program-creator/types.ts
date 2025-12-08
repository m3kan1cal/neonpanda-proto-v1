/**
 * Program Creator Types
 *
 * Defines the ProgramCreatorSession entity and related types for the
 * todo-list based program creation conversational flow.
 *
 * Pattern: Matches CoachCreatorSession structure exactly
 */

// Re-export shared types
export type { TodoItem, ConversationMessage } from '../todo-types';
import type { TodoItem, ConversationMessage } from '../todo-types';

/**
 * ProgramCreatorSession - Separate DynamoDB entity for program creation
 *
 * Stored as:
 * PK: user#{userId}
 * SK: programCreatorSession#{sessionId}
 *
 * Where sessionId = program_creator_{conversationId}_{timestamp}
 * Full SK example: programCreatorSession#program_creator_conv123_1732469123456
 *
 * This structure allows efficient querying:
 * - All sessions for a user: query PK with SK begins_with "programCreatorSession#"
 * - All sessions for a conversation: query PK with SK begins_with "programCreatorSession#program_creator_{conversationId}_"
 * - Specific session: direct get with exact SK
 * - Supports multiple sessions per conversation (user can start multiple programs)
 *
 * Lifecycle:
 * 1. Created when user enters BUILD mode
 * 2. Updated on each conversation message
 * 3. Marked complete when program generation starts
 * 4. Soft-deleted after program generation succeeds
 */
export interface ProgramCreatorSession {
  // Identity
  userId: string;
  sessionId: string;  // program_creator_{conversationId}_{timestamp}
  conversationId: string; // Link back to CoachConversation

  // Todo-list based conversational flow
  todoList: ProgramCreatorTodoList;
  conversationHistory: ConversationMessage[];

  // Session status
  isComplete: boolean; // True when all required items collected
  isDeleted?: boolean; // Soft delete when program generation succeeds
  startedAt: Date;
  lastActivity: Date;
  completedAt?: Date;
  turnCount: number; // Track number of conversation turns (matches workout creator pattern)
  imageS3Keys: string[]; // Store image keys for multimodal context (matches workout creator pattern)

  // Progress tracking
  progressDetails?: {
    itemsCompleted: number;
    totalItems: number;
    percentage: number;
  };

  // Link to generated program
  programGeneration?: {
    status: 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';
    startedAt: Date;
    completedAt?: Date;
    failedAt?: Date;
    error?: string;
    programId?: string;
  };
}

/**
 * Complete to-do list for program creation
 * 21 fields tracking all required information
 *
 * Note: Using camelCase for all field names (code convention)
 * User-facing text will say "training program"
 */
export interface ProgramCreatorTodoList {
  // Core Program Definition (3 fields)
  trainingGoals: TodoItem;        // Primary objectives
  targetEvent: TodoItem;          // Competition, race, testing, or null
  programDuration: TodoItem;      // Weeks or specific end date

  // Schedule & Logistics (4 fields)
  trainingFrequency: TodoItem;    // Days per week
  sessionDuration: TodoItem;      // Typical workout length
  startDate: TodoItem;            // When to begin
  restDaysPreference: TodoItem;   // Specific days off, or flexible

  // Equipment & Environment (2 fields)
  equipmentAccess: TodoItem;      // Available equipment with specifics
  trainingEnvironment: TodoItem;  // Home gym, commercial, CrossFit box, etc.

  // User Context (5 fields)
  experienceLevel: TodoItem;      // Beginner, intermediate, advanced
  currentFitnessBaseline: TodoItem; // Recent performance indicators
  injuryConsiderations: TodoItem; // Current injuries or limitations
  movementPreferences: TodoItem;  // What they enjoy
  movementDislikes: TodoItem;     // What to minimize

  // Program Structure Preferences (3 fields)
  programFocus: TodoItem;         // Strength, conditioning, gymnastics, mixed
  intensityPreference: TodoItem;  // Conservative, moderate, aggressive
  volumeTolerance: TodoItem;      // How much work they can handle

  // Optional Advanced (2 fields)
  deloadPreference: TodoItem;     // Built-in recovery weeks
  progressionStyle: TodoItem;     // Linear, undulating, block periodization
}

/**
 * Required fields for minimum viable program creation
 * Optional fields enhance program but aren't blocking
 */
export const REQUIRED_PROGRAM_FIELDS = [
  'trainingGoals',
  'programDuration',
  'trainingFrequency',
  'equipmentAccess',
  'experienceLevel',
] as const;

export type RequiredProgramField = typeof REQUIRED_PROGRAM_FIELDS[number];
