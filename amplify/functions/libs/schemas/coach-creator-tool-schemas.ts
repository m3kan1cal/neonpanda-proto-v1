/**
 * Coach Creator Tool Schemas
 *
 * JSON schemas used for AI-powered tool operations in the coach creator agent.
 * These schemas are used as Bedrock tool configurations to enforce structured output
 * and eliminate double-encoding issues.
 */

/**
 * Schema for personality selection
 * Used by generatePersonalitySelection in ai-generation.ts
 */
export const PERSONALITY_SELECTION_SCHEMA = {
  name: "personality_selection_result",
  description: "Select the optimal personality template for the user",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      primaryTemplate: {
        type: "string",
        enum: ["emma", "marcus", "diana", "alex"],
        description:
          "Primary personality template ID (emma=encouraging, marcus=technical, diana=competitive, alex=balanced)",
      },
      secondaryInfluences: {
        type: "array",
        items: { type: "string" },
        description: "Secondary personality template IDs for blending",
      },
      selectionReasoning: {
        type: "string",
        description: "Detailed explanation of why this personality was chosen",
      },
      blendingWeights: {
        type: "object",
        additionalProperties: false,
        properties: {
          primary: {
            type: "number",
            description: "Weight for primary personality (0.5-1.0)",
          },
          secondary: {
            type: "number",
            description: "Weight for secondary influence (0-0.5)",
          },
        },
        required: ["primary", "secondary"],
      },
    },
    required: ["primaryTemplate", "selectionReasoning", "blendingWeights"],
  },
};

/**
 * Schema for methodology selection
 * Used by generateMethodologySelection in ai-generation.ts
 */
export const METHODOLOGY_SELECTION_SCHEMA = {
  name: "methodology_selection_result",
  description: "Select the optimal training methodology for the user",
  inputSchema: {
    type: "object",
    properties: {
      primaryMethodology: {
        type: "string",
        description:
          "Primary methodology ID (e.g., comptrain_strength, mayhem_conditioning, prvn_fitness)",
      },
      methodologyReasoning: {
        type: "string",
        description: "Detailed explanation of why this methodology was chosen",
      },
      programmingEmphasis: {
        type: "string",
        enum: ["strength", "conditioning", "balanced"],
        description: "Primary programming emphasis",
      },
      periodizationApproach: {
        type: "string",
        enum: ["linear", "conjugate", "block", "daily_undulating"],
        description: "Periodization strategy",
      },
      creativityEmphasis: {
        type: "string",
        enum: ["high_variety", "medium_variety", "low_variety"],
        description: "How much workout variety to include",
      },
      workoutInnovation: {
        type: "string",
        enum: ["enabled", "disabled"],
        description: "Whether to include novel workout formats",
      },
    },
    required: [
      "primaryMethodology",
      "methodologyReasoning",
      "programmingEmphasis",
      "periodizationApproach",
      "creativityEmphasis",
      "workoutInnovation",
    ],
    additionalProperties: false,
  },
};

/**
 * Schema for coach prompts generation
 * Used by generateCoachPrompts in ai-generation.ts
 */
export const COACH_PROMPTS_SCHEMA = {
  name: "coach_prompts_result",
  description: "Generate all 7 personality prompts for the coach configuration",
  inputSchema: {
    type: "object",
    properties: {
      personality_prompt: {
        type: "string",
        description: "Main coaching personality and behavior (100-300 words)",
      },
      safety_integrated_prompt: {
        type: "string",
        description:
          "Safety-aware coaching prompt with injury awareness (100-300 words)",
      },
      motivation_prompt: {
        type: "string",
        description: "Motivation and encouragement approach (100-300 words)",
      },
      methodology_prompt: {
        type: "string",
        description:
          "Programming and training methodology prompt (100-300 words)",
      },
      communication_style: {
        type: "string",
        description: "Response format and interaction style (100-300 words)",
      },
      learning_adaptation_prompt: {
        type: "string",
        description: "Teaching and progression approach (100-300 words)",
      },
      gender_tone_prompt: {
        type: "string",
        description: "Gender-specific persona and tone (100-300 words)",
      },
    },
    required: [
      "personality_prompt",
      "safety_integrated_prompt",
      "motivation_prompt",
      "methodology_prompt",
      "communication_style",
      "learning_adaptation_prompt",
      "gender_tone_prompt",
    ],
    additionalProperties: false,
  },
};

/**
 * Schema for validation result
 * Used by runConfigValidation in ai-generation.ts
 */
export const VALIDATION_RESULT_SCHEMA = {
  name: "validation_result",
  description: "Validate coach configuration for consistency and quality",
  inputSchema: {
    type: "object",
    properties: {
      gender_consistency: {
        type: "boolean",
        description: "Whether gender tone is consistent across all prompts",
      },
      safety_language_quality: {
        type: "number",
        description: "Quality score for safety language (0-10)",
      },
      brand_voice_score: {
        type: "number",
        description: "Brand voice compliance score (0-10)",
      },
      prompt_coherence: {
        type: "number",
        description: "Coherence score across all prompts (0-10)",
      },
      issues: {
        type: "array",
        items: { type: "string" },
        description: "Specific issues identified during validation",
      },
    },
    required: [
      "gender_consistency",
      "safety_language_quality",
      "brand_voice_score",
      "prompt_coherence",
      "issues",
    ],
    additionalProperties: false,
  },
};

/**
 * Schema for prompt repair normalization
 * Used by normalizeCoachConfigTool in agents/coach-creator/tools.ts
 * to fix minor quality issues in a single generated coach prompt field.
 */
export const PROMPT_REPAIR_SCHEMA = {
  name: "fixed_prompt_output",
  description: "The fixed prompt text and a summary of changes made.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      fixed_prompt: {
        type: "string",
        description:
          "The rephrased prompt text with identified issues resolved",
      },
      changes_made: {
        type: "array",
        items: { type: "string" },
        description:
          "List of specific changes made to resolve identified issues",
      },
    },
    required: ["fixed_prompt", "changes_made"],
  },
};

export const COACH_NAME_SCHEMA = {
  name: "coach_name_result",
  description:
    "Generate a creative, contextual coach name that embodies the user's journey and NeonPanda's playful power philosophy",
  inputSchema: {
    type: "object",
    properties: {
      coach_name: {
        type: "string",
        description:
          "Creative coach name incorporating personality template and reflecting user's training focus (e.g., 'Maria_Strength_Architect', 'Diana_the_PR_Hunter', 'Maya_Technical_Master')",
      },
      name_reasoning: {
        type: "string",
        description:
          "Brief explanation of why this name fits the user's profile and personality",
      },
      coach_description: {
        type: "string",
        description:
          "Concise 3-5 word specialty description (e.g., 'Technical Excellence & Body Recomp', 'Elite Performance Coaching')",
      },
    },
    required: ["coach_name", "name_reasoning", "coach_description"],
    additionalProperties: false,
  },
};
