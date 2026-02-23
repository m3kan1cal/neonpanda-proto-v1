/**
 * Hyrox Schema Plugin
 *
 * Discipline-specific schema for Hyrox workouts.
 * Hyrox is a fitness race consisting of 8 stations with 1km runs between each.
 * Stations: SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps, Rowing, Farmers Carry, Sandbag Lunges, Wall Balls.
 *
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const HYROX_SCHEMA_PLUGIN = {
  hyrox: {
    type: "object",
    required: ["race_or_training", "stations", "runs"],
    additionalProperties: false,
    properties: {
      race_or_training: {
        type: "string",
        enum: ["race", "simulation", "training", "partial"],
        description:
          "Workout type: race (official event), simulation (full course), training (specific elements), partial (subset)"
      },
      division: {
        type: ["string", "null"],
        enum: ["open", "pro", "doubles", "relay", null],
        description:
          "Hyrox division: open (standard), pro (heavier weights), doubles (pairs), relay (team)"
      },
      total_time: {
        type: ["number", "null"],
        description: "Total race/workout time in seconds"
      },
      stations: {
        type: "array",
        description:
          "Array of Hyrox stations completed (8 stations in full race)",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["station_number", "station_name"],
          properties: {
            station_number: {
              type: "number",
              description: "Station number in race order (1-8)"
            },
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
              description:
                "Official Hyrox station name (skierg, sled_push, sled_pull, burpee_broad_jumps, rowing, farmers_carry, sandbag_lunges, wall_balls)"
            },
            distance: {
              type: ["number", "null"],
              description:
                "Distance in meters (for SkiErg: 1000m, Rowing: 1000m, etc.)"
            },
            reps: {
              type: ["number", "null"],
              description:
                "Rep count (for Burpee Broad Jumps: 80m distance as reps, Wall Balls: 75-100 reps)"
            },
            weight: {
              type: ["number", "null"],
              description:
                "Weight used (sled weight, sandbag weight, wall ball weight)"
            },
            weight_unit: {
              type: ["string", "null"],
              enum: ["kg", "lbs", null],
              description: "Weight unit (kg standard for Hyrox)"
            },
            time: {
              type: ["number", "null"],
              description: "Time to complete this station in seconds"
            },
            notes: {
              type: ["string", "null"],
              description: "Station-specific notes (pacing, strategy, issues)"
            }
          }
        }
      },
      runs: {
        type: "array",
        description:
          "Array of 1km runs between stations (9 runs in full race: before station 1, between each station)",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["run_number", "distance"],
          properties: {
            run_number: {
              type: "number",
              description:
                "Run number (1-9): Run 1 is before Station 1, Run 9 is after Station 8"
            },
            distance: {
              type: "number",
              description: "Run distance in meters (typically 1000m)"
            },
            time: {
              type: ["number", "null"],
              description: "Run time in seconds"
            },
            pace: {
              type: ["string", "null"],
              description: "Pace per km in MM:SS format (e.g., '5:30')"
            },
            notes: {
              type: ["string", "null"],
              description: "Run-specific notes (pacing, terrain, fatigue)"
            }
          }
        }
      },
      performance_notes: {
        type: ["string", "null"],
        description:
          "Overall performance notes, strategy reflections, or race commentary"
      }
    }
  }
};
