/**
 * Hyrox Schema Plugin
 *
 * Discipline-specific schema for Hyrox workouts.
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const HYROX_SCHEMA_PLUGIN = {
  hyrox: {
    type: "object",
    required: ["race_or_training", "stations", "runs"],
    properties: {
      race_or_training: {
        type: "string",
        enum: ["race", "simulation", "training", "partial"],
      },
      division: {
        type: ["string", "null"],
        enum: ["open", "pro", "doubles", "relay", null],
      },
      total_time: { type: ["number", "null"] },
      stations: {
        type: "array",
        items: {
          type: "object",
          required: ["station_number", "station_name"],
          properties: {
            station_number: { type: "number", minimum: 1, maximum: 8 },
            station_name: {
              type: "string",
              enum: [
                "skierg",
                "sled_push",
                "sled_pull",
                "burpee_broad_jumps",
                "rowing",
                "farmers_carry",
                "sandbag_lunges",
                "wall_balls",
              ],
            },
            distance: { type: ["number", "null"] },
            reps: { type: ["number", "null"] },
            weight: { type: ["number", "null"] },
            weight_unit: {
              type: ["string", "null"],
              enum: ["kg", "lbs", null],
            },
            time: { type: ["number", "null"] },
            notes: { type: ["string", "null"] },
          },
        },
      },
      runs: {
        type: "array",
        items: {
          type: "object",
          required: ["run_number", "distance"],
          properties: {
            run_number: { type: "number", minimum: 1, maximum: 9 },
            distance: { type: "number" },
            time: { type: ["number", "null"] },
            pace: {
              type: ["string", "null"],
              pattern: "^\\d{1,2}:\\d{2}$",
            },
            notes: { type: ["string", "null"] },
          },
        },
      },
      performance_notes: { type: ["string", "null"] },
    },
  },
};
