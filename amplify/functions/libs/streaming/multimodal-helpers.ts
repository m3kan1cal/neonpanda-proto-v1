/**
 * Multimodal message building utilities for streaming handlers
 *
 * Provides complete multimodal support including:
 * - S3 image fetching
 * - Bedrock Converse API formatting
 * - Message building
 * - Stream selection (text-only vs multimodal)
 */

import { getObjectAsUint8Array } from "../s3-utils";
import { logger } from "../logger";
import {
  callBedrockApiStream,
  callBedrockApiMultimodalStream,
  MODEL_IDS,
  BedrockApiOptions,
} from "../api-helpers";

/**
 * Message object structure for multimodal content
 */
export interface MultimodalMessageInput {
  userResponse: string;
  messageTimestamp: string;
  imageS3Keys?: string[];
}

/**
 * Generic message interface for multimodal content
 * Any message with these properties can be used with buildMultimodalContent
 */
export interface MultimodalMessage {
  role: string;
  content: string;
  messageType?: string;
  imageS3Keys?: string[];
}

/**
 * Fetch image from S3 as buffer
 */
export async function fetchImageFromS3(
  s3Key: string,
): Promise<Uint8Array | null> {
  try {
    return await getObjectAsUint8Array(s3Key);
  } catch (error) {
    logger.error(`❌ Failed to fetch image ${s3Key}:`, error);
    return null;
  }
}

/**
 * Get image format from S3 key for Converse API
 */
export function getImageFormat(s3Key: string): "jpeg" | "png" | "gif" | "webp" {
  const extension = s3Key.split(".").pop()?.toLowerCase() || "jpeg";
  const formatMap: Record<string, "jpeg" | "png" | "gif" | "webp"> = {
    jpg: "jpeg",
    jpeg: "jpeg",
    png: "png",
    gif: "gif",
    webp: "webp",
  };
  return formatMap[extension] || "jpeg";
}

/**
 * Build multimodal content for Bedrock Converse API
 *
 * CRITICAL: Uses Converse API format, NOT Messages API!
 * Compatible with: us.anthropic.claude-sonnet-4-6
 *
 * @param messages - Array of messages with optional images
 * @returns Formatted messages for Bedrock Converse API
 */
export async function buildMultimodalContent(
  messages: MultimodalMessage[],
): Promise<any[]> {
  const converseMessages = [];

  for (const msg of messages) {
    const contentBlocks: any[] = [];

    // Add text first (if present)
    if (msg.content && msg.content.trim()) {
      contentBlocks.push({
        text: msg.content,
      });
    }

    // Add images if this message has them
    if (
      msg.messageType === "text_with_images" &&
      msg.imageS3Keys &&
      msg.imageS3Keys.length > 0
    ) {
      for (const s3Key of msg.imageS3Keys) {
        const imageBytes = await fetchImageFromS3(s3Key);

        if (imageBytes) {
          contentBlocks.push({
            image: {
              format: getImageFormat(s3Key),
              source: {
                bytes: imageBytes, // Converse API uses bytes directly
              },
            },
          });
        } else {
          logger.warn(`⚠️ Skipping missing image: ${s3Key}`);
        }
      }
    }

    converseMessages.push({
      role: msg.role,
      content: contentBlocks,
    });
  }

  logger.info(
    `✅ Built multimodal content: ${converseMessages.length} messages, ${messages.filter((m) => m.imageS3Keys?.length).length} with images`,
  );

  return converseMessages;
}

/**
 * Build a multimodal message object
 * Common structure used across streaming handlers
 */
export function buildMultimodalMessage(input: MultimodalMessageInput): any[] {
  return [
    {
      id: `msg_${Date.now()}_user`,
      role: "user" as const,
      content: input.userResponse || "",
      timestamp: new Date(input.messageTimestamp),
      messageType: "text_with_images" as const,
      imageS3Keys: input.imageS3Keys,
    },
  ];
}

/**
 * Get AI response stream based on whether images are present
 * Abstracts the choice between regular and multimodal streaming
 *
 * @param options - Optional Bedrock API options for caching support
 */
export async function getAIResponseStream(
  prompt: string,
  input: MultimodalMessageInput,
  options?: BedrockApiOptions,
): Promise<AsyncGenerator<string, void, unknown>> {
  const { userResponse, imageS3Keys } = input;

  // Check if images are present
  if (imageS3Keys && imageS3Keys.length > 0) {
    logger.info("🖼️ Processing with images:", {
      imageCount: imageS3Keys.length,
    });

    // Build multimodal message
    const messages = buildMultimodalMessage(input);

    // Convert to Bedrock format
    const converseMessages = await buildMultimodalContent(messages);

    // Return multimodal stream with caching support
    return await callBedrockApiMultimodalStream(
      prompt,
      converseMessages,
      MODEL_IDS.PLANNER_MODEL_FULL,
      options,
    );
  } else {
    // Return regular text stream with caching support
    return await callBedrockApiStream(
      prompt,
      userResponse,
      MODEL_IDS.PLANNER_MODEL_FULL,
      options,
    );
  }
}
