/**
 * Coach Conversation Message Utilities
 *
 * Provides utilities for filtering, processing, and analyzing conversation messages.
 */

import { CoachMessage, CONVERSATION_MODES, MESSAGE_TYPES } from "./types";
import { logger } from "../logger";

/**
 * Extract the latest continuous Build mode section messages
 * Includes user + AI message pairs where AI has Build mode metadata
 * Works backwards from the end to find the most recent Build mode session
 * Stops when it hits a non-Build mode AI message
 *
 * This allows multi-day Build sessions (started last night, continued this morning)
 * while still preventing confusion from multiple separate Build sessions
 *
 * @param allMessages - All messages from the conversation
 * @returns Filtered messages from the latest Build mode section
 */
export function extractLatestBuildModeSection(
  allMessages: CoachMessage[]
): CoachMessage[] {
  if (allMessages.length === 0) {
    return [];
  }

  // Find the index where the latest Build mode section starts
  // Work backwards from the end until we hit a non-Build AI message
  let buildSectionStartIndex = allMessages.length;

  for (let i = allMessages.length - 1; i >= 0; i--) {
    const msg = allMessages[i];

    if (msg.role === 'assistant') {
      // If this AI message has Build mode, this is part of the Build section
      if (msg.metadata?.mode === CONVERSATION_MODES.PROGRAM_DESIGN) {
        buildSectionStartIndex = i;
      } else {
        // Hit a non-Build AI message - stop here
        // The Build section starts at the next message
        break;
      }
    } else if (msg.role === 'user') {
      // User messages are included if they're part of the Build section
      // Check if the next message (if it exists and is AI) has Build mode
      if (i < allMessages.length - 1) {
        const nextMsg = allMessages[i + 1];
        if (nextMsg.role === 'assistant' && nextMsg.metadata?.mode === CONVERSATION_MODES.PROGRAM_DESIGN) {
          buildSectionStartIndex = i;
        }
      }
    }
  }

  // Extract from the start of the Build section to the end
  const buildSectionMessages = allMessages.slice(buildSectionStartIndex);

  logger.info('📋 Build mode section extraction:', {
    totalMessages: allMessages.length,
    buildSectionStartIndex,
    extractedMessages: buildSectionMessages.length,
    buildModeAiCount: buildSectionMessages.filter(m => m.role === 'assistant' && m.metadata?.mode === CONVERSATION_MODES.PROGRAM_DESIGN).length,
    userMessageCount: buildSectionMessages.filter(m => m.role === 'user').length,
    firstMessageTimestamp: buildSectionMessages[0]?.timestamp,
    lastMessageTimestamp: buildSectionMessages[buildSectionMessages.length - 1]?.timestamp,
  });

  return buildSectionMessages;
}

/**
 * Build a user CoachMessage with consistent handling of image and document
 * attachments. Centralizes the messageType decision:
 *   - no attachments: messageType omitted
 *   - images only: TEXT_WITH_IMAGES
 *   - any documents (with or without images): TEXT_WITH_ATTACHMENTS
 *
 * Used by all streaming and helper flows that save a user turn to a
 * coachConversation. Does NOT apply to send-coach-conversation-message or
 * response-orchestrator, which follow a different messageType convention.
 */
export function buildUserMessage(
  content: string,
  imageS3Keys?: string[],
  documentS3Keys?: string[],
): CoachMessage {
  const hasImages = !!(imageS3Keys && imageS3Keys.length > 0);
  const hasDocuments = !!(documentS3Keys && documentS3Keys.length > 0);

  return {
    id: `msg_${Date.now()}_user`,
    role: "user",
    content,
    timestamp: new Date(),
    ...(hasImages ? { imageS3Keys } : {}),
    ...(hasDocuments ? { documentS3Keys } : {}),
    ...(hasImages || hasDocuments
      ? {
          messageType: hasDocuments
            ? MESSAGE_TYPES.TEXT_WITH_ATTACHMENTS
            : MESSAGE_TYPES.TEXT_WITH_IMAGES,
        }
      : {}),
  };
}
