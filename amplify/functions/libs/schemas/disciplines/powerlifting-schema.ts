/**
 * Powerlifting Schema Plugin
 *
 * Discipline-specific schema for Powerlifting workouts.
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const POWERLIFTING_SCHEMA_PLUGIN = {
  powerlifting: {
    type: "object",
    required: ["session_type", "competition_prep", "exercises"],
    properties: {
      session_type: {
        type: "string",
        enum: [
          "max_effort",
          "dynamic_effort",
          "repetition_method",
          "competition_prep",
        ],
        description: "Type of powerlifting session",
      },
      competition_prep: {
        type: "boolean",
        description: "Whether this is competition preparation",
      },
      exercises: {
        type: "array",
        items: {
          type: "object",
          required: ["exercise_name", "movement_category", "sets"],
          properties: {
            exercise_name: {
              type: "string",
              description: "Name of the lift",
            },
            movement_category: {
              type: "string",
              enum: ["main_lift", "accessory", "mobility"],
              description: "Category of movement",
            },
            equipment: {
              type: "array",
              items: { type: "string" },
              description: "Equipment used (belt, sleeves, wraps, etc.)",
            },
            competition_commands: {
              type: "boolean",
              description: "Whether competition commands were used",
            },
            attempts: {
              type: "object",
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
                  description: "Successful attempt weights",
                },
                missed_attempts: {
                  type: "array",
                  items: { type: "number" },
                  description: "Missed attempt weights",
                },
                miss_reasons: {
                  type: "array",
                  items: { type: "string" },
                  description: "Reasons for missed attempts",
                },
              },
            },
            sets: {
              type: "array",
              items: {
                type: "object",
                required: ["set_type", "weight", "reps"],
                properties: {
                  set_type: {
                    type: "string",
                    enum: [
                      "opener",
                      "second",
                      "third",
                      "warmup",
                      "working",
                      "accessory",
                    ],
                    description: "Type of set",
                  },
                  weight: {
                    type: "number",
                    description: "Weight used",
                  },
                  reps: {
                    type: "number",
                    description: "Reps performed",
                  },
                  rpe: {
                    type: ["number", "null"],
                    minimum: 1,
                    maximum: 10,
                    description: "Rate of perceived exertion (1-10)",
                  },
                  rest_time: {
                    type: ["number", "null"],
                    description: "Rest time after set (seconds)",
                  },
                  percentage_1rm: {
                    type: ["number", "null"],
                    description: "Percentage of 1RM",
                  },
                  bar_speed: {
                    type: ["string", "null"],
                    enum: ["slow", "moderate", "fast", "explosive", null],
                    description: "Bar speed",
                  },
                  competition_commands: {
                    type: "boolean",
                    description: "Competition commands used",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
};
