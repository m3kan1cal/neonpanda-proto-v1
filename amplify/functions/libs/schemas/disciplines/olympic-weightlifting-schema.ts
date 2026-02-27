/**
 * Olympic Weightlifting Schema Plugin
 *
 * Discipline-specific schema for Olympic Weightlifting workouts.
 * Covers snatch, clean & jerk, and their variations plus accessory work.
 * Supports competition attempts, percentage-based training, and technique work.
 *
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const OLYMPIC_WEIGHTLIFTING_SCHEMA_PLUGIN = {
  olympic_weightlifting: {
    type: "object",
    required: ["session_type", "lifts"],
    additionalProperties: false,
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
        description:
          "Session focus: technique (light/positional), strength (heavy), competition_prep, competition, accessory",
      },
      competition_prep: {
        type: "boolean",
        description: "Whether this session is part of competition preparation",
      },
      lifts: {
        type: "array",
        description:
          "Array of lifts performed with competition attempt and technique tracking",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["lift_name", "lift_category", "sets"],
          properties: {
            lift_name: {
              type: "string",
              description:
                "Name of the lift (e.g., 'snatch', 'clean and jerk', 'power clean')",
            },
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
              description:
                "Lift category: competition lifts, variations, pulls, squats, or accessory",
            },
            variation: {
              type: ["string", "null"],
              description:
                "Lift variation (e.g., 'power', 'hang', 'block', 'pause', 'no feet')",
            },
            position: {
              type: ["string", "null"],
              description:
                "Starting position (e.g., 'floor', 'hang', 'knee', 'hip', 'block')",
            },
            attempts: {
              type: "object",
              additionalProperties: false,
              required: [], // all attempt fields are optional competition tracking
              description:
                "Competition attempt tracking (for comp or comp prep)",
              properties: {
                opener: {
                  type: ["number", "null"],
                  description: "Opening attempt weight",
                },
                second_attempt: {
                  type: ["number", "null"],
                  description: "Second attempt weight",
                },
                third_attempt: {
                  type: ["number", "null"],
                  description: "Third attempt weight",
                },
                successful_attempts: {
                  type: "array",
                  items: { type: "number" },
                  description: "Weights of successful attempts",
                },
                missed_attempts: {
                  type: "array",
                  items: { type: "number" },
                  description: "Weights of missed attempts",
                },
                miss_reasons: {
                  type: "array",
                  items: { type: "string" },
                  description:
                    "Reasons for misses (e.g., 'pressed out', 'forward', 'soft lockout')",
                },
              },
            },
            sets: {
              type: "array",
              description:
                "Individual sets with technique and success tracking",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["set_number", "weight", "reps"],
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
                      "technique",
                      "opener",
                      "second",
                      "third",
                      "complex",
                    ],
                    description:
                      "Set type: warmup, working, technique, competition attempts, or complex",
                  },
                  weight: {
                    type: "number",
                    description: "Weight used",
                  },
                  weight_unit: {
                    type: "string",
                    enum: ["lbs", "kg"],
                    description: "Weight unit (kg is standard in competition)",
                  },
                  reps: {
                    type: "number",
                    description: "Reps completed",
                  },
                  percentage_1rm: {
                    type: ["number", "null"],
                    description: "Percentage of 1RM (e.g., 80 for 80%)",
                  },
                  success: {
                    type: "boolean",
                    description: "Whether the lift was made successfully",
                  },
                  rest_time: {
                    type: ["number", "null"],
                    description: "Rest time after this set in seconds",
                  },
                  technique_notes: {
                    type: ["string", "null"],
                    description:
                      "Technique observations (e.g., 'good pull', 'soft lockout', 'early arm bend')",
                  },
                },
              },
            },
            complex_structure: {
              type: ["string", "null"],
              description:
                "Complex structure if applicable (e.g., '1 snatch + 2 overhead squat')",
            },
          },
        },
      },
    },
  },
};
