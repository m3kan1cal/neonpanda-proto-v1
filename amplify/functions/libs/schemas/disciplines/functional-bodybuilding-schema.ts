/**
 * Functional Bodybuilding Schema Plugin
 *
 * Discipline-specific schema for Functional Bodybuilding workouts.
 * Emphasizes quality movement, controlled tempo, and hypertrophy with functional patterns.
 * Popularized by Marcus Filly (Persist program), Awaken Training Series.
 *
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
        description:
          "Primary focus of the session (body region or workout type)",
      },
      methodology: {
        type: ["string", "null"],
        enum: ["functional_bodybuilding", "persist", "marcus_filly", null],
        description:
          "Specific program methodology if mentioned (Persist, Marcus Filly, etc.)",
      },
      exercises: {
        type: "array",
        description: "Array of exercises with quality-focused tracking",
        items: {
          type: "object",
          required: ["exercise_name", "movement_pattern", "sets"],
          properties: {
            exercise_name: {
              type: "string",
              description: "Name of the exercise",
            },
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
              description:
                "Fundamental movement pattern (push, pull, squat, hinge, carry, core)",
            },
            target_muscles: {
              type: "array",
              items: { type: "string" },
              description:
                "Primary muscles targeted (e.g., ['chest', 'triceps', 'shoulders'])",
            },
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
              description: "Primary equipment used",
            },
            structure: {
              type: "string",
              enum: ["emom", "straight_sets", "superset", "circuit", "amrap"],
              description:
                "Exercise structure (EMOM with quality focus, straight sets, supersets)",
            },
            emom_details: {
              type: ["object", "null"],
              description:
                "EMOM-specific details when structure is emom (quality-focused, not max effort)",
              properties: {
                interval: {
                  type: "number",
                  description:
                    "EMOM interval in seconds (e.g., 60 for every minute)",
                },
                rounds: {
                  type: "number",
                  description: "Total EMOM rounds",
                },
                reps_per_round: {
                  type: "number",
                  description: "Reps performed each round",
                },
              },
            },
            sets: {
              type: "array",
              description:
                "Individual set data with tempo and quality tracking",
              items: {
                type: "object",
                required: ["set_number", "reps", "weight"],
                properties: {
                  set_number: {
                    type: "number",
                    description: "Set number (1, 2, 3...)",
                  },
                  reps: {
                    type: "number",
                    description: "Reps completed",
                  },
                  weight: {
                    type: "number",
                    description: "Weight used",
                  },
                  weight_unit: {
                    type: "string",
                    enum: ["lbs", "kg"],
                    description: "Weight unit",
                  },
                  rest_time: {
                    type: ["number", "null"],
                    description: "Rest time after this set in seconds",
                  },
                  tempo: {
                    type: ["string", "null"],
                    pattern: "^\\d-\\d-\\d-\\d$",
                    description:
                      "Tempo notation (eccentric-pause-concentric-rest, e.g., '3-1-1-0')",
                  },
                  quality_focus: {
                    type: ["string", "null"],
                    description:
                      "Quality cue for the set (e.g., 'squeeze at top', 'slow eccentric')",
                  },
                  notes: {
                    type: ["string", "null"],
                    description: "Additional notes for this set",
                  },
                },
              },
            },
            superset_with: {
              type: ["string", "null"],
              description:
                "Exercise name if this is part of a superset (paired with another exercise)",
            },
          },
        },
      },
    },
  },
};
