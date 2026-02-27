/**
 * Circuit Training Schema Plugin
 *
 * Discipline-specific schema for Circuit Training workouts.
 * Covers F45, Orange Theory, Barry's Bootcamp, HIIT circuits, boot camps,
 * and community circuit classes.
 *
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const CIRCUIT_TRAINING_SCHEMA_PLUGIN = {
  circuit_training: {
    type: "object",
    required: ["circuit_format", "stations"],
    additionalProperties: false,
    properties: {
      circuit_format: {
        type: "string",
        enum: ["stations", "amrap", "emom", "tabata", "rounds", "custom"],
        description:
          "Circuit structure type: stations (rotate through), amrap, emom, tabata (20s/10s), rounds, or custom",
      },
      session_focus: {
        type: ["string", "null"],
        enum: ["cardio", "strength", "hybrid", "endurance", "power", null],
        description:
          "Primary focus of the circuit session (cardio-heavy, strength-focused, or hybrid)",
      },
      total_rounds: {
        type: ["number", "null"],
        description: "Number of times through the full circuit",
      },
      work_interval: {
        type: ["number", "null"],
        description:
          "Default work time per station in seconds (e.g., 30 for 30s work)",
      },
      rest_interval: {
        type: ["number", "null"],
        description:
          "Default rest time between stations in seconds (e.g., 15 for 15s rest)",
      },
      stations: {
        type: "array",
        description: "Array of stations in the circuit, in order",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["station_number", "exercise_name"],
          properties: {
            station_number: {
              type: "number",
              description: "Station position in the circuit (1, 2, 3...)",
            },
            station_name: {
              type: ["string", "null"],
              description:
                "Optional station label (e.g., 'cardio station', 'strength station')",
            },
            exercise_name: {
              type: "string",
              description: "Name of exercise performed at this station",
            },
            work_time: {
              type: ["number", "null"],
              description:
                "Work time for this station in seconds (overrides global work_interval)",
            },
            rest_time: {
              type: ["number", "null"],
              description:
                "Rest time after this station in seconds (overrides global rest_interval)",
            },
            reps: {
              type: ["number", "null"],
              description:
                "Rep count if station is rep-based instead of time-based",
            },
            weight: {
              type: ["number", "null"],
              description: "Weight used at this station",
            },
            weight_unit: {
              type: "string",
              enum: ["lbs", "kg"],
              description: "Weight unit (lbs or kg)",
            },
            equipment: {
              type: ["string", "null"],
              description:
                "Equipment used (kettlebell, dumbbell, barbell, bands, box, etc.)",
            },
            notes: {
              type: ["string", "null"],
              description: "Additional notes for this station",
            },
          },
        },
      },
      performance_data: {
        type: ["object", "null"],
        additionalProperties: false,
        required: [], // all performance fields are optional
        description: "Overall circuit performance metrics",
        properties: {
          total_time: {
            type: ["number", "null"],
            description: "Total workout duration in seconds",
          },
          rounds_completed: {
            type: ["number", "null"],
            description: "Number of complete rounds finished",
          },
          total_work_time: {
            type: ["number", "null"],
            description: "Accumulated work time in seconds (excluding rest)",
          },
        },
      },
      class_name: {
        type: ["string", "null"],
        description:
          "Specific class name if applicable (e.g., 'F45 Hollywood', 'Orange Theory 2G')",
      },
      class_style: {
        type: ["string", "null"],
        enum: [
          "f45",
          "orange_theory",
          "barrys",
          "community_class",
          "custom",
          null,
        ],
        description:
          "Branded class type: f45, orange_theory, barrys, community_class, or custom",
      },
    },
  },
};
