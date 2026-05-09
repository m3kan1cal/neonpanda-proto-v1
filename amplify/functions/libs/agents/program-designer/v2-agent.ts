/**
 * Program Designer Agent — v2 framework migration.
 *
 * Drop-in replacement for `ProgramDesignerAgent` (in `./agent.ts`) that runs
 * on the v2 framework. Mirrors coach-creator's pattern with two extra
 * concerns specific to program design:
 *
 *   1. `generate_phase_workouts` is parallel-safe per-phase. v2 marks it
 *      `parallelSafe: true` so the scheduler runs concurrent calls
 *      together; an `after` middleware persists each call's data under
 *      `phase_workouts:{phaseId}` so parallel calls don't collide on a
 *      single store key (replace semantics on bare `put` would otherwise
 *      keep only the last phase).
 *   2. `prune_excess_workouts` returns `phaseUpdates[]` that v1's agent
 *      iterates and writes back to the store. An `after` middleware
 *      mirrors that here so the save tool sees pruned phase data.
 *
 * Selection between v1 and v2 is gated by `AGENT_V2_PROGRAM_DESIGNER=true`
 * in the build-program Lambda env. v1 stays untouched as the rollback.
 */

import { Agent, type AgentConfigV2 } from "../core/v2/agent";
import { adaptLegacyTool } from "../core/v2/tools/legacy-adapter";
import { SyncRuntime } from "../core/v2/runtime/sync-runtime";
import type {
  ToolMiddleware,
  ToolResult,
  ToolResultStoreLike,
} from "../core/v2/tools/tool-types";
import {
  normaliseLegacyToolResult,
  countSuccessfulToolResults,
} from "../core/v2/legacy-result-helpers";
import {
  loadProgramRequirementsTool,
  generatePhaseStructureTool,
  generatePhaseWorkoutsTool,
  validateProgramStructureTool,
  pruneExcessWorkoutsTool,
  normalizeProgramDataTool,
  generateProgramSummaryTool,
  saveProgramToDatabaseTool,
} from "./tools";
import { buildProgramDesignerPrompt } from "./prompts";
import { enforceAllBlocking, calculateProgramMetrics } from "./helpers";
import type { ProgramDesignerContext, ProgramDesignResult } from "./types";
import { MODEL_IDS } from "../../api-helpers";
import { logger } from "../../logger";

/**
 * Tool ID -> semantic storage key. Mirrors v1's STORAGE_KEY_MAP exactly so
 * existing tools that read prior outputs via `getToolResult(key)` keep
 * working unchanged.
 */
const STORAGE_KEY_MAP: Record<string, string> = {
  load_program_requirements: "requirements",
  generate_phase_structure: "phase_structure",
  generate_phase_workouts: "phase_workouts",
  validate_program_structure: "validation",
  prune_excess_workouts: "pruning",
  normalize_program_data: "normalization",
  generate_program_summary: "summary",
  save_program_to_database: "save",
};

const MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW = 3;

/**
 * `generate_phase_workouts` is parallelSafe and called once per phase. v1
 * stored each call's result at `phase_workouts:{phaseId}`. The legacy
 * adapter's default put goes through STORAGE_KEY_MAP -> `phase_workouts`,
 * which (under replace semantics) would keep only the last phase. This
 * middleware writes the same data under the phase-keyed alias so the
 * result builder can enumerate every phase.
 */
const phaseWorkoutsMiddleware: ToolMiddleware<ProgramDesignerContext> = {
  after: (input, result, ctx) => {
    if (!result.ok) return;
    const phase = (input as any)?.phase;
    const phaseId =
      phase?.phaseId ?? phase?.id ?? `phase_unknown_${Date.now()}`;
    ctx.resultStore.put("generate_phase_workouts", result.data, {
      uniqueKey: `phase_workouts:${phaseId}`,
    });
  },
};

/**
 * `prune_excess_workouts` returns `phaseUpdates[]` describing post-prune
 * state of each affected phase. v1 applies these back to the store so
 * the save tool sees pruned phase workouts. Mirror that here.
 */
