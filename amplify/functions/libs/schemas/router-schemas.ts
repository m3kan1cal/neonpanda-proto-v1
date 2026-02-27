/**
 * JSON Schemas for router and context analysis tool use
 * These enforce structured responses from the AI for request routing and semantic retrieval
 *
 * Field ordering follows reasoning-first pattern per Bedrock structured output best practices:
 * reasoning fields appear before boolean conclusions and confidence scores so the model
 * thinks through the problem before committing to an answer.
 */

export const SMART_ROUTER_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    userIntent: {
      type: "string",
      enum: [
        "workout_logging",
        "memory_request",
        "question",
        "progress_check",
        "acknowledgment",
        "cancel_request",
        "general",
        "other",
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
      additionalProperties: false,
      description: "Analysis of workout logging intent and characteristics",
      properties: {
        reasoning: {
          type: "string",
          description:
            "Brief explanation of workout detection decision (under 100 chars)",
        },
        isWorkoutLog: {
          type: "boolean",
          description: "True if message describes a completed workout",
        },
        confidence: {
          type: "number",
          description: "Confidence level in workout detection from 0.0 to 1.0",
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
            "Type of workout if detected. Set to null if no workout was detected.",
        },
        isSlashCommand: {
          type: "boolean",
          description: "True if using /log-workout slash command",
        },
      },
      required: [
        "reasoning",
        "isWorkoutLog",
        "confidence",
        "workoutType",
        "isSlashCommand",
      ],
    },
    memoryProcessing: {
      type: "object",
      additionalProperties: false,
      description: "Analysis of memory retrieval and save request needs",
      properties: {
        reasoning: {
          type: "string",
          description:
            "Brief explanation of memory processing needs (under 100 chars)",
        },
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
          additionalProperties: false,
          description:
            "Characteristics of memory to save, null if no memory request",
          properties: {
            type: {
              type: "string",
              enum: [
                "preference",
                "goal",
                "constraint",
                "instruction",
                "other",
              ],
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
              description: "Relevant keywords for memory retrieval (up to 5)",
            },
          },
          required: ["type", "importance", "isCoachSpecific", "suggestedTags"],
        },
      },
      required: [
        "reasoning",
        "needsRetrieval",
        "isMemoryRequest",
        "memoryCharacteristics",
      ],
    },
    contextNeeds: {
      type: "object",
      additionalProperties: false,
      description: "Analysis of semantic context search requirements",
      properties: {
        reasoning: {
          type: "string",
          description:
            "Brief explanation of context search decision (under 100 chars)",
        },
        needsPineconeSearch: {
          type: "boolean",
          description: "True if semantic search would provide helpful context",
        },
        searchTypes: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "methodology",
              "workouts",
              "progress",
              "techniques",
              "other",
            ],
          },
          description: "Types of context to search for in Pinecone",
        },
      },
      required: ["reasoning", "needsPineconeSearch", "searchTypes"],
    },
    conversationComplexity: {
      type: "object",
      additionalProperties: false,
      description:
        "Analysis of conversation complexity and summarization needs",
      properties: {
        reasoning: {
          type: "string",
          description:
            "Brief explanation of complexity assessment (under 100 chars)",
        },
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
              "other",
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
        },
      },
      required: [
        "reasoning",
        "hasComplexity",
        "complexityTypes",
        "needsSummary",
        "requiresDeepReasoning",
        "confidence",
      ],
    },
    processingPriority: {
      type: "object",
      additionalProperties: false,
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
      additionalProperties: false,
      description:
        "Detection of program design requests for informational purposes",
      properties: {
        reasoning: {
          type: "string",
          description:
            "Brief explanation of program design detection (under 100 chars)",
        },
        isProgramDesignRequest: {
          type: "boolean",
          description:
            "True if user is requesting help with multi-week program design",
        },
        confidence: {
          type: "number",
          description:
            "Confidence level in program design detection from 0.0 to 1.0",
        },
      },
      required: ["reasoning", "isProgramDesignRequest", "confidence"],
    },
    routerMetadata: {
      type: "object",
      additionalProperties: false,
      description: "Metadata about the routing analysis itself",
      properties: {
        confidence: {
          type: "number",
          description: "Overall confidence in routing analysis from 0.0 to 1.0",
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
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description: "Brief explanation of retrieval decision (under 100 chars)",
    },
    needsSemanticRetrieval: {
      type: "boolean",
      description:
        "True if semantic memory retrieval would enhance the coaching response",
    },
    confidence: {
      type: "number",
      description: "Confidence level in retrieval decision from 0.0 to 1.0",
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
          "other",
        ],
      },
      description: "Types of context that would be beneficial to retrieve",
    },
  },
  required: [
    "reasoning",
    "needsSemanticRetrieval",
    "confidence",
    "contextTypes",
  ],
};

export const CONVERSATION_COMPLEXITY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reasoning: {
      type: "string",
      description:
        "Brief explanation of complexity detected or why none found (under 100 chars)",
    },
    hasComplexity: {
      type: "boolean",
      description:
        "True if message contains complexity triggers warranting conversation summarization",
    },
    confidence: {
      type: "number",
      description: "Confidence level in complexity detection from 0.0 to 1.0",
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
          "other",
        ],
      },
      description: "Types of complexity detected in the message",
    },
  },
  required: ["reasoning", "hasComplexity", "confidence", "complexityTypes"],
};
