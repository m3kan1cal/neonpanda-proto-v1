/**
 * Conversation Agent Tool Input Schemas
 *
 * JSON Schemas for the 11 conversation agent tools extracted from inline definitions
 * in agents/conversation/tools.ts. Centralizing these enables warmup-platform to
 * pre-compile their Bedrock constrained-decoding grammars.
 *
 * Field ordering follows reasoning-first pattern per Bedrock structured output best practices.
 */

export const SEARCH_KNOWLEDGE_BASE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: {
      type: "string",
      description:
        "Semantic search query describing what information you need (e.g., 'powerlifting squat technique', 'previous shoulder workouts', 'programming principles for hypertrophy')",
    },
    searchTypes: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "methodology",
          "workouts",
          "conversations",
          "programs",
          "coach_creator",
          "program_designer",
          "user_memory",
        ],
      },
      description:
        "Types of content to search. Omit this parameter to search all types. Only specify if you want to narrow the search scope.",
    },
  },
  required: ["query"],
};

export const SEARCH_METHODOLOGY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: {
      type: "string",
      description:
        "The methodology or technique question to search for (e.g., 'conjugate method programming', 'squat technique cues', '5/3/1 vs Starting Strength comparison')",
    },
  },
  required: ["query"],
};

export const RETRIEVE_MEMORIES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    query: {
      type: "string",
      description:
        "What kind of memories to look for (e.g., 'injury history', 'available equipment', 'training goals', 'scheduling constraints')",
    },
  },
  required: ["query"],
};

export const SAVE_MEMORY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    content: {
      type: "string",
      description:
        "The memory content to save. Write as a clear, concise statement in third person (e.g., 'User can only train 3 days per week' not 'You said you can only train 3 days')",
    },
    memoryType: {
      type: "string",
      enum: [
        "preference",
        "goal",
        "constraint",
        "instruction",
        "feedback",
        "context",
      ],
      description: "Category of the memory",
    },
    importance: {
      type: "string",
      enum: ["low", "medium", "high"],
      description:
        "How important this memory is for future interactions. High: always relevant (injuries, equipment). Medium: frequently relevant (preferences, goals). Low: occasionally relevant (feedback, one-time context).",
    },
  },
  required: ["content", "memoryType", "importance"],
};

export const LOG_WORKOUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    workoutDescription: {
      type: "string",
      description:
        "Comprehensive description of the complete workout. Include all exercises with sets, reps, weights, duration, distance, and any performance notes. Aggregate from the full conversation.",
    },
    workoutDate: {
      type: "string",
      description:
        "When the workout was performed. MUST be ISO date format (YYYY-MM-DD). Resolve relative references using today's date from your context (e.g., if today is 2026-02-17 and user says 'yesterday', send '2026-02-16'). Defaults to today if omitted.",
    },
    templateContext: {
      type: "object",
      additionalProperties: false,
      properties: {
        programId: { type: "string" },
        templateId: { type: "string" },
        dayNumber: { type: "number" },
      },
      description:
        "If this workout matches a program template (check context.activeProgram and use get_todays_workout if needed), include this context to link the logged workout to the program.",
    },
  },
  required: ["workoutDescription"],
};

export const COMPLETE_PROGRAM_WORKOUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    programId: {
      type: "string",
      description:
        "The program ID from context.activeProgram or get_todays_workout result",
    },
    templateId: {
      type: "string",
      description:
        "The specific workout template ID to mark as completed (from get_todays_workout result)",
    },
    dayNumber: {
      type: "number",
      description:
        "The day number in the program (from context.activeProgram or get_todays_workout)",
    },
    performanceNotes: {
      type: "string",
      description:
        "Brief summary of how the workout went. Optional but helpful for tracking.",
    },
  },
  required: ["programId", "templateId", "dayNumber"],
};

export const GET_TODAYS_WORKOUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    dayNumber: {
      type: "number",
      description:
        "Specific day number to look up. If omitted, uses the program's currentDay from context.activeProgram. Use this to look ahead or look back at specific days.",
    },
  },
  required: [],
};

export const GET_RECENT_WORKOUTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    limit: {
      type: "number",
      description:
        "Maximum number of workouts to return. Default 10, max 20. Use smaller limits (5-7) for quick checks, larger (15-20) for comprehensive analysis.",
    },
    discipline: {
      type: "string",
      description:
        "Filter by discipline. Examples: 'powerlifting', 'running', 'bodybuilding', 'crossfit', 'calisthenics'. Omit for all disciplines.",
    },
  },
  required: [],
};

export const QUERY_PROGRAMS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    status: {
      type: "string",
      enum: ["active", "completed", "paused", "archived"],
      description:
        "Filter by program status. Omit to see all non-archived programs.",
    },
    limit: {
      type: "number",
      description:
        "Maximum number of programs to return. Defaults to 10 most recent.",
    },
    includeArchived: {
      type: "boolean",
      description: "Include archived programs. Defaults to false.",
    },
  },
  required: [],
};

export const QUERY_EXERCISE_HISTORY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    exerciseName: {
      type: "string",
      description:
        "The name of the exercise to query (e.g., 'Back Squat', 'Bench Press', 'Deadlift'). The tool will normalize this to the stored format automatically.",
    },
    fromDate: {
      type: "string",
      description:
        "Start date for the query range (YYYY-MM-DD format). Omit to get all history.",
    },
    toDate: {
      type: "string",
      description:
        "End date for the query range (YYYY-MM-DD format). Omit to get up to present.",
    },
    limit: {
      type: "number",
      description:
        "Maximum number of exercise sessions to return. Defaults to 20.",
    },
  },
  required: ["exerciseName"],
};

export const LIST_EXERCISE_NAMES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    discipline: {
      type: "string",
      description:
        "Optional filter by discipline (e.g., 'powerlifting', 'bodybuilding', 'crossfit'). Omit to see exercises from all disciplines.",
    },
    limit: {
      type: "number",
      description:
        "Maximum number of exercise names to return. Defaults to 50.",
    },
  },
  required: [],
};
