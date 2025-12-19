/**
 * Program Designer Types
 *
 * Defines the ProgramDesignerSession entity and related types for the
 * todo-list based program creation conversational flow.
 *
 * Pattern: Matches CoachCreatorSession structure exactly
 */

// Import and re-export shared types
import type { TodoItem } from "../todo-types";
import type { CoachMessage } from "../coach-conversation/types";

// Re-export for backward compatibility
export type { TodoItem, CoachMessage };

/**
 * ProgramDesignerSession - Separate DynamoDB entity for program creation
 *
 * Stored as:
 * PK: user#{userId}
 * SK: programDesignerSession#{sessionId}
 *
 * Where sessionId = program_designer_{userId}_{timestamp}
 * Full SK example: programDesignerSession#program_designer_user123_1732469123456
 *
 * This structure allows efficient querying:
 * - All sessions for a user: query PK with SK begins_with "programDesignerSession#"
 * - Specific session: direct get with exact SK
 * - Most recent active: query and filter by isDeleted=false, sort by lastActivity
 *
 * Design: Only ONE active session per user at a time (focused 5-10 minute conversation)
 * If user starts new design, existing incomplete session is automatically soft-deleted
 *
 * Lifecycle:
 * 1. Created when user enters program design flow
 * 2. Updated on each conversation message
 * 3. Marked complete when program generation starts
 * 4. Soft-deleted after program generation succeeds
 */
export interface ProgramDesignerSession {
  // Identity
  userId: string;
  coachId: string; // Coach ID for this program design session
  coachName?: string; // Coach name for display purposes (embedded for efficiency)
  sessionId: string; // program_designer_{userId}_{timestamp}

  // Todo-list based conversational flow
  todoList: ProgramDesignerTodoList;
  conversationHistory: CoachMessage[];

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
    status: "IN_PROGRESS" | "COMPLETE" | "FAILED";
    startedAt: Date;
    completedAt?: Date;
    failedAt?: Date;
    error?: string;
    programId?: string;
  };

  // Final user considerations (asked as last question before generation)
  additionalConsiderations?: string;
}

/**
 * Complete to-do list for program creation
 * 20 fields tracking all required information
 *
 * Note: Using camelCase for all field names (code convention)
 * User-facing text will say "training program"
 */
export interface ProgramDesignerTodoList {
  // Core Program Definition (3 fields)
  trainingGoals: TodoItem; // Primary objectives
  targetEvent: TodoItem; // Competition, race, testing, or null
  programDuration: TodoItem; // Weeks or specific end date

  // Schedule & Logistics (4 fields)
  trainingFrequency: TodoItem; // Days per week
  sessionDuration: TodoItem; // Typical workout length
  startDate: TodoItem; // When to begin
  restDaysPreference: TodoItem; // Specific days off, or flexible

  // Equipment & Environment (2 fields)
  equipmentAccess: TodoItem; // Available equipment with specifics
  trainingEnvironment: TodoItem; // Home gym, commercial, CrossFit box, etc.

  // User Context (5 fields)
  experienceLevel: TodoItem; // Beginner, intermediate, advanced
  currentFitnessBaseline: TodoItem; // Recent performance indicators
  injuryConsiderations: TodoItem; // Current injuries or limitations
  movementPreferences: TodoItem; // What they enjoy
  movementDislikes: TodoItem; // What to minimize

  // Program Structure Preferences (4 fields)
  trainingMethodology: TodoItem; // Preferred training style/discipline
  programFocus: TodoItem; // Strength, conditioning, gymnastics, mixed
  intensityPreference: TodoItem; // Conservative, moderate, aggressive
  volumeTolerance: TodoItem; // How much work they can handle

  // Optional Advanced (2 fields)
  deloadPreference: TodoItem; // Built-in recovery weeks
  progressionStyle: TodoItem; // Linear, undulating, block periodization
}

/**
 * Required fields for minimum viable program creation
 * Optional fields enhance program but aren't blocking
 */
export const REQUIRED_PROGRAM_FIELDS = [
  "trainingGoals",
  "programDuration",
  "trainingFrequency",
  "trainingMethodology",
  "equipmentAccess",
  "experienceLevel",
] as const;

export type RequiredProgramField = (typeof REQUIRED_PROGRAM_FIELDS)[number];
