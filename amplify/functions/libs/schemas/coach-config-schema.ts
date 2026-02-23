/**
 * Coach Configuration Schema
 *
 * Defines the structure and validation for AI coach configurations generated
 * through the coach creator flow. This schema ensures consistency in coach
 * personality, methodology, safety constraints, and technical configuration.
 *
 * Related files:
 * - amplify/functions/libs/coach-creator/types.ts (TypeScript interfaces)
 * - amplify/functions/libs/coach-creator/coach-generation.ts (Coach generation logic)
 * - amplify/functions/build-coach-config/handler.ts (Async coach build handler)
 */

// Re-export types from coach-creator module for convenience
export type {
  CoachConfig,
  CoachConfigSummary,
  CoachPersonalityTemplate,
  MethodologyTemplate,
  SafetyRule,
  PersonalityCoherenceCheck,
  CoachModificationCapabilities,
} from "../coach-creator/types";

/**
 * JSON Schema for Coach Configuration
 * Used to validate AI-generated coach configs
 */
export const COACH_CONFIG_SCHEMA = {
  type: "object",
  required: [
    "coach_id",
    "coach_name",
    "selected_personality",
    "selected_methodology",
    "technical_config",
    "generated_prompts",
    "modification_capabilities",
    "metadata",
  ],
  additionalProperties: false,
  properties: {
    coach_id: {
      type: "string",
      description:
        "Unique identifier following pattern: user_{userId}_coach_{timestamp}",
    },
    coach_name: {
      type: "string",
      description:
        'Creative, playful coach name, up to 50 characters (e.g., "Marcus_the_Form_Master")',
    },
    coach_description: {
      type: "string",
      description:
        'Concise 3-5 word specialty description, up to 50 characters (e.g., "Technical Excellence & Body Recomp")',
    },
    status: {
      type: "string",
      enum: ["active", "archived"],
      description: "Coach status - defaults to active",
    },
    gender_preference: {
      type: "string",
      enum: ["male", "female", "neutral"],
      description: "Gender persona for the coach",
    },
    selected_personality: {
      type: "object",
      required: ["primary_template", "selection_reasoning", "blending_weights"],
      additionalProperties: false,
      properties: {
        primary_template: {
          type: "string",
          enum: ["emma", "marcus", "diana", "alex"],
          description: "Primary personality template",
        },
        secondary_influences: {
          type: "array",
          items: { type: "string" },
          description: "Secondary personality influences",
        },
        selection_reasoning: {
          type: "string",
          description: "Detailed explanation of personality selection",
        },
        blending_weights: {
          type: "object",
          additionalProperties: false,
          description:
            "Weighting of personality templates (primary + secondary should sum to 1.0)",
          properties: {
            primary: {
              type: "number",
              description: "Weight for primary template (0.0 to 1.0)",
            },
            secondary: {
              type: "number",
              description: "Weight for secondary influences (0.0 to 1.0)",
            },
          },
        },
      },
    },
    selected_methodology: {
      type: "object",
      required: [
        "primary_methodology",
        "methodology_reasoning",
        "programming_emphasis",
        "periodization_approach",
        "creativity_emphasis",
        "workout_innovation",
      ],
      additionalProperties: false,
      properties: {
        primary_methodology: {
          type: "string",
          description: "Primary training methodology ID",
        },
        methodology_reasoning: {
          type: "string",
          description: "Explanation of methodology selection",
        },
        programming_emphasis: {
          type: "string",
          enum: ["strength", "conditioning", "balanced"],
        },
        periodization_approach: {
          type: "string",
          enum: ["linear", "conjugate", "block", "daily_undulating"],
        },
        creativity_emphasis: {
          type: "string",
          enum: ["high_variety", "medium_variety", "low_variety"],
        },
        workout_innovation: {
          type: "string",
          enum: ["enabled", "disabled"],
        },
      },
    },
    technical_config: {
      type: "object",
      required: [
        "methodology",
        "programming_focus",
        "experience_level",
        "training_frequency",
        "specializations",
        "injury_considerations",
        "goal_timeline",
        "preferred_intensity",
        "equipment_available",
        "time_constraints",
        "safety_constraints",
      ],
      additionalProperties: false,
      properties: {
        methodology: { type: "string" },
        programming_focus: {
          type: "array",
          items: { type: "string" },
        },
        experience_level: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
        },
        training_frequency: {
          type: "number",
        },
        specializations: {
          type: "array",
          items: { type: "string" },
        },
        injury_considerations: {
          type: "array",
          items: { type: "string" },
        },
        goal_timeline: { type: "string" },
        preferred_intensity: { type: "string" },
        equipment_available: {
          type: "array",
          items: { type: "string" },
        },
        time_constraints: {
          type: "object",
          properties: {
            preferred_time: { type: "string" },
            session_duration: { type: "string" },
            weekly_frequency: { type: "string" },
          },
          additionalProperties: false,
        },
        safety_constraints: {
          type: "object",
          required: [
            "volume_progression_limit",
            "contraindicated_exercises",
            "required_modifications",
            "recovery_requirements",
            "safety_monitoring",
          ],
          additionalProperties: false,
          properties: {
            volume_progression_limit: { type: "string" },
            contraindicated_exercises: {
              type: "array",
              items: { type: "string" },
            },
            required_modifications: {
              type: "array",
              items: { type: "string" },
            },
            recovery_requirements: {
              type: "array",
              items: { type: "string" },
            },
            safety_monitoring: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
    },
    generated_prompts: {
      type: "object",
      required: [
        "personality_prompt",
        "safety_integrated_prompt",
        "motivation_prompt",
        "methodology_prompt",
        "communication_style",
        "learning_adaptation_prompt",
      ],
      additionalProperties: false,
      properties: {
        personality_prompt: {
          type: "string",
          description: "Main personality system prompt",
        },
        safety_integrated_prompt: {
          type: "string",
          description: "Safety-aware coaching prompt",
        },
        motivation_prompt: {
          type: "string",
          description: "Motivation approach prompt",
        },
        methodology_prompt: {
          type: "string",
          description: "Programming methodology prompt",
        },
        communication_style: {
          type: "string",
          description: "Communication style guidelines",
        },
        learning_adaptation_prompt: {
          type: "string",
          description: "Teaching and learning adaptation prompt",
        },
        gender_tone_prompt: {
          type: "string",
          description: "Gender-specific tone and persona prompt",
        },
      },
    },
    modification_capabilities: {
      type: "object",
      required: [
        "enabled_modifications",
        "personality_flexibility",
        "programming_adaptability",
        "creative_programming",
        "workout_variety_emphasis",
        "safety_override_level",
      ],
      additionalProperties: false,
      properties: {
        enabled_modifications: {
          type: "array",
          items: { type: "string" },
        },
        personality_flexibility: {
          type: "string",
          enum: ["high", "medium", "low"],
        },
        programming_adaptability: {
          type: "string",
          enum: ["high", "medium", "low"],
        },
        creative_programming: {
          type: "string",
          enum: ["high", "medium", "low"],
        },
        workout_variety_emphasis: {
          type: "string",
          enum: ["high", "medium", "low"],
        },
        safety_override_level: {
          type: "string",
          enum: ["none", "limited", "moderate"],
        },
      },
    },
    metadata: {
      type: "object",
      required: [
        "version",
        "created_date",
        "total_conversations",
        "safety_profile",
        "methodology_profile",
        "coach_creator_session_summary",
      ],
      additionalProperties: false,
      properties: {
        version: { type: "string" },
        created_date: {
          type: "string",
        },
        user_satisfaction: {
          type: ["number", "null"],
        },
        total_conversations: {
          type: "number",
        },
        safety_profile: {
          type: "object",
          description: "Extracted safety profile from coach creator session",
          additionalProperties: false,
          properties: {
            injuries: { type: "array", items: { type: "string" } },
            contraindications: { type: "array", items: { type: "string" } },
            equipment: { type: "array", items: { type: "string" } },
            modifications: { type: "array", items: { type: "string" } },
            recoveryNeeds: { type: "array", items: { type: "string" } },
          },
        },
        methodology_profile: {
          type: "object",
          description: "Methodology preferences and focus areas",
          additionalProperties: false,
          properties: {
            primary: { type: "string" },
            focus: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific goal focus areas (e.g., body_recomposition, gymnastics_skills)",
            },
            preferences: {
              type: "array",
              items: { type: "string" },
              description:
                "Coaching approach preferences (e.g., technical_progression, balanced_coaching)",
            },
            experience: {
              type: "array",
              items: { type: "string" },
              description: "User experience markers",
            },
          },
        },
        coach_creator_session_summary: {
          type: "string",
          description: "Plain text summary of coach creator session",
        },
        generation_method: {
          type: "string",
          enum: ["tool", "fallback"],
          description:
            "Method used to generate config (tool-based or fallback prompt-based)",
        },
        generation_timestamp: {
          type: "string",
          description:
            "Timestamp when config was generated (ISO 8601 date-time format, e.g., 2026-02-11T12:00:00Z)",
        },
      },
    },
  },
};

/**
 * JSON Schema for Coach Config Summary (listing views)
 * Subset of full config for efficient list displays
 */
export const COACH_CONFIG_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "coach_id",
    "coach_name",
    "selected_personality",
    "technical_config",
    "metadata",
  ],
  properties: {
    coach_id: { type: "string" },
    coach_name: { type: "string" },
    coach_description: {
      type: "string",
      description:
        'Concise specialty description (e.g., "Technical Excellence & Body Recomp")',
    },
    status: {
      type: "string",
      enum: ["active", "archived"],
    },
    selected_personality: {
      type: "object",
      additionalProperties: false,
      properties: {
        primary_template: { type: "string" },
        selection_reasoning: { type: "string" },
      },
    },
    technical_config: {
      type: "object",
      additionalProperties: false,
      properties: {
        programming_focus: {
          type: "array",
          items: { type: "string" },
        },
        specializations: {
          type: "array",
          items: { type: "string" },
        },
        methodology: { type: "string" },
        experience_level: { type: "string" },
        training_frequency: {
          type: "number",
          description: "Training days per week (1-7)",
        },
      },
    },
    metadata: {
      type: "object",
      additionalProperties: false,
      properties: {
        created_date: { type: "string" },
        total_conversations: { type: "number" },
        methodology_profile: {
          type: "object",
          description: "Rich methodology metadata for UI display",
          additionalProperties: false,
          properties: {
            primary: { type: "string" },
            focus: {
              type: "array",
              items: { type: "string" },
              description:
                "Specific goal areas (e.g., body_recomposition, gymnastics_skills)",
            },
            preferences: {
              type: "array",
              items: { type: "string" },
              description:
                "Coaching approach (e.g., technical_progression, balanced_coaching)",
            },
            experience: {
              type: "array",
              items: { type: "string" },
              description: "User experience markers",
            },
          },
        },
      },
    },
  },
};

