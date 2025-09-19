/**
 * Coach Creator Library
 *
 * This library provides functionality for creating personalized AI coaches
 * through guided conversation and configuration generation.
 */

// Core session management
export {
  createCoachCreatorSession,
  generateCoachCreatorSessionSummary,
  storeUserResponse,
  updateSessionContext
} from './session-management';

// Question management and prompts
export {
  COACH_CREATOR_QUESTIONS,
  BASE_COACH_CREATOR_PROMPT,
  buildQuestionPrompt,
  getNextQuestion
} from './question-management';

// Coach generation and configuration
export {
  generateCoachConfig,
  validateCoachConfigSafety,
  validatePersonalityCoherence,
  COACH_PERSONALITY_TEMPLATES,
  METHODOLOGY_TEMPLATES,
  SAFETY_RULES,
  COACH_MODIFICATION_OPTIONS
} from './coach-generation';

// Data extraction utilities
export {
  extractSafetyProfile,
  extractMethodologyPreferences,
  extractTrainingFrequency,
  extractSpecializations,
  extractGoalTimeline,
  extractIntensityPreference
} from './data-extraction';

// Pinecone integration
export {
  storeCoachCreatorSummaryInPinecone
} from './pinecone';

// Configuration constants
export {
  COACH_CREATOR_VERSION,
  MIN_QUESTIONS_FOR_COACH_CREATION,
  MAX_COACH_PERSONALITIES_PER_USER,
  SUCCESS_MESSAGES
} from './config';

// Type definitions
export {
  SophisticationLevel,
  UserContext,
  CoachCreatorSession,
  CoachConfig,
  CoachConfigSummary,
  CoachPersonalityTemplate,
  MethodologyTemplate,
  SafetyRule,
  CoachModificationCapabilities,
  PersonalityCoherenceCheck,
  CoachCreatorPineconeIntegration,
  StartSessionResponse,
  ProcessResponseResult,
  DynamoDBItem,
  PersonalityBlendingConfig,
  Question
} from './types';

// Future exports can be added here as the library grows:
// export { validateCoachPerformance } from './validation';
// export { CoachAnalytics } from './analytics';