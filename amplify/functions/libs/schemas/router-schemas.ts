/**
 * JSON Schemas for router and context analysis tool use
 * These enforce structured responses from the AI for request routing and semantic retrieval
 */

export const SMART_ROUTER_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    userIntent: {
      type: "string",
      enum: [
        "workout_logging",
        "memory_request",
        "question",
        "progress_check",
        "acknowledgment",
        "general",
      ],
      description: "Primary intent of the user's message",
    },
    showContextualUpdates: {
      type: "boolean",
      description:
        "Whether to show contextual loading updates to user during processing",
    },
    workoutDetection: {
      type: "object",
      description: "Analysis of workout logging intent and characteristics",
      properties: {
        isWorkoutLog: {
          type: "boolean",
          description: "True if message describes a completed workout",
        },
        confidence: {
          type: "number",
          description: "Confidence level in workout detection from 0.0 to 1.0",
          minimum: 0.0,
          maximum: 1.0,
        },
        workoutType: {
          type: ["string", "null"],
          enum: [
            "strength",
            "cardio",
            "flexibility",
            "skill",
            "competition",
            "recovery",
            "hybrid",
            null,
          ],
          description:
            "Type of workout if detected, null if no workout detected",
        },
        reasoning: {
          type: "string",
          description:
            "Brief explanation of workout detection decision (under 100 chars)",
        },
        isSlashCommand: {
          type: "boolean",
          description: "True if using /log-workout slash command",
        },
      },
      required: [
        "isWorkoutLog",
        "confidence",
        "workoutType",
        "reasoning",
        "isSlashCommand",
      ],
    },
    memoryProcessing: {
      type: "object",
      description: "Analysis of memory retrieval and save request needs",
      properties: {
        needsRetrieval: {
          type: "boolean",
          description:
            "True if retrieving past memories would enhance the response",
        },
        isMemoryRequest: {
          type: "boolean",
          description:
            "True if user wants to save something for future reference",
        },
        memoryCharacteristics: {
          type: ["object", "null"],
          description:
            "Characteristics of memory to save, null if no memory request",
          properties: {
            type: {
              type: "string",
              enum: ["preference", "goal", "constraint", "instruction"],
              description: "Primary category of the memory",
            },
            importance: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Importance level for coaching context",
            },
            isCoachSpecific: {
              type: "boolean",
              description:
                "True if memory is specific to this coach, false if global",
            },
            suggestedTags: {
              type: "array",
              items: { type: "string" },
              description: "Relevant keywords for memory retrieval",
              maxItems: 5,
            },
          },
          required: ["type", "importance", "isCoachSpecific", "suggestedTags"],
        },
        reasoning: {
          type: "string",
          description:
            "Brief explanation of memory processing needs (under 100 chars)",
        },
      },
      required: [
        "needsRetrieval",
        "isMemoryRequest",
        "memoryCharacteristics",
        "reasoning",
      ],
    },
    contextNeeds: {
      type: "object",
      description: "Analysis of semantic context search requirements",
      properties: {
        needsPineconeSearch: {
          type: "boolean",
          description: "True if semantic search would provide helpful context",
        },
        searchTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["methodology", "workouts", "progress", "techniques"],
          },
          description: "Types of context to search for in Pinecone",
        },
        reasoning: {
          type: "string",
          description:
            "Brief explanation of context search decision (under 100 chars)",
        },
      },
      required: ["needsPineconeSearch", "searchTypes", "reasoning"],
    },
    conversationComplexity: {
      type: "object",
      description:
        "Analysis of conversation complexity and summarization needs",
      properties: {
        hasComplexity: {
          type: "boolean",
          description:
            "True if conversation contains significant emotional or contextual complexity",
        },
        complexityTypes: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "emotional",
              "goal",
              "achievement",
              "setback",
              "relationship",
              "lifestyle",
              "learning",
              "health",
              "program",
              "motivation",
              "social",
              "competition",
              "nutrition",
            ],
          },
          description: "Types of complexity detected in the conversation",
        },
        needsSummary: {
          type: "boolean",
          description:
            "True if conversation should be summarized for long-term context",
        },
        requiresDeepReasoning: {
          type: "boolean",
          description:
            "True if response requires deep reasoning or advanced model capabilities",
        },
        confidence: {
          type: "number",
          description:
            "Confidence level in complexity assessment from 0.0 to 1.0",
          minimum: 0.0,
          maximum: 1.0,
        },
        reasoning: {
          type: "string",
          description:
            "Brief explanation of complexity assessment (under 100 chars)",
        },
      },
      required: [
        "hasComplexity",
        "complexityTypes",
        "needsSummary",
        "requiresDeepReasoning",
        "confidence",
        "reasoning",
      ],
    },
    processingPriority: {
      type: "object",
      description: "Processing order priorities for parallel operations",
      properties: {
        workoutFirst: {
          type: "boolean",
          description: "True if workout processing should happen first",
        },
        memoryFirst: {
          type: "boolean",
          description: "True if memory operations should happen first",
        },
        contextFirst: {
          type: "boolean",
          description: "True if context loading should happen first",
        },
      },
      required: ["workoutFirst", "memoryFirst", "contextFirst"],
    },
    programDesignDetection: {
      type: "object",
      description:
        "Detection of program design requests for informational purposes",
      properties: {
        isProgramDesignRequest: {
          type: "boolean",
          description:
            "True if user is requesting help with multi-week program design",
        },
        confidence: {
          type: "number",
          description:
            "Confidence level in program design detection from 0.0 to 1.0",
          minimum: 0.0,
          maximum: 1.0,
        },
        reasoning: {
          type: "string",
          description:
            "Brief explanation of program design detection (under 100 chars)",
        },
      },
      required: ["isProgramDesignRequest", "confidence", "reasoning"],
    },
    routerMetadata: {
      type: "object",
      description: "Metadata about the routing analysis itself",
      properties: {
        confidence: {
          type: "number",
          description: "Overall confidence in routing analysis from 0.0 to 1.0",
          minimum: 0.0,
          maximum: 1.0,
        },
        processingTime: {
          type: ["number", "null"],
          description: "Processing time in milliseconds, null during analysis",
        },
        fallbackUsed: {
          type: "boolean",
          description: "True if fallback values were used due to errors",
        },
      },
      required: ["confidence", "processingTime", "fallbackUsed"],
    },
  },
  required: [
    "userIntent",
    "showContextualUpdates",
    "workoutDetection",
    "memoryProcessing",
    "contextNeeds",
    "conversationComplexity",
    "processingPriority",
    "programDesignDetection",
    "routerMetadata",
  ],
};

export const SEMANTIC_RETRIEVAL_SCHEMA = {
  type: "object",
  properties: {
    needsSemanticRetrieval: {
      type: "boolean",
      description:
        "True if semantic memory retrieval would enhance the coaching response",
    },
    confidence: {
      type: "number",
      description: "Confidence level in retrieval decision from 0.0 to 1.0",
      minimum: 0.0,
      maximum: 1.0,
    },
    contextTypes: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "preference",
          "goal",
          "constraint",
          "instruction",
          "context",
          "motivational",
        ],
      },
      description: "Types of context that would be beneficial to retrieve",
    },
    reasoning: {
      type: "string",
      description: "Brief explanation of retrieval decision (under 100 chars)",
    },
  },
  required: [
    "needsSemanticRetrieval",
    "confidence",
    "contextTypes",
    "reasoning",
  ],
};

export const CONVERSATION_COMPLEXITY_SCHEMA = {
  type: "object",
  properties: {
    hasComplexity: {
      type: "boolean",
      description:
        "True if message contains complexity triggers warranting conversation summarization",
    },
    confidence: {
      type: "number",
      description: "Confidence level in complexity detection from 0.0 to 1.0",
      minimum: 0.0,
      maximum: 1.0,
    },
    complexityTypes: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "emotional",
          "goal",
          "achievement",
          "setback",
          "relationship",
          "lifestyle",
          "learning",
          "health",
          "program",
          "motivation",
          "social",
          "competition",
          "nutrition",
        ],
      },
      description: "Types of complexity detected in the message",
    },
    reasoning: {
      type: "string",
      description:
        "Brief explanation of complexity detected or why none found (under 100 chars)",
    },
  },
  required: ["hasComplexity", "confidence", "complexityTypes", "reasoning"],
};
