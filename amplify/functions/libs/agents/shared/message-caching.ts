/**
 * Shared Message Caching Utilities
 *
 * Single source of truth for stepped history caching used across all streaming handlers:
 *   - stream-coach-conversation
 *   - stream-coach-creator-session
 *   - stream-program-designer-session
 *   - send-coach-conversation-message (legacy)
 *
 * Multimodal messages (messageType === "text_with_images") are handled via
 * buildMultimodalContent from streaming/multimodal-helpers.ts.
 *
 * Guardrail-flagged messages are redacted before being sent to Bedrock so they
 * do not re-trigger the guardrail on subsequent turns. Original content is
 * preserved in DynamoDB and shown in the UI.
 */

import { buildMultimodalContent } from "../../streaming/multimodal-helpers";
import type { CoachMessage } from "../../coach-conversation/types";
import { logger } from "../../logger";

const CACHE_STEP_SIZE = 10; // Move cache boundary in 10-message increments
const MIN_CACHE_THRESHOLD = 12; // Start caching when conversation has > 12 messages

/**
 * Returns the message content to send to Bedrock.
 * Guardrail-flagged messages are replaced with neutral placeholders so they
 * do not re-trigger the guardrail on subsequent turns.
 */
function getRedactedContent(msg: CoachMessage): string {
  if (msg.metadata?.guardrailWarning) {
    return msg.role === "user"
      ? "[Message removed by safety review]"
      : "[Response removed by safety review]";
  }
  return msg.content;
}

/**
 * Returns a shallow copy of the messages array with guardrail-flagged messages
 * having their content replaced with placeholders and image data cleared.
 * Used by multimodal branches that bypass the caching pipeline.
 */
export function redactGuardrailMessages(
  messages: CoachMessage[],
): CoachMessage[] {
  return messages.map((msg) => {
    if (!msg.metadata?.guardrailWarning) return msg;
    return {
      ...msg,
      content: getRedactedContent(msg),
      imageS3Keys: undefined,
      messageType: undefined,
    };
  });
}

/**
 * Convert CoachMessage[] to Bedrock-format messages array with stepped history caching.
 *
 * - Short conversations (< 12 messages): no cache points
 * - Longer conversations: cache boundary moves in 10-message increments
 *   (12-19 → cache 10, 20-29 → cache 20, etc.)
 *
 * Multimodal messages are expanded via buildMultimodalContent so that
 * images stored as S3 keys become proper Bedrock image blocks.
 *
 * @param messages - Existing conversation history from the session
 * @param logLabel - Label for logging (e.g., "coach creator" or "program designer")
 * @returns Promise<any[]> — Bedrock-format messages array
 */
export async function buildMessagesWithCaching(
  messages: CoachMessage[],
  logLabel: string,
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

  logger.info(`💰 STEPPED HISTORY CACHING (${logLabel}):`, {
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
    // Guardrail-flagged messages are always sent as redacted text, regardless of
    // whether they originally had images. Avoids unnecessary S3 fetches.
    if (msg.metadata?.guardrailWarning) {
      result.push({
        role: msg.role,
        content: [{ text: getRedactedContent(msg) }],
      });
      continue;
    }

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
          result.push({
            role: msg.role,
            content: [{ text: getRedactedContent(msg) }],
          });
        }
      } catch (error) {
        logger.warn(
          "⚠️ Failed to build multimodal content for history message, falling back to text-only:",
          error,
        );
        result.push({
          role: msg.role,
          content: [{ text: getRedactedContent(msg) }],
        });
      }
    } else {
      result.push({
        role: msg.role,
        content: [{ text: getRedactedContent(msg) }],
      });
    }
  }

  return result;
}
