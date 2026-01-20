/**
 * Training Program Types
 *
 * This module contains TypeScript interfaces and types specific to
 * training program functionality including programs, phases, workouts, and adaptation.
 */

import { TodoItem } from "../todo-types";

/**
 * Training Program entity - main program structure
 */
export interface Program {
  programId: string; // Keep ID prefix for clarity in queries/references
  userId: string;
  coachIds: string[]; // All coaches involved (supports multi-coach programs)
  coachNames: string[]; // Names of all coaches (for display without additional queries)
  creationConversationId?: string; // Optional: Link to the conversation that created it (not present for program designer sessions)

  // Program definition
  name: string; // Simplified from programName
  description: string; // Simplified from programDescription
  status: "active" | "paused" | "completed" | "archived";

  // Timeline and progression
  startDate: string; // YYYY-MM-DD format for calendar calculations
  endDate: string; // Calculated from startDate + totalDays
  totalDays: number; // Total program length in days
  currentDay: number; // User's current position (1-indexed)

  // Pause/resume tracking
  pausedAt: Date | null; // Timestamp when paused
  pausedDuration: number; // Total days paused (cumulative)

  // Program structure
  phases: ProgramPhase[]; // Simplified from programPhases
  equipmentConstraints: string[];
  trainingGoals: string[];
  trainingFrequency: number; // Days per week

  // Analytics
  totalWorkouts: number; // Scheduled workout count
  completedWorkouts: number;
  skippedWorkouts: number;
  completedRestDays: number; // Count of rest days manually completed
  adherenceRate: number; // completedWorkouts / totalWorkouts
  lastActivityAt: Date | null;

  // S3 storage reference for detailed daily workouts
  s3DetailKey: string; // Path to full program JSON in S3

  // Adaptation tracking
  adaptationLog: ProgramAdaptation[]; // Simplified from programAdaptationLog

  // Track day-level completion for multiple templates per day
  dayCompletionStatus: {
    [dayNumber: number]: {
      primaryComplete: boolean;
      optionalCompleted: number;
      totalOptional: number;
    };
  };

  // Optional metadata for tracking program origin and customization
  metadata?: {
    // Shared program copy tracking
    copiedFromSharedProgram?: boolean; // True if this was copied from a shared program
    sharedProgramId?: string; // Source shared program ID
    sourceCreator?: string; // Username of original creator
    sourceCoachNames?: string[]; // Original coach names for attribution
    adaptationReviewed?: boolean; // False = trigger slide-out on first view
    copiedAt?: string; // ISO timestamp of copy

    // Future: Could track customization history
    adaptationHistory?: Array<{
      timestamp: string;
      changeType: string;
      description: string;
    }>;
  };

  // DynamoDB timestamps (populated from database metadata)
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Training Program Phase structure - defines training phases within a program
 */
export interface ProgramPhase {
  phaseId: string; // Keep ID prefix for clarity
  name: string; // Simplified from phaseName - e.g., "Phase 1: Foundation Building"
  description: string; // Simplified from phaseDescription
  startDay: number; // 1-indexed day number
  endDay: number; // 1-indexed day number
  durationDays: number; // Calculated: endDay - startDay + 1
  focusAreas: string[]; // e.g., ["strength development", "movement quality"]
}

/**
 * Workout Template structure - a named, actionable workout
 * This represents a PRESCRIBED workout that hasn't been performed yet.
 * Once completed, it gets converted to a Workout (Universal Schema) with performance data.
 * Each template = one logged workout (1:1 relationship)
 *
 * Templates for the same training day are linked via groupId (implicit grouping)
 */
export interface WorkoutTemplate {
  // === Core Identity & Grouping ===
  templateId: string; // "template_userId_timestamp_shortId"
  groupId: string; // "group_userId_timestamp_shortId" - links templates for same day
  dayNumber: number; // Day 1, 2, 3... of program (for querying/display)
  phaseId?: string; // Optional reference to phase (for easier querying)
  name: string; // "Strength Block", "Lower Body Burn" (user-facing name)
  type: TemplateType; // Type of workout

