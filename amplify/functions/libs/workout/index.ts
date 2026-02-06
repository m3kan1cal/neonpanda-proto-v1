/**
 * Workout Session Library
 *
 * This library provides functionality for detecting and processing workout sessions
 * from natural language user input in coach conversations.
 */

export {
  parseSlashCommand,
  isWorkoutSlashCommand,
  validateWorkoutContent,
  quickWorkoutExtraction,
  generateWorkoutDetectionContext,
  generateStructuredWorkoutContext,
  WORKOUT_SLASH_COMMANDS,
  type SlashCommandResult,
  type WorkoutContentValidation,
} from "./detection";

export {
  buildWorkoutExtractionPrompt,
  calculateConfidence,
  calculateCompleteness,
  extractCompletedAtTime,
  checkWorkoutComplexity,
  generateWorkoutSummary,
  classifyDiscipline,
  validateWorkoutStructure,
  applyPerformanceMetricDefaults,
} from "./extraction";

export {
  WORKOUT_COMPLEXITY_SCHEMA,
  type WorkoutComplexityResult,
} from "../schemas/workout-complexity-schema";

export { storeWorkoutSummaryInPinecone } from "./pinecone";

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
  DisciplineSpecific,
} from "./types";

export {
  normalizeWorkout,
  shouldNormalizeWorkout,
  generateNormalizationSummary,
  type NormalizationResult,
  type NormalizationIssue,
} from "./normalization";
