/**
 * Program Designer Agent Tool Input Schemas
 *
 * JSON Schemas for the program designer agent tools extracted from inline definitions
 * in agents/program-designer/tools.ts. Centralizing these enables warmup-platform to
 * pre-compile their Bedrock constrained-decoding grammars.
 */

export const LOAD_PROGRAM_REQUIREMENTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    userId: {
      type: "string",
      description: "User ID",
    },
    coachId: {
      type: "string",
      description: "Coach ID",
    },
    todoList: {
      type: "object",
      description: "Program requirements from todo-list conversation",
    },
  },
  required: ["userId", "coachId", "todoList"],
};

export const GENERATE_PHASE_STRUCTURE_TOOL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    totalDays: {
      type: "number",
      description: "Total program duration in days",
    },
    trainingFrequency: {
      type: "number",
      description: "Training frequency (days per week)",
    },
    todoList: {
      type: "object",
      description:
        "Program requirements from todo-list (optional: retrieved from stored results if available)",
    },
    coachConfig: {
      type: "object",
      description:
        "Coach configuration (optional: automatically retrieved from stored load_program_requirements results)",
    },
    userProfile: {
      type: "object",
      description:
        "User profile (optional: automatically retrieved from stored load_program_requirements results)",
    },
    conversationContext: {
      type: "string",
      description:
        "Full conversation history (optional: automatically retrieved from stored load_program_requirements results)",
    },
    pineconeContext: {
      type: "string",
      description:
        "Relevant context from Pinecone (optional: automatically retrieved from stored load_program_requirements results)",
    },
  },
  required: ["totalDays", "trainingFrequency"],
};

export const GENERATE_PHASE_WORKOUTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    phase: {
      type: "object",
      additionalProperties: false,
      description: "Single phase definition from phase structure",
      properties: {
        phaseId: { type: "string" },
        name: { type: "string" },
        description: { type: "string" },
        startDay: { type: "number" },
        endDay: { type: "number" },
        durationDays: { type: "number" },
        focusAreas: { type: "array", items: { type: "string" } },
        expectedWorkoutCount: {
          type: "number",
          description:
            "Estimated number of workout templates planned during phase structure generation",
        },
      },
    },
    allPhases: {
      type: "array",
      description: "All phases from phase structure (for context)",
    },
  },
  required: ["phase", "allPhases"],
};

export const VALIDATE_PROGRAM_STRUCTURE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    program: {
      type: "object",
      description:
        "LIGHTWEIGHT program object with basic fields: name, programId, totalDays, startDate, trainingGoals (array), equipmentConstraints (array), description, trainingFrequency. Do NOT include phases array or full workout data.",
    },
    phaseIds: {
      type: "array",
      description:
        "Array of phaseIds from generated phases - tool will retrieve full data from storage",
      items: { type: "string" },
    },
  },
  required: ["program", "phaseIds"],
};

export const PRUNE_EXCESS_WORKOUTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    phaseIds: {
      type: "array",
      description:
        "Array of phaseIds - tool will retrieve full workout data from storage",
      items: { type: "string" },
    },
    targetTrainingDays: {
      type: "number",
      description: "Target number of training days (from pruningMetadata)",
    },
    currentTrainingDays: {
      type: "number",
      description: "Current number of training days (from pruningMetadata)",
    },
  },
  required: ["phaseIds", "targetTrainingDays", "currentTrainingDays"],
};

export const SELECT_DAYS_TO_REMOVE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    daysToRemove: {
      type: "array",
      description: "Array of dayNumber values to remove from the program",
      items: { type: "number" },
    },
    reasoning: {
      type: "string",
      description:
        "Brief explanation of why these days were selected for removal",
    },
  },
  required: ["daysToRemove", "reasoning"],
};

export const NORMALIZE_PROGRAM_DATA_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    program: {
      type: "object",
      description: "The program object to normalize",
    },
    enableThinking: {
      type: "boolean",
      description: "Whether to enable extended thinking for normalization",
    },
  },
  required: ["program"],
};

export const GENERATE_PROGRAM_SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    program: {
      type: "object",
      description: "The finalized program object",
    },
  },
  required: ["program"],
};

export const SAVE_PROGRAM_TO_DATABASE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    program: {
      type: "object",
      description: "The finalized program object",
    },
    summary: {
      type: "string",
      description: "The AI-generated program summary",
    },
    debugData: {
      type: "object",
      description: "Optional debug data collected during generation",
    },
  },
  required: ["program", "summary"],
};
