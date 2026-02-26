/**
 * Warmup Platform Lambda
 *
 * Pre-compiles Bedrock constrained-decoding grammars for all tool schemas used
 * with strict: true. This eliminates first-request grammar compilation latency
 * for real users.
 *
 * Runs on a 12-hour EventBridge schedule to keep grammars warm.
 * Can also be invoked manually after deployments to immediately warm new/changed schemas.
 *
 * Per AWS docs, grammar caches are scoped per account and last 24 hours from first access.
 * Only structural schema changes (not name/description changes) invalidate the cache.
 */

import {
  callBedrockApi,
  callBedrockApiWithJsonOutput,
  MODEL_IDS,
  TEMPERATURE_PRESETS,
  BedrockApiOptions,
  JsonOutputOptions,
} from "../libs/api-helpers";
import { withHeartbeat } from "../libs/heartbeat";
import { WORKOUT_COMPLEXITY_SCHEMA } from "../libs/schemas/workout-complexity-schema";
import { DISCIPLINE_DETECTION_SCHEMA } from "../libs/schemas/discipline-detection-schema";
import { WORKOUT_CLASSIFICATION_SCHEMA } from "../libs/schemas/workout-classification-schema";
import { NORMALIZE_EXERCISES_TOOL } from "../libs/schemas/exercise-normalization-schema";
import {
  SMART_ROUTER_ANALYSIS_SCHEMA,
  SEMANTIC_RETRIEVAL_SCHEMA,
  CONVERSATION_COMPLEXITY_SCHEMA,
} from "../libs/schemas/router-schemas";
import {
  MEMORY_REQUEST_DETECTION_SCHEMA,
  CONSOLIDATED_MEMORY_ANALYSIS_SCHEMA,
  MEMORY_CHARACTERISTICS_SCHEMA,
} from "../libs/schemas/memory-detection-schemas";
import {
  VALIDATION_RESULT_SCHEMA,
  COACH_NAME_SCHEMA,
  PERSONALITY_SELECTION_SCHEMA,
  METHODOLOGY_SELECTION_SCHEMA,
  COACH_PROMPTS_SCHEMA,
} from "../libs/schemas/coach-creator-tool-schemas";
import {
  SAFETY_PROFILE_EXTRACTION_SCHEMA,
  METHODOLOGY_PREFERENCES_EXTRACTION_SCHEMA,
  SPECIALIZATIONS_EXTRACTION_SCHEMA,
} from "../libs/schemas/coach-creator-extraction-schemas";
import { CONVERSATION_SUMMARY_TOOL } from "../libs/schemas/conversation-summary-schema";
import {
  PHASE_STRUCTURE_SCHEMA,
  PHASE_SCHEMA,
} from "../libs/schemas/program-schema";
import { DURATION_NORMALIZATION_SCHEMA } from "../libs/program/duration-normalizer";
import {
  SEARCH_KNOWLEDGE_BASE_SCHEMA,
  SAVE_MEMORY_SCHEMA,
  LOG_WORKOUT_SCHEMA,
  COMPLETE_PROGRAM_WORKOUT_SCHEMA,
  QUERY_PROGRAMS_SCHEMA,
  QUERY_EXERCISE_HISTORY_SCHEMA,
} from "../libs/schemas/conversation-agent-tool-schemas";
import {
  EXTRACT_WORKOUT_DATA_SCHEMA,
  VALIDATE_WORKOUT_COMPLETENESS_SCHEMA,
} from "../libs/schemas/workout-logger-tool-schemas";
import { SELECT_DAYS_TO_REMOVE_SCHEMA } from "../libs/schemas/program-designer-tool-schemas";
import { NORMALIZATION_RESPONSE_SCHEMA as PROGRAM_NORMALIZATION_RESPONSE_SCHEMA } from "../libs/schemas/program-normalization-schema";

// Inline schema for fixed_prompt_output (too small to warrant its own file)
const FIXED_PROMPT_OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    fixed_prompt: {
      type: "string",
      description: "The rephrased prompt text",
    },
    changes_made: {
      type: "array",
      items: { type: "string" },
      description: "List of specific changes made",
    },
  },
  required: ["fixed_prompt", "changes_made"],
};

interface WarmupSchemaEntry {
  toolName: string;
  tool: {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  };
  model: string;
  source: string;
}

