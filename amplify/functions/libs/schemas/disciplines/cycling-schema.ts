/**
 * Cycling Schema Plugin
 *
 * Discipline-specific schema for Cycling workouts.
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const CYCLING_SCHEMA_PLUGIN = {
  cycling: {
    type: "object",
    additionalProperties: false,
    required: [
      "ride_type",
      "total_distance",
      "distance_unit",
      "total_time",
      "average_speed",
      "surface",
    ],
    properties: {
      ride_type: {
        type: "string",
        enum: [
          "road",
          "mountain",
          "gravel",
          "track",
          "criterium",
          "time_trial",
          "gran_fondo",
          "endurance",
          "tempo",
          "interval",
          "recovery",
          "race",
          "group_ride",
          "virtual",
          "indoor_trainer",
        ],
        description: "Type of cycling ride",
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
      average_speed: {
        type: "string",
        description: "Average speed (e.g., '18.5 mph' or '29.8 km/h')",
      },
      surface: {
        type: "string",
        enum: ["road", "gravel", "dirt", "cobblestone", "track", "indoor", "mixed"],
        description: "Riding surface",
      },
      average_power: {
        type: ["number", "null"],
        description: "Average power output in watts",
      },
      normalized_power: {
        type: ["number", "null"],
        description: "Normalized power (NP) in watts — weighted average accounting for variability",
      },
      max_power: {
        type: ["number", "null"],
        description: "Maximum power output in watts",
      },
      ftp: {
        type: ["number", "null"],
        description: "Functional Threshold Power in watts — athlete's 1-hour maximal power baseline",
      },
      intensity_factor: {
        type: ["number", "null"],
        description: "Intensity Factor (IF) — NP divided by FTP (e.g., 0.75 for endurance, 1.0+ for threshold)",
      },
      training_stress_score: {
        type: ["number", "null"],
        description: "Training Stress Score (TSS) — quantified training load accounting for intensity and duration",
      },
      average_cadence: {
        type: ["number", "null"],
        description: "Average pedaling cadence in revolutions per minute (rpm)",
      },
      average_heart_rate: {
        type: ["number", "null"],
        description: "Average heart rate in bpm",
      },
      max_heart_rate: {
        type: ["number", "null"],
        description: "Maximum heart rate in bpm",
      },
      elevation_gain: {
        type: ["number", "null"],
        description: "Elevation gain in feet or meters",
      },
      elevation_loss: {
        type: ["number", "null"],
        description: "Elevation loss in feet or meters",
      },
      power_zones_distribution: {
        type: ["object", "null"],
        additionalProperties: false,
        description: "Time spent in each Coggan power zone (seconds)",
        properties: {
          zone1: {
            type: ["number", "null"],
            description: "Zone 1 (Active Recovery, <55% FTP) time in seconds",
          },
          zone2: {
            type: ["number", "null"],
            description: "Zone 2 (Endurance, 56-75% FTP) time in seconds",
          },
          zone3: {
            type: ["number", "null"],
            description: "Zone 3 (Tempo, 76-90% FTP) time in seconds",
          },
          zone4: {
            type: ["number", "null"],
            description: "Zone 4 (Threshold/FTP, 91-105% FTP) time in seconds",
          },
          zone5: {
            type: ["number", "null"],
            description: "Zone 5 (VO2max, 106-120% FTP) time in seconds",
          },
          zone6: {
            type: ["number", "null"],
            description: "Zone 6 (Anaerobic Capacity, 121-150% FTP) time in seconds",
          },
          zone7: {
            type: ["number", "null"],
            description: "Zone 7 (Neuromuscular Power, >150% FTP) time in seconds",
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
        required: [],
        properties: {
          bike_type: {
            type: ["string", "null"],
            enum: ["road", "mountain", "gravel", "tt", "track", "bmx", "ebike", null],
            description: "Type of bicycle",
          },
          bike_model: {
            type: ["string", "null"],
            description: "Bicycle make and model",
          },
          power_meter: {
            type: ["string", "null"],
            description: "Power meter brand/model (e.g., Wahoo Powrlink, Garmin Rally)",
          },
          indoor_trainer: {
            type: ["string", "null"],
            description: "Indoor trainer brand/model (e.g., Wahoo KICKR, Tacx Neo)",
          },
          wearable: {
            type: ["string", "null"],
            description: "Wearable device used (e.g., Garmin, Wahoo ELEMNT)",
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
        required: [],
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
        required: [],
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
            "average_speed",
            "effort_level",
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
                "climb",
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
            average_speed: {
              type: "string",
              description: "Segment average speed (e.g., '22.5 mph')",
            },
            average_power: {
              type: ["number", "null"],
              description: "Average power for segment (watts)",
            },
            normalized_power: {
              type: ["number", "null"],
              description: "Normalized power for segment (watts)",
            },
            cadence: {
              type: ["number", "null"],
              description: "Average cadence for segment (rpm)",
            },
            heart_rate_avg: {
              type: ["number", "null"],
              description: "Average heart rate for segment (bpm)",
            },
            heart_rate_max: {
              type: ["number", "null"],
              description: "Maximum heart rate for segment (bpm)",
            },
            elevation_change: {
              type: ["number", "null"],
              description: "Elevation change (feet or meters)",
            },
            grade_percent: {
              type: ["number", "null"],
              description: "Average gradient percentage (e.g., 6.5 for 6.5% climb)",
            },
            effort_level: {
              type: "string",
              enum: ["easy", "moderate", "hard", "max"],
              description: "Effort level",
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
        required: [],
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
          strava_segment_id: {
            type: ["string", "null"],
            description: "Strava segment ID if applicable",
          },
        },
      },
      fueling: {
        type: "object",
        additionalProperties: false,
        required: [],
        properties: {
          pre_ride: {
            type: ["string", "null"],
            description: "Pre-ride nutrition",
          },
          during_ride: {
            type: ["array", "null"],
            items: { type: "string" },
            description: "During-ride nutrition (gels, bars, bottles, etc.)",
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
