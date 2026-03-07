/**
 * Program Designer Session Agent Tool Schemas
 *
 * JSON schemas for the streaming agent tools used during the program designer
 * intake conversation (stream-program-designer-session Lambda).
 *
 * Mirrors coach-creator-session-tool-schemas.ts for the program designer role.
 */

/**
 * Schema for the update_design_fields agent tool.
 * Maps each of the 20 ProgramDesignerTodoList fields to its expected type
 * and description so the model produces structured, validated output on
 * every extraction call.
 */
export const UPDATE_DESIGN_FIELDS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    fields: {
      type: "object",
      description:
        "Key-value pairs of program design field names to extracted values. Only include fields where you found information.",
      additionalProperties: false,
      properties: {
        // Core Program Definition
        trainingGoals: {
          type: "string",
          description:
            'Primary training objectives (e.g. "build strength", "prepare for CrossFit competition", "improve Olympic lifts")',
        },
        targetEvent: {
          type: "string",
          description:
            'Specific event or competition the program prepares for, or "none" if no specific event',
        },
        programDuration: {
          type: "string",
          description:
            'Total length of the program (e.g. "8 weeks", "12 weeks", "3 months")',
        },
        // Schedule & Logistics
        trainingFrequency: {
          type: "number",
          description: "Number of training days per week (e.g. 3, 4, 5)",
        },
        sessionDuration: {
          type: "string",
          description: 'Typical session length (e.g. "45 minutes", "1 hour")',
        },
        startDate: {
          type: "string",
          description:
            'When the program should begin (e.g. "next Monday", "2024-01-15", "ASAP")',
        },
        restDaysPreference: {
          type: "array",
          items: { type: "string" },
          description:
            'Preferred rest days (e.g. ["Saturday", "Sunday"] or ["flexible"])',
        },
        // Equipment & Environment
        equipmentAccess: {
          type: "array",
          items: { type: "string" },
          description:
            'Available equipment list (e.g. ["barbell", "squat rack", "pull-up bar"])',
        },
        trainingEnvironment: {
          type: "string",
          description:
            'Where they train (e.g. "home gym", "CrossFit box", "commercial gym")',
        },
        // User Context
        experienceLevel: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description:
            "Training experience — use their stated level or your assessment",
        },
        currentFitnessBaseline: {
          type: "string",
          description:
            'Current performance indicators (e.g. "back squat 225lbs for 5", "Fran in 8 minutes")',
        },
        injuryConsiderations: {
          type: "string",
          description: 'Current injuries or limitations, or "none"',
        },
        movementPreferences: {
          type: "string",
          description:
            'Movements or disciplines they enjoy (e.g. "Olympic lifts, barbell work")',
        },
        movementDislikes: {
          type: "string",
          description:
            'Movements they want to minimize (e.g. "long runs, burpees")',
        },
        // Program Structure Preferences
        trainingMethodology: {
          type: "string",
          description:
            'Preferred training style or discipline (e.g. "CrossFit", "Powerlifting", "hybrid strength")',
        },
        programFocus: {
          type: "string",
          description:
            'Primary emphasis (e.g. "strength", "conditioning", "mixed/hybrid")',
        },
        intensityPreference: {
          type: "string",
          enum: ["conservative", "moderate", "aggressive"],
          description: "Preferred training intensity and progression rate",
        },
        volumeTolerance: {
          type: "string",
          enum: ["low", "moderate", "high"],
          description: "How much training volume they can handle",
        },
        // Optional Advanced
        deloadPreference: {
          type: "string",
          description:
            'Deload frequency preference (e.g. "every 4 weeks", "as needed", "none")',
        },
        progressionStyle: {
          type: "string",
          description:
            'Periodization style (e.g. "linear", "undulating", "block periodization")',
        },
      },
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "Overall confidence in the extracted values",
    },
  },
  required: ["fields"],
};
