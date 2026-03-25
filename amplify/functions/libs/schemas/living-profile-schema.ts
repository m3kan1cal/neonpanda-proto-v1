/**
 * JSON Schema for Living Profile generation/update tool use.
 * Used by the build-living-profile Lambda to generate structured profile updates
 * from conversation summaries, memories, and existing profile data.
 *
 * Field ordering follows reasoning-first pattern per Bedrock structured output best practices.
 */

export const LIVING_PROFILE_GENERATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description:
        "Brief explanation of what changed in this profile update and why",
    },
    trainingIdentity: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: {
          type: "string",
          description:
            "One-line summary (e.g., 'Intermediate lifter, 2yr experience, CrossFit background')",
        },
        experienceLevel: {
          type: "string",
          description: "Beginner, Intermediate, Advanced, Elite",
        },
        trainingAge: {
          type: "string",
          description: "How long they've been training (e.g., '2 years', '6 months')",
        },
        primaryDisciplines: {
          type: "array",
          items: { type: "string" },
          description:
            "Primary training disciplines (e.g., ['Powerlifting', 'CrossFit'])",
        },
        identityNarrative: {
          type: "string",
          description:
            "Their relationship with fitness in their own framing — how they see themselves",
        },
      },
      required: [
        "summary",
        "experienceLevel",
        "trainingAge",
        "primaryDisciplines",
        "identityNarrative",
      ],
    },
    communicationPreferences: {
      type: "object",
      additionalProperties: false,
      properties: {
        preferredStyle: {
          type: "string",
          description:
            "Communication style preference (e.g., 'Direct and technical', 'Warm and encouraging')",
        },
        responseLength: {
          type: "string",
          enum: ["concise", "detailed", "adaptive"],
          description: "Preferred response length",
        },
        motivationalTriggers: {
          type: "array",
          items: { type: "string" },
          description:
            "What motivates them (e.g., ['competition', 'progress tracking', 'community'])",
        },
        sensitiveTopics: {
          type: "array",
          items: { type: "string" },
          description:
            "Topics to approach carefully (e.g., ['body image', 'past injuries', 'diet'])",
        },
      },
      required: [
        "preferredStyle",
        "responseLength",
        "motivationalTriggers",
        "sensitiveTopics",
      ],
    },
    lifeContext: {
      type: "object",
      additionalProperties: false,
      properties: {
        summary: {
          type: "string",
          description: "Brief life context overview",
        },
        occupation: {
          type: "string",
          description: "What they do for work (or 'Unknown')",
        },
        schedule: {
          type: "string",
          description:
            "Typical schedule pattern (e.g., '9-5 office job, trains evenings')",
        },
        stressors: {
          type: "array",
          items: { type: "string" },
          description: "Known stressors (e.g., ['work deadlines', 'young kids'])",
        },
        supportFactors: {
          type: "array",
          items: { type: "string" },
          description:
            "Positive factors (e.g., ['supportive partner', 'home gym'])",
        },
        constraints: {
          type: "array",
          items: { type: "string" },
          description:
            "Physical/logistical constraints (e.g., ['bad shoulder', 'limited equipment'])",
        },
      },
      required: [
        "summary",
        "occupation",
        "schedule",
        "stressors",
        "supportFactors",
        "constraints",
      ],
    },
    goalsAndProgress: {
      type: "object",
      additionalProperties: false,
      properties: {
        activeGoals: {
          type: "array",
          items: { type: "string" },
          description: "Current active goals",
        },
        recentMilestones: {
          type: "array",
          items: { type: "string" },
          description:
            "Recent achievements or milestones (last 30 days)",
        },
        currentPhase: {
          type: "string",
          description:
            "Current training phase (e.g., 'Building base', 'Peaking', 'Deload', 'General fitness')",
        },
        progressTrajectory: {
          type: "string",
          description:
            "Overall trajectory (e.g., 'Consistent improvement', 'Plateaued', 'Returning after break')",
        },
      },
      required: [
        "activeGoals",
        "recentMilestones",
        "currentPhase",
        "progressTrajectory",
      ],
    },
    coachingRelationship: {
      type: "object",
      additionalProperties: false,
      properties: {
        relationshipStage: {
          type: "string",
          enum: ["new", "developing", "established", "deep"],
          description: "Stage of the coaching relationship",
        },
        rapport: {
          type: "string",
          description:
            "Brief description of rapport quality (e.g., 'Good - user is open and engaged')",
        },
        communicationDynamic: {
          type: "string",
          description:
            "How they interact (e.g., 'User asks detailed questions, responds well to technical explanations')",
        },
      },
      required: ["relationshipStage", "rapport", "communicationDynamic"],
    },
    knowledgeGaps: {
      type: "object",
      additionalProperties: false,
      properties: {
        unknownTopics: {
          type: "array",
          items: { type: "string" },
          description:
            "Topics we have no data on that could improve coaching",
        },
        partiallyKnown: {
          type: "array",
          items: { type: "string" },
          description:
            "Topics where we have some info but could know more",
        },
        suggestedQuestions: {
          type: "array",
          items: { type: "string" },
          description:
            "Natural questions to ask over time to fill knowledge gaps",
        },
      },
      required: ["unknownTopics", "partiallyKnown", "suggestedQuestions"],
    },
    observedPatterns: {
      type: "array",
      description: "Behavioral patterns observed from data (not stated by user)",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          pattern: {
            type: "string",
            description: "The observed pattern (e.g., 'Resists deload weeks')",
          },
          confidence: {
            type: "number",
            description: "Confidence level 0.0-1.0",
          },
          category: {
            type: "string",
            enum: [
              "training",
              "communication",
              "adherence",
              "emotional",
              "avoidance",
            ],
            description: "Category of the pattern",
          },
        },
        required: ["pattern", "confidence", "category"],
      },
    },
    highlightReel: {
      type: "array",
      description:
        "Significant shared moments worth referencing in future conversations",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          moment: {
            type: "string",
            description:
              "Brief description (e.g., 'Hit 3-plate squat PR - emotional, mentioned dad')",
          },
          emotionalValence: {
            type: "string",
            enum: ["positive", "negative", "neutral", "mixed"],
            description: "Emotional tone of the moment",
          },
          significance: {
            type: "string",
            enum: ["high", "medium"],
            description: "How significant this moment is",
          },
          themes: {
            type: "array",
            items: { type: "string" },
            description:
              "Themes (e.g., ['achievement', 'family', 'persistence'])",
          },
        },
        required: ["moment", "emotionalValence", "significance", "themes"],
      },
    },
    profileConfidence: {
      type: "number",
      description:
        "Overall confidence in this profile's accuracy (0.0-1.0). Higher with more data.",
    },
  },
  required: [
    "reasoning",
    "trainingIdentity",
    "communicationPreferences",
    "lifeContext",
    "goalsAndProgress",
    "coachingRelationship",
    "knowledgeGaps",
    "observedPatterns",
    "highlightReel",
    "profileConfidence",
  ],
};
