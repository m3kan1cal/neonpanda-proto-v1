/**
 * JSON Schemas for memory detection tool use
 * These enforce structured responses from the AI
 */

export const MEMORY_REQUEST_DETECTION_SCHEMA = {
  type: "object",
  properties: {
    isMemoryRequest: {
      type: "boolean",
      description:
        "True if the user is explicitly asking to remember something for future conversations",
    },
    confidence: {
      type: "number",
      description: "Confidence level from 0.0 to 1.0",
      minimum: 0.0,
      maximum: 1.0,
    },
    extractedMemory: {
      type: "object",
      description: "The memory content if a memory request was detected",
      properties: {
        content: {
          type: "string",
          description: "Concise description of what to remember about the user",
        },
        type: {
          type: "string",
          enum: ["preference", "goal", "constraint", "instruction", "context"],
          description: "Category of the memory content",
        },
        importance: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Importance level for coaching context",
        },
      },
      required: ["content", "type", "importance"],
    },
    reasoning: {
      type: "string",
      description: "Brief explanation of the memory detection decision",
    },
  },
  required: ["isMemoryRequest", "confidence", "reasoning"],
};

export const CONSOLIDATED_MEMORY_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    needsRetrieval: {
      type: "boolean",
      description:
        "True if retrieving past memories would enhance the coaching response",
    },
    retrievalReasoning: {
      type: "string",
      description: "Brief explanation of retrieval decision",
    },
    contextTypes: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "goals",
          "preferences",
          "constraints",
          "progress",
          "techniques",
          "motivation",
        ],
      },
      description: "Types of context that would be beneficial to retrieve",
    },
    retrievalConfidence: {
      type: "number",
      description: "Confidence level for retrieval decision from 0.0 to 1.0",
      minimum: 0.0,
      maximum: 1.0,
    },
    isMemoryRequest: {
      type: "boolean",
      description:
        "True if the user wants to save something for future reference",
    },
    memoryRequestReasoning: {
      type: "string",
      description: "Brief explanation of memory request detection",
    },
    memoryCharacteristics: {
      type: "object",
      description:
        "Characteristics of the memory if a save request was detected",
      properties: {
        type: {
          type: "string",
          enum: ["preference", "goal", "constraint", "instruction", "context"],
          description: "Primary category of the memory",
        },
        importance: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Importance level for coaching",
        },
        isCoachSpecific: {
          type: "boolean",
          description:
            "True if memory is specific to this coach relationship, false if global",
        },
        suggestedTags: {
          type: "array",
          items: { type: "string" },
          description: "Relevant keywords for memory retrieval (max 5)",
          maxItems: 5,
        },
        reasoning: {
          type: "string",
          description: "Brief explanation of characteristics analysis",
        },
      },
      required: [
        "type",
        "importance",
        "isCoachSpecific",
        "suggestedTags",
        "reasoning",
      ],
    },
    overallConfidence: {
      type: "number",
      description: "Overall confidence in the analysis from 0.0 to 1.0",
      minimum: 0.0,
      maximum: 1.0,
    },
  },
  required: [
    "needsRetrieval",
    "retrievalReasoning",
    "contextTypes",
    "retrievalConfidence",
    "isMemoryRequest",
    "memoryRequestReasoning",
    "overallConfidence",
  ],
};

export const MEMORY_CHARACTERISTICS_SCHEMA = {
  type: "object",
  properties: {
    type: {
      type: "string",
      enum: ["preference", "goal", "constraint", "instruction", "context"],
      description: "Primary category of the memory - choose exactly one",
    },
    importance: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "Importance level for coaching context",
    },
    isCoachSpecific: {
      type: "boolean",
      description:
        "True if memory is specific to this coaching relationship, false if applicable to any coach",
    },
    confidence: {
      type: "number",
      description: "Confidence level from 0.0 to 1.0",
      minimum: 0.0,
      maximum: 1.0,
    },
    suggestedTags: {
      type: "array",
      items: { type: "string" },
      description: "Relevant keywords for memory retrieval (3-5 tags)",
      minItems: 3,
      maxItems: 5,
    },
    exerciseTags: {
      type: "array",
      items: { type: "string" },
      description:
        "Exercise-specific tags if the memory mentions specific exercises, body parts, or equipment",
    },
    reasoning: {
      type: "object",
      properties: {
        type: {
          type: "string",
          description: "Brief explanation of type classification",
        },
        importance: {
          type: "string",
          description: "Brief explanation of importance level",
        },
        scope: {
          type: "string",
          description:
            "Brief explanation of why this is coach-specific or global",
        },
        tags: {
          type: "string",
          description: "Brief explanation of tag choices",
        },
        exercises: {
          type: "string",
          description: "Brief explanation of exercise tags",
        },
      },
      required: ["type", "importance", "scope", "tags", "exercises"],
    },
  },
  required: [
    "type",
    "importance",
    "isCoachSpecific",
    "confidence",
    "suggestedTags",
    "exerciseTags",
    "reasoning",
  ],
};
