/**
 * Workout Session Types
 *
 * This module contains TypeScript interfaces and types specific to
 * workout functionality including extraction, detection, and processing.
 */

import { CoachConfig } from "../coach-creator/types";

/**
 * Discipline classification result from AI analysis
 */
export interface DisciplineClassification {
  isQualitative: boolean;
  requiresPreciseMetrics: boolean;
  environment: "indoor" | "outdoor" | "mixed";
  primaryFocus:
    | "strength"
    | "endurance"
    | "power"
    | "speed"
    | "agility"
    | "flexibility"
    | "balance"
    | "technique"
    | "coordination"
    | "mixed";
  confidence: number;
  reasoning: string;
}

/**
 * Core workout data structure
 */
export interface Workout {
  workoutId: string;
  userId: string;
  coachIds: string[];
  coachNames: string[];
  conversationId: string;
  completedAt: Date;
  workoutData: UniversalWorkoutSchema;
  extractionMetadata: {
    confidence: number;
    extractedAt: Date;
    reviewedBy?: string;
    reviewedAt?: Date;
    // Template comparison for template-based workouts
    templateComparison?: {
      wasScaled: boolean;
      modifications: string[];
      adherenceScore: number; // 0-1
      analysisConfidence: number; // 0-1
    };
    normalizationSummary?: string; // Summary of normalization changes
  };
  // NEW: AI-generated summary for coach context and UI display
  summary?: string;
  // Root-level workout name for easier access
  workoutName?: string;

  // NEW: Training program template relationship (for implicit grouping)
  templateId?: string; // Links to the WorkoutTemplate this was logged from
  groupId?: string; // Links workouts from same training day/session

