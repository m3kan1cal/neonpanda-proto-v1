/**
 * Running Schema Plugin
 *
 * Discipline-specific schema for Running workouts.
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const RUNNING_SCHEMA_PLUGIN = {
  running: {
    type: "object",
    additionalProperties: false,
    required: [
      "run_type",
      "total_distance",
      "distance_unit",
      "total_time",
      "average_pace",
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
          "progression",
          "threshold",
          "hill_repeats",
          "speed_work",
        ],
        description: "Type of run",
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
        type: "string",
        description: "Average pace in MM:SS format per mile or km",
      },
      elevation_gain: {
        type: ["number", "null"],
        description: "Elevation gain in feet or meters",
      },
      elevation_loss: {
        type: ["number", "null"],
        description: "Elevation loss in feet or meters",
      },
      surface: {
        type: "string",
        enum: ["road", "trail", "track", "treadmill", "mixed"],
        description: "Running surface",
      },
      weather: {
        type: "object",
        additionalProperties: false,
        required: [], // all weather fields are optional
        properties: {
          temperature: {
            type: ["number", "null"],
            description: "Temperature (fahrenheit or celsius)",
          },
          temperature_unit: {
            type: ["string", "null"],
            enum: ["F", "C", null],
            description: "Temperature unit",
          },
          conditions: {
            type: ["string", "null"],
            enum: [
              "sunny",
              "cloudy",
              "rainy",
              "snowy",
              "windy",
              "foggy",
              "clear",
              null,
            ],
            description: "Weather conditions",
          },
          wind_speed: {
            type: ["number", "null"],
            description: "Wind speed (mph or km/h)",
          },
          humidity: {
            type: ["number", "null"],
            description: "Humidity percentage",
          },
        },
      },
      equipment: {
        type: "object",
        additionalProperties: false,
        required: [], // all equipment fields are optional
        properties: {
          shoes: {
            type: ["string", "null"],
            description: "Running shoes used",
          },
          wearable: {
            type: ["string", "null"],
            description: "Wearable device used",
          },
          other_gear: {
            type: ["array", "null"],
            items: { type: "string" },
            description: "Other gear used",
          },
        },
      },
      warmup: {
        type: "object",
        additionalProperties: false,
        required: [], // all warmup fields are optional
        properties: {
          distance: {
            type: ["number", "null"],
            description: "Warmup distance",
          },
          time: {
            type: ["number", "null"],
            description: "Warmup time (seconds)",
          },
          description: {
            type: ["string", "null"],
            description: "Warmup description",
          },
        },
      },
      cooldown: {
        type: "object",
        additionalProperties: false,
        required: [], // all cooldown fields are optional
        properties: {
          distance: {
            type: ["number", "null"],
            description: "Cooldown distance",
          },
          time: {
            type: ["number", "null"],
            description: "Cooldown time (seconds)",
          },
          description: {
            type: ["string", "null"],
            description: "Cooldown description",
          },
        },
      },
      segments: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "segment_number",
            "segment_type",
            "distance",
            "time",
            "pace",
            "effort_level",
            "terrain",
          ],
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
                "main",
              ],
              description: "Type of segment",
            },
            distance: {
              type: "number",
              description: "Segment distance",
            },
            time: {
              type: "number",
              description: "Segment time (seconds)",
            },
            pace: {
              type: "string",
              description: "Segment pace in MM:SS format",
            },
            heart_rate_avg: {
              type: ["number", "null"],
              description: "Average heart rate for segment",
            },
            heart_rate_max: {
              type: ["number", "null"],
              description: "Maximum heart rate for segment",
            },
            cadence: {
              type: ["number", "null"],
              description: "Cadence (steps per minute)",
            },
            effort_level: {
              type: "string",
              enum: ["easy", "moderate", "hard", "max"],
              description: "Effort level",
            },
            terrain: {
              type: "string",
              enum: ["flat", "uphill", "downhill", "mixed"],
              description: "Terrain type",
            },
            elevation_change: {
              type: ["number", "null"],
              description: "Elevation change (feet or meters)",
            },
            notes: {
              type: ["string", "null"],
              description: "Segment notes",
            },
          },
        },
      },
      route: {
        type: "object",
        additionalProperties: false,
        required: [], // all route fields are optional
        properties: {
          name: {
            type: ["string", "null"],
            description: "Route name",
          },
          description: {
            type: ["string", "null"],
            description: "Route description",
          },
          type: {
            type: ["string", "null"],
            enum: ["out_and_back", "loop", "point_to_point", null],
            description: "Route type",
          },
        },
      },
      fueling: {
        type: "object",
        additionalProperties: false,
        required: [], // all fueling fields are optional
        properties: {
          pre_run: {
            type: ["string", "null"],
            description: "Pre-run nutrition",
          },
          during_run: {
            type: ["array", "null"],
            items: { type: "string" },
            description: "During-run nutrition",
          },
          hydration_oz: {
            type: ["number", "null"],
            description: "Hydration (ounces)",
          },
        },
      },
    },
  },
};