const pruneUpdatesMiddleware: ToolMiddleware<ProgramDesignerContext> = {
  after: (_input, result, ctx) => {
    if (!result.ok) return;
    const phaseUpdates = (result.data as any)?.phaseUpdates;
    if (!Array.isArray(phaseUpdates) || phaseUpdates.length === 0) return;
    logger.info(
      `📝 Applying ${phaseUpdates.length} phase updates from pruning…`,
    );
    for (const update of phaseUpdates) {
      if (update?.storageKey && update?.updatedResult !== undefined) {
        ctx.resultStore.put(
          "generate_phase_workouts",
          update.updatedResult,
          { uniqueKey: update.storageKey },
        );
      }
    }
  },
};

export class ProgramDesignerAgentV2 {
  private readonly agent: Agent<ProgramDesignerContext>;

  constructor(private readonly context: ProgramDesignerContext) {
    const fullPrompt = buildProgramDesignerPrompt(context);

    const config: AgentConfigV2<ProgramDesignerContext> = {
      agentId: "program-designer",
      context,
      runtime: new SyncRuntime<ProgramDesignerContext>(),
      modelId: MODEL_IDS.PLANNER_MODEL_FULL,
      // v1 ProgramDesignerAgent passed a single `systemPrompt` (no
      // static/dynamic split). Match v1 here; a future refactor of
      // prompts.ts can opt into Bedrock prompt caching by splitting.
      systemPrompt: fullPrompt,
      tools: [
        // All Bedrock-calling tools get a 60s timeout (mirrors the
        // coach-creator/v2 follow-up fix on develop). The framework
        // default is 25s which is below typical per-tool latency for
        // agent-driven Bedrock + DynamoDB + S3 + Pinecone tools.
        adaptLegacyTool(loadProgramRequirementsTool, { timeoutMs: 60_000 }),
        adaptLegacyTool(generatePhaseStructureTool, { timeoutMs: 60_000 }),
        adaptLegacyTool(generatePhaseWorkoutsTool, {
          parallelSafe: true,
          timeoutMs: 60_000,
          middleware: [phaseWorkoutsMiddleware],
        }),
        adaptLegacyTool(validateProgramStructureTool, { timeoutMs: 60_000 }),
        adaptLegacyTool(pruneExcessWorkoutsTool, {
          timeoutMs: 60_000,
          middleware: [pruneUpdatesMiddleware],
        }),
        adaptLegacyTool(normalizeProgramDataTool, { timeoutMs: 60_000 }),
        adaptLegacyTool(generateProgramSummaryTool, { timeoutMs: 60_000 }),
        adaptLegacyTool(saveProgramToDatabaseTool, { timeoutMs: 60_000 }),
      ],
      resultStoreAliases: STORAGE_KEY_MAP,
      maxIterations: 20,
      policy: {
        blocking: (toolId, _input, store) => {
          // Normalise v2 ToolResult-shaped failures back to v1's
          // `{ error, isValid }` shape so enforceAllBlocking recognises
          // both validation-said-no and validation-threw paths.
          const validation = normaliseLegacyToolResult(store.get<unknown>("validation"));
          const normalization = normaliseLegacyToolResult(
            store.get<unknown>("normalization"),
          );
          const pruning = normaliseLegacyToolResult(store.get<unknown>("pruning"));
          const decision = enforceAllBlocking(
            toolId,
            validation,
            normalization,
            pruning,
          );
          if (!decision) return null;
          return {
            reason: decision.reason,
            details: {
              validationIssues: decision.validationIssues,
              normalizationIssues: decision.normalizationIssues,
            },
          };
        },
        maxRetries: 1,
        shouldRetry: ({ resultStore, finalText }) => {
          // Don't retry if save already succeeded.
          const save = resultStore.get<any>("save");
          if (save?.success && save?.programId) return null;

          // Don't retry on explicit validation failure (structural).
          // enforceAllBlocking will have run and the result builder
          // surfaces a "Program validation failed" reason. Normalise the
          // store value so a thrown-validate (v2 `{ ok: false }` envelope)
          // also matches the v1 `{ isValid, error }` shape this guard
          // checks — otherwise we'd burn an unnecessary retry that
          // clears the store and reruns the workflow into the same
          // failure.
          const validation = normaliseLegacyToolResult(
            resultStore.get<unknown>("validation"),
          ) as any;
          if (
            validation &&
            (validation.isValid === false || validation.error)
          ) {
            return null;
          }

          const successfulCount = countSuccessfulToolResults(resultStore, Object.values(STORAGE_KEY_MAP));
          if (successfulCount >= MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW) {
            return null;
          }

          const lower = finalText.toLowerCase();
          const looksIncomplete =
            finalText.includes("?") ||
            lower.includes("need to") ||
            lower.includes("should i") ||
            lower.includes("would you like") ||
            lower.includes("can you confirm");
          // v1 also retries on the specific "missing programContext"
          // error pattern that bites generate_phase_workouts when
          // Claude doesn't pass requirementsResult through.
          const hasContextError =
            lower.includes("programcontext") ||
            lower.includes("coachconfig") ||
            lower.includes("missing required fields");

          if (!looksIncomplete && !hasContextError) return null;

          // v1 ProgramDesignerAgent.designProgram() clears tool results
          // before the retry round so the model starts fresh. Mirror
          // that. (coach-creator's retry preserved prior results; the
          // two agents have different design intents here.)
          const retryPrompt = this.buildRetryPrompt(finalText, resultStore);
          resultStore.clear();
          return {
            retryPrompt,
            reason: hasContextError
              ? "tool_context_error"
              : "tool_not_called_or_incomplete",
          };
        },
      },
      correlation: {
        sessionId: context.sessionId,
        coachId: context.coachId,
      },
    };

    this.agent = new Agent<ProgramDesignerContext>(config);
    logger.info("ProgramDesignerAgentV2 initialized");
  }

