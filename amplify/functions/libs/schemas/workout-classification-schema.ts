/**
 * JSON Schema for AI workout classification (qualitative vs quantitative)
 * Used with Bedrock toolConfig for schema enforcement
 */
export const WORKOUT_CLASSIFICATION_SCHEMA = {
  type: "object",
  required: ["isQualitative", "reason"],
  properties: {
    isQualitative: {
      type: "boolean",
      description:
        "True if workout is qualitative/activity-based (valid without structured exercise data), false if quantitative/exercise-structured (requires sets/reps/weights)",
    },
    reason: {
      type: "string",
      description: "Brief explanation (1-2 sentences) for the classification",
    },
  },
};
