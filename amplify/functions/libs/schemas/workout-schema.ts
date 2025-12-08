/**
 * Universal Workout Schema v2.0 - JSON Schema Definition
 *
 * This module contains the complete Universal Workout Schema structure that can be
 * used for both AI-powered extraction via Bedrock toolConfig and validation.
 *
 * Related files:
 * - amplify/functions/libs/workout/types.ts (TypeScript interfaces)
 * - amplify/functions/build-workout/handler.ts (Workout extraction handler)
 * - amplify/functions/libs/workout/extraction.ts (Extraction logic)
 */

// Re-export types from workout module for convenience
export type {
  UniversalWorkoutSchema,
  PerformanceMetrics,
  DisciplineSpecific,
  CrossFitWorkout,
  PowerliftingWorkout,
  RunningWorkout,
  BodybuildingWorkout,
  PRAchievement,
  SubjectiveFeedback,
  EnvironmentalFactors,
  RecoveryMetrics,
  CoachNotes,
  WorkoutMetadata,
} from "../workout/types";

/**
 * JSON Schema for Universal Workout Schema v2.0
 * Used for both Bedrock tool-based extraction AND validation
 */
export const WORKOUT_SCHEMA = {
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
        "hiit",
        "running",
        "swimming",
        "cycling",
        "yoga",
        "martial_arts",
        "climbing",
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

    // Performance Metrics
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

    // Discipline-Specific Data
    discipline_specific: {
      type: "object",
      properties: {
        // CrossFit
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
                              description:
                                "Rest time between broken sets (seconds)",
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
                          description:
                            "Notes on form, technique, or performance",
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

        // Powerlifting
        powerlifting: {
          type: "object",
          required: ["session_type", "competition_prep", "exercises"],
          properties: {
            session_type: {
              type: "string",
              enum: [
                "max_effort",
                "dynamic_effort",
                "repetition_method",
                "competition_prep",
              ],
              description: "Type of powerlifting session",
            },
            competition_prep: {
              type: "boolean",
              description: "Whether this is competition preparation",
            },
            exercises: {
              type: "array",
              items: {
                type: "object",
                required: ["exercise_name", "movement_category", "sets"],
                properties: {
                  exercise_name: {
                    type: "string",
                    description: "Name of the lift",
                  },
                  movement_category: {
                    type: "string",
                    enum: ["main_lift", "accessory", "mobility"],
                    description: "Category of movement",
                  },
                  equipment: {
                    type: "array",
                    items: { type: "string" },
                    description: "Equipment used (belt, sleeves, wraps, etc.)",
                  },
                  competition_commands: {
                    type: "boolean",
                    description: "Whether competition commands were used",
                  },
                  attempts: {
                    type: "object",
                    properties: {
                      opener: {
                        type: ["number", "null"],
                        description: "Opening attempt weight",
                      },
                      second_attempt: {
                        type: ["number", "null"],
                        description: "Second attempt weight",
                      },
                      third_attempt: {
                        type: ["number", "null"],
                        description: "Third attempt weight",
                      },
                      successful_attempts: {
                        type: "array",
                        items: { type: "number" },
                        description: "Successful attempt weights",
                      },
                      missed_attempts: {
                        type: "array",
                        items: { type: "number" },
                        description: "Missed attempt weights",
                      },
                      miss_reasons: {
                        type: "array",
                        items: { type: "string" },
                        description: "Reasons for missed attempts",
                      },
                    },
                  },
                  sets: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["set_type", "weight", "reps"],
                      properties: {
                        set_type: {
                          type: "string",
                          enum: [
                            "opener",
                            "second",
                            "third",
                            "warmup",
                            "working",
                            "accessory",
                          ],
                          description: "Type of set",
                        },
                        weight: {
                          type: "number",
                          description: "Weight used",
                        },
                        reps: {
                          type: "number",
                          description: "Reps performed",
                        },
                        rpe: {
                          type: ["number", "null"],
                          minimum: 1,
                          maximum: 10,
                          description: "Rate of perceived exertion (1-10)",
                        },
                        rest_time: {
                          type: ["number", "null"],
                          description: "Rest time after set (seconds)",
                        },
                        percentage_1rm: {
                          type: ["number", "null"],
                          description: "Percentage of 1RM",
                        },
                        bar_speed: {
                          type: ["string", "null"],
                          enum: ["slow", "moderate", "fast", "explosive", null],
                          description: "Bar speed",
                        },
                        competition_commands: {
                          type: "boolean",
                          description: "Competition commands used",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },

        // Bodybuilding (placeholder for future implementation)
        bodybuilding: {
          type: "object",
          description: "Bodybuilding-specific data (to be implemented)",
        },

        // HIIT (placeholder for future implementation)
        hiit: {
          type: "object",
          description: "HIIT-specific data (to be implemented)",
        },

        // Running
        running: {
          type: "object",
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
              pattern: "^\\d{1,2}:\\d{2}$",
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
                    pattern: "^\\d{1,2}:\\d{2}$",
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
      },
    },

    // PR Achievements
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
        },
      },
    },

    // Subjective Feedback
    subjective_feedback: {
      type: "object",
      properties: {
        enjoyment: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Enjoyment level (1-10)",
        },
        difficulty: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Difficulty level (1-10)",
        },
        form_quality: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Form quality (1-10)",
        },
        motivation: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Motivation level (1-10)",
        },
        confidence: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Confidence level (1-10)",
        },
        mental_state: {
          type: ["string", "null"],
          enum: [
            "focused",
            "distracted",
            "motivated",
            "tired",
            "energetic",
            "stressed",
            "calm",
            null,
          ],
          description: "Mental state during workout",
        },
        pacing_strategy: {
          type: ["string", "null"],
          enum: [
            "even_split",
            "negative_split",
            "positive_split",
            "went_out_too_fast",
            "conservative",
            null,
          ],
          description: "Pacing strategy used",
        },
        nutrition_pre_workout: {
          type: ["string", "null"],
          description: "Pre-workout nutrition",
        },
        hydration_level: {
          type: ["string", "null"],
          enum: ["poor", "fair", "good", "excellent", null],
          description: "Hydration level",
        },
        sleep_quality_previous: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Sleep quality previous night (1-10)",
        },
        stress_level: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Stress level (1-10)",
        },
        soreness_pre: {
          type: "object",
          properties: {
            overall: {
              type: ["number", "null"],
              minimum: 1,
              maximum: 10,
              description: "Overall soreness before workout (1-10)",
            },
            legs: {
              type: ["number", "null"],
              minimum: 1,
              maximum: 10,
              description: "Leg soreness before workout (1-10)",
            },
            arms: {
              type: ["number", "null"],
              minimum: 1,
              maximum: 10,
              description: "Arm soreness before workout (1-10)",
            },
            back: {
              type: ["number", "null"],
              minimum: 1,
              maximum: 10,
              description: "Back soreness before workout (1-10)",
            },
          },
        },
        soreness_post: {
          type: "object",
          properties: {
            overall: {
              type: ["number", "null"],
              minimum: 1,
              maximum: 10,
              description: "Overall soreness after workout (1-10)",
            },
            legs: {
              type: ["number", "null"],
              minimum: 1,
              maximum: 10,
              description: "Leg soreness after workout (1-10)",
            },
            arms: {
              type: ["number", "null"],
              minimum: 1,
              maximum: 10,
              description: "Arm soreness after workout (1-10)",
            },
            back: {
              type: ["number", "null"],
              minimum: 1,
              maximum: 10,
              description: "Back soreness after workout (1-10)",
            },
          },
        },
        notes: {
          type: ["string", "null"],
          description: "Additional notes about the workout",
        },
      },
    },

    // Environmental Factors
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
          description: "Altitude (feet or meters)",
        },
        equipment_condition: {
          type: ["string", "null"],
          enum: ["poor", "fair", "good", "excellent", null],
          description: "Condition of equipment",
        },
        gym_crowding: {
          type: ["string", "null"],
          enum: ["empty", "light", "moderate", "busy", "packed", null],
          description: "Gym crowding level",
        },
      },
    },

    // Recovery Metrics
    recovery_metrics: {
      type: "object",
      properties: {
        hrv_morning: {
          type: ["number", "null"],
          description: "Morning heart rate variability",
        },
        resting_heart_rate: {
          type: ["number", "null"],
          description: "Resting heart rate",
        },
        sleep_hours: {
          type: ["number", "null"],
          description: "Hours of sleep previous night",
        },
        stress_level: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Overall stress level (1-10)",
        },
        readiness_score: {
          type: ["number", "null"],
          minimum: 1,
          maximum: 10,
          description: "Readiness score (1-10)",
        },
      },
    },

    // Coach Notes
    coach_notes: {
      type: "object",
      properties: {
        programming_intent: {
          type: ["string", "null"],
          description: "Intent behind the programming",
        },
        coaching_cues_given: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Coaching cues provided",
        },
        areas_for_improvement: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Areas identified for improvement",
        },
        positive_observations: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Positive observations",
        },
        next_session_focus: {
          type: ["string", "null"],
          description: "Focus for next session",
        },
        adaptation_recommendations: {
          type: ["array", "null"],
          items: { type: "string" },
          description: "Recommended adaptations",
        },
        safety_flags: {
          type: "array",
          items: { type: "string" },
          description: "Safety concerns or flags",
        },
        motivation_strategy: {
          type: ["string", "null"],
          description: "Motivation strategy used",
        },
      },
    },

    // Metadata (Required)
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
export const SCHEMA_VERSION = "2.0";
export const SCHEMA_LAST_UPDATED = "2025-01-14";

