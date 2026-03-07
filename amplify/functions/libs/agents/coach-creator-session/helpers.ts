/**
 * Coach Creator Session Agent Helpers
 *
 * Utilities for the V2 coach creator handler:
 *   - buildCoachCreatorMessagesWithCaching: wrapper around shared buildMessagesWithCaching
 *     that adds the coach creator log label
 */

import { buildMessagesWithCaching } from "../shared/message-caching";
import type { CoachMessage } from "../../coach-conversation/types";

/**
 * Convert CoachMessage[] (coach creator session history) to the
 * Bedrock-format messages array with stepped history caching.
 *
 * Delegates to the shared caching implementation with a label for logging.
 *
 * @param messages - Existing conversation history from the session
 * @returns Promise<any[]> — Bedrock-format messages array
 */
export async function buildCoachCreatorMessagesWithCaching(
  messages: CoachMessage[],
): Promise<any[]> {
  return buildMessagesWithCaching(messages, "coach creator");
}
