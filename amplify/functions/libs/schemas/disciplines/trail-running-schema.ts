/**
 * Trail Running Schema Plugin
 *
 * Discipline-specific schema for trail_running workouts (trail surface,
 * vert, technical terrain, trail ultras). Distinct from `running`, which is
 * narrowed to road/track.
 */

export const TRAIL_RUNNING_SCHEMA_PLUGIN = {
  trail_running: {
    type: "object",
    additionalProperties: false,
    required: [
      "run_type",
      "total_distance",
      "distance_unit",
      "total_time",
      "surface",
    ],
    properties: {
      run_type: {
        type: "string",
        enum: [
          "easy",
          "tempo",
          "interval",
          "long",
          "race",
          "recovery",
          "fartlek",
          "hill_repeats",
          "vert_repeats",
          "fkt_attempt",
          "ultra",
          "training",
        ],
        description: "Type of trail run",
      },
      total_distance: {
        type: "number",
        description: "Total distance covered",
      },
      distance_unit: {
        type: "string",
        enum: ["miles", "km"],
        description: "Unit of distance",
      },
      total_time: {
        type: "number",
        description: "Total elapsed time in seconds",
      },
      average_pace: {
        type: ["string", "null"],
        description: "Average pace in MM:SS format per mile or km",
      },
      elevation_gain: {
        type: ["number", "null"],
        description: "Elevation gain (ft or m)",
      },
      elevation_loss: {
        type: ["number", "null"],
        description: "Elevation loss (ft or m)",
      },
      elevation_unit: {
        type: ["string", "null"],
        enum: ["ft", "m", null],
        description: "Unit for elevation values",
      },
      surface: {
        type: "string",
        enum: [
          "trail",
          "technical_trail",
          "fire_road",
          "mixed",
          "mountain",
          "scree",
        ],
        description: "Trail surface type",
      },
      technicality: {
        type: ["string", "null"],
        enum: ["low", "moderate", "high", "very_high", null],
        description: "Technical difficulty of the terrain",
      },
      is_ultra: {
        type: ["boolean", "null"],
        description:
          "True if this is an ultra-distance effort (typically >= 50km / 50mi)",
      },
      race_name: {
        type: ["string", "null"],
        description: "Race or event name, if applicable",
      },
      vertical_meters_per_km: {
        type: ["number", "null"],
        description:
          "Average vertical meters per kilometer (useful vert intensity metric)",
      },
      segments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["segment_number", "segment_type"],
          properties: {
            segment_number: {
              type: "number",
              description: "Segment number",
            },
            segment_type: {
              type: "string",
              enum: [
                "warmup",
                "working",
                "climb",
                "descent",
                "flat",
                "recovery",
                "cooldown",
                "aid_station",
              ],
              description: "Type of segment",
            },
            distance: {
              type: ["number", "null"],
              description: "Segment distance",
            },
            time: {
              type: ["number", "null"],
              description: "Segment time in seconds",
            },
            pace: {
              type: ["string", "null"],
              description: "Segment pace in MM:SS format",
            },
            elevation_gain: {
              type: ["number", "null"],
              description: "Elevation gain for segment",
            },
            elevation_loss: {
              type: ["number", "null"],
              description: "Elevation loss for segment",
            },
            surface: {
              type: ["string", "null"],
              description: "Segment surface",
            },
            effort_level: {
              type: ["string", "null"],
              enum: ["easy", "moderate", "hard", "max", null],
              description: "Effort level for segment",
            },
            notes: {
              type: ["string", "null"],
              description: "Segment notes",
            },
          },
        },
      },
      fueling: {
        type: "object",
        additionalProperties: false,
        required: [],
        properties: {
          pre_run: {
            type: ["string", "null"],
            description: "Pre-run nutrition",
          },
          during_run: {
            type: ["array", "null"],
            items: { type: "string" },
            description: "During-run fueling items",
          },
          hydration_oz: {
            type: ["number", "null"],
            description: "Hydration carried/consumed (ounces)",
          },
          aid_stations: {
            type: ["number", "null"],
            description: "Number of aid stations used",
          },
        },
      },
      weather: {
        type: "object",
        additionalProperties: false,
        required: [],
        properties: {
          temperature: {
            type: ["number", "null"],
            description: "Temperature",
          },
          temperature_unit: {
            type: ["string", "null"],
            enum: ["F", "C", null],
            description: "Temperature unit",
          },
          conditions: {
            type: ["string", "null"],
            description: "Conditions (e.g. sunny, rainy, snowy, windy)",
          },
        },
      },
      equipment: {
        type: "object",
        additionalProperties: false,
        required: [],
        properties: {
          shoes: {
            type: ["string", "null"],
            description: "Shoes used",
          },
          pack: {
            type: ["string", "null"],
            description: "Running vest or pack used",
          },
          poles: {
            type: ["boolean", "null"],
            description: "Whether trekking/running poles were used",
          },
          wearable: {
            type: ["string", "null"],
            description: "Wearable device used",
          },
        },
      },
      notes: {
        type: ["string", "null"],
        description: "Free-form notes about the run",
      },
    },
  },
};