  // === Natural Language Content ===
  description: string; // Natural language workout (coach-like, prescriptive)
  prescribedExercises: string[]; // ["Back Squat", "KB Swings"] - for AI context & filtering

  // === Scoring & Duration ===
  scoringType: ScoringType; // How this workout is scored/tracked
  timeCap?: number; // For timed workouts (minutes)
  estimatedDuration: number; // Expected duration (minutes)
  restAfter: number; // Rest after this workout (minutes)

  // === Optional Metadata ===
  equipment?: string[]; // ["Barbell", "Kettlebell", "Box"]
  notes?: string; // Coach notes for this specific workout
  metadata?: {
    difficulty?: string; // "beginner", "intermediate", "advanced"
    focusAreas?: string[]; // ["Lower Body", "Strength"]
  };

  // === Status Tracking (populated after logging) ===
  status?: "pending" | "completed" | "skipped" | "regenerated";
  completedAt?: Date | null;
  linkedWorkoutId?: string | null; // References logged Workout.workoutId
  userFeedback?: WorkoutFeedback | null;
}

/**
 * Template types - categorizes the workout
 */
export type TemplateType =
  | "strength" // Heavy barbell work, max effort lifts
  | "accessory" // Secondary strength work, hypertrophy
  | "conditioning" // MetCons, cardio, high-intensity intervals
  | "skill" // Technique work, skill practice
  | "mobility" // Stretching, mobility, recovery
  | "warmup" // Warm-up specific
  | "cooldown" // Cool-down specific
  | "recovery" // Recovery work
  | "power" // Powerlifting work
  | "olympic" // Olympic lifting work
  | "endurance" // Endurance work
  | "flexibility" // Flexibility work
  | "balance" // Balance work
  | "core" // Core work
  | "stability" // Stability work
  | "mixed"; // Combination of types

/**
 * Scoring types - how workout performance is tracked
 */
export type ScoringType =
  | "load" // Track weight lifted
  | "time" // For time workouts
  | "amrap" // As many rounds as possible
  | "rounds_plus_reps" // Track rounds + partial reps (e.g., "3 rounds + 15 reps")
  | "emom" // Every minute on the minute
  | "reps" // Total reps completed
  | "distance" // Distance covered
  | "calories" // Track calories on cardio equipment
  | "pace" // Speed tracking (min/mile, min/km, min/500m)
  | "rpe" // Rate of Perceived Exertion (1-10 scale)
  | "completion" // Just mark as done
  | "none"; // No scoring needed

/**
 * Exercise structure - individual exercises within a workout template
 * Represents a PRESCRIBED exercise that will be performed
 * Aligned with Universal Workout Schema for seamless conversion to logged workouts
 */
export interface Exercise {
  exerciseName: string;
  movementType:
    | "barbell"
    | "dumbbell"
    | "kettlebell"
    | "bodyweight"
    | "gymnastics"
    | "machine" // Cable machines, leg press, smith machine, etc.
    | "band" // Resistance bands
    | "medicine_ball" // Med ball slams, throws, etc.
    | "sled" // Sled pushes/pulls
    | "plyometric" // Box jumps, broad jumps, explosive movements
    | "rowing" // Rowing machine/erg
    | "cycling" // Bike erg, assault bike, spin bike
    | "ski" // Ski erg
    | "running" // Treadmill or outdoor running
    | "rope" // Battle ropes, jump rope
    | "plate" // Weight plates used directly
    | "sandbag" // Sandbag carries, cleans, etc.
    | "cardio" // Generic cardio (when specific type not needed)
    | "other"; // Other equipment or mixed
  variation?: string; // Movement variation: "touch and go", "dead stop", "strict", "kipping", "butterfly", etc.
  assistance?: string; // Equipment assistance: "red band", "blue band", "belt", "wraps", "sleeves", etc.

  sets?: number; // Number of sets prescribed
  reps?: number | string; // Prescribed reps: number or "AMRAP", "max", "UB" (unbroken), etc.

