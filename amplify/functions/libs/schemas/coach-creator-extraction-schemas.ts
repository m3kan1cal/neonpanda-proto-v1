/**
 * Coach Creator Data Extraction Schemas
 *
 * JSON schemas used for AI-powered data extraction from coach creator sessions.
 * These schemas are used as Bedrock tool configurations to ensure structured output.
 */

/**
 * Schema for safety profile extraction
 * Used by extractSafetyProfileFromSession in data-extraction.ts
 */
export const SAFETY_PROFILE_EXTRACTION_SCHEMA = {
  name: "safety_profile_result",
  description: "Structured safety profile extracted from user data",
  inputSchema: {
    type: "object",
    properties: {
      injuries: {
        type: "array",
        items: { type: "string" },
        description: "Specific injuries or conditions",
      },
      contraindications: {
        type: "array",
        items: { type: "string" },
        description: "Exercises or movements to avoid",
      },
      equipment: {
        type: "array",
        items: { type: "string" },
        description: "Available equipment",
      },
      modifications: {
        type: "array",
        items: { type: "string" },
        description: "Required modifications",
      },
      recoveryNeeds: {
        type: "array",
        items: { type: "string" },
        description: "Recovery requirements",
      },
    },
    required: [
      "injuries",
      "contraindications",
      "equipment",
      "modifications",
      "recoveryNeeds",
    ],
  },
};

/**
 * Schema for methodology preferences extraction
 * Used by extractMethodologyPreferencesFromSession in data-extraction.ts
 */
export const METHODOLOGY_PREFERENCES_EXTRACTION_SCHEMA = {
  name: "methodology_preferences_result",
  description: "Structured methodology preferences extracted from user data",
  inputSchema: {
    type: "object",
    properties: {
      focus: {
        type: "array",
        items: { type: "string" },
        description:
          'Primary training focus areas (e.g., "strength", "conditioning")',
      },
      preferences: {
        type: "array",
        items: { type: "string" },
        description: "Specific movement or training preferences",
      },
      avoidances: {
        type: "array",
        items: { type: "string" },
        description: "Things to avoid",
      },
      experience: {
        type: "string",
        enum: ["beginner", "intermediate", "advanced", "expert"],
        description: "Training experience level",
      },
    },
    required: ["focus", "preferences", "avoidances", "experience"],
  },
};

/**
 * Schema for specializations extraction
 * Used by extractSpecializationsFromSession in data-extraction.ts
 */
export const SPECIALIZATIONS_EXTRACTION_SCHEMA = {
  name: "specializations_result",
  description: "List of fitness specializations relevant to user profile",
  inputSchema: {
    type: "object",
    properties: {
      specializations: {
        type: "array",
        items: { type: "string" },
        description:
          "Relevant fitness specializations (e.g., Olympic Weightlifting, CrossFit)",
      },
    },
    required: ["specializations"],
  },
};