/**
 * Validates a coach config against the schema
 * @param coachConfig - The coach config to validate
 * @returns Object with isValid boolean and errors array
 */
export function validateCoachConfig(coachConfig: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required top-level fields
  const requiredFields = [
    "coach_id",
    "coach_name",
    "selected_personality",
    "selected_methodology",
    "technical_config",
    "generated_prompts",
    "modification_capabilities",
    "metadata",
  ];

  for (const field of requiredFields) {
    if (!coachConfig[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate coach_id pattern
  if (
    coachConfig.coach_id &&
    !coachConfig.coach_id.match(/^user_.*_coach_.*$/)
  ) {
    errors.push("coach_id must match pattern: user_{userId}_coach_{timestamp}");
  }

  // Validate personality template
  if (coachConfig.selected_personality?.primary_template) {
    const validTemplates = ["emma", "marcus", "diana", "alex"];
    if (
      !validTemplates.includes(
        coachConfig.selected_personality.primary_template,
      )
    ) {
      errors.push(
        `Invalid primary_template: ${coachConfig.selected_personality.primary_template}`,
      );
    }
  }

  // Validate experience level
  if (coachConfig.technical_config?.experience_level) {
    const validLevels = ["beginner", "intermediate", "advanced"];
    if (!validLevels.includes(coachConfig.technical_config.experience_level)) {
      errors.push(
        `Invalid experience_level: ${coachConfig.technical_config.experience_level}`,
      );
    }
  }

  // Validate training frequency
  if (coachConfig.technical_config?.training_frequency) {
    const freq = coachConfig.technical_config.training_frequency;
    if (typeof freq !== "number" || freq < 1 || freq > 7) {
      errors.push("training_frequency must be a number between 1 and 7");
    }
  }

  // Validate generation method (if provided)
  if (coachConfig.metadata?.generation_method) {
    const validMethods = ["tool", "fallback"];
    if (!validMethods.includes(coachConfig.metadata.generation_method)) {
      errors.push(
        `Invalid generation_method: ${coachConfig.metadata.generation_method}. Must be 'tool' or 'fallback'`,
      );
    }
  }

  // Validate generation timestamp format (if provided)
  // Note: DynamoDB may deserialize ISO strings as Date objects, so we accept both
  if (coachConfig.metadata?.generation_timestamp) {
    const timestamp = coachConfig.metadata.generation_timestamp;

    // Accept Date objects (from DynamoDB deserialization) or ISO 8601 strings
    if (timestamp instanceof Date) {
      // Valid if it's a valid Date object (not Invalid Date)
      if (isNaN(timestamp.getTime())) {
        errors.push("generation_timestamp is an invalid Date object");
      }
    } else if (typeof timestamp === "string") {
      // Accept full ISO 8601 format: YYYY-MM-DDTHH:MM:SS with optional milliseconds (.SSS) and timezone (Z or +/-HH:MM)
      const iso8601Regex =
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?$/;
      if (!timestamp.match(iso8601Regex)) {
        errors.push(
          "generation_timestamp must be a valid ISO 8601 date-time string",
        );
      }
    } else {
      errors.push(
        "generation_timestamp must be a Date object or ISO 8601 string",
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