  weight?: {
    value?: number; // Prescribed weight value
    unit: "lbs" | "kg";
    percentage1RM?: number; // Percentage of 1 rep max (e.g., 75 for 75%)
    rxWeight?: number; // RX standard weight for this movement in this workout
    scaledWeight?: number; // Scaled option weight
  };

  distance?: {
    value: number;
    unit: "meters" | "miles" | "km" | "feet" | "yards";
  };

  calories?: number; // For bike/row/ski erg movements (prescribed calories)

  time?: {
    value: number;
    unit: "seconds" | "minutes" | "hours";
  };

  formNotes?: string; // Coaching cues, form reminders, scaling notes for this specific exercise
}

/**
 * Workout Feedback - user feedback after completing workout
 */
export interface WorkoutFeedback {
  rating: number; // 1-5 or thumbs up/down
  difficulty: "too_easy" | "just_right" | "too_hard" | null;
  comments: string | null;
  timestamp: Date;
  // Scaling analysis (populated automatically when logging from template)
  scalingAnalysis?: {
    wasScaled: boolean;
    modifications: string[]; // ["weight reduced from 135lb to 115lb", "substituted pull-ups for ring rows"]
    adherenceScore: number; // 0-1, how closely they followed the template
    analysisConfidence: number; // 0-1, confidence in the analysis
  };
}

/**
 * Workout Adaptation - tracks when and why workout template was regenerated
 */
export interface WorkoutAdaptation {
  adaptationId: string;
  timestamp: Date;
  reason: string; // Why it was regenerated
  changes: string; // What changed
  triggeredBy: "user_request" | "auto_adaptation" | "coach_adjustment";
  originalWorkout?: Partial<WorkoutTemplate>; // Snapshot of original
}

/**
 * Training Program Adaptation - system-wide adaptations to the program
 */
export interface ProgramAdaptation {
  adaptationId: string;
  timestamp: Date;
  trigger:
    | "consistent_scaling"
    | "missed_workouts"
    | "user_feedback"
    | "performance_data";
  description: string; // What was observed
  action: string; // What changed in programming
  affectedDays: number[]; // Which future workouts were adjusted
}

/**
 * Training Program Details - full program data stored in S3
 */
export interface ProgramDetails {
  programId: string;

  // Program context for better AI understanding
  programContext: {
    goals: string[];
    purpose: string;
    successMetrics: string[];
    equipmentConstraints: string[];
    userContext?: {
      fitnessLevel?: string;
      injuries?: string[];
      preferences?: string[];
    };
  };

  // Flat array of workout templates (implicit grouping via groupId and dayNumber)
  workoutTemplates: WorkoutTemplate[];

  generationMetadata: {
    generatedAt: Date;
    generatedBy: string; // Coach ID
    aiModel: string;
    confidence: number;
    generationPrompt?: string; // For debugging/analysis
  };
}

/**
 * Event structure for creating a training program
 */
export interface CreateProgramEvent {
  userId: string;
  coachId: string;
  conversationId: string;

  // Program parameters extracted from Build mode conversation
  name: string; // Simplified from programName
  description: string; // Simplified from programDescription
  totalDays: number;
  trainingFrequency: number;
  startDate: string; // YYYY-MM-DD
  equipmentConstraints: string[];
  trainingGoals: string[];

  // Phase structure
  phases: Array<{
    name: string; // Simplified from phaseName
    description: string; // Simplified from phaseDescription
    durationDays: number;
    focusAreas: string[];
  }>;