/**
 * Validates a workout against the schema
 * @param workout - The workout data to validate
 * @returns Object with isValid boolean and errors array
 */
export function validateWorkout(workout: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required top-level fields
  const requiredFields = ["date", "discipline", "workout_type", "metadata"];

  for (const field of requiredFields) {
    if (!workout[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate date format
  if (workout.date && !workout.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
    errors.push("date must be in YYYY-MM-DD format");
  }

  // Validate discipline
  const validDisciplines = [
    "crossfit",
    "powerlifting",
    "bodybuilding",
    "hiit",
    "running",
    "swimming",
    "cycling",
    "yoga",
    "martial_arts",
    "climbing",
    "hybrid",
  ];
  if (workout.discipline && !validDisciplines.includes(workout.discipline)) {
    errors.push(`Invalid discipline: ${workout.discipline}`);
  }

  // Validate workout_type
  const validTypes = [
    "strength",
    "cardio",
    "flexibility",
    "skill",
    "competition",
    "recovery",
    "hybrid",
  ];
  if (workout.workout_type && !validTypes.includes(workout.workout_type)) {
    errors.push(`Invalid workout_type: ${workout.workout_type}`);
  }

  // Validate metadata (required)
  if (!workout.metadata) {
    errors.push("Missing required metadata object");
  } else {
    const requiredMetadata = [
      "logged_via",
      "data_confidence",
      "ai_extracted",
      "user_verified",
      "version",
      "schema_version",
      "extraction_method",
      "validation_flags",
    ];
    for (const field of requiredMetadata) {
      if (workout.metadata[field] === undefined) {
        errors.push(`Missing required metadata field: ${field}`);
      }
    }

    // Validate data_confidence range
    if (
      workout.metadata.data_confidence !== undefined &&
      (typeof workout.metadata.data_confidence !== "number" ||
        workout.metadata.data_confidence < 0 ||
        workout.metadata.data_confidence > 1)
    ) {
      errors.push("metadata.data_confidence must be a number between 0 and 1");
    }

    // Validate schema_version
    if (
      workout.metadata.schema_version &&
      workout.metadata.schema_version !== "2.0"
    ) {
      errors.push('metadata.schema_version should be "2.0"');
    }

    // Validate generation_method (if provided)
    if (workout.metadata.generation_method) {
      const validMethods = ["tool", "fallback"];
      if (!validMethods.includes(workout.metadata.generation_method)) {
        errors.push(
          `Invalid metadata.generation_method: ${workout.metadata.generation_method}. Must be 'tool' or 'fallback'`,
        );
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
