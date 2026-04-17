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
  documentS3Keys?: string[];
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
  documentS3Keys?: string[];
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
 * Fetch document from S3 as buffer
 */
export async function fetchDocumentFromS3(
  s3Key: string,
): Promise<Uint8Array | null> {
  try {
    return await getObjectAsUint8Array(s3Key);
  } catch (error) {
    logger.error(`❌ Failed to fetch document ${s3Key}:`, error);
    return null;
  }
}

/**
 * Get document format from S3 key for Converse API document blocks
 */
export type DocumentFormat = "pdf" | "csv" | "doc" | "docx" | "xls" | "xlsx" | "html" | "txt" | "md";

export function getDocumentFormat(s3Key: string): DocumentFormat {
  const extension = s3Key.split(".").pop()?.toLowerCase() || "txt";
  const formatMap: Record<string, DocumentFormat> = {
    pdf: "pdf",
    csv: "csv",
    txt: "txt",
    md: "md",
    doc: "doc",
    docx: "docx",
    xls: "xls",
    xlsx: "xlsx",
    html: "html",
  };
  return formatMap[extension] || "txt";
}

/**
 * Extract document name from S3 key (required by Bedrock document blocks)
 * Returns the filename without extension
 */
export function getDocumentName(s3Key: string): string {
  const filename = s3Key.split("/").pop() || "document";
  return filename.replace(/\.[^.]+$/, "");
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

    if (msg.content && msg.content.trim()) {
      contentBlocks.push({
        text: msg.content,
      });
    }

    // Image content blocks — presence-driven (works for both text_with_images and text_with_attachments)
    if (msg.imageS3Keys && msg.imageS3Keys.length > 0) {
      const fetchResults = await Promise.all(
        msg.imageS3Keys.map(async (s3Key) => {
          const imageBytes = await fetchImageFromS3(s3Key);
          return { s3Key, imageBytes };
        }),
      );

      for (const { s3Key, imageBytes } of fetchResults) {
        if (imageBytes) {
          const format = getImageFormat(s3Key);
          logger.info(`🖼️ Image content block: { s3Key: "${s3Key}", format: "${format}", sizeBytes: ${imageBytes.length}, sizeKB: ${(imageBytes.length / 1024).toFixed(1)} }`);
          contentBlocks.push({
            image: {
              format,
              source: {
                bytes: imageBytes,
              },
            },
          });
        } else {
          logger.warn(`⚠️ Skipping missing image: ${s3Key}`);
        }
      }
    }

    // Document content blocks — presence-driven
    if (msg.documentS3Keys && msg.documentS3Keys.length > 0) {
      const fetchResults = await Promise.all(
        msg.documentS3Keys.map(async (s3Key) => {
          const docBytes = await fetchDocumentFromS3(s3Key);
          return { s3Key, docBytes };
        }),
      );

      for (const { s3Key, docBytes } of fetchResults) {
        if (docBytes) {
          const format = getDocumentFormat(s3Key);
          const name = getDocumentName(s3Key);
          logger.info(`📄 Document content block: { s3Key: "${s3Key}", format: "${format}", name: "${name}", sizeBytes: ${docBytes.length}, sizeKB: ${(docBytes.length / 1024).toFixed(1)} }`);
          contentBlocks.push({
            document: {
              format,
              name,
              source: {
                bytes: docBytes,
              },
            },
          });
        } else {
          logger.warn(`⚠️ Skipping missing document: ${s3Key}`);
        }
      }
    }

    converseMessages.push({
      role: msg.role,
      content: contentBlocks,
    });
  }

  const withImages = messages.filter((m) => m.imageS3Keys?.length).length;
  const withDocs = messages.filter((m) => m.documentS3Keys?.length).length;
  logger.info(
    `✅ Built multimodal content: ${converseMessages.length} messages, ${withImages} with images, ${withDocs} with documents`,
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
      messageType: "text_with_attachments" as const,
      ...(input.imageS3Keys?.length ? { imageS3Keys: input.imageS3Keys } : {}),
      ...(input.documentS3Keys?.length ? { documentS3Keys: input.documentS3Keys } : {}),
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
  const { userResponse, imageS3Keys, documentS3Keys } = input;
  const hasAttachments =
    (imageS3Keys && imageS3Keys.length > 0) ||
    (documentS3Keys && documentS3Keys.length > 0);

  // Check if attachments (images or documents) are present
  if (hasAttachments) {
    logger.info("📎 Processing with attachments:", {
      imageCount: imageS3Keys?.length || 0,
      documentCount: documentS3Keys?.length || 0,
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
