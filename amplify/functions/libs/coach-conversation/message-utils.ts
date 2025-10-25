/**
 * Coach Conversation Message Utilities
 *
 * Provides utilities for filtering, processing, and analyzing conversation messages.
 */

import { CoachMessage, CONVERSATION_MODES } from "./types";

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
      if (msg.metadata?.mode === CONVERSATION_MODES.BUILD) {
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
        if (nextMsg.role === 'assistant' && nextMsg.metadata?.mode === CONVERSATION_MODES.BUILD) {
          buildSectionStartIndex = i;
        }
      }
    }
  }

  // Extract from the start of the Build section to the end
  const buildSectionMessages = allMessages.slice(buildSectionStartIndex);

  console.info('📋 Build mode section extraction:', {
    totalMessages: allMessages.length,
    buildSectionStartIndex,
    extractedMessages: buildSectionMessages.length,
    buildModeAiCount: buildSectionMessages.filter(m => m.role === 'assistant' && m.metadata?.mode === CONVERSATION_MODES.BUILD).length,
    userMessageCount: buildSectionMessages.filter(m => m.role === 'user').length,
    firstMessageTimestamp: buildSectionMessages[0]?.timestamp,
    lastMessageTimestamp: buildSectionMessages[buildSectionMessages.length - 1]?.timestamp,
  });

  return buildSectionMessages;
}
