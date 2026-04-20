/**
 * Metadata tag for the Training Grounds FAB inline chat "home" thread.
 * Stored on normal CHAT-mode conversations via updateCoachConversation tags.
 */
export const INLINE_TRAINING_GROUNDS_TAG = "training_grounds_inline";

/**
 * Metadata tag prefix for the Program Dashboard inline chat "home" thread.
 * Never used directly — call `getProgramDashboardInlineTag(programId)` so
 * the tag is scoped per program. Each program gets its own home chat, so
 * switching programs naturally switches conversations and the tag-based
 * fallback lookup can't return another program's home thread.
 */
export const INLINE_PROGRAM_DASHBOARD_TAG_PREFIX = "program_dashboard_inline";

/** Per-program tag used by the Program Dashboard inline drawer. */
export function getProgramDashboardInlineTag(programId) {
  return `${INLINE_PROGRAM_DASHBOARD_TAG_PREFIX}:${programId}`;
}

/** sessionStorage key for last conversation opened from the inline Training Grounds drawer picker */
export function getTrainingGroundsInlineSessionKey(userId, coachId) {
  return `neonpanda-tg-inline-chat:${userId}:${coachId}`;
}

/**
 * sessionStorage key for last conversation opened from the Program Dashboard
 * inline drawer. Scoped by programId so each program has its own "home" chat.
 */
export function getProgramDashboardInlineSessionKey(
  userId,
  coachId,
  programId,
) {
  return `neonpanda-pd-inline-chat:${userId}:${coachId}:${programId}`;
}

/** ~10 recent chats in drawer picker */
export const TRAINING_GROUNDS_INLINE_PICKER_LIMIT = 10;
