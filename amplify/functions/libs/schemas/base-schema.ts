/**
 * Base Workout Schema - Common fields for ALL disciplines
 *
 * This schema contains fields that are universal across all workout types.
 * Discipline-specific fields are defined in separate plugin schemas.
 *
 * Related files:
 * - amplify/functions/libs/schemas/schema-composer.ts (Composes base + discipline plugin)
 * - amplify/functions/libs/schemas/disciplines/*.ts (Discipline plugins)
 */

export const BASE_WORKOUT_SCHEMA = {
  type: "object",
  required: ["date", "discipline", "workout_type", "metadata"],
  properties: {
    workout_id: {
      type: "string",
      pattern: "^workout_.*$",
      description:
        "Unique workout identifier following pattern: workout_{userId}_{timestamp}_{shortId}",
    },
    user_id: {
      type: "string",
      pattern: "^[a-zA-Z0-9_-]+$",
      description: "User identifier (raw user ID without prefix)",
    },
    date: {
      type: "string",
      pattern: "^\\d{4}-\\d{2}-\\d{2}$",
      description: "Workout date in YYYY-MM-DD format",
    },
    discipline: {
      type: "string",
      enum: [
        "crossfit",
        "powerlifting",
        "bodybuilding",
        "olympic_weightlifting",
        "functional_bodybuilding",
        "calisthenics",
        "hiit",
        "running",
        "swimming",
        "cycling",
        "yoga",
        "martial_arts",
        "climbing",
        "hyrox",
        "hybrid",
      ],
      description: "Primary training discipline for this workout",
    },
    methodology: {
      type: ["string", "null"],
      description:
        'Training methodology used (e.g., "Westside Barbell", "Conjugate Method")',
    },
    workout_name: {
      type: ["string", "null"],
      description:
        'Name or title of the workout (e.g., "Fran", "Deadlift Day")',
    },
    workout_type: {
      type: "string",
      enum: [
        "strength",
        "cardio",
        "flexibility",
        "skill",
        "competition",
        "recovery",
        "hybrid",
      ],
      description: "Primary type/focus of the workout",
    },
    duration: {
      type: ["number", "null"],
      description:
        "Total workout work time in seconds (e.g., for AMRAPs, this equals time_cap; for timed workouts, this is the actual work duration)",
    },
    session_duration: {
      type: ["number", "null"],
      description:
        "Total gym session time in seconds, including warm-up, workout, and cool-down (optional, only if user specifies total time spent)",
    },
    location: {
      type: "string",
      enum: ["gym", "box", "home", "outdoors", "online", "other"],
      description: "Where the workout took place",
    },
    coach_id: {
      type: ["string", "null"],
      description: "ID of the coach who programmed/guided this workout",
    },
    conversation_id: {
      type: ["string", "null"],
      description: "ID of the conversation where this workout was logged",
    },

    // Performance Metrics (common to all disciplines)
    performance_metrics: {
      type: "object",
      properties: {
        intensity: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Overall intensity rating (1-10 scale)",
        },
        perceived_exertion: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Rate of perceived exertion (1-10 scale)",
        },
        heart_rate: {
          type: "object",
          properties: {
            avg: {
              type: ["number", "null"],
              description: "Average heart rate in beats per minute",
            },
            max: {
              type: ["number", "null"],
              description: "Maximum heart rate in beats per minute",
            },
            zones: {
              type: "object",
              properties: {
                zone_1: {
                  type: ["number", "null"],
                  description: "Time in zone 1 (minutes)",
                },
                zone_2: {
                  type: ["number", "null"],
                  description: "Time in zone 2 (minutes)",
                },
                zone_3: {
                  type: ["number", "null"],
                  description: "Time in zone 3 (minutes)",
                },
                zone_4: {
                  type: ["number", "null"],
                  description: "Time in zone 4 (minutes)",
                },
                zone_5: {
                  type: ["number", "null"],
                  description: "Time in zone 5 (minutes)",
                },
              },
            },
          },
        },
        calories_burned: {
          type: ["number", "null"],
          description: "Estimated calories burned",
        },
        mood_pre: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Mood before workout (1-10 scale)",
        },
        mood_post: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Mood after workout (1-10 scale)",
        },
        energy_level_pre: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Energy level before workout (1-10 scale)",
        },
        energy_level_post: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Energy level after workout (1-10 scale)",
        },
      },
    },

    // PR Achievements (common to all disciplines)
    pr_achievements: {
      type: "array",
      items: {
        type: "object",
        required: [
          "exercise",
          "discipline",
          "pr_type",
          "new_best",
          "significance",
        ],
        properties: {
          exercise: {
            type: "string",
            description: "Exercise where PR was achieved",
          },
          discipline: {
            type: "string",
            description: "Discipline of the PR",
          },
          pr_type: {
            type: "string",
            enum: [
              "workout_time",
              "1rm",
              "volume_pr",
              "distance_pr",
              "pace_pr",
            ],
            description: "Type of PR",
          },
          previous_best: {
            type: ["number", "null"],
            description: "Previous best value",
          },
          new_best: {
            type: "number",
            description: "New best value",
          },
          improvement: {
            type: ["number", "null"],
            description: "Improvement amount",
          },
          improvement_percentage: {
            type: ["number", "null"],
            description: "Improvement percentage",
          },
          date_previous: {
            type: ["string", "null"],
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            description: "Date of previous PR (YYYY-MM-DD)",
          },
          significance: {
            type: "string",
            enum: ["minor", "moderate", "major"],
            description: "Significance of the PR",
          },
          context: {
            type: ["string", "null"],
            description: "Context or notes about the PR",
          },
          unit: {
            type: ["string", "null"],
            description:
              "Unit of measurement for the PR value (e.g., 'lbs', 'kg', 'mi', 'km', 'min', 'sec'). Infer from context: weight PRs use weight units, distance PRs use distance units, time PRs use 'min' or 'sec'.",
          },
        },
      },
    },

    // Subjective Feedback (common to all disciplines)
    subjective_feedback: {
      type: "object",
      properties: {
        enjoyment: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Enjoyment rating (1-10 scale)",
        },
        difficulty: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Difficulty rating (1-10 scale)",
        },
        energy_pre: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Energy level before workout (1-10 scale)",
        },
        energy_post: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Energy level after workout (1-10 scale)",
        },
        soreness: {
          type: "object",
          properties: {
            level: {
              type: ["number", "null"],
              minimum: 1,
              maximum: 10,
              description: "Soreness level (1-10 scale)",
            },
            location: {
              type: ["array", "null"],
              items: { type: "string" },
              description: "Body parts that are sore",
            },
          },
        },
        sleep_quality: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Sleep quality previous night (1-10 scale)",
        },
        sleep_hours: {
          type: ["number", "null"],
          description: "Hours of sleep previous night",
        },
        nutrition_pre: {
          type: ["string", "null"],
          description: "Pre-workout nutrition details",
        },
        nutrition_post: {
          type: ["string", "null"],
          description: "Post-workout nutrition details",
        },
        hydration: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Hydration level (1-10 scale)",
        },
        stress_level: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Stress level before workout (1-10 scale)",
        },
        notes: {
          type: ["string", "null"],
          description: "General workout notes or observations",
        },
        injuries: {
          type: ["array", "null"],
          items: {
            type: "object",
            properties: {
              body_part: {
                type: "string",
                description: "Injured body part",
              },
              severity: {
                type: "string",
                enum: ["minor", "moderate", "severe"],
                description: "Injury severity",
              },
              impact: {
                type: "string",
                description: "How injury impacted workout",
              },
            },
          },
          description: "Injuries affecting workout",
        },
        equipment_used: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Special equipment used (belts, straps, etc.)",
        },
        training_partners: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "People trained with",
        },
        music: {
          type: ["string", "null"],
          description: "Music or playlist used",
        },
        overall_feeling: {
          type: ["string", "null"],
          description: "Overall feeling about the workout",
        },
      },
    },

    // Environmental Factors (common to all disciplines)
    environmental_factors: {
      type: "object",
      properties: {
        temperature: {
          type: ["number", "null"],
          description: "Temperature (fahrenheit or celsius)",
        },
        humidity: {
          type: ["number", "null"],
          description: "Humidity percentage",
        },
        altitude: {
          type: ["number", "null"],
          description: "Altitude in feet or meters",
        },
        weather: {
          type: ["string", "null"],
          description: "Weather conditions",
        },
      },
    },

    // Recovery Metrics (common to all disciplines)
    recovery_metrics: {
      type: "object",
      properties: {
        hrv_morning: {
          type: ["number", "null"],
          description: "Morning heart rate variability",
        },
        resting_heart_rate: {
          type: ["number", "null"],
          description: "Resting heart rate (bpm)",
        },
        sleep_score: {
          type: ["number", "null"],
          description: "Sleep quality score",
        },
        recovery_score: {
          type: ["number", "null"],
          description: "Overall recovery score",
        },
      },
    },

    // Coach Notes (common to all disciplines)
    coach_notes: {
      type: "object",
      properties: {
        programming_intent: {
          type: ["string", "null"],
          description: "Intent behind the programming",
        },
        coaching_cues: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Coaching cues provided",
        },
        strengths_observed: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Strengths demonstrated",
        },
        areas_for_improvement: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Areas needing improvement",
        },
        next_session_focus: {
          type: ["string", "null"],
          description: "Focus for next session",
        },
      },
    },

    // Metadata (required for all workouts)
    metadata: {
      type: "object",
      required: [
        "logged_via",
        "data_confidence",
        "ai_extracted",
        "user_verified",
        "version",
        "schema_version",
        "extraction_method",
        "validation_flags",
      ],
      properties: {
        logged_via: {
          type: "string",
          enum: ["conversation", "app", "wearable", "manual", "slash_command"],
          description: "Method used to log workout",
        },
        logging_time: {
          type: ["number", "null"],
          description: "Time taken to log (seconds)",
        },
        data_confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Confidence in extracted data (0-1)",
        },
        ai_extracted: {
          type: "boolean",
          description: "Whether data was AI extracted",
        },
        user_verified: {
          type: "boolean",
          description: "Whether user verified the data",
        },
        version: {
          type: "string",
          description: "Data version identifier",
        },
        schema_version: {
          type: "string",
          description: 'Schema version (should be "2.0")',
        },
        data_completeness: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description: "Completeness of data (0-1)",
        },
        extraction_method: {
          type: "string",
          enum: ["claude_conversation_analysis", "manual_entry", "api_import"],
          description: "Method used for extraction",
        },
        validation_flags: {
          type: "array",
          items: { type: "string" },
          description: "Validation flags or warnings",
        },
        extraction_notes: {
          type: ["string", "null"],
          description: "Notes about the extraction process",
        },
        generation_method: {
          type: "string",
          enum: ["tool", "fallback"],
          description:
            "Method used to generate workout data (tool-based or fallback prompt-based)",
        },
        generation_timestamp: {
          type: "string",
          format: "date-time",
          description: "Timestamp when workout data was generated",
        },
      },
    },
  },
};

/**
 * Schema version information
 */
export const BASE_SCHEMA_VERSION = "2.0";
