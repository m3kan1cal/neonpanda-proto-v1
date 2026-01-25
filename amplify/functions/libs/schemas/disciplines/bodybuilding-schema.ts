/**
 * Bodybuilding Schema Plugin
 *
 * Discipline-specific schema for Bodybuilding workouts.
 * Emphasizes hypertrophy, muscle isolation, tempo work, and volume tracking.
 * Supports various split types (PPL, bro split, upper/lower) and intensity techniques.
 *
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
        description:
          "Training split type (push/pull/legs, upper/lower, bro split, etc.)",
      },
      target_muscle_groups: {
        type: "array",
        description: "Primary muscle groups targeted in this session",
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
        description: "Array of exercises with hypertrophy-focused tracking",
        items: {
          type: "object",
          required: ["exercise_name", "movement_category", "sets"],
          properties: {
            exercise_name: {
              type: "string",
              description: "Name of the exercise",
            },
            movement_category: {
              type: "string",
              enum: ["compound", "isolation", "accessory"],
              description:
                "Movement type: compound (multi-joint), isolation (single-joint), accessory",
            },
            target_muscles: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific muscles targeted (e.g., ['chest', 'front_delt', 'triceps'])",
            },
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
              description: "Primary equipment used",
            },
            variation: {
              type: ["string", "null"],
              description:
                "Exercise variation (e.g., 'incline', 'close-grip', 'paused')",
            },
            sets: {
              type: "array",
              description: "Individual sets with intensity technique tracking",
              items: {
                type: "object",
                required: ["set_number", "reps", "weight"],
                properties: {
                  set_number: {
                    type: "number",
                    description: "Set number (1, 2, 3...)",
                  },
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
                    description:
                      "Set type: warmup, working, drop set, rest-pause, AMRAP, superset",
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
                  rpe: {
                    type: ["number", "null"],
                    minimum: 1,
                    maximum: 10,
                    description: "Rate of perceived exertion (1-10)",
                  },
                  rest_time: {
                    type: ["number", "null"],
                    description: "Rest time after this set in seconds",
                  },
                  tempo: {
                    type: ["string", "null"],
                    pattern: "^\\d-\\d-\\d-\\d$",
                    description:
                      "Tempo notation (eccentric-pause-concentric-rest, e.g., '3-1-2-0')",
                  },
                  time_under_tension: {
                    type: ["number", "null"],
                    description: "Time under tension for the set in seconds",
                  },
                  failure: {
                    type: "boolean",
                    description: "Whether the set was taken to failure",
                  },
                  notes: {
                    type: ["string", "null"],
                    description: "Set-specific notes (pump, burn, form cues)",
                  },
                },
              },
            },
            superset_with: {
              type: ["string", "null"],
              description:
                "Exercise name if part of a superset (paired with another exercise)",
            },
          },
        },
      },
    },
  },
};
