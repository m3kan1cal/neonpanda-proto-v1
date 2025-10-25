/**
 * Training Program Types
 *
 * This module contains TypeScript interfaces and types specific to
 * training program functionality including programs, phases, workouts, and adaptation.
 */

/**
 * Training Program entity - main program structure
 */
export interface TrainingProgram {
  programId: string; // Keep ID prefix for clarity in queries/references
  userId: string;
  coachId: string;
  creationConversationId: string; // Link to the conversation that created it

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
  phases: TrainingProgramPhase[]; // Simplified from trainingProgramPhases
  equipmentConstraints: string[];
  trainingGoals: string[];
  trainingFrequency: number; // Days per week

  // Analytics
  totalWorkouts: number; // Scheduled workout count
  completedWorkouts: number;
  skippedWorkouts: number;
  adherenceRate: number; // completedWorkouts / totalWorkouts
  lastActivityAt: Date | null;

  // S3 storage reference for detailed daily workouts
  s3DetailKey: string; // Path to full program JSON in S3

  // Adaptation tracking
  adaptationLog: TrainingProgramAdaptation[]; // Simplified from trainingProgramAdaptationLog

  // Track day-level completion for multiple templates per day
  dayCompletionStatus: {
    [dayNumber: number]: {
      primaryComplete: boolean;
      optionalCompleted: number;
      totalOptional: number;
    };
  };

  // NOTE: createdAt/updatedAt are provided by DynamoDBItem<TrainingProgram> wrapper
  // They are NOT stored inside attributes to avoid redundancy and maintain consistency
}

/**
 * Training Program Phase structure - defines training phases within a program
 */
export interface TrainingProgramPhase {
  phaseId: string; // Keep ID prefix for clarity
  name: string; // Simplified from phaseName - e.g., "Phase 1: Foundation Building"
  description: string; // Simplified from phaseDescription
  startDay: number; // 1-indexed day number
  endDay: number; // 1-indexed day number
  durationDays: number; // Calculated: endDay - startDay + 1
  focusAreas: string[]; // e.g., ["strength development", "movement quality"]
}

/**
 * Workout Template structure - a planned workout stored in S3 as part of program details
 * This represents a PRESCRIBED workout that hasn't been performed yet.
 * Once completed, it gets converted to a Workout (Universal Schema) with performance data.
 */
export interface WorkoutTemplate {
  // === Structured Metadata (for app functionality) ===
  templateId: string; // Keep ID prefix for clarity
  dayNumber: number; // 1-indexed position in program
  templateType: "primary" | "optional" | "accessory"; // For handling multiple templates per day
  templatePriority: number; // For sorting templates within a day
  scheduledDate: string; // YYYY-MM-DD calculated from startDate + dayNumber - pausedDuration
  phaseId: string; // Which phase this workout belongs to

  // === Display Fields ===
  name: string; // "Lower Body Strength - Squat Focus"
  description: string; // Brief 1-sentence overview
  estimatedDuration: number; // Minutes
  requiredEquipment: string[]; // Subset of program equipment

  // === Natural Language Workout Content ===
  workoutContent: string; // The actual workout written naturally (like a human coach)
  coachingNotes: string; // Additional context, cues, scaling options, focus points

  // === Optional: Lightweight Exercise References ===
  prescribedExercises?: Exercise[]; // Optional - for filtering/quick reference only

  // === Status Tracking ===
  status: "pending" | "completed" | "skipped" | "regenerated";
  completedAt: Date | null;

  // Link to the logged workout (Universal Schema) when completed
  linkedWorkoutId: string | null; // References Workout.workoutId

  userFeedback: WorkoutFeedback | null;
  adaptationHistory: WorkoutAdaptation[]; // If regenerated, track changes
}

/**
 * Exercise structure - individual exercises within a workout template
 * Represents a PRESCRIBED exercise that will be performed
 * Aligned with Universal Workout Schema for seamless conversion to logged workouts
 */
export interface Exercise {
  exerciseName: string;
  movementType: "barbell" | "dumbbell" | "kettlebell" | "bodyweight" | "gymnastics" | "cardio" | "other";
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
export interface TrainingProgramAdaptation {
  adaptationId: string;
  timestamp: Date;
  trigger: "consistent_scaling" | "missed_workouts" | "user_feedback" | "performance_data";
  description: string; // What was observed
  action: string; // What changed in programming
  affectedDays: number[]; // Which future workouts were adjusted
}

/**
 * Training Program Details - full program data stored in S3
 */
export interface TrainingProgramDetails {
  programId: string;

  // NEW: Program context for better AI understanding
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

  dailyWorkoutTemplates: WorkoutTemplate[]; // Renamed from dailyWorkouts

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
export interface CreateTrainingProgramEvent {
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
export interface UpdateTrainingProgramStatusEvent {
  userId: string;
  coachId: string;
  programId: string;
  action: "pause" | "resume" | "complete" | "archive";
  timestamp: Date;
}

/**
 * Event structure for the build-training-program Lambda function
 * Triggered asynchronously from Build mode conversations
 */
export interface BuildTrainingProgramEvent {
  userId: string;
  coachId: string;
  conversationId: string;
  conversationMessages: any[]; // Full conversation history for context
  coachConfig: any; // CoachConfig from DynamoDB
  userProfile?: any; // UserProfile from DynamoDB (optional)
}

/**
 * Event structure for logging a workout template (converting template to logged workout)
 */
export interface LogWorkoutTemplateEvent {
  userId: string;
  coachId: string;
  programId: string;
  templateId: string; // Specific template to log
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
export interface TrainingProgramSummary {
  programId: string; // Keep ID prefix for clarity
  name: string; // Simplified from programName
  status: TrainingProgram["status"];
  currentDay: number;
  totalDays: number;
  adherenceRate: number;
  startDate: string;
  lastActivityAt: Date | null;
  coachId: string;
  coachName: string;
}

/**
 * Today's workout template view - what user sees in UI
 * Can include multiple templates (primary + optional)
 */
export interface TodaysWorkoutTemplates {
  programId: string; // Keep ID prefix for clarity
  programName: string; // Keep for display purposes (external reference)
  dayNumber: number;
  totalDays: number;
  phaseName: string; // Keep for display purposes (external reference)
  templates: WorkoutTemplate[]; // Array of templates for the day (primary + optional)
  nextWorkout?: {
    dayNumber: number;
    name: string; // Simplified from workoutName
    scheduledDate: string;
  };
}

/**
 * Training Program creation result
 */
export interface TrainingProgramCreationResult {
  success: boolean;
  programId: string;
  program?: TrainingProgram;
  error?: string;
}

/**
 * Conversation mode type for Build vs Chat
 */
export type ConversationMode = "chat" | "build";

/**
 * Training Program generation data from Build mode conversation
 */
export interface TrainingProgramGenerationData {
  name: string; // Simplified from programName
  description: string; // Simplified from programDescription
  totalDays: number;
  trainingFrequency: number;
  startDate: string;
  equipmentConstraints: string[];
  trainingGoals: string[];
  phases: Array<{
    name: string; // Simplified from phaseName
    description: string; // Simplified from phaseDescription
    startDay: number;
    endDay: number;
    focusAreas: string[];
  }>;
  dailyWorkoutTemplates: WorkoutTemplate[];
}

/**
 * Result from detecting training program generation trigger in AI response
 */
export interface TrainingProgramGenerationDetection {
  shouldGenerate: boolean;
  cleanedResponse: string; // Response with trigger removed
}
