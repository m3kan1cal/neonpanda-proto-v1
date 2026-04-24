/**
 * Rucking Schema Plugin
 *
 * Discipline-specific schema for rucking workouts (structured loaded-march
 * training). Pace / distance / load is the main story. For trail + vert +
 * backcountry context, use `backpacking` instead.
 */

export const RUCKING_SCHEMA_PLUGIN = {
  rucking: {
    type: "object",
    additionalProperties: false,
    required: [
      "ruck_type",
      "total_distance",
      "distance_unit",
      "total_time",
      "pack_weight",
      "pack_weight_unit",
    ],
    properties: {
      ruck_type: {
        type: "string",
        enum: [
          "endurance",
          "speed",
          "interval",
          "event",
          "recovery",
          "training",
          "test",
        ],
        description: "Type of ruck session",
      },
      event_name: {
        type: ["string", "null"],
        description:
          "Event name if applicable (e.g. GORUCK event, selection test)",
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
        description: "Total time in seconds",
      },
      average_pace: {
        type: ["string", "null"],
        description: "Average pace in MM:SS format per mile or km",
      },
      pack_weight: {
        type: "number",
        description: "Pack / ruck weight carried",
      },
      pack_weight_unit: {
        type: "string",
        enum: ["lbs", "kg"],
        description: "Unit for pack weight",
      },
      cadence: {
        type: ["number", "null"],
        description: "Cadence in steps per minute",
      },
      elevation_gain: {
        type: ["number", "null"],
        description: "Elevation gain (ft or m)",
      },
      elevation_unit: {
        type: ["string", "null"],
        enum: ["ft", "m", null],
        description: "Unit for elevation values",
      },
      surface: {
        type: ["string", "null"],
        enum: ["road", "trail", "track", "treadmill", "mixed", null],
        description: "Surface the ruck was performed on",
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
                "interval",
                "recovery",
                "cooldown",
                "hill",
              ],
              description: "Type of segment",
            },
            distance: {
              type: ["number", "null"],
              description: "Segment distance",
            },
            duration_min: {
              type: ["number", "null"],
              description: "Segment duration in minutes",
            },
            pace: {
              type: ["string", "null"],
              description: "Segment pace in MM:SS format",
            },
            pack_weight_lb: {
              type: ["number", "null"],
              description: "Pack weight for segment (lb)",
            },
            cadence: {
              type: ["number", "null"],
              description: "Segment cadence (steps per minute)",
            },
            notes: {
              type: ["string", "null"],
              description: "Segment notes",
            },
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
            description: "Pack used (e.g. GR1, Rucker 4.0)",
          },
          footwear: {
            type: ["string", "null"],
            description: "Footwear used",
          },
          plate_weight: {
            type: ["string", "null"],
            description:
              "Plate configuration (e.g. '30 lb steel', '20 lb + sand')",
          },
        },
      },
      notes: {
        type: ["string", "null"],
        description: "Free-form notes about the ruck",
      },
    },
  },
};