interface WarmupResult {
  toolName: string;
  status: "fulfilled" | "rejected";
  durationMs: number;
  error?: string;
}

interface GrammarWarmupSummary {
  total: number;
  succeeded: number;
  failed: number;
  durationMs: number;
  results: WarmupResult[];
}

// Registry of all unique tool schemas used with strict: true.
// Grouped by target model -- only structural schema changes invalidate the grammar cache.
const WARMUP_SCHEMAS: WarmupSchemaEntry[] = [
  // ─── Contextual model (Claude Haiku 4.5) ─────────────────────────────────
  // Simple classification schemas that run on the contextual model in production.
  {
    toolName: "classify_complexity",
    tool: {
      name: "classify_complexity",
      description: "Classify the complexity level of a workout",
      inputSchema: WORKOUT_COMPLEXITY_SCHEMA,
    },
    model: MODEL_IDS.CONTEXTUAL_MODEL_FULL,
    source: "workout-complexity-schema.ts",
  },
  {
    toolName: "classify_discipline",
    tool: {
      name: "classify_discipline",
      description: "Classify the training discipline of a workout",
      inputSchema: DISCIPLINE_DETECTION_SCHEMA,
    },
    model: MODEL_IDS.CONTEXTUAL_MODEL_FULL,
    source: "discipline-detection-schema.ts",
  },
  {
    toolName: "classify_workout_type",
    tool: {
      name: "classify_workout_type",
      description: "Classify the type of workout",
      inputSchema: WORKOUT_CLASSIFICATION_SCHEMA,
    },
    model: MODEL_IDS.CONTEXTUAL_MODEL_FULL,
    source: "workout-classification-schema.ts",
  },
  {
    toolName: "normalize_duration",
    tool: {
      name: "normalize_duration",
      description: "Return the normalized duration in a structured format",
      inputSchema: DURATION_NORMALIZATION_SCHEMA,
    },
    model: MODEL_IDS.CONTEXTUAL_MODEL_FULL,
    source: "duration-normalizer.ts",
  },

  // ─── Executor model (Claude Haiku 4.5) ───────────────────────────────────
  // Conversation agent tool schemas (run on Haiku for most conversations).
  {
    toolName: "search_knowledge_base",
    tool: {
      name: "search_knowledge_base",
      description: "Search the user's knowledge base for relevant information",
      inputSchema: SEARCH_KNOWLEDGE_BASE_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "conversation-agent-tool-schemas.ts",
  },
  {
    toolName: "save_memory",
    tool: {
      name: "save_memory",
      description: "Save something the user shared for future reference",
      inputSchema: SAVE_MEMORY_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "conversation-agent-tool-schemas.ts",
  },
  {
    toolName: "log_workout",
    tool: {
      name: "log_workout",
      description:
        "Log a completed workout by triggering the async workout creation pipeline",
      inputSchema: LOG_WORKOUT_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "conversation-agent-tool-schemas.ts",
  },
  {
    toolName: "complete_program_workout",
    tool: {
      name: "complete_program_workout",
      description: "Mark a program-prescribed workout template as completed",
      inputSchema: COMPLETE_PROGRAM_WORKOUT_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "conversation-agent-tool-schemas.ts",
  },
  {
    toolName: "query_programs",
    tool: {
      name: "query_programs",
      description: "Query the user's training program history",
      inputSchema: QUERY_PROGRAMS_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "conversation-agent-tool-schemas.ts",
  },
  {
    toolName: "query_exercise_history",
    tool: {
      name: "query_exercise_history",
      description:
        "Query the user's performance history for a specific exercise",
      inputSchema: QUERY_EXERCISE_HISTORY_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "conversation-agent-tool-schemas.ts",
  },

  // Other executor model schemas
  {
    toolName: "normalize_exercises",
    tool: {
      name: NORMALIZE_EXERCISES_TOOL.name,
      description: NORMALIZE_EXERCISES_TOOL.description,
      inputSchema: NORMALIZE_EXERCISES_TOOL.inputSchema,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "exercise-normalization-schema.ts",
  },
  {
    toolName: "analyze_semantic_retrieval",
    tool: {
      name: "analyze_semantic_retrieval",
      description: "Analyze whether semantic retrieval is needed",
      inputSchema: SEMANTIC_RETRIEVAL_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "router-schemas.ts (SEMANTIC_RETRIEVAL_SCHEMA)",
  },
  {
    toolName: "analyze_complexity",
    tool: {
      name: "analyze_complexity",
      description: "Analyze the complexity of a conversation",
      inputSchema: CONVERSATION_COMPLEXITY_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "router-schemas.ts (CONVERSATION_COMPLEXITY_SCHEMA)",
  },
  {
    toolName: "analyze_request",
    tool: {
      name: "analyze_request",
      description: "Analyze the user request to determine routing",
      inputSchema: SMART_ROUTER_ANALYSIS_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "router-schemas.ts (SMART_ROUTER_ANALYSIS_SCHEMA)",
  },
  {
    toolName: "detect_memory_request",
    tool: {
      name: "detect_memory_request",
      description: "Detect whether a message contains a memory request",
      inputSchema: MEMORY_REQUEST_DETECTION_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "memory-detection-schemas.ts (MEMORY_REQUEST_DETECTION_SCHEMA)",
  },
  {
    toolName: "detect_memory_characteristics",
    tool: {
      name: "detect_memory_characteristics",
      description: "Detect characteristics of a memory to be stored",
      inputSchema: MEMORY_CHARACTERISTICS_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "memory-detection-schemas.ts (MEMORY_CHARACTERISTICS_SCHEMA)",
  },
  {
    toolName: "analyze_memory_needs",
    tool: {
      name: "analyze_memory_needs",
      description: "Analyze memory needs from a conversation",
      inputSchema: CONSOLIDATED_MEMORY_ANALYSIS_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "memory-detection-schemas.ts (CONSOLIDATED_MEMORY_ANALYSIS_SCHEMA)",
  },
  {
    toolName: "validation_result",
    tool: {
      name: VALIDATION_RESULT_SCHEMA.name,
      description: VALIDATION_RESULT_SCHEMA.description,
      inputSchema: VALIDATION_RESULT_SCHEMA.inputSchema,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "coach-creator-tool-schemas.ts (VALIDATION_RESULT_SCHEMA)",
  },
  {
    toolName: "coach_name_result",
    tool: {
      name: COACH_NAME_SCHEMA.name,
      description: COACH_NAME_SCHEMA.description,
      inputSchema: COACH_NAME_SCHEMA.inputSchema,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "coach-creator-tool-schemas.ts (COACH_NAME_SCHEMA)",
  },
  {
    toolName: "safety_profile_result",
    tool: {
      name: SAFETY_PROFILE_EXTRACTION_SCHEMA.name,
      description: SAFETY_PROFILE_EXTRACTION_SCHEMA.description,
      inputSchema: SAFETY_PROFILE_EXTRACTION_SCHEMA.inputSchema,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source:
      "coach-creator-extraction-schemas.ts (SAFETY_PROFILE_EXTRACTION_SCHEMA)",
  },
  {
    toolName: "methodology_preferences_result",
    tool: {
      name: METHODOLOGY_PREFERENCES_EXTRACTION_SCHEMA.name,
      description: METHODOLOGY_PREFERENCES_EXTRACTION_SCHEMA.description,
      inputSchema: METHODOLOGY_PREFERENCES_EXTRACTION_SCHEMA.inputSchema,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source:
      "coach-creator-extraction-schemas.ts (METHODOLOGY_PREFERENCES_EXTRACTION_SCHEMA)",
  },
  {
    toolName: "specializations_result",
    tool: {
      name: SPECIALIZATIONS_EXTRACTION_SCHEMA.name,
      description: SPECIALIZATIONS_EXTRACTION_SCHEMA.description,
      inputSchema: SPECIALIZATIONS_EXTRACTION_SCHEMA.inputSchema,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source:
      "coach-creator-extraction-schemas.ts (SPECIALIZATIONS_EXTRACTION_SCHEMA)",
  },
  // ─── Planner model (Claude Sonnet 4) ─────────────────────────────────────
  // Workout logger agent schemas (run on Sonnet in production).
  {
    toolName: "extract_workout_data",
    tool: {
      name: "extract_workout_data",
      description:
        "Extract structured workout information from user's message and images",
      inputSchema: EXTRACT_WORKOUT_DATA_SCHEMA,
    },
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "workout-logger-tool-schemas.ts",
  },
  {
    toolName: "validate_workout_completeness",
    tool: {
      name: "validate_workout_completeness",
      description:
        "Validate completeness and quality of extracted workout data",
      inputSchema: VALIDATE_WORKOUT_COMPLETENESS_SCHEMA,
    },
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "workout-logger-tool-schemas.ts",
  },
  {
    toolName: "generate_conversation_summary",
    tool: {
      name: CONVERSATION_SUMMARY_TOOL.name,
      description: CONVERSATION_SUMMARY_TOOL.description,
      inputSchema: CONVERSATION_SUMMARY_TOOL.inputSchema,
    },
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "conversation-summary-schema.ts",
  },
  {
    toolName: "personality_selection_result",
    tool: {
      name: PERSONALITY_SELECTION_SCHEMA.name,
      description: PERSONALITY_SELECTION_SCHEMA.description,
      inputSchema: PERSONALITY_SELECTION_SCHEMA.inputSchema,
    },
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "coach-creator-tool-schemas.ts (PERSONALITY_SELECTION_SCHEMA)",
  },
  {
    toolName: "methodology_selection_result",
    tool: {
      name: METHODOLOGY_SELECTION_SCHEMA.name,
      description: METHODOLOGY_SELECTION_SCHEMA.description,
      inputSchema: METHODOLOGY_SELECTION_SCHEMA.inputSchema,
    },
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "coach-creator-tool-schemas.ts (METHODOLOGY_SELECTION_SCHEMA)",
  },
  {
    toolName: "coach_prompts_result",
    tool: {
      name: COACH_PROMPTS_SCHEMA.name,
      description: COACH_PROMPTS_SCHEMA.description,
      inputSchema: COACH_PROMPTS_SCHEMA.inputSchema,
    },
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "coach-creator-tool-schemas.ts (COACH_PROMPTS_SCHEMA)",
  },
  {
    toolName: "generate_phase_structure",
    tool: {
      name: "generate_phase_structure",
      description: "Generate the phase structure for a training program",
      inputSchema: PHASE_STRUCTURE_SCHEMA,
    },
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "program-schema.ts (PHASE_STRUCTURE_SCHEMA)",
  },
  {
    toolName: "generate_program_phase",
    tool: {
      name: "generate_program_phase",
      description: "Generate a single phase of a training program",
      inputSchema: PHASE_SCHEMA,
    },
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "program-schema.ts (PHASE_SCHEMA)",
  },

  // ─── Additional strict tool use entries ──────────────────────────────────
  {
    toolName: "fixed_prompt_output",
    tool: {
      name: "fixed_prompt_output",
      description: "The fixed prompt text and a summary of changes.",
      inputSchema: FIXED_PROMPT_OUTPUT_SCHEMA,
    },
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "agents/coach-creator/tools.ts (inline)",
  },
  {
    toolName: "select_days_to_remove",
    tool: {
      name: "select_days_to_remove",
      description: "Select training days to remove from the program",
      inputSchema: SELECT_DAYS_TO_REMOVE_SCHEMA,
    },
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "program-designer-tool-schemas.ts (SELECT_DAYS_TO_REMOVE_SCHEMA)",
  },
];

// ─── JSON output format warmup ────────────────────────────────────────────────
//
// These schemas are used via callBedrockApiWithJsonOutput (outputConfig.textFormat)
// instead of strict tool use. Both mechanisms share the same Bedrock grammar
// compilation engine and the same 24-hour cache.
//
// Only schemas that reliably compile within Bedrock's grammar limits belong here.
// All 5 excluded schemas (normalize_workout, extract_workout_info, extract_program_info,
// extract_coach_creator_info, generate_coach_config) have complex or large schemas
// and are documented in docs/strategy/STRUCTURED_OUTPUTS_STRATEGY.md.
// ──────────────────────────────────────────────────────────────────────────────

interface JsonOutputWarmupEntry {
  schemaName: string;
  schema: Record<string, unknown>;
  model: string;
  source: string;
}

const JSON_OUTPUT_WARMUP_SCHEMAS: JsonOutputWarmupEntry[] = [
  // normalize_program warms on Haiku (default tier) and Sonnet (high-tier)
  {
    schemaName: "normalize_program_haiku",
    schema: PROGRAM_NORMALIZATION_RESPONSE_SCHEMA,
    model: MODEL_IDS.EXECUTOR_MODEL_FULL,
    source: "schemas/program-normalization-schema.ts (Haiku tier)",
  },
  {
    schemaName: "normalize_program_sonnet",
    schema: PROGRAM_NORMALIZATION_RESPONSE_SCHEMA,
    model: MODEL_IDS.PLANNER_MODEL_FULL,
    source: "schemas/program-normalization-schema.ts (Sonnet tier)",
  },
];

async function warmSingleJsonOutputSchema(
  entry: JsonOutputWarmupEntry,
): Promise<WarmupResult> {
  const startMs = Date.now();
  try {
    await callBedrockApiWithJsonOutput(
      "You are a warmup assistant.",
      "Return a minimal valid response.",
      entry.model,
      {
        schemaName: entry.schemaName,
        schema: entry.schema,
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
      } as JsonOutputOptions,
    );
    return {
      toolName: entry.schemaName,
      status: "fulfilled",
      durationMs: Date.now() - startMs,
    };
  } catch (error) {
    return {
      toolName: entry.schemaName,
      status: "rejected",
      durationMs: Date.now() - startMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function warmSingleSchema(
  entry: WarmupSchemaEntry,
): Promise<WarmupResult> {
  const startMs = Date.now();
  try {
    await callBedrockApi(
      "You are a warmup assistant. Return a minimal valid response.",
      "Return a minimal valid response.",
      entry.model,
      {
        temperature: TEMPERATURE_PRESETS.STRUCTURED,
        tools: {
          name: entry.tool.name,
          description: entry.tool.description,
          inputSchema: entry.tool.inputSchema,
        },
        expectedToolName: entry.tool.name,
        // strict mode removed — broader model compatibility; schema enforced via additionalProperties, required, and enum constraints
      } as BedrockApiOptions,
    );
    return {
      toolName: entry.toolName,
      status: "fulfilled",
      durationMs: Date.now() - startMs,
    };
  } catch (error) {
    return {
      toolName: entry.toolName,
      status: "rejected",
      durationMs: Date.now() - startMs,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function warmBedrockGrammars(): Promise<GrammarWarmupSummary> {
  const startMs = Date.now();
  const totalSchemas =
    WARMUP_SCHEMAS.length + JSON_OUTPUT_WARMUP_SCHEMAS.length;
  console.info(
    `[warmup-platform] Starting grammar warmup for ${totalSchemas} schemas (${WARMUP_SCHEMAS.length} strict tool use + ${JSON_OUTPUT_WARMUP_SCHEMAS.length} JSON output format)`,
  );

  const [strictResults, jsonOutputResults] = await Promise.all([
    Promise.allSettled(WARMUP_SCHEMAS.map((entry) => warmSingleSchema(entry))),
    Promise.allSettled(
      JSON_OUTPUT_WARMUP_SCHEMAS.map((entry) =>
        warmSingleJsonOutputSchema(entry),
      ),
    ),
  ]);

  const toWarmupResult = (
    result: PromiseSettledResult<WarmupResult>,
  ): WarmupResult => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    return {
      toolName: "unknown",
      status: "rejected" as const,
      durationMs: 0,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    };
  };

  const warmupResults: WarmupResult[] = [
    ...strictResults.map(toWarmupResult),
    ...jsonOutputResults.map(toWarmupResult),
  ];

  const succeeded = warmupResults.filter(
    (r) => r.status === "fulfilled",
  ).length;
  const failed = warmupResults.filter((r) => r.status === "rejected").length;
  const totalMs = Date.now() - startMs;

  const summary: GrammarWarmupSummary = {
    total: totalSchemas,
    succeeded,
    failed,
    durationMs: totalMs,
    results: warmupResults,
  };

  if (failed > 0) {
    const failedTools = warmupResults
      .filter((r) => r.status === "rejected")
      .map((r) => `${r.toolName}: ${r.error}`)
      .join(", ");
    console.warn(
      `[warmup-platform] ${failed}/${totalSchemas} grammar warmups failed: ${failedTools}`,
    );
  }

  console.info(
    `[warmup-platform] Grammar warmup complete: ${succeeded}/${totalSchemas} succeeded in ${totalMs}ms`,
  );

  return summary;
}

export const handler = async (
  event: unknown,
): Promise<Record<string, unknown>> => {
  console.info("[warmup-platform] Handler invoked", { event });

  const grammarWarmup = await withHeartbeat(
    "Bedrock Grammar Warmup",
    () => warmBedrockGrammars(),
    15000, // 15s heartbeat interval -- each parallel batch can take 10-30s
  );

  return {
    grammarWarmup,
  };
};
