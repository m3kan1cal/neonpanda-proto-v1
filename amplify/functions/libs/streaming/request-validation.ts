/**
 * Request validation utilities for streaming handlers
 */

import type { ConversationEditContext } from "../coach-conversation/types";
import { SUPPORTED_DOCUMENT_EXTENSIONS } from "../document-types";

/** Optional UI origin hints for coach conversation streaming (non-edit modes). */
export type ConversationClientContext = {
  surface: "program_dashboard";
  programId: string;
};

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
  clientContext?: unknown;
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

  const {
    userResponse,
    messageTimestamp,
    imageS3Keys,
    documentS3Keys,
    editContext,
    clientContext,
  } = parsedBody;

  return {
    userResponse,
    messageTimestamp,
    imageS3Keys,
    documentS3Keys,
    editContext,
    clientContext,
  };
}

const ALLOWED_CLIENT_CONTEXT_SURFACES = ["program_dashboard"] as const;

/**
 * Validates optional clientContext from the streaming request body.
 * Returns undefined when absent or empty; throws on malformed values.
 */
export function validateConversationClientContext(
  clientContext: unknown,
): ConversationClientContext | undefined {
  if (clientContext === undefined || clientContext === null) {
    return undefined;
  }
  if (typeof clientContext !== "object" || Array.isArray(clientContext)) {
    throw new Error("clientContext must be a plain object");
  }
  const raw = clientContext as Record<string, unknown>;
  const keys = Object.keys(raw);
  if (keys.length === 0) {
    return undefined;
  }
  const surface = raw.surface;
  if (surface !== "program_dashboard") {
    throw new Error(
      `clientContext.surface must be one of: ${ALLOWED_CLIENT_CONTEXT_SURFACES.join(", ")}`,
    );
  }
  const programId = raw.programId;
  if (typeof programId !== "string" || !programId.trim()) {
    throw new Error(
      "clientContext.programId is required for program_dashboard surface",
    );
  }
  return { surface: "program_dashboard", programId: programId.trim() };
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
    const ext = key.split(".").pop()?.toLowerCase();
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
  clientContext?: ConversationClientContext;
} {
  const {
    requireUserResponse = true,
    maxImages = 5,
    maxDocuments = 3,
    isBase64Encoded,
  } = options;

  // Parse body
  const parsed = parseRequestBody(body, isBase64Encoded);
  const {
    userResponse,
    messageTimestamp,
    imageS3Keys,
    documentS3Keys,
    editContext,
    clientContext: rawClientContext,
  } = parsed;

  const clientContext = validateConversationClientContext(rawClientContext);

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
    clientContext,
  };
}
