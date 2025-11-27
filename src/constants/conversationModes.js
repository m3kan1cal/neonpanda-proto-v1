/**
 * Conversation Mode Constants - Artifact-Focused Naming
 *
 * Defines the available conversation modes for coach interactions.
 * Must match backend CONVERSATION_MODES in amplify/functions/libs/coach-conversation/types.ts
 *
 * NAMING CONVENTION:
 * Modes are named after the primary artifact/deliverable they produce:
 * - CHAT: Standard coaching conversation (no specific artifact)
 * - PROGRAM_DESIGN: Creates training program artifact
 * - WORKOUT_LOG: Creates workout log artifact
 *
 * Future modes should follow this pattern (e.g., NUTRITION_PLAN, GOAL_SETTING, ASSESSMENT)
 */

export const CONVERSATION_MODES = {
  CHAT: 'chat',
  PROGRAM_DESIGN: 'program_design',
  WORKOUT_LOG: 'workout_log',
};

/**
 * Program Status Constants
 *
 * Defines the lifecycle states of a training program.
 * Must match backend Program status in amplify/functions/libs/program/types.ts
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
