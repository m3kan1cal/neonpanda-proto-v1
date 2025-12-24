/**
 * Calisthenics Schema Plugin
 *
 * Discipline-specific schema for Calisthenics workouts.
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const CALISTHENICS_SCHEMA_PLUGIN = {
  calisthenics: {
    type: "object",
    required: ["session_focus", "exercises"],
    properties: {
      session_focus: {
        type: "string",
        enum: ["strength", "skill", "endurance", "mobility", "mixed"],
      },
      exercises: {
        type: "array",
        items: {
          type: "object",
          required: ["exercise_name", "skill_category"],
          properties: {
            exercise_name: { type: "string" },
            skill_category: {
              type: "string",
              enum: [
                "pull",
                "push",
                "static_hold",
                "dynamic_movement",
                "core",
                "leg",
                "skill_transfer",
              ],
            },
            progression_level: { type: ["string", "null"] },
            assistance_method: { type: ["string", "null"] },
            sets: {
              type: "array",
              items: {
                type: "object",
                required: ["set_number"],
                properties: {
                  set_number: { type: "number" },
                  set_type: {
                    type: "string",
                    enum: [
                      "warmup",
                      "working",
                      "skill_practice",
                      "max_effort",
                      "endurance",
                    ],
                  },
                  reps: { type: ["number", "null"] },
                  hold_time: { type: ["number", "null"] },
                  rest_time: { type: ["number", "null"] },
                  success: { type: "boolean" },
                  quality_rating: {
                    type: ["number", "null"],
                    minimum: 1,
                    maximum: 10,
                  },
                  notes: { type: ["string", "null"] },
                },
              },
            },
          },
        },
      },
    },
  },
};
