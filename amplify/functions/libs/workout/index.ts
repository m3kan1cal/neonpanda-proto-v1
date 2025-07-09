/**
 * Workout Session Library
 *
 * This library provides functionality for detecting and processing workout sessions
 * from natural language user input in coach conversations.
 */

export {
  parseSlashCommand,
  isWorkoutSlashCommand,
  detectWorkoutLogging,
  isCompletedWorkout,
  quickWorkoutExtraction,
  generateWorkoutDetectionContext,
  generateStructuredWorkoutContext,
  WORKOUT_SLASH_COMMANDS,
  type SlashCommandResult
} from './detection';

export {
  buildWorkoutExtractionPrompt,
  parseAndValidateWorkoutData,
  calculateConfidence,
  extractCompletedAtTime
} from './extraction';

export {
  Workout,
  UniversalWorkoutSchema,
  BuildWorkoutEvent,
  CrossFitExercise,
  CrossFitRound,
  CrossFitWorkout,
  PerformanceMetrics,
  SubjectiveFeedback,
  CoachNotes,
  WorkoutMetadata,
  TimeIndicator,
  QuickWorkoutExtraction,
  PRAchievement,
  SorenessLevel,
  EnvironmentalFactors,
  RecoveryMetrics,
  DisciplineSpecific
} from './types';

// Future exports can be added here as the library grows:
// export { validateWorkoutData } from './validation';
// export { WorkoutEnhancementConfig } from './types';