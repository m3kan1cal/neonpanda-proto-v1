/**
 * Metadata tag for the Training Grounds FAB inline chat "home" thread.
 * Stored on normal CHAT-mode conversations via updateCoachConversation tags.
 */
export const INLINE_TRAINING_GROUNDS_TAG = "training_grounds_inline";

/** sessionStorage key for last conversation opened from the inline drawer picker */
export function getTrainingGroundsInlineSessionKey(userId, coachId) {
  return `neonpanda-tg-inline-chat:${userId}:${coachId}`;
}

/** ~10 recent chats in drawer picker */
export const TRAINING_GROUNDS_INLINE_PICKER_LIMIT = 10;