  // Legacy training program context (kept for backward compatibility)
  programContext?: {
    programId: string;
    coachId: string;
    templateId: string;
    dayNumber: number;
    phaseId: string;
    phaseName: string;
  };
  // DynamoDB timestamps (populated from database metadata)
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Universal Workout Schema interface (based on UNIVERSAL_WORKOUT_SCHEMA.md)
 */
export interface UniversalWorkoutSchema {
  workout_id: string;
  user_id: string;
  date: string;
  discipline: string;
  methodology?: string;
  workout_name?: string;
  workout_type: string;
  duration?: number;
  session_duration?: number;
  location?: string;
  performance_metrics?: PerformanceMetrics;
  discipline_specific?: DisciplineSpecific;
  pr_achievements?: PRAchievement[];
  subjective_feedback?: SubjectiveFeedback;
  environmental_factors?: EnvironmentalFactors;
  recovery_metrics?: RecoveryMetrics;
  coach_notes?: CoachNotes;
  metadata: WorkoutMetadata; // Required - core part of Universal Workout Schema
}

/**
 * Performance metrics section
 */
export interface PerformanceMetrics {
  intensity?: number;
  perceived_exertion?: number;
  heart_rate?: {
    avg?: number;
    max?: number;
    zones?: {
      zone_1?: number;
      zone_2?: number;
      zone_3?: number;
      zone_4?: number;
      zone_5?: number;
    };
  };
  calories_burned?: number;
  mood_pre?: number;
  mood_post?: number;
  energy_level_pre?: number;
  energy_level_post?: number;
}

/**
 * Discipline-specific data
 */
export interface DisciplineSpecific {
  crossfit?: CrossFitWorkout;
  powerlifting?: PowerliftingWorkout;
  running?: RunningWorkout;
  bodybuilding?: BodybuildingWorkout;
  hyrox?: HyroxWorkout;
  olympic_weightlifting?: OlympicWeightliftingWorkout;
  functional_bodybuilding?: FunctionalBodybuildingWorkout;
  calisthenics?: CalisthenicsWorkout;
  circuit_training?: CircuitTrainingWorkout;
}

/**
 * CrossFit-specific workout structure
 */
export interface CrossFitWorkout {
  workout_format:
    | "for_time"
    | "amrap"
    | "emom"
    | "tabata"
    | "ladder"
    | "chipper"
    | "death_by"
    | "intervals"
    | "strength_then_metcon"
    | "hero_workout"
    | "custom";
  time_cap?: number;
  rx_status: "rx" | "scaled" | "modified";
  rounds: CrossFitRound[];
  performance_data?: {
    total_time?: number;
    rounds_completed: number;
    total_reps?: number;
    round_times?: number[];
    score?: {
      value: number | string;
      type: "time" | "rounds" | "reps" | "weight" | "distance" | "points";
      unit?: string;
    };
  };
}

/**
 * CrossFit round structure
 */
export interface CrossFitRound {
  round_number: number;
  rep_scheme?: string;
  exercises: CrossFitExercise[];
}

/**
 * CrossFit exercise structure
 */
export interface CrossFitExercise {
  exercise_name: string;
  movement_type: string;
  variation?: string;
  assistance?: string;
  weight?: {
    value?: number;
    unit: string;
    percentage_1rm?: number;
    rx_weight?: number;
    scaled_weight?: number;
  };
  reps?: {
    prescribed: number | "max";
    completed: number;
    broken_sets?: number[];
    rest_between_sets?: number[];
  };
  distance?: number;
  calories?: number;
  time?: number;
  form_notes?: string;
}

/**
 * Other discipline types (placeholder for future implementation)
 */
export interface PowerliftingWorkout {
  [key: string]: any; // Placeholder
}

export interface RunningWorkout {
  run_type:
    | "easy"
    | "tempo"
    | "interval"
    | "long"
    | "race"
    | "recovery"
    | "fartlek"
    | "progression"
    | "threshold"
    | "hill_repeats"
    | "speed_work";
  total_distance: number;
  distance_unit: "miles" | "km";
  total_time: number;
  average_pace: string;
  elevation_gain?: number;
  elevation_loss?: number;
  surface: "road" | "trail" | "track" | "treadmill" | "mixed";
  weather?: {
    temperature?: number;
    temperature_unit?: "F" | "C";
    conditions?: "sunny" | "cloudy" | "rainy" | "snowy" | "windy" | "foggy";
    wind_speed?: number;
    humidity?: number;
  };
  equipment?: {
    shoes?: string;
    wearable?: string;
    other_gear?: string[];
  };
  warmup?: {
    distance?: number;
    time?: number;
    description?: string;
  };
  cooldown?: {
    distance?: number;
    time?: number;
    description?: string;
  };
  segments?: RunningSegment[];
  route?: {
    name?: string;
    description?: string;
    type?: "out_and_back" | "loop" | "point_to_point";
  };
  fueling?: {
    pre_run?: string;
    during_run?: string[];
    hydration_oz?: number;
  };
}

export interface RunningSegment {
  segment_number: number;
  segment_type:
    | "warmup"
    | "working"
    | "interval"
    | "recovery"
    | "cooldown"
    | "main";
  distance: number;
  time: number;
  pace: string;
  heart_rate_avg?: number;
  heart_rate_max?: number;
  cadence?: number;
  effort_level: "easy" | "moderate" | "hard" | "max";
  terrain: "flat" | "uphill" | "downhill" | "mixed";
  elevation_change?: number;
  notes?: string;
}

export interface BodybuildingWorkout {
  split_type: string;
  target_muscle_groups?: string[];
  exercises: BodybuildingExercise[];
}

export interface BodybuildingExercise {
  exercise_name: string;
  movement_category: string;
  target_muscles?: string[];
  equipment?: string;
  variation?: string | null;
  sets: BodybuildingSet[];
  superset_with?: string | null;
}

export interface BodybuildingSet {
  set_number: number;
  set_type?: string;
  reps: number;
  weight: number;
  weight_unit?: string;
  rpe?: number | null;
  rest_time?: number | null;
  tempo?: string | null;
  time_under_tension?: number | null;
  failure?: boolean;
  notes?: string | null;
}

export interface HyroxWorkout {
  race_or_training: string;
  division?: string | null;
  total_time?: number | null;
  stations: HyroxStation[];
  runs: HyroxRun[];
  performance_notes?: string | null;
}

export interface HyroxStation {
  station_number: number;
  station_name: string;
  distance?: number | null;
  reps?: number | null;
  weight?: number | null;
  weight_unit?: string | null;
  time?: number | null;
  notes?: string | null;
}

export interface HyroxRun {
  run_number: number;
  distance: number;
  time?: number | null;
  pace?: string | null;
  notes?: string | null;
}

export interface OlympicWeightliftingWorkout {
  session_type: string;
  competition_prep?: boolean;
  lifts: OlympicLift[];
}

export interface OlympicLift {
  lift_name: string;
  lift_category: string;
  variation?: string | null;
  position?: string | null;
  attempts?: {
    opener?: number | null;
    second_attempt?: number | null;
    third_attempt?: number | null;
    successful_attempts?: number[];
    missed_attempts?: number[];
    miss_reasons?: string[];
  };
  sets: OlympicLiftSet[];
  complex_structure?: string | null;
}

export interface OlympicLiftSet {
  set_number: number;
  set_type?: string;
  weight: number;
  weight_unit: string;
  reps: number;
  percentage_1rm?: number | null;
  success?: boolean;
  rest_time?: number | null;
  technique_notes?: string | null;
}

export interface FunctionalBodybuildingWorkout {
  session_focus: string;
  methodology?: string | null;
  exercises: FunctionalBodybuildingExercise[];
}

export interface FunctionalBodybuildingExercise {
  exercise_name: string;
  movement_pattern: string;
  target_muscles?: string[];
  equipment?: string;
  structure?: string;
  emom_details?: {
    interval: number;
    rounds: number;
    reps_per_round: number;
  } | null;
  sets: FunctionalBodybuildingSet[];
  superset_with?: string | null;
}

export interface FunctionalBodybuildingSet {
  set_number: number;
  reps: number;
  weight: number;
  weight_unit?: string;
  rest_time?: number | null;
  tempo?: string | null;
  quality_focus?: string | null;
  notes?: string | null;
}

export interface CalisthenicsWorkout {
  session_focus: string;
  exercises: CalisthenicsExercise[];
}

export interface CalisthenicsExercise {
  exercise_name: string;
  skill_category: string;
  progression_level?: string | null;
  assistance_method?: string | null;
  sets: CalisthenicsSet[];
}

export interface CalisthenicsSet {
  set_number: number;
  set_type?: string;
  reps?: number | null;
  hold_time?: number | null;
  rest_time?: number | null;
  success?: boolean;
  quality_rating?: number | null;
  notes?: string | null;
}

export interface CircuitTrainingWorkout {
  circuit_format:
    | "stations"
    | "amrap"
    | "emom"
    | "tabata"
    | "rounds"
    | "custom";
  session_focus?: "cardio" | "strength" | "hybrid" | "endurance" | "power";
  total_rounds?: number;
  work_interval?: number; // seconds
  rest_interval?: number; // seconds
  stations: CircuitStation[];
  performance_data?: {
    total_time?: number;
    rounds_completed?: number;
    total_work_time?: number;
  };
  class_name?: string; // "F45 Hollywood", "Orange Theory 2G"
  class_style?: string; // "f45" | "orange_theory" | "barrys" | "community_class" | "custom"
}

export interface CircuitStation {
  station_number: number;
  station_name?: string;
  exercise_name: string;
  work_time?: number; // seconds
  rest_time?: number; // seconds
  reps?: number;
  weight?: number;
  weight_unit?: string;
  equipment?: string;
  notes?: string;
}

/**
 * PR Achievement structure
 */
export interface PRAchievement {
  exercise: string;
  discipline: string;
  pr_type: string;
  previous_best?: number;
  new_best: number;
  improvement?: number;
  improvement_percentage?: number;
  date_previous?: string;
  significance: "minor" | "moderate" | "major";
  context?: string;
}

/**
 * Subjective feedback structure
 */
export interface SubjectiveFeedback {
  enjoyment?: number;
  difficulty?: number;
  form_quality?: number;
  motivation?: number;
  confidence?: number;
  mental_state?: string;
  pacing_strategy?: string;
  nutrition_pre_workout?: string;
  hydration_level?: string;
  sleep_quality_previous?: number;
  stress_level?: number;
  soreness_pre?: SorenessLevel;
  soreness_post?: SorenessLevel;
  notes?: string;
}

/**
 * Soreness level structure
 */
export interface SorenessLevel {
  overall?: number;
  legs?: number;
  arms?: number;
  back?: number;
}

/**
 * Environmental factors
 */
export interface EnvironmentalFactors {
  temperature?: number;
  humidity?: number;
  altitude?: number;
  equipment_condition?: string;
  gym_crowding?: string;
}

/**
 * Recovery metrics
 */
export interface RecoveryMetrics {
  hrv_morning?: number;
  resting_heart_rate?: number;
  sleep_hours?: number;
  stress_level?: number;
  readiness_score?: number;
}

/**
 * Coach notes structure
 */
export interface CoachNotes {
  programming_intent?: string;
  coaching_cues_given?: string[];
  areas_for_improvement?: string[];
  positive_observations?: string[];
  next_session_focus?: string;
  adaptation_recommendations?: string[];
  safety_flags?: string[];
  motivation_strategy?: string;
}

/**
 * Workout metadata structure
 */
export interface WorkoutMetadata {
  logged_via: string;
  logging_time?: number;
  data_confidence: number;
  ai_extracted: boolean;
  user_verified: boolean;
  version: string;
  schema_version: string;
  data_completeness?: number;
  extraction_method: string;
  validation_flags?: string[];
  extraction_notes?: string;
  generation_method?: "tool" | "fallback";
  generation_timestamp?: string;
}

/**
 * Template context for workout logging from training programs
 */
export interface TemplateContext {
  programId: string;
  templateId: string;
  groupId: string;
  dayNumber: number;
  phaseId?: string;
  phaseName?: string;
  scoringType: string;
  prescribedExercises: string[];
  estimatedDuration: number;
  prescribedDescription: string;
  // Scaling analysis from log-workout-template
  scalingAnalysis?: {
    wasScaled: boolean;
    modifications: string[];
    adherenceScore: number; // 0-1
    analysisConfidence: number; // 0-1
  };
}

/**
 * Event structure for the build-workout Lambda function
 */
export interface BuildWorkoutEvent {
  userId: string;
  coachId: string;
  conversationId: string; // "standalone" for command palette, actual conversationId for conversation-based
  userMessage: string;
  coachConfig: CoachConfig;
  completedAt?: string; // ISO date string
  isSlashCommand?: boolean; // Whether this was triggered by a slash command
  slashCommand?: string; // The slash command that was used (e.g., 'log-workout', 'log', 'workout')
  messageTimestamp?: string; // When the user typed the message (for better completion time accuracy)
  userTimezone?: string; // User's timezone preference (e.g., 'America/Los_Angeles')
  criticalTrainingDirective?: { content: string; enabled: boolean }; // User's critical training directive
  templateContext?: TemplateContext; // Optional: Context from training program template
  imageS3Keys?: string[]; // Optional: S3 keys for images attached to the message (may contain workout data)
  // Note: Discipline detection is handled by WorkoutLoggerAgent's detect_discipline tool (agent-first approach)
}

/**
 * Result of quick workout extraction (used in detection phase)
 */
export interface QuickWorkoutExtraction {
  workoutName?: string;
  timeDetected?: string;
  weightDetected?: string;
  discipline?: string;
  repCountDetected?: string;
  roundsDetected?: string;
  intensityDetected?: string;
  equipmentUsed?: string;
  locationContext?: string;
  keyExercises?: string[];
  quickSummary?: string;
  confidence: number;
}

/**
 * Time indicator patterns for extracting completion times
 */
export interface TimeIndicator {
  pattern: RegExp;
  offset: number;
  hour?: number;
}

/**
 * Workout detection result
 */
export interface WorkoutDetectionResult {
  isWorkout: boolean;
  confidence: number;
  quickExtraction?: QuickWorkoutExtraction;
  detectedPatterns: string[];
}

// Lightweight function to query only workout summary fields
// Uses ProjectionExpression to avoid fetching full workout data (30KB+ per workout)
// Workout summary type for analytics queries
export interface WorkoutSummary {
  workoutId: string;
  completedAt: Date;
  summary?: string;
  workoutName?: string;
  discipline?: string;
  coachIds: string[];
}

// Future types can be added here:
// export interface WorkoutValidationResult { ... }
// export interface WorkoutEnhancementConfig { ... }
// export interface WorkoutAnalyticsEvent { ... }
