/**
 * Calisthenics Schema Plugin
 *
 * Discipline-specific schema for Calisthenics workouts.
 * Emphasizes bodyweight skill development, progressions, and movement quality.
 * Covers pull-ups, push-ups, dips, handstands, levers, planches, muscle-ups, etc.
 *
 * This plugin is composed with the base schema at runtime for targeted extraction.
 */

export const CALISTHENICS_SCHEMA_PLUGIN = {
  calisthenics: {
    type: "object",
    required: ["session_focus", "exercises"],
    additionalProperties: false,
    properties: {
      session_focus: {
        type: "string",
        enum: ["strength", "skill", "endurance", "mobility", "mixed"],
        description:
          "Primary session focus: strength (max effort), skill (technique), endurance (volume), mobility, or mixed"
      },
      exercises: {
        type: "array",
        description:
          "Array of calisthenics exercises with progression and quality tracking",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["exercise_name", "skill_category"],
          properties: {
            exercise_name: {
              type: "string",
              description:
                "Name of the exercise (e.g., 'pull-up', 'handstand push-up', 'front lever')"
            },
            skill_category: {
              type: "string",
              enum: [
                "pull",
                "push",
                "static_hold",
                "dynamic_movement",
                "core",
                "leg",
                "skill_transfer",
              ],
              description:
                "Movement category: pull (pulling), push (pressing), static_hold (isometric), dynamic_movement (explosive), core, leg, skill_transfer"
            },
            progression_level: {
              type: ["string", "null"],
              description:
                "Current progression level (e.g., 'tuck', 'advanced_tuck', 'straddle', 'full', 'weighted')"
            },
            assistance_method: {
              type: ["string", "null"],
              description:
                "Assistance used if any (e.g., 'band', 'box', 'spotter', 'wall')"
            },
            sets: {
              type: "array",
              description: "Individual sets with success and quality tracking",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["set_number"],
                properties: {
                  set_number: {
                    type: "number",
                    description: "Set number (1, 2, 3...)"
                  },
                  set_type: {
                    type: "string",
                    enum: [
                      "warmup",
                      "working",
                      "skill_practice",
                      "max_effort",
                      "endurance",
                    ],
                    description:
                      "Set type: warmup, working, skill_practice (technique focus), max_effort, endurance"
                  },
                  reps: {
                    type: ["number", "null"],
                    description: "Reps completed (for dynamic movements)"
                  },
                  hold_time: {
                    type: ["number", "null"],
                    description:
                      "Hold time in seconds (for static holds like planche, front lever)"
                  },
                  rest_time: {
                    type: ["number", "null"],
                    description: "Rest time after this set in seconds"
                  },
                  success: {
                    type: "boolean",
                    description:
                      "Whether the set was completed successfully (important for skill progressions)"
                  },
                  quality_rating: {
                    type: ["number", "null"],
                    description:
                      "Quality rating for the set (1-10, form and control)"
                  },
                  notes: {
                    type: ["string", "null"],
                    description:
                      "Set-specific notes (form cues, technique observations)"
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
