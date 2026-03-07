/**
 * Program Designer Session Agent Helpers
 *
 * Utilities for the V2 program designer handler:
 *   - buildProgramDesignerMessagesWithCaching: wrapper around shared buildMessagesWithCaching
 *     that adds the program designer log label
 */

import { buildMessagesWithCaching } from "../shared/message-caching";
import type { CoachMessage } from "../../coach-conversation/types";

/**
 * Convert CoachMessage[] (program designer session history) to the
 * Bedrock-format messages array with stepped history caching.
 *
 * Delegates to the shared caching implementation with a label for logging.
 *
 * @param messages - Existing conversation history from the session
 * @returns Promise<any[]> — Bedrock-format messages array
 */
export async function buildProgramDesignerMessagesWithCaching(
  messages: CoachMessage[],
): Promise<any[]> {
  return buildMessagesWithCaching(messages, "program designer");
}
