/**
 * Coach Creator Library
 *
 * This library provides functionality for creating personalized AI coaches
 * through AI-driven conversation using a dynamic to-do list approach.
 */

// Core session management
export {
  generateCoachCreatorSessionSummary,
  markSessionComplete,
  loadSessionData,
  saveSessionAndTriggerCoachConfig,
  checkCoachConfigIdempotency,
  createCoachConfigGenerationLock,
  createCoachConfigGenerationFailure,
  IDEMPOTENCY_REASONS,
  type SessionData,
  type IdempotencyCheckResult,
} from './session-management';

// Conversation handler (AI-driven flow)
export {
  handleTodoListConversation,
} from './conversation-handler';

// To-do list utilities
export {
  createEmptyTodoList,
  getTodoProgress,
  getPendingItems,
  getRequiredPendingItems,
  isSessionComplete,
  getTodoSummary,
} from './todo-list-utils';

// AI-powered extraction and generation
export {
  extractAndUpdateTodoList,
} from './todo-extraction';

export {
  generateNextQuestion,
  generateNextQuestionStream,
} from './question-generator';

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

// Data extraction utilities (session-based, AI-powered)
export {
  extractSophisticationLevel,
  extractSafetyProfileFromSession,
  extractMethodologyPreferencesFromSession,
  extractTrainingFrequencyFromSession,
  extractSpecializationsFromSession,
  extractGoalTimelineFromSession,
  extractIntensityPreferenceFromSession,
  extractGenderPreferenceFromSession,
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
  CoachCreatorSession,
  CoachConfig,
  CoachConfigSummary,
  CoachPersonalityTemplate,
  MethodologyTemplate,
  SafetyRule,
  CoachModificationCapabilities,
  PersonalityCoherenceCheck,
  CoachCreatorPineconeIntegration,
  DynamoDBItem,
  PersonalityBlendingConfig,
  CoachCreatorTodoList,
  TodoItem,
  ConversationMessage,
} from './types';
