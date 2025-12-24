/**
 * Olympic Weightlifting Schema Plugin
 *
 * Discipline-specific schema for Olympic Weightlifting workouts.
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const OLYMPIC_WEIGHTLIFTING_SCHEMA_PLUGIN = {
  olympic_weightlifting: {
    type: "object",
    required: ["session_type", "lifts"],
    properties: {
      session_type: {
        type: "string",
        enum: [
          "technique",
          "strength",
          "competition_prep",
          "competition",
          "accessory",
        ],
      },
      competition_prep: { type: "boolean" },
      lifts: {
        type: "array",
        items: {
          type: "object",
          required: ["lift_name", "lift_category", "sets"],
          properties: {
            lift_name: { type: "string" },
            lift_category: {
              type: "string",
              enum: [
                "competition_snatch",
                "competition_clean_jerk",
                "snatch_variation",
                "clean_variation",
                "jerk_variation",
                "pull",
                "squat",
                "accessory",
              ],
            },
            variation: { type: ["string", "null"] },
            position: { type: ["string", "null"] },
            attempts: {
              type: "object",
              properties: {
                opener: { type: ["number", "null"] },
                second_attempt: { type: ["number", "null"] },
                third_attempt: { type: ["number", "null"] },
                successful_attempts: {
                  type: "array",
                  items: { type: "number" },
                },
                missed_attempts: {
                  type: "array",
                  items: { type: "number" },
                },
                miss_reasons: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
            sets: {
              type: "array",
              items: {
                type: "object",
                required: ["set_number", "weight", "reps"],
                properties: {
                  set_number: { type: "number" },
                  set_type: {
                    type: "string",
                    enum: [
                      "warmup",
                      "working",
                      "technique",
                      "opener",
                      "second",
                      "third",
                      "complex",
                    ],
                  },
                  weight: { type: "number" },
                  weight_unit: { type: "string", enum: ["lbs", "kg"] },
                  reps: { type: "number" },
                  percentage_1rm: { type: ["number", "null"] },
                  success: { type: "boolean" },
                  rest_time: { type: ["number", "null"] },
                  technique_notes: { type: ["string", "null"] },
                },
              },
            },
            complex_structure: { type: ["string", "null"] },
          },
        },
      },
    },
  },
};
