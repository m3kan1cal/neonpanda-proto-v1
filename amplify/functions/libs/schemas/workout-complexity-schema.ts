/**
 * JSON Schema for AI workout complexity detection result
 * Used with Bedrock toolConfig for schema enforcement
 *
 * Determines whether a workout description requires extended thinking
 * for accurate data extraction.
 */
export const WORKOUT_COMPLEXITY_SCHEMA = {
  type: "object",
  required: ["isComplex", "confidence", "reasoning"],
  properties: {
    isComplex: {
      type: "boolean",
      description:
        "True if the workout requires extended thinking for accurate extraction",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Confidence score from 0.0 to 1.0",
    },
    reasoning: {
      type: "string",
      description: "Brief 1-sentence explanation for the classification",
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
  isComplex: boolean;
  confidence: number;
  reasoning: string;
  complexityFactors?: string[];
}
