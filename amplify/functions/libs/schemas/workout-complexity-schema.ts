/**
 * JSON Schema for AI workout complexity detection result
 * Used with Bedrock toolConfig for schema enforcement
 *
 * Determines whether a workout description requires extended thinking
 * for accurate data extraction.
 *
 * Field ordering follows reasoning-first pattern: reasoning before isComplex and confidence.
 */
export const WORKOUT_COMPLEXITY_SCHEMA = {
  type: "object",
  required: ["reasoning", "isComplex", "confidence"],
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description: "Brief 1-sentence explanation for the classification",
    },
    isComplex: {
      type: "boolean",
      description:
        "True if the workout requires extended thinking for accurate extraction",
    },
    confidence: {
      type: "number",
      description: "Confidence score from 0.0 to 1.0",
    },
    complexityFactors: {
      type: "array",
      description: "List of detected complexity factors",
      items: {
        type: "string",
        enum: [
          "multiple_phases",
          "nested_structures",
          "ambiguous_notation",
          "mixed_modalities",
          "wearable_data",
          "complex_rep_schemes",
          "multiple_time_domains",
          "equipment_transitions",
          "progressive_schemes",
          "interval_complexity",
        ],
      },
    },
  },
};

/**
 * TypeScript interface matching the schema
 */
export interface WorkoutComplexityResult {
  reasoning: string;
  isComplex: boolean;
  confidence: number;
  complexityFactors?: string[];
}