  /**
   * Public entry point — equivalent to v1's `designProgram()`. Returns the
   * same `ProgramDesignResult` shape so the build-program handler can
   * consume it without changes.
   */
  async designProgram(): Promise<ProgramDesignResult> {
    logger.info("ProgramDesignerAgentV2 starting", {
      userId: this.context.userId,
      programId: this.context.programId,
      sessionId: this.context.sessionId,
    });
    try {
      const userMessage =
        "Design the complete training program based on the provided todo list and context.";
      const result = await this.agent.run({ userMessage });
      const built = this.buildResultFromToolData(result.finalResponseText);
      logger.info("ProgramDesignerAgentV2 completed", {
        success: built.success,
        programId: built.programId,
        toolsUsed: result.toolsUsed,
        iterations: result.iterations,
      });
      return built;
    } catch (error: unknown) {
      logger.error("ProgramDesignerAgentV2 error", { error });
      return {
        success: false,
        skipped: true,
        reason:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private buildResultFromToolData(agentResponse: string): ProgramDesignResult {
    const store = this.agent.getResultStore();
    const requirements = store.get<any>("requirements");
    const phaseStructure = store.get<any>("phase_structure");
    const validation = normaliseLegacyToolResult(store.get<unknown>("validation")) as any;
    const pruning = normaliseLegacyToolResult(
      store.get<unknown>("pruning"),
    ) as any;
    const normalization = normaliseLegacyToolResult(
      store.get<unknown>("normalization"),
    ) as any;
    const summary = store.get<any>("summary");
    const save = store.get<any>("save");

    // Phase workouts are stored under `phase_workouts:{phaseId}`. The
    // phase IDs are determined by phaseStructure; collect each.
    const phaseWorkouts: any[] = [];
    const phases = phaseStructure?.phases ?? [];
    for (const phase of phases) {
      const phaseId = phase?.phaseId ?? phase?.id;
      if (!phaseId) continue;
      const r = store.get<any>(`phase_workouts:${phaseId}`);
      if (r) phaseWorkouts.push(r);
    }

    // Success path: save returned a programId.
    if (save?.success && save?.programId) {
      const allWorkoutTemplates = phaseWorkouts.flatMap(
        (r: any) => r?.workoutTemplates ?? [],
      );
      const metrics = calculateProgramMetrics(allWorkoutTemplates);
      return {
        success: true,
        programId: save.programId,
        programName: this.extractProgramName(save, requirements),
        startDate: save.startDate,
        endDate: save.endDate,
        totalDays: requirements?.programDuration,
        phaseCount: phases.length,
        totalWorkoutTemplates: metrics.totalWorkoutTemplates,
        uniqueTrainingDays: metrics.uniqueTrainingDays,
        averageSessionsPerDay: metrics.averageSessionsPerDay,
        trainingFrequency: requirements?.trainingFrequency,
        summary: summary?.summary,
        pineconeStored: !!save.pineconeRecordId,
        pineconeRecordId: save.pineconeRecordId,
        normalizationApplied: !!normalization && normalization.error == null,
        pruningApplied: !!pruning && pruning.error == null,
        generationMethod: "agent_v2",
        s3DetailKey: save.s3Key,
      };
    }

    // Validation blocked save: return structured failure.
    if (validation && validation.isValid === false) {
      return {
        success: false,
        skipped: true,
        reason: `Program validation failed: ${
          validation.validationIssues?.join(", ") || "Unknown issues"
        }`,
        blockingFlags: validation.validationIssues,
      };
    }

    // No tools called at all: surface the agent text as the reason.
    if (!requirements && !phaseStructure && !validation && !save) {
      return {
        success: false,
        skipped: true,
        reason: agentResponse || "Agent workflow incomplete - no tools called",
      };
    }

    // Partial execution without save: workflow incomplete.
    return {
      success: false,
      skipped: true,
      reason: agentResponse || "Workflow incomplete - program was not saved",
    };
  }

  private extractProgramName(save: any, requirements: any): string {
    if (save?.name) return save.name;
    const todoList = this.context.todoList;
    if (todoList?.trainingGoals?.value) {
      const durationDays = requirements?.programDuration ?? 56;
      const durationWeeks = Math.round(durationDays / 7);
      return `${durationWeeks}-Week ${todoList.trainingGoals.value}`;
    }
    return "Custom Training Program";
  }

  private buildRetryPrompt(
    aiResponse: string,
    store: ToolResultStoreLike,
  ): string {
    const requirementsResult = store.get<any>("requirements");
    const hasRequirements =
      requirementsResult &&
      typeof requirementsResult === "object" &&
      !requirementsResult.error &&
      requirementsResult.ok !== false;

    const lower = aiResponse.toLowerCase();
    const hasProgramContextError =
      lower.includes("programcontext") ||
      lower.includes("coachconfig") ||
      lower.includes("missing required fields");

    let contextGuidance = "";
    if (hasProgramContextError && hasRequirements) {
      contextGuidance = `\n\n🚨 CRITICAL DATA PASSING ERROR DETECTED:\n\nYou called generate_phase_workouts without passing the complete programContext.\n\nWhen you call generate_phase_workouts, you MUST pass the ENTIRE load_program_requirements result as programContext:\n\ngenerate_phase_workouts({\n  phase: phaseStructureResult.phases[N],\n  allPhases: phaseStructureResult.phases,\n  programContext: requirementsResult  // ← Pass the ENTIRE load_program_requirements result\n})\n\nDO NOT construct programContext manually. DO NOT pass individual fields.\nPass the ENTIRE requirementsResult object exactly as you received it.`;
    }

    return `CRITICAL OVERRIDE: You did not complete the program design workflow.

Your previous response: "${aiResponse.substring(0, 200)}..."
${contextGuidance}

You MUST now complete the workflow by calling ALL required tools:
1. load_program_requirements
2. generate_phase_structure
3. generate_phase_workouts (for EACH phase) ${hasProgramContextError ? "← FIX YOUR DATA PASSING HERE" : ""}
4. validate_program_structure
5. normalize_program_data (if needed)
6. generate_program_summary
7. save_program_to_database

CRITICAL INSTRUCTIONS:
- When calling generate_phase_workouts, pass requirementsResult as programContext
- DO NOT construct programContext manually
- DO NOT pass individual fields - pass the ENTIRE object
- Make reasonable assumptions for any missing information
- DO NOT ask any more questions
- CALL YOUR TOOLS to design and save the program

Now design the complete program using your tools with CORRECT data passing.`;
  }
}

// `normaliseLegacyToolResult` and `countSuccessfulToolResults` live in
// core/v2/legacy-result-helpers.ts so coach-creator and program-designer
// share the same translation logic — see imports at the top of this file.
