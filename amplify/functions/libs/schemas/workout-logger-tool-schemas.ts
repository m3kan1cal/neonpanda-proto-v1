/**
 * Workout Logger Agent Tool Input Schemas
 *
 * JSON Schemas for the 6 workout logger agent tools extracted from inline definitions
 * in agents/workout-logger/tools.ts. Centralizing these enables warmup-platform to
 * pre-compile their Bedrock constrained-decoding grammars.
 */

export const DETECT_DISCIPLINE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    userMessage: {
      type: "string",
      description:
        "The user message describing their workout. If user attached images, YOU must analyze them first and include ALL workout details from the images in this parameter.",
    },
  },
  required: ["userMessage"],
};

export const EXTRACT_WORKOUT_DATA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    discipline: {
      type: "string",
      description:
        "The detected workout discipline from detect_discipline tool (e.g., 'crossfit', 'powerlifting')",
    },
    userMessage: {
      type: "string",
      description:
        "The user message describing their workout. If user attached images, YOU must analyze them first and include ALL workout details from the images in this parameter.",
    },
    userTimezone: {
      type: "string",
      description:
        "User timezone for date extraction (e.g., America/Los_Angeles)",
    },
    messageTimestamp: {
      type: "string",
      description: "ISO timestamp when user sent the message",
    },
    isSlashCommand: {
      type: "boolean",
      description: "Whether this was triggered by a slash command",
    },
    slashCommand: {
      type: "string",
      description: "The slash command used (e.g., log-workout)",
    },
  },
  required: [
    "discipline",
    "userMessage",
    "userTimezone",
    "messageTimestamp",
    "isSlashCommand",
  ],
};

export const VALIDATE_WORKOUT_COMPLETENESS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    isSlashCommand: {
      type: "boolean",
      description: "Whether this was triggered by a slash command",
    },
    workoutIndex: {
      type: "number",
      description:
        "When processing multiple workouts, the 0-based index of which workout to validate. Corresponds to the order extractions were stored. Omit for single-workout messages.",
    },
  },
  required: ["isSlashCommand"],
};

export const NORMALIZE_WORKOUT_DATA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    workoutIndex: {
      type: "number",
      description:
        "When processing multiple workouts, the 0-based index of which workout to normalize.",
    },
  },
  required: [],
};

export const GENERATE_WORKOUT_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    originalMessage: {
      type: "string",
      description: "The original user message",
    },
    workoutIndex: {
      type: "number",
      description:
        "When processing multiple workouts, the 0-based index of which workout to summarize.",
    },
  },
  required: ["originalMessage"],
};

export const SAVE_WORKOUT_TO_DATABASE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    workoutIndex: {
      type: "number",
      description:
        "When processing multiple workouts, the 0-based index of which workout to save.",
    },
  },
  required: [],
};
