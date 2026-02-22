/**
 * JSON Schema for AI workout classification (qualitative vs quantitative)
 * Used with Bedrock toolConfig for schema enforcement
 *
 * Field ordering follows reasoning-first pattern: reason before isQualitative conclusion.
 */
export const WORKOUT_CLASSIFICATION_SCHEMA = {
  type: "object",
  required: ["reason", "isQualitative"],
  additionalProperties: false,
  properties: {
    reason: {
      type: "string",
      description: "Brief explanation (1-2 sentences) for the classification",
    },
    isQualitative: {
      type: "boolean",
      description:
        "True if workout is qualitative/activity-based (valid without structured exercise data), false if quantitative/exercise-structured (requires sets/reps/weights)",
    },
  },
};