  // Optional metadata
  userContext?: {
    fitnessLevel?: string;
    injuries?: string[];
    preferences?: string[];
    previousProgramExperience?: string;
  };
}

/**
 * Event structure for updating training program status
 */
export interface UpdateProgramStatusEvent {
  userId: string;
  coachId: string;
  programId: string;
  action: "pause" | "resume" | "complete" | "archive";
  timestamp: Date;
}

/**
 * Event structure for the build-program Lambda function
 * Triggered asynchronously from program designer sessions
 */
export interface BuildProgramEvent {
  userId: string;
  coachId: string;
  conversationId?: string; // Optional: Not used for program designer sessions (session-based flow)
  programId: string; // Pre-generated program ID
  sessionId: string; // Program designer session ID (primary identifier)
  todoList: any; // ProgramDesignerTodoList with complete requirements
  conversationContext: string; // Full conversation history as text
  additionalConsiderations?: string; // User's final thoughts/requirements (asked as last question)
}

/**
 * Event structure for logging a workout template (converting template to logged workout)
 */
export interface LogWorkoutTemplateEvent {
  userId: string;
  coachId: string;
  programId: string;
  templateId: string; // Specific template to log
  groupId: string; // Links to other workouts from same training day
  workoutData?: any; // Optional: user can provide their own workout data, otherwise template is converted
  completedAt?: Date;
  feedback?: WorkoutFeedback;
}

/**
 * Event structure for regenerating a workout template
 */
export interface RegenerateWorkoutTemplateEvent {
  userId: string;
  coachId: string;
  programId: string;
  templateId: string; // Specific template to regenerate
  reason: string;
  constraints: {
    maxDuration?: number;
    equipmentChanges?: string[];
    intensityAdjustment?: "easier" | "harder";
    focusChange?: string;
  };
}

/**
 * Training Program summary for list views (lightweight)
 */
export interface ProgramSummary {
  programId: string; // Keep ID prefix for clarity
  name: string; // Simplified from programName
  status: Program["status"];
  currentDay: number;
  totalDays: number;
  adherenceRate: number;
  startDate: string;
  lastActivityAt: Date | null;
  coachIds: string[]; // All coaches
  coachNames: string[]; // All coach names
}

/**
 * Today's workout template view - what user sees in UI
 * Can include multiple templates if day has multiple workouts
 */
export interface TodaysWorkoutTemplates {
  programId: string;
  programName: string;
  dayNumber: number;
  totalDays: number;
  phaseName: string;
  phaseNumber: number | null; // Phase number (1-indexed) or null if phase not found
  groupId: string; // Links all templates for this day
  templates: WorkoutTemplate[]; // Array of templates for the day
  nextWorkout?: {
    dayNumber: number;
    templateName: string;
    scheduledDate: string;
  };
}

/**
 * Training Program creation result
 */
export interface ProgramDesignerResult {
  success: boolean;
  programId: string;
  program?: Program;
  error?: string;
}

/**
 * Conversation mode type for Build vs Chat
 */
export type ConversationMode = "chat" | "build";

/**
 * Training Program generation data from Build mode conversation
 */
export interface ProgramGenerationData {
  name: string;
  description: string;
  totalDays: number;
  trainingFrequency: number;
  startDate: string;
  equipmentConstraints: string[];
  trainingGoals: string[];
  phases: Array<{
    name: string;
    description: string;
    startDay: number;
    endDay: number;
    focusAreas: string[];
  }>;
  workoutTemplates: WorkoutTemplate[]; // Flat array of templates with groupId/dayNumber
}

/**
 * Program Creation Todo List
 * Tracks all information needed for training program generation
 * Pattern: Same structure as CoachCreatorTodoList
 */
export interface ProgramDesignerTodoList {
  // Core Program Definition (3 fields)
  trainingGoals: TodoItem;
  targetEvent: TodoItem;
  programDuration: TodoItem;

  // Schedule & Logistics (4 fields)
  trainingFrequency: TodoItem;
  sessionDuration: TodoItem;
  startDate: TodoItem;
  restDaysPreference: TodoItem;

  // Equipment & Environment (2 fields)
  equipmentAccess: TodoItem;
  trainingEnvironment: TodoItem;

  // User Context (5 fields)
  experienceLevel: TodoItem;
  currentFitnessBaseline: TodoItem;
  injuryConsiderations: TodoItem;
  movementPreferences: TodoItem;
  movementDislikes: TodoItem;

  // Program Structure Preferences (3 fields)
  programFocus: TodoItem;
  intensityPreference: TodoItem;
  volumeTolerance: TodoItem;

  // Optional Advanced (2 fields)
  deloadPreference: TodoItem;
  progressionStyle: TodoItem;
}
