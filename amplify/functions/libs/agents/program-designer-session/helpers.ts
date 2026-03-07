/**
 * Program Designer Session Agent Helpers
 *
 * Utilities for the V2 program designer handler:
 *   - buildProgramDesignerMessagesWithCaching: converts CoachMessage[] to the
 *     Bedrock { role, content }[] format with stepped history caching,
 *     mirroring buildCoachCreatorMessagesWithCaching from
 *     coach-creator-session/helpers.ts
 *
 * Multimodal messages (messageType === "text_with_images") are handled via
 * buildMultimodalContent from streaming/multimodal-helpers.ts.
 */

import { buildMultimodalContent } from "../../streaming/multimodal-helpers";
import type { CoachMessage } from "../../coach-conversation/types";
import { logger } from "../../logger";

// Mirror the caching constants from response-orchestrator.ts
const CACHE_STEP_SIZE = 10;
const MIN_CACHE_THRESHOLD = 12;

/**
 * Convert CoachMessage[] (program designer session history) to the
 * Bedrock-format messages array with stepped history caching.
 *
 * - Short conversations (< 12 messages): no cache points
 * - Longer conversations: cache boundary moves in 10-message increments
 *   (12-19 → cache 10, 20-29 → cache 20, etc.)
 *
 * Multimodal messages are expanded via buildMultimodalContent so that
 * images stored as S3 keys become proper Bedrock image blocks.
 *
 * @param messages - Existing conversation history from the session
 * @returns Promise<any[]> — Bedrock-format messages array
 */
export async function buildProgramDesignerMessagesWithCaching(
  messages: CoachMessage[],
): Promise<any[]> {
  const messageCount = messages.length;

  if (messageCount < MIN_CACHE_THRESHOLD) {
    logger.info(
      `📝 Short conversation (${messageCount} messages) - no history caching`,
    );
    return buildBedrockMessages(messages);
  }

  const cachedCount =
    Math.floor((messageCount - 2) / CACHE_STEP_SIZE) * CACHE_STEP_SIZE;
  const cachedMessages = messages.slice(0, cachedCount);
  const dynamicMessages = messages.slice(cachedCount);

  logger.info("💰 STEPPED HISTORY CACHING (program designer):", {
    totalMessages: messageCount,
    cached: cachedCount,
    dynamic: dynamicMessages.length,
    stepSize: CACHE_STEP_SIZE,
    nextBoundary: cachedCount + CACHE_STEP_SIZE,
  });

  const messagesArray: any[] = [];

  // Cached messages (text only — older messages don't carry active S3 refs)
  const cachedBedrock = await buildBedrockMessages(cachedMessages);
  messagesArray.push(...cachedBedrock);

  // Insert cache point after the cached block
  messagesArray.push({
    role: "user",
    content: [
      { text: `---stepped-cache-boundary-${cachedCount}---` },
      { cachePoint: { type: "default" } },
    ],
  });

  // Dynamic messages (may include multimodal)
  const dynamicBedrock = await buildBedrockMessages(dynamicMessages);
  messagesArray.push(...dynamicBedrock);

  return messagesArray;
}

/**
 * Convert a slice of CoachMessage[] to Bedrock format.
 * Multimodal messages are expanded; text-only messages get a simple text block.
 */
async function buildBedrockMessages(messages: CoachMessage[]): Promise<any[]> {
  const result: any[] = [];

  for (const msg of messages) {
    if (
      msg.messageType === "text_with_images" &&
      msg.imageS3Keys &&
      msg.imageS3Keys.length > 0
    ) {
      try {
        const multimodalMessages = await buildMultimodalContent([msg as any]);
        if (multimodalMessages.length > 0) {
          result.push(multimodalMessages[0]);
        } else {
          result.push({ role: msg.role, content: [{ text: msg.content }] });
        }
      } catch (error) {
        logger.warn(
          "⚠️ Failed to build multimodal content for history message, falling back to text-only:",
          error,
        );
        result.push({ role: msg.role, content: [{ text: msg.content }] });
      }
    } else {
      result.push({ role: msg.role, content: [{ text: msg.content }] });
    }
  }

  return result;
}
