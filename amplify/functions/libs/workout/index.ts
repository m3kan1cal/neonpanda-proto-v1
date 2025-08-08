/**
 * Workout Session Library
 *
 * This library provides functionality for detecting and processing workout sessions
 * from natural language user input in coach conversations.
 */

export {
  parseSlashCommand,
  isWorkoutSlashCommand,
  isWorkoutLog,
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
  extractCompletedAtTime,
  isComplexWorkout,
  generateWorkoutSummary,
  classifyDiscipline
} from './extraction';

export {
  storeWorkoutSummaryInPinecone
} from './pinecone';

export {
  Workout,
  UniversalWorkoutSchema,
  DisciplineClassification,
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

export {
  normalizeWorkout,
  shouldNormalizeWorkout,
  generateNormalizationSummary,
  type NormalizationResult,
  type NormalizationIssue
} from './normalization';