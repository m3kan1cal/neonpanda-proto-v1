/**
 * Hybrid Schema Plugin
 *
 * Discipline-specific schema for mixed-modality workouts that don't clearly fit
 * a single discipline. Used when:
 * - Workouts contain multiple distinct sections (strength + cardio + mobility)
 * - AI detection has low confidence on another discipline
 * - User explicitly mentions "mixed" or "general" training
 *
 * The schema supports both:
 * 1. Phase-based structure (recommended for workouts with distinct sections)
 * 2. Flat exercise list (fallback for truly unstructured workouts)
 *
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const HYBRID_SCHEMA_PLUGIN = {
  hybrid: {
    type: "object",
    additionalProperties: false,
    properties: {
      primary_focus: {
        type: ["string", "null"],
        description:
          "Optional dominant focus (e.g., 'strength', 'conditioning', 'mobility', 'general fitness')"
      },
      workout_style: {
        type: ["string", "null"],
        description:
          "Free-form style description (e.g., 'personal training', 'gym class', 'home workout', 'open gym')"
      },
      phases: {
        type: "array",
        description:
          "Workout phases/sections - use when workout has distinct parts (warmup, main work, finisher, etc.)",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            phase_name: {
              type: ["string", "null"],
              description:
                "Name of the phase as described by user (e.g., 'Warmup', 'Circuit A', 'Deadlift Work')"
            },
            phase_type: {
              type: ["string", "null"],
              enum: [
                "warmup",
                "mobility",
                "working",
                "strength",
                "conditioning",
                "circuit",
                "skill",
                "cardio",
                "cooldown",
                "accessory",
                "other",
                null,
              ],
              description: "Type of phase for categorization"
            },
            duration: {
              type: ["number", "null"],
              description: "Duration of phase in seconds"
            },
            rounds: {
              type: ["number", "null"],
              description: "Number of rounds if applicable"
            },
            notes: {
              type: ["string", "null"],
              description: "Additional notes for this phase"
            },
            exercises: {
              type: "array",
              description: "Exercises performed in this phase",
              items: {
                type: "object",
                required: ["exercise_name"],
                additionalProperties: false,
                properties: {
                  exercise_name: {
                    type: "string",
                    description: "Name of the exercise"
                  },
                  movement_pattern: {
                    type: ["string", "null"],
                    enum: [
                      "push",
                      "pull",
                      "squat",
                      "hinge",
                      "carry",
                      "accessory",
                      "core",
                      "cardio",
                      "mobility",
                      "other",
                      null,
                    ],
                    description: "Fundamental movement pattern if identifiable"
                  },
                  equipment: {
                    type: ["string", "null"],
                    description:
                      "Equipment used (e.g., barbell, dumbbell, kettlebell, machine, bodyweight)"
                  },
                  sets: {
                    type: "array",
                    description: "Individual set data",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      properties: {
                        set_number: {
                          type: ["number", "null"],
                          description: "Set number (1, 2, 3...)"
                        },
                        reps: {
                          type: ["number", "string", "null"],
                          description:
                            "Reps completed (number or string like 'max' or '8-12')"
                        },
                        weight: {
                          type: ["object", "null"],
                          additionalProperties: false,
                          description: "Weight used for this set",
                          properties: {
                            value: {
                              type: ["number", "null"],
                              description: "Weight value"
                            },
                            unit: {
                              type: ["string", "null"],
                              enum: ["lbs", "kg", null],
                              description: "Weight unit"
                            }
                          }
                        },
                        duration: {
                          type: ["number", "null"],
                          description:
                            "Duration in seconds (for timed exercises)"
                        },
                        distance: {
                          type: ["string", "null"],
                          description:
                            "Distance covered (e.g., '400m', '1 mile')"
                        },
                        rpe: {
                          type: ["number", "null"],
                          description: "Rate of perceived exertion (1-10)"
                        },
                        notes: {
                          type: ["string", "null"],
                          description: "Notes for this set (tempo, cues, etc.)"
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      // Fallback for truly unstructured workouts where phases don't make sense
      exercises: {
        type: "array",
        description:
          "Flat exercise list - use only when workout has no distinct phases/sections",
        items: {
          type: "object",
          required: ["exercise_name"],
          additionalProperties: false,
          properties: {
            exercise_name: {
              type: "string",
              description: "Name of the exercise"
            },
            movement_pattern: {
              type: ["string", "null"],
              enum: [
                "push",
                "pull",
                "squat",
                "hinge",
                "carry",
                "accessory",
                "core",
                "cardio",
                "mobility",
                "other",
                null,
              ],
              description: "Fundamental movement pattern if identifiable"
            },
            equipment: {
              type: ["string", "null"],
              description:
                "Equipment used (e.g., barbell, dumbbell, kettlebell, machine, bodyweight)"
            },
            sets: {
              type: "array",
              description: "Individual set data",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  set_number: {
                    type: ["number", "null"],
                    description: "Set number (1, 2, 3...)"
                  },
                  reps: {
                    type: ["number", "string", "null"],
                    description:
                      "Reps completed (number or string like 'max' or '8-12')"
                  },
                  weight: {
                    type: ["object", "null"],
                    additionalProperties: false,
                    description: "Weight used for this set",
                    properties: {
                      value: {
                        type: ["number", "null"],
                        description: "Weight value"
                      },
                      unit: {
                        type: ["string", "null"],
                        enum: ["lbs", "kg", null],
                        description: "Weight unit"
                      }
                    }
                  },
                  duration: {
                    type: ["number", "null"],
                    description: "Duration in seconds (for timed exercises)"
                  },
                  distance: {
                    type: ["string", "null"],
                    description: "Distance covered (e.g., '400m', '1 mile')"
                  },
                  rpe: {
                    type: ["number", "null"],
                    description: "Rate of perceived exertion (1-10)"
                  },
                  notes: {
                    type: ["string", "null"],
                    description: "Notes for this set (tempo, cues, etc.)"
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};
