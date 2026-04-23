/**
 * JSON Schema for AI discipline detection result
 * Used with Bedrock toolConfig for schema enforcement
 *
 * Field ordering follows reasoning-first pattern: reasoning before conclusion and confidence.
 */
export const DISCIPLINE_DETECTION_SCHEMA = {
  type: "object",
  required: ["reasoning", "discipline", "confidence"],
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description: "Brief 1-sentence explanation for the classification",
    },
    discipline: {
      type: "string",
      enum: [
        "crossfit",
        "powerlifting",
        "bodybuilding",
        "hyrox",
        "olympic_weightlifting",
        "functional_bodybuilding",
        "calisthenics",
        "running",
        "trail_running",
        "cycling",
        "circuit_training",
        "hybrid",
        "backpacking",
        "rucking",
      ],
      description:
        "The detected workout discipline. Use 'hybrid' for mixed-modality workouts that don't clearly fit a single discipline, workouts with multiple distinct sections (strength + cardio + mobility), or when the user explicitly mentions 'mixed' or 'general' training. Boundary rules: 'running' = road/track (including road ultras); 'trail_running' = trail surface, meaningful vert, or technical terrain (including trail ultras); 'rucking' = structured loaded march where pace/distance/load is the main story; 'backpacking' = trail + pack context, including multi-day trips and mountaineering prep.",
    },
    confidence: {
      type: "number",
      description: "Confidence score from 0.0 to 1.0",
    },
  },
};
