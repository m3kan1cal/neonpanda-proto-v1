/**
 * JSON Schema for AI workout completion time extraction
 * Used with Bedrock toolConfig for schema enforcement
 *
 * Extracts the actual clock time a workout was completed from a user message,
 * distinguishing between clock times ("7pm", "23:00 local") and workout
 * duration/result notation ("23:47", "3:45", "1:02:14" in MM:SS or H:MM:SS).
 *
 * Field ordering follows reasoning-first pattern: reasoning before completedAt and confidence.
 */
export const WORKOUT_TIME_EXTRACTION_SCHEMA = {
  type: "object",
  required: ["reasoning", "confidence"],
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description:
        "Brief explanation of the date/time logic applied, including duration vs. clock-time disambiguation",
    },
    completedAt: {
      type: "string",
      description:
        "ISO 8601 UTC timestamp of when the workout was completed (e.g. 2025-01-14T19:42:00.000Z). Omit this field entirely if no clock time can be determined — do NOT include it as null.",
    },
    confidence: {
      type: "number",
      description: "Confidence score from 0.0 to 1.0",
    },
  },
};

/**
 * TypeScript interface matching the schema
 */
export interface WorkoutTimeExtractionResult {
  reasoning: string;
  completedAt?: string;
  confidence: number;
}
