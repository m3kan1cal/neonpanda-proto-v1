/**
 * Request validation utilities for streaming handlers
 */

/**
 * Parse and validate request body from streaming event
 */
export function parseRequestBody(body: string | undefined): {
  userResponse: string;
  messageTimestamp: string;
  imageS3Keys?: string[];
} {
  if (!body) {
    throw new Error("Request body is required");
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (parseError) {
    throw new Error("Invalid JSON in request body");
  }

  const { userResponse, messageTimestamp, imageS3Keys } = parsedBody;

  return {
    userResponse,
    messageTimestamp,
    imageS3Keys,
  };
}

/**
 * Validate image S3 keys
 */
export function validateImageS3Keys(
  imageS3Keys: string[] | undefined,
  userId: string,
  maxImages: number = 5
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
  messageTimestamp: string | undefined
): void {
  if (!messageTimestamp) {
    throw new Error("Message timestamp is required");
  }
}

/**
 * Validate user response (optional for some use cases)
 */
export function validateUserResponse(
  userResponse: string | undefined,
  imageS3Keys?: string[]
): void {
  // Either text or images required
  if (!userResponse && (!imageS3Keys || imageS3Keys.length === 0)) {
    throw new Error("Either text or images required");
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
  } = {}
): {
  userResponse: string;
  messageTimestamp: string;
  imageS3Keys?: string[];
} {
  const { requireUserResponse = true, maxImages = 5 } = options;

  // Parse body
  const parsed = parseRequestBody(body);
  const { userResponse, messageTimestamp, imageS3Keys } = parsed;

  // Validate user response (if required)
  if (requireUserResponse && !userResponse) {
    throw new Error("userResponse is required");
  } else if (!requireUserResponse) {
    // If not strictly required, check that we have either text or images
    validateUserResponse(userResponse, imageS3Keys);
  }

  // Validate images
  validateImageS3Keys(imageS3Keys, userId, maxImages);

  // Validate timestamp
  validateMessageTimestamp(messageTimestamp);

  return {
    userResponse,
    messageTimestamp,
    imageS3Keys,
  };
}

