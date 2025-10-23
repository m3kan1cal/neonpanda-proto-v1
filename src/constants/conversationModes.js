/**
 * Conversation Mode Constants
 *
 * Defines the available conversation modes for coach interactions.
 * Must match backend CONVERSATION_MODES in amplify/functions/libs/coach-conversation/types.ts
 */

export const CONVERSATION_MODES = {
  CHAT: 'chat',
  BUILD: 'build',
};

/**
 * Program Status Constants
 *
 * Defines the lifecycle states of a training program.
 * Must match backend TrainingProgram status in amplify/functions/libs/training-program/types.ts
 */
export const PROGRAM_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
};

/**
 * Workout Template Types
 *
 * Defines the types of workout templates within a training program.
 */
export const TEMPLATE_TYPES = {
  PRIMARY: 'primary',
  OPTIONAL: 'optional',
  RECOVERY: 'recovery',
};

/**
 * Message Type Constants
 *
 * Defines the types of messages that can be sent in conversations.
 * Must match backend MESSAGE_TYPES in amplify/functions/libs/coach-conversation/types.ts
 */
export const MESSAGE_TYPES = {
  TEXT: 'text',
  TEXT_WITH_IMAGES: 'text_with_images',
  VOICE: 'voice',
};
