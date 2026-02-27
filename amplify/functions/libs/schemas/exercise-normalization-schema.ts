/**
 * Exercise Normalization Schema
 *
 * Tool schema for AI-powered exercise name normalization.
 * Converts exercise names to canonical snake_case format with confidence scores.
 */

import type { BedrockToolConfig } from "../api-helpers";

/**
 * Tool definition for exercise normalization
 */
export const NORMALIZE_EXERCISES_TOOL: BedrockToolConfig = {
  name: "normalize_exercises",
  description:
    "Normalize exercise names to canonical snake_case format with confidence scores",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      exercises: {
        type: "array",
        description: "Array of normalized exercise entries",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            original: {
              type: "string",
              description: "The original exercise name provided",
            },
            normalized: {
              type: "string",
              description: "The normalized snake_case exercise name",
            },
            confidence: {
              type: "number",
              description: "Confidence score between 0 and 1",
            },
          },
          required: ["original", "normalized", "confidence"],
        },
      },
    },
    required: ["exercises"],
  },
};
