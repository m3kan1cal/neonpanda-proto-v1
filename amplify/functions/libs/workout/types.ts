/**
 * Workout Session Types
 *
 * This module contains TypeScript interfaces and types specific to
 * workout functionality including extraction, detection, and processing.
 */

import { CoachConfig } from '../coach-creator/types';

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
  };
  // NEW: AI-generated summary for coach context and UI display
  summary?: string;
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
  // Add other disciplines as needed
}

/**
 * CrossFit-specific workout structure
 */
export interface CrossFitWorkout {
  workout_format: 'for_time' | 'amrap' | 'emom' | 'tabata' | 'ladder' | 'chipper' | 'death_by' | 'intervals' | 'strength_then_metcon' | 'hero_workout' | 'custom';
  time_cap?: number;
  rx_status: 'rx' | 'scaled' | 'modified';
  rounds: CrossFitRound[];
  performance_data?: {
    total_time?: number;
    rounds_completed: number;
    total_reps?: number;
    round_times?: number[];
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
    prescribed: number;
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
  [key: string]: any; // Placeholder
}

export interface BodybuildingWorkout {
  [key: string]: any; // Placeholder
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
  significance: 'minor' | 'moderate' | 'major';
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
}

/**
 * Event structure for the build-workout Lambda function
 */
export interface BuildWorkoutEvent {
  userId: string;
  coachId: string;
  conversationId: string;
  userMessage: string;
  coachConfig: CoachConfig;
  completedAt?: string; // ISO date string
  isSlashCommand?: boolean; // Whether this was triggered by a slash command
  slashCommand?: string; // The slash command that was used (e.g., 'log-workout', 'log', 'workout')
}

/**
 * Result of quick workout extraction (used in detection phase)
 */
export interface QuickWorkoutExtraction {
  workoutName?: string;
  timeDetected?: string;
  weightDetected?: string;
  discipline?: string;
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

// Future types can be added here:
// export interface WorkoutValidationResult { ... }
// export interface WorkoutEnhancementConfig { ... }
// export interface WorkoutAnalyticsEvent { ... }