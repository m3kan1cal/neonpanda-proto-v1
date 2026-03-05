/**
 * Coach Creator Session Agent Tool Schemas
 *
 * JSON schemas for the streaming agent tools used during the coach creator
 * intake conversation (stream-coach-creator-session Lambda).
 *
 * Distinct from coach-creator-tool-schemas.ts, which contains schemas for
 * the build-time AI generation steps (personality selection, etc.).
 */

/**
 * Schema for the update_intake_fields agent tool.
 * Maps each intake field to its expected type and description so the model
 * produces structured, validated output on every extraction call.
 */
export const UPDATE_INTAKE_FIELDS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    fields: {
      type: "object",
      description:
        "Key-value pairs of intake field names to extracted values. Only include fields where you found information.",
      additionalProperties: false,
      properties: {
        coachGenderPreference: {
          type: "string",
          description: '"male", "female", or "neutral"',
        },
        primaryGoals: {
          type: "string",
          description:
            'Their primary fitness goals (e.g. "build muscle", "lose fat", "compete in CrossFit", "general fitness")',
        },
        goalTimeline: {
          type: "string",
          description: 'Timeframe (e.g. "6 months", "1 year")',
        },
        age: {
          type: "string",
          description: 'Their age as a number string (e.g. "32")',
        },
        lifeStageContext: {
          type: "string",
          description: 'Life stage context (e.g. "parent of young kids")',
        },
        experienceLevel: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description:
            "Training experience level — use their stated level or your assessment from context",
        },
        trainingHistory: {
          type: "string",
          description:
            'Their training background (e.g. "5 years powerlifting", "2 years CrossFit, competed twice", "gym-goer for 10 years, mostly machines")',
        },
        trainingFrequency: {
          type: "string",
          description: 'Days per week (e.g. "4" or "4 days")',
        },
        sessionDuration: {
          type: "string",
          description: 'Typical workout length (e.g. "45 minutes")',
        },
        timeOfDayPreference: {
          type: "string",
          description: 'When they prefer to train (e.g. "morning")',
        },
        injuryConsiderations: {
          type: "string",
          description: 'Injury description or "none"',
        },
        movementLimitations: {
          type: "string",
          description: 'Movement restrictions or "none"',
        },
        equipmentAccess: {
          type: "string",
          description:
            'Equipment list (e.g. "barbell, pull-up bar, dumbbells")',
        },
        trainingEnvironment: {
          type: "string",
          description: 'Where they train (e.g. "CrossFit gym", "home garage")',
        },
        movementPreferences: {
          type: "string",
          description:
            'Movements or disciplines they enjoy (e.g. "barbell work, gymnastics, Olympic lifting")',
        },
        movementDislikes: {
          type: "string",
          description:
            'Movements or activities they want to minimize (e.g. "long runs, burpees, machine work")',
        },
        coachingStylePreference: {
          type: "string",
          description:
            'How they want to be coached (e.g. "technical and data-driven", "motivational and energetic", "concise and no-nonsense")',
        },
        motivationStyle: {
          type: "string",
          description:
            'How they want to be motivated (e.g. "challenge me", "encourage me", "just give me the data")',
        },
        successMetrics: {
          type: "string",
          description:
            'How they measure success (e.g. "hitting PRs", "feeling strong", "body composition changes", "race times")',
        },
        progressTrackingPreferences: {
          type: "string",
          description:
            'How they want to track progress (e.g. "detailed logs", "simple check-ins", "data-driven metrics")',
        },
        competitionGoals: {
          type: "string",
          description: 'Competition plans or "none" (OPTIONAL)',
        },
        competitionTimeline: {
          type: "string",
          description: "When they plan to compete (OPTIONAL)",
        },
      },
    },
    sophisticationLevel: {
      type: "string",
      enum: ["UNKNOWN", "BEGINNER", "INTERMEDIATE", "ADVANCED"],
      description:
        "Updated sophistication assessment based on user's language and knowledge depth",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "Overall confidence in the extracted values",
    },
  },
  required: ["fields"],
};
