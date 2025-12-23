/**
 * Bodybuilding Schema Plugin
 *
 * Discipline-specific schema for Bodybuilding workouts.
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const BODYBUILDING_SCHEMA_PLUGIN = {
  bodybuilding: {
    type: "object",
    required: ["split_type", "exercises"],
    properties: {
      split_type: {
        type: "string",
        enum: [
          "push",
          "pull",
          "legs",
          "upper",
          "lower",
          "full_body",
          "push_pull_legs",
          "bro_split",
          "custom",
        ],
      },
      target_muscle_groups: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "chest",
            "back",
            "shoulders",
            "biceps",
            "triceps",
            "quads",
            "hamstrings",
            "glutes",
            "calves",
            "abs",
            "forearms",
          ],
        },
      },
      exercises: {
        type: "array",
        items: {
          type: "object",
          required: ["exercise_name", "movement_category", "sets"],
          properties: {
            exercise_name: { type: "string" },
            movement_category: {
              type: "string",
              enum: ["compound", "isolation", "accessory"],
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
                "other",
              ],
            },
            variation: { type: ["string", "null"] },
            sets: {
              type: "array",
              items: {
                type: "object",
                required: ["set_number", "reps", "weight"],
                properties: {
                  set_number: { type: "number" },
                  set_type: {
                    type: "string",
                    enum: [
                      "warmup",
                      "working",
                      "drop",
                      "rest_pause",
                      "amrap",
                      "superset",
                    ],
                  },
                  reps: { type: "number" },
                  weight: { type: "number" },
                  weight_unit: { type: "string", enum: ["lbs", "kg"] },
                  rpe: {
                    type: ["number", "null"],
                    minimum: 1,
                    maximum: 10,
                  },
                  rest_time: { type: ["number", "null"] },
                  tempo: {
                    type: ["string", "null"],
                    pattern: "^\\d-\\d-\\d-\\d$",
                    description: "Tempo (eccentric-pause-concentric-rest)",
                  },
                  time_under_tension: { type: ["number", "null"] },
                  failure: { type: "boolean" },
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
