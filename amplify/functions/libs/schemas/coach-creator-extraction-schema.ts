/**
 * Coach Creator Extraction Schema
 *
 * Defines the JSON schema for AI-powered extraction of coach creator intake
 * information from conversational responses. Each message the user sends during
 * the coach creator flow is run through this schema to incrementally populate
 * the intake to-do list with confidence-tracked fields.
 *
 * Grammar enforcement: This schema is used with JSON output format (Tier 2) via
 * callBedrockApiWithJsonOutput. The `notes` field was intentionally removed from
 * all 22 field objects to bring the total optional parameter count to 22, which
 * is within Bedrock's grammar compilation limit of 24.
 *
 * If `notes` fields are re-added, the count rises to 44 and grammar compilation
 * will fail -- at that point revert to strictSchema: false and document in
 * docs/strategy/STRUCTURED_OUTPUTS_STRATEGY.md.
 *
 * Related files:
 * - amplify/functions/libs/coach-creator/types.ts (TypeScript interfaces)
 * - amplify/functions/libs/coach-creator/todo-extraction.ts (Extraction logic)
 * - amplify/functions/libs/coach-creator/todo-list-utils.ts (To-do list utilities)
 */

/**
 * JSON Schema for Coach Creator Info Extraction Tool
 * 22 top-level optional fields, each with value + confidence (both required).
 * No optional sub-fields -- total optional param count is 22, within Bedrock's limit.
 */
export const COACH_CREATOR_EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    coachGenderPreference: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string", enum: ["male", "female", "neutral"] },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    primaryGoals: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    goalTimeline: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    age: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "number" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    lifeStageContext: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    experienceLevel: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
        },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    trainingHistory: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    trainingFrequency: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "number" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    sessionDuration: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    timeOfDayPreference: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    injuryConsiderations: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    movementLimitations: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    equipmentAccess: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "array", items: { type: "string" } },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    trainingEnvironment: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    movementPreferences: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    movementDislikes: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    coachingStylePreference: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    motivationStyle: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    successMetrics: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    progressTrackingPreferences: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    competitionGoals: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
    competitionTimeline: {
      type: "object",
      additionalProperties: false,
      properties: {
        value: { type: "string" },
        confidence: { type: "string", enum: ["high", "medium", "low"] },
      },
      required: ["value", "confidence"],
    },
  },
  // No required fields - only extract what's found in this message
};
