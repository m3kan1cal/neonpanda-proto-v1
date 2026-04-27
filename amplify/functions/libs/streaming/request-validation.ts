/**
 * Request validation utilities for streaming handlers
 */

import type { ConversationEditContext } from "../coach-conversation/types";
import { SUPPORTED_DOCUMENT_EXTENSIONS } from "../document-types";

/** Time-range options the Training Pulse page exposes via its TimeRangeSelector. */
export type TrainingPulseTimeRange = "4w" | "8w" | "12w" | "24w" | "1y";

/** Optional UI origin hints for coach conversation streaming (non-edit modes). */
export type ConversationClientContext =
  | { surface: "program_dashboard"; programId: string }
  | { surface: "training_grounds" }
  | {
      surface: "view_workouts";
      programId: string;
      /** Day the user is currently viewing on the View Workouts page. */
      dayNumber?: number;
      /** True when the page is showing today (no `?day=N` in URL). */
      isViewingToday?: boolean;
    }
  | {
      surface: "training_pulse";
      timeRange: TrainingPulseTimeRange;
      /** Optional exercise the user has drilled into via ExerciseSelector. */
      exerciseName?: string;
    }
  | {
      surface: "reports_list";
      reportType: "weekly" | "monthly";
    }
  | { surface: "weekly_report"; weekId: string }
  | { surface: "monthly_report"; monthId: string };

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

const ALLOWED_CLIENT_CONTEXT_SURFACES = [
  "program_dashboard",
  "training_grounds",
  "view_workouts",
  "training_pulse",
  "reports_list",
  "weekly_report",
  "monthly_report",
] as const;

const TRAINING_PULSE_TIME_RANGES: readonly TrainingPulseTimeRange[] = [
  "4w",
  "8w",
  "12w",
  "24w",
  "1y",
];

const REPORTS_LIST_REPORT_TYPES = ["weekly", "monthly"] as const;

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
  if (
    !(ALLOWED_CLIENT_CONTEXT_SURFACES as readonly string[]).includes(
      surface as string,
    )
  ) {
    throw new Error(
      `clientContext.surface must be one of: ${ALLOWED_CLIENT_CONTEXT_SURFACES.join(", ")}`,
    );
  }

  // Surfaces that must NOT carry a programId (it would silently mislead the
  // backend). Enforced symmetrically across all non-program-scoped surfaces
  // so a typo on the client doesn't pass through unnoticed.
  const NON_PROGRAM_SURFACES = new Set([
    "training_grounds",
    "training_pulse",
    "reports_list",
    "weekly_report",
    "monthly_report",
  ]);
  if (NON_PROGRAM_SURFACES.has(surface as string) && raw.programId !== undefined) {
    throw new Error(
      `clientContext.programId is not allowed for ${surface} surface`,
    );
  }

  if (surface === "training_grounds") {
    return { surface: "training_grounds" };
  }

  if (surface === "training_pulse") {
    const timeRange = raw.timeRange;
    if (
      typeof timeRange !== "string" ||
      !(TRAINING_PULSE_TIME_RANGES as readonly string[]).includes(timeRange)
    ) {
      throw new Error(
        `clientContext.timeRange must be one of: ${TRAINING_PULSE_TIME_RANGES.join(", ")} for training_pulse surface`,
      );
    }
    const out: ConversationClientContext = {
      surface: "training_pulse",
      timeRange: timeRange as TrainingPulseTimeRange,
    };
    if (raw.exerciseName !== undefined) {
      if (typeof raw.exerciseName !== "string" || !raw.exerciseName.trim()) {
        throw new Error(
          "clientContext.exerciseName must be a non-empty string for training_pulse surface",
        );
      }
      out.exerciseName = raw.exerciseName.trim();
    }
    return out;
  }

  if (surface === "reports_list") {
    const reportType = raw.reportType;
    if (
      typeof reportType !== "string" ||
      !(REPORTS_LIST_REPORT_TYPES as readonly string[]).includes(reportType)
    ) {
      throw new Error(
        `clientContext.reportType must be one of: ${REPORTS_LIST_REPORT_TYPES.join(", ")} for reports_list surface`,
      );
    }
    return {
      surface: "reports_list",
      reportType: reportType as "weekly" | "monthly",
    };
  }

  if (surface === "weekly_report") {
    const weekId = raw.weekId;
    if (typeof weekId !== "string" || !weekId.trim()) {
      throw new Error(
        "clientContext.weekId is required for weekly_report surface",
      );
    }
    return { surface: "weekly_report", weekId: weekId.trim() };
  }

  if (surface === "monthly_report") {
    const monthId = raw.monthId;
    if (typeof monthId !== "string" || !monthId.trim()) {
      throw new Error(
        "clientContext.monthId is required for monthly_report surface",
      );
    }
    return { surface: "monthly_report", monthId: monthId.trim() };
  }

  // surface === "program_dashboard" || surface === "view_workouts"
  const programId = raw.programId;
  if (typeof programId !== "string" || !programId.trim()) {
    throw new Error(
      `clientContext.programId is required for ${surface} surface`,
    );
  }
  if (surface === "program_dashboard") {
    return { surface: "program_dashboard", programId: programId.trim() };
  }
  // surface === "view_workouts"
  const out: ConversationClientContext = {
    surface: "view_workouts",
    programId: programId.trim(),
  };
  if (raw.dayNumber !== undefined) {
    if (
      typeof raw.dayNumber !== "number" ||
      !Number.isFinite(raw.dayNumber) ||
      raw.dayNumber < 1
    ) {
      throw new Error(
        "clientContext.dayNumber must be a positive number for view_workouts surface",
      );
    }
    out.dayNumber = raw.dayNumber;
  }
  if (raw.isViewingToday !== undefined) {
    if (typeof raw.isViewingToday !== "boolean") {
      throw new Error(
        "clientContext.isViewingToday must be a boolean for view_workouts surface",
      );
    }
    out.isViewingToday = raw.isViewingToday;
  }
  return out;
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
