/**
 * JSON Schema for AI workout discipline classification
 * Used with Bedrock toolConfig for schema enforcement
 *
 * Classifies a workout discipline across multiple axes:
 * qualitative vs. quantitative, environment, and primary training focus.
 *
 * Mirrors the DisciplineClassification interface in libs/workout/types.ts.
 * Field ordering follows reasoning-first pattern.
 */
export const DISCIPLINE_CLASSIFICATION_SCHEMA = {
  type: "object",
  required: [
    "reasoning",
    "isQualitative",
    "requiresPreciseMetrics",
    "environment",
    "primaryFocus",
    "confidence",
  ],
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description: "Brief explanation of the classification decision",
    },
    isQualitative: {
      type: "boolean",
      description:
        "True if the discipline tolerates missing precise metrics (e.g. outdoor running, swimming, yoga). False if specific numbers are central to the activity (e.g. powerlifting, CrossFit metcons).",
    },
    requiresPreciseMetrics: {
      type: "boolean",
      description:
        "True if performance must be tracked with specific numbers (weights, reps, distances, times) for meaningful progression",
    },
    environment: {
      type: "string",
      enum: ["indoor", "outdoor", "mixed"],
      description:
        "Typical training environment for this discipline: indoor (gym/controlled), outdoor (open air/trails/open water), or mixed",
    },
    primaryFocus: {
      type: "string",
      enum: [
        "strength",
        "endurance",
        "power",
        "speed",
        "agility",
        "flexibility",
        "balance",
        "technique",
        "coordination",
        "mixed",
      ],
      description:
        "The dominant training quality developed by this discipline. Use 'mixed' only when multiple qualities are equally emphasized (e.g. CrossFit, general fitness).",
    },
    confidence: {
      type: "number",
      description:
        "Confidence score from 0.0 to 1.0. Use 0.8+ for clear classifications, 0.5–0.7 for moderate cases, below 0.5 for ambiguous ones.",
    },
  },
};

/**
 * TypeScript interface matching the schema.
 * This is a re-export-friendly duplicate of DisciplineClassification in libs/workout/types.ts.
 */
export interface DisciplineClassificationResult {
  reasoning: string;
  isQualitative: boolean;
  requiresPreciseMetrics: boolean;
  environment: "indoor" | "outdoor" | "mixed";
  primaryFocus:
    | "strength"
    | "endurance"
    | "power"
    | "speed"
    | "agility"
    | "flexibility"
    | "balance"
    | "technique"
    | "coordination"
    | "mixed";
  confidence: number;
}
