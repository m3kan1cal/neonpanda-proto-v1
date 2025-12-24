/**
 * Functional Bodybuilding Schema Plugin
 *
 * Discipline-specific schema for Functional Bodybuilding workouts.
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const FUNCTIONAL_BODYBUILDING_SCHEMA_PLUGIN = {
  functional_bodybuilding: {
    type: "object",
    required: ["session_focus", "exercises"],
    properties: {
      session_focus: {
        type: "string",
        enum: [
          "upper_body",
          "lower_body",
          "full_body",
          "accessory",
          "pump",
          "hybrid",
        ],
      },
      methodology: {
        type: ["string", "null"],
        enum: ["functional_bodybuilding", "persist", "marcus_filly", null],
      },
      exercises: {
        type: "array",
        items: {
          type: "object",
          required: ["exercise_name", "movement_pattern", "sets"],
          properties: {
            exercise_name: { type: "string" },
            movement_pattern: {
              type: "string",
              enum: [
                "push",
                "pull",
                "squat",
                "hinge",
                "carry",
                "accessory",
                "core",
              ],
            },
            target_muscles: { type: "array", items: { type: "string" } },
            equipment: {
              type: "string",
              enum: [
                "barbell",
                "dumbbell",
                "cable",
                "machine",
                "bodyweight",
                "kettlebell",
                "other",
              ],
            },
            structure: {
              type: "string",
              enum: ["emom", "straight_sets", "superset", "circuit", "amrap"],
            },
            emom_details: {
              type: ["object", "null"],
              properties: {
                interval: { type: "number" },
                rounds: { type: "number" },
                reps_per_round: { type: "number" },
              },
            },
            sets: {
              type: "array",
              items: {
                type: "object",
                required: ["set_number", "reps", "weight"],
                properties: {
                  set_number: { type: "number" },
                  reps: { type: "number" },
                  weight: { type: "number" },
                  weight_unit: { type: "string", enum: ["lbs", "kg"] },
                  rest_time: { type: ["number", "null"] },
                  tempo: {
                    type: ["string", "null"],
                    pattern: "^\\d-\\d-\\d-\\d$",
                  },
                  quality_focus: { type: ["string", "null"] },
                  notes: { type: ["string", "null"] },
                },
              },
            },
            superset_with: { type: ["string", "null"] },
          },
        },
      },
    },
  },
};
