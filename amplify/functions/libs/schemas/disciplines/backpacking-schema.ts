/**
 * Backpacking Schema Plugin
 *
 * Discipline-specific schema for backpacking workouts (trail + pack context,
 * including long single days, multi-day trips, and mountaineering prep).
 */

export const BACKPACKING_SCHEMA_PLUGIN = {
  backpacking: {
    type: "object",
    additionalProperties: false,
    required: ["total_distance", "distance_unit"],
    properties: {
      trip_name: {
        type: ["string", "null"],
        description: "Trip or route name (e.g. 'Uintas loop', 'JMT Day 2')",
      },
      trip_day: {
        type: ["number", "null"],
        description: "Which day of the trip this represents",
      },
      total_trip_days: {
        type: ["number", "null"],
        description: "Total number of days in the trip",
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
        type: ["number", "null"],
        description: "Total elapsed time in seconds (car-to-car)",
      },
      moving_time: {
        type: ["number", "null"],
        description:
          "Moving time in seconds (excludes breaks, camp, rest stops)",
      },
      pack_weight: {
        type: ["number", "null"],
        description: "Pack weight carried",
      },
      pack_weight_unit: {
        type: ["string", "null"],
        enum: ["lbs", "kg", null],
        description: "Unit for pack weight",
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
        type: ["string", "null"],
        enum: [
          "trail",
          "technical_trail",
          "off_trail",
          "scree",
          "snow",
          "mixed",
          null,
        ],
        description: "Primary surface type",
      },
      terrain_notes: {
        type: ["string", "null"],
        description: "Notes about terrain (e.g. 'class 3 scrambling on ridge')",
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
                "approach",
                "climb",
                "descent",
                "flat",
                "rest",
                "camp",
                "summit",
                "other",
              ],
              description: "Type of segment in the trip flow",
            },
            distance: {
              type: ["number", "null"],
              description: "Segment distance",
            },
            duration_min: {
              type: ["number", "null"],
              description: "Segment duration in minutes",
            },
            elevation_gain_ft: {
              type: ["number", "null"],
              description: "Elevation gain for segment (ft)",
            },
            elevation_loss_ft: {
              type: ["number", "null"],
              description: "Elevation loss for segment (ft)",
            },
            pack_weight_lb: {
              type: ["number", "null"],
              description: "Pack weight for segment (lb)",
            },
            surface: {
              type: ["string", "null"],
              description: "Segment surface",
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
          calories: {
            type: ["number", "null"],
            description: "Calories consumed",
          },
          hydration_oz: {
            type: ["number", "null"],
            description: "Hydration (ounces)",
          },
          notes: {
            type: ["string", "null"],
            description: "Fueling notes",
          },
        },
      },
      equipment: {
        type: "object",
        additionalProperties: false,
        required: [],
        properties: {
          pack: {
            type: ["string", "null"],
            description: "Backpack used",
          },
          footwear: {
            type: ["string", "null"],
            description: "Footwear used",
          },
          poles: {
            type: ["boolean", "null"],
            description: "Whether trekking poles were used",
          },
          other_gear: {
            type: ["array", "null"],
            items: { type: "string" },
            description: "Other gear carried",
          },
        },
      },
      notes: {
        type: ["string", "null"],
        description: "Free-form notes about the day/trip",
      },
    },
  },
};
