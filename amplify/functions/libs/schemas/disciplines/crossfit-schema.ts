/**
 * CrossFit Schema Plugin
 *
 * Discipline-specific schema for CrossFit workouts.
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const CROSSFIT_SCHEMA_PLUGIN = {
  crossfit: {
    type: "object",
    required: ["workout_format", "rx_status", "rounds"],
    properties: {
      workout_format: {
        type: "string",
        enum: [
          "for_time",
          "amrap",
          "emom",
          "tabata",
          "ladder",
          "chipper",
          "death_by",
          "intervals",
          "strength_then_metcon",
          "hero_workout",
          "custom",
        ],
        description: "CrossFit workout format type",
      },
      time_cap: {
        type: ["number", "null"],
        description: "Time cap in seconds",
      },
      rx_status: {
        type: "string",
        enum: ["rx", "scaled", "modified"],
        description: "Workout scaling status",
      },
      rounds: {
        type: "array",
        items: {
          type: "object",
          required: ["round_number", "exercises"],
          properties: {
            round_number: {
              type: "number",
              description: "Round number",
            },
            rep_scheme: {
              type: ["string", "null"],
              description: 'Rep scheme for this round (e.g., "21-15-9")',
            },
            exercises: {
              type: "array",
              items: {
                type: "object",
                required: ["exercise_name", "movement_type"],
                properties: {
                  exercise_name: {
                    type: "string",
                    description: "Name of the exercise",
                  },
                  movement_type: {
                    type: "string",
                    enum: [
                      "barbell",
                      "dumbbell",
                      "kettlebell",
                      "bodyweight",
                      "gymnastics",
                      "cardio",
                      "other",
                    ],
                    description: "Type of movement",
                  },
                  variation: {
                    type: ["string", "null"],
                    description:
                      'Exercise variation (e.g., "butterfly", "kipping")',
                  },
                  assistance: {
                    type: ["string", "null"],
                    description:
                      'Assistance equipment used (e.g., "bands", "box")',
                  },
                  weight: {
                    type: "object",
                    properties: {
                      value: {
                        type: ["number", "null"],
                        description: "Weight value",
                      },
                      unit: {
                        type: "string",
                        enum: ["lbs", "kg"],
                        description: "Weight unit",
                      },
                      percentage_1rm: {
                        type: ["number", "null"],
                        description: "Percentage of 1RM",
                      },
                      rx_weight: {
                        type: ["number", "null"],
                        description: "Prescribed RX weight",
                      },
                      scaled_weight: {
                        type: ["number", "null"],
                        description: "Scaled weight used",
                      },
                    },
                  },
                  reps: {
                    type: "object",
                    properties: {
                      prescribed: {
                        type: ["number", "string"],
                        description: 'Prescribed reps (number or "max")',
                      },
                      completed: {
                        type: "number",
                        description: "Reps actually completed",
                      },
                      broken_sets: {
                        type: ["array", "null"],
                        items: { type: "number" },
                        description:
                          "How reps were broken up (e.g., [10, 8, 7])",
                      },
                      rest_between_sets: {
                        type: ["array", "null"],
                        items: { type: "number" },
                        description: "Rest time between broken sets (seconds)",
                      },
                    },
                  },
                  distance: {
                    type: ["number", "null"],
                    description: "Distance in meters",
                  },
                  calories: {
                    type: ["number", "null"],
                    description: "Calories performed",
                  },
                  time: {
                    type: ["number", "null"],
                    description: "Time in seconds",
                  },
                  form_notes: {
                    type: ["string", "null"],
                    description: "Notes on form, technique, or performance",
                  },
                },
              },
            },
          },
        },
      },
      performance_data: {
        type: "object",
        properties: {
          total_time: {
            type: ["number", "null"],
            description: "Total workout time in seconds",
          },
          rounds_completed: {
            type: "number",
            description: "Number of rounds completed",
          },
          total_reps: {
            type: ["number", "null"],
            description: "Total reps completed",
          },
          round_times: {
            type: ["array", "null"],
            items: { type: "number" },
            description: "Time for each round (seconds)",
          },
          score: {
            type: "object",
            properties: {
              value: {
                type: ["number", "string"],
                description: "Score value",
              },
              type: {
                type: "string",
                enum: [
                  "time",
                  "rounds",
                  "reps",
                  "weight",
                  "distance",
                  "points",
                ],
                description: "Type of score",
              },
              unit: {
                type: ["string", "null"],
                description: "Score unit if applicable",
              },
            },
          },
        },
      },
    },
  },
};
