/**
 * Request validation utilities for streaming handlers
 */

import type { ConversationEditContext } from "../coach-conversation/types";
import { SUPPORTED_DOCUMENT_EXTENSIONS } from '../document-types';

/**
 * Parse and validate request body from streaming event.
 * Handles base64-encoded bodies from Lambda Function URLs.
 */
export function parseRequestBody(
  body: string | undefined,
  isBase64Encoded?: boolean,
): {
  userResponse: string | undefined;
  messageTimestamp: string | undefined;
  imageS3Keys?: string[];
  documentS3Keys?: string[];
  editContext?: ConversationEditContext;
} {
  if (!body) {
    throw new Error("Request body is required");
  }

  const decodedBody = isBase64Encoded
    ? Buffer.from(body, "base64").toString("utf-8")
    : body;

  let parsedBody;
  try {
    parsedBody = JSON.parse(decodedBody);
  } catch (parseError) {
    throw new Error("Invalid JSON in request body");
  }

  const { userResponse, messageTimestamp, imageS3Keys, documentS3Keys, editContext } =
    parsedBody;

  return {
    userResponse,
    messageTimestamp,
    imageS3Keys,
    documentS3Keys,
    editContext,
  };
}

/**
 * Validate image S3 keys
 */
export function validateImageS3Keys(
  imageS3Keys: string[] | undefined,
  userId: string,
  maxImages: number = 5,
): void {
  if (!imageS3Keys) {
    return;
  }

  if (!Array.isArray(imageS3Keys)) {
    throw new Error("imageS3Keys must be an array");
  }

  if (imageS3Keys.length > maxImages) {
    throw new Error(`Maximum ${maxImages} images per message`);
  }

  // Verify all keys belong to this user
  for (const key of imageS3Keys) {
    if (!key.startsWith(`user-uploads/${userId}/`)) {
      throw new Error(`Invalid image key: ${key}`);
    }
  }
}

/**
 * Validate message timestamp
 */
export function validateMessageTimestamp(
  messageTimestamp: string | undefined,
): void {
  if (!messageTimestamp) {
    throw new Error("Message timestamp is required");
  }
}

/**
 * Validate document S3 keys
 */

export function validateDocumentS3Keys(
  documentS3Keys: string[] | undefined,
  userId: string,
  maxDocuments: number = 3,
): void {
  if (!documentS3Keys) {
    return;
  }

  if (!Array.isArray(documentS3Keys)) {
    throw new Error("documentS3Keys must be an array");
  }

  if (documentS3Keys.length > maxDocuments) {
    throw new Error(`Maximum ${maxDocuments} documents per message`);
  }

  for (const key of documentS3Keys) {
    if (!key.startsWith(`user-uploads/${userId}/`)) {
      throw new Error(`Invalid document key: ${key}`);
    }
    const ext = key.split('.').pop()?.toLowerCase();
    if (!ext || !SUPPORTED_DOCUMENT_EXTENSIONS.includes(ext)) {
      throw new Error(`Unsupported document type: ${ext}`);
    }
  }
}

/**
 * Validate user response (optional for some use cases)
 */
export function validateUserResponse(
  userResponse: string | undefined,
  imageS3Keys?: string[],
  documentS3Keys?: string[],
): void {
  // Either text, images, or documents required
  const hasImages = imageS3Keys && imageS3Keys.length > 0;
  const hasDocuments = documentS3Keys && documentS3Keys.length > 0;
  if (!userResponse && !hasImages && !hasDocuments) {
    throw new Error("Either text, images, or documents required");
  }
}

/**
 * Complete validation for streaming request body
 * Returns validated body fields
 */
export function validateStreamingRequestBody(
  body: string | undefined,
  userId: string,
  options: {
    requireUserResponse?: boolean;
    maxImages?: number;
    maxDocuments?: number;
    isBase64Encoded?: boolean;
  } = {},
): {
  userResponse: string | undefined;
  messageTimestamp: string;
  imageS3Keys?: string[];
  documentS3Keys?: string[];
  editContext?: ConversationEditContext;
} {
  const {
    requireUserResponse = true,
    maxImages = 5,
    maxDocuments = 3,
    isBase64Encoded,
  } = options;

  // Parse body
  const parsed = parseRequestBody(body, isBase64Encoded);
  const { userResponse, messageTimestamp, imageS3Keys, documentS3Keys, editContext } = parsed;

  // Validate user response (if required)
  if (requireUserResponse && !userResponse) {
    throw new Error("userResponse is required");
  } else if (!requireUserResponse) {
    // If not strictly required, check that we have either text, images, or documents
    validateUserResponse(userResponse, imageS3Keys, documentS3Keys);
  }

  // Validate images
  validateImageS3Keys(imageS3Keys, userId, maxImages);

  // Validate documents
  validateDocumentS3Keys(documentS3Keys, userId, maxDocuments);

  // Validate timestamp
  validateMessageTimestamp(messageTimestamp);

  // Validate editContext if present
  if (editContext) {
    if (!editContext.entityType || !editContext.entityId) {
      throw new Error("editContext must have entityType and entityId");
    }
    if (editContext.entityType !== "workout") {
      throw new Error("editContext.entityType must be 'workout'");
    }
  }

  return {
    userResponse,
    messageTimestamp: messageTimestamp as string,
    imageS3Keys,
    documentS3Keys,
    editContext,
  };
}
