// Export all coach conversation functionality
export {
  generateSystemPrompt,
  validateCoachConfig,
  generateSystemPromptPreview
} from './prompt-generation';

export {
  type PromptGenerationOptions,
  type SystemPrompt,
  type CoachConfigInput,
  type CoachConfigValidationResult,
  type SystemPromptPreview
} from './types';

export {
  CoachMessage,
  CoachConversation,
  CoachConversationListItem,
  BuildCoachConversationSummaryEvent,
  CoachConversationSummary
} from './types';

export {
  buildCoachConversationSummaryPrompt,
  parseCoachConversationSummary
} from './summary';

export {
  storeCoachConversationSummaryInPinecone,
  deleteConversationSummaryFromPinecone
} from './pinecone';

export {
  detectConversationComplexity
} from './detection';
