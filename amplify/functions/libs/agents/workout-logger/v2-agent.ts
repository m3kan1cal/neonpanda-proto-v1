/**
 * Workout Logger Agent — v2 framework migration.
 *
 * Drop-in replacement for `WorkoutLoggerAgent` (in `./agent.ts`) that runs
 * on the v2 framework. Mirrors the coach-creator and program-designer
 * patterns plus three concerns specific to workout logging:
 *
 *   1. **Index-based positional storage for multi-workout flows.** When
 *      the user logs multiple workouts in one message, Claude emits
 *      `detect_discipline` × N and `extract_workout_data` × N in
 *      sequential tool_use turns, then `validate / normalize / summary /
 *      save` × N with explicit `workoutIndex` parameters. v1 uses
 *      `Map<string, any[]>` with positional indexing. v2's
 *      `ToolResultStore.put` only supports {index} or {uniqueKey}, so
 *      `makeWorkoutIndexMiddleware` mutates each tool's
 *      `result.toolStoreIndex` to point at the right slot before the
 *      scheduler's default persist fires. All tools stay
 *      `parallelSafe: false` (matches v1) so middleware can read
 *      `getAll(...).length` without a race for tools that don't carry an
 *      explicit `workoutIndex`.
 *   2. **Index-aware blocking.** `enforceValidationBlocking` is checked
 *      per-workout: blocking reads `store.get("validation",
 *      workoutIndex)` from `toolInput.workoutIndex`, not the latest
 *      validation result.
 *   3. **Heavy retry decision logic preserved verbatim.** v1's
 *      `isValidBlockingResponse` and `isIncompleteWorkflow` regex
 *      catalogs (~150 LOC each) carry months of production-tuned
 *      patterns for distinguishing "Claude correctly blocked
 *      non-workout content" from "Claude is asking a clarifying
 *      question and we should retry". Migrated as private helpers.
 *
 * Selection between v1 and v2 is gated by `AGENT_V2_WORKOUT_LOGGER=true`
 * in the build-workout Lambda env. v1 stays untouched as the rollback.
 */

import { Agent, type AgentConfigV2 } from "../core/v2/agent";
import { adaptLegacyTool } from "../core/v2/tools/legacy-adapter";
import { SyncRuntime } from "../core/v2/runtime/sync-runtime";
import type { ToolResultStoreLike } from "../core/v2/tools/tool-types";
import type { ToolResultStore } from "../core/v2/tools/tool-result-store";
import {
  normaliseLegacyToolResult,
  countSuccessfulToolResults,
} from "../core/v2/legacy-result-helpers";
import {
  detectDisciplineTool,
  extractWorkoutDataTool,
  validateWorkoutCompletenessTool,
  normalizeWorkoutDataTool,
  generateWorkoutSummaryTool,
  saveWorkoutToDatabaseTool,
  computeDateTool,
} from "./tools";
import { buildWorkoutLoggerPrompt } from "./prompts";
import { enforceValidationBlocking } from "./helpers";
import type { WorkoutLoggerContext, WorkoutLogResult } from "./types";
import { MODEL_IDS } from "../../api-helpers";
import { logger } from "../../logger";

/**
 * Tool ID -> semantic storage key. Mirrors v1's STORAGE_KEY_MAP exactly.
 * `compute_date` has no alias (stateless utility, results not consumed by
 * other tools). All other tools store positionally for multi-workout.
 */
const STORAGE_KEY_MAP: Record<string, string> = {
  detect_discipline: "discipline",
  extract_workout_data: "extraction",
  validate_workout_completeness: "validation",
  normalize_workout_data: "normalization",
  generate_workout_summary: "summary",
  save_workout_to_database: "save",
};

/**
 * Minimum successful tools for a complete workflow:
 *   detect + extract + validate + summary + save = 5
 * normalize is optional (only when validation.shouldNormalize is true).
 */
const MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW = 5;

/**
 * Per-tool `getStoreLocation` factory that aligns v2 store-writes to v1's
 * positional semantics. Two cases:
 *
 *   - Tool input carries `workoutIndex` (validate / normalize / summary /
 *     save in multi-workout flows): use that value as the storage index.
 *   - Tool input has no `workoutIndex` (detect_discipline,
 *     extract_workout_data; or any single-workout call): use the next
 *     available slot via `getAll(alias).length`. Safe under sequential
 *     execution (`parallelSafe: false` for all workout-logger tools).
 *
 * The scheduler calls `getStoreLocation` for every persist path —
 * success, returned-failure, blocked-by-policy, throw-from-execute — so
 * a single tool failure in a multi-workout flow no longer replaces the
 * entire keyed array and drops earlier successful slots. This replaces
 * the earlier middleware approach and the framework-level
 * `inferInputIndex` helper (Bugbot finding f61c3f4b: domain-specific
 * field name shouldn't leak into the shared core).
 */
function makeWorkoutStoreLocation(alias: string) {
  return (
    input: unknown,
    ctx: { resultStore: { getAll: (k: string) => unknown[] | undefined } },
  ): { index?: number } => {
    const explicit = (input as any)?.workoutIndex;
    if (typeof explicit === "number" && Number.isFinite(explicit)) {
      return { index: explicit };
    }
    const existing = ctx.resultStore.getAll(alias) ?? [];
    return { index: existing.length };
  };
}

export class WorkoutLoggerAgentV2 {
  private readonly agent: Agent<WorkoutLoggerContext>;

  constructor(private readonly context: WorkoutLoggerContext) {
    const fullPrompt = buildWorkoutLoggerPrompt(context);

    // Match v1's static/dynamic split for Bedrock prompt caching. v1
    // (workout-logger/agent.ts:344-353) treats the full prompt as static
    // (~90% of tokens — tool descriptions, examples, blocking rules) and
    // a tiny session-specific tail as dynamic. SyncRuntime forwards both
    // when present.
    const dynamicPrompt =
      `\n## CURRENT LOGGING SESSION\n` +
      `- User ID: ${context.userId}\n` +
      `- Images: ${context.imageS3Keys?.length || 0}\n` +
      `- Conversation ID: ${context.conversationId}`;

    const config: AgentConfigV2<WorkoutLoggerContext> = {
      agentId: "workout-logger",
      context,
      runtime: new SyncRuntime<WorkoutLoggerContext>(),
      modelId: MODEL_IDS.PLANNER_MODEL_FULL,
      // staticPrompt + dynamicPrompt enable Bedrock prompt caching; the
      // single-string `systemPrompt` field is documented as fallback-only
      // and `SyncRuntime` resolves it as
      // `input.systemPrompt ?? input.staticPrompt ?? ...`. We omit it
      // here so there's no chance of double-sending if a future runtime
      // refactor mishandles the precedence (Bugbot finding aafdb11c).
      staticPrompt: fullPrompt,
      dynamicPrompt,
      tools: [
        // All Bedrock-calling tools get a 60s ceiling (mirrors the
        // coach-creator/v2 follow-up fix). extract_workout_data gets
        // 180s because multimodal extraction with vision can be slow,
        // especially with the targetedSchema fallback path.
        adaptLegacyTool(detectDisciplineTool, {
          timeoutMs: 60_000,
          getStoreLocation: makeWorkoutStoreLocation("discipline"),
        }),
        adaptLegacyTool(extractWorkoutDataTool, {
          timeoutMs: 180_000,
          getStoreLocation: makeWorkoutStoreLocation("extraction"),
        }),
        adaptLegacyTool(validateWorkoutCompletenessTool, {
          timeoutMs: 60_000,
          getStoreLocation: makeWorkoutStoreLocation("validation"),
        }),
        adaptLegacyTool(normalizeWorkoutDataTool, {
          timeoutMs: 60_000,
          getStoreLocation: makeWorkoutStoreLocation("normalization"),
        }),
        adaptLegacyTool(generateWorkoutSummaryTool, {
          timeoutMs: 60_000,
          getStoreLocation: makeWorkoutStoreLocation("summary"),
        }),
        // save: DDB + Pinecone + 2 fire-and-forget Lambda invokes.
        // 60s gives enough headroom; the redactInput keeps user health
        // data out of the SSE stream / persisted ToolCallRecord.
        adaptLegacyTool(saveWorkoutToDatabaseTool, {
          timeoutMs: 60_000,
          redactInput: true,
          getStoreLocation: makeWorkoutStoreLocation("save"),
        }),
        // compute_date: deterministic date math, no Bedrock, fast.
        // No getStoreLocation — single-call tool, default replace
        // semantics are fine.
        adaptLegacyTool(computeDateTool),
      ],
      resultStoreAliases: STORAGE_KEY_MAP,
      maxIterations: 20,
      policy: {
        blocking: (toolId, toolInput, store) => {
          // Index-aware: each workout has its own validation result.
          // For multi-workout flows the model passes `workoutIndex` on
          // normalize/save, so look up the correct validation by index.
          const workoutIndex = (toolInput as any)?.workoutIndex;
          const rawValidation =
            typeof workoutIndex === "number" && Number.isFinite(workoutIndex)
              ? store.get<unknown>("validation", workoutIndex)
              : store.get<unknown>("validation");
          // adaptLegacyTool wraps thrown exceptions or `{ error }` returns
          // in v2 ToolResult shape (`{ ok: false, code, message, ... }`),
          // which `enforceValidationBlocking` doesn't recognize. Normalize
          // back so the defense-in-depth block fires on validation
          // failures *and* validation exceptions.
          const validation = normaliseLegacyToolResult(rawValidation);
          const decision = enforceValidationBlocking(toolId, validation);
          if (!decision) return null;
          return {
            reason: decision.reason,
            details: { blockingFlags: decision.blockingFlags },
          };
        },
        maxRetries: 1,
        shouldRetry: ({ resultStore, finalText }) => {
          // 1. Don't retry if any save succeeded (single or multi-workout).
          const allSaves = resultStore.getAll<any>("save") ?? [];
          if (
            allSaves.some(
              (s: any) => s && s.success && s.workoutId && !s.duplicate,
            )
          ) {
            return null;
          }

          // 2. Tool-level timeout (per program-designer/v2's eecf4d7
          //    lesson). Treat as infrastructure issue and retry once
          //    with a fresh store + targeted prompt. **Must run BEFORE
          //    the validation-blocked / valid-blocking-response checks**
          //    because Claude's polished post-timeout response often
          //    reads as a valid block ("I was unable to extract the
          //    workout data") and would short-circuit the retry —
          //    Bugbot finding da826b4b. The timeout is a fact about the
          //    store, not the response text, so it's safe to evaluate
          //    first.
          const sawTimeout = Object.values(STORAGE_KEY_MAP).some((alias) => {
            const arr = resultStore.getAll<any>(alias) ?? [];
            return arr.some(
              (r: any) => r && r.ok === false && r.code === "timeout",
            );
          });
          if (sawTimeout) {
            const originalMessage = this.extractOriginalUserMessage();
            const retryPrompt = this.buildRetryPrompt(originalMessage, finalText);
            this.clearStoreForRetry(resultStore);
            return { retryPrompt, reason: "tool_timeout" };
          }

          // 3. Don't retry on explicit validation block (planning,
          //    insufficient_data, etc.). Trust the AI validation
          //    decision — same as v1 (workout-logger/agent.ts:469-476).
          //    Normalise so v2 envelope matches v1 shape.
          const allValidations = resultStore.getAll<unknown>("validation") ?? [];
          const hasExplicitBlock = allValidations.some((raw) => {
            const v = normaliseLegacyToolResult(raw) as any;
            return (
              v &&
              (v.shouldSave === false ||
                (Array.isArray(v.blockingFlags) && v.blockingFlags.length > 0))
            );
          });
          if (hasExplicitBlock) return null;

          // 4. Don't retry if Claude correctly identified non-workout
          //    content and produced a valid blocking response. v1
          //    catalog (workout-logger/agent.ts:530-613) — preserved
          //    verbatim because it carries months of tuned patterns.
          if (isValidBlockingResponse(finalText)) return null;

          // 5. Don't retry if we already have most of the workflow
          //    complete (e.g. extraction succeeded but summary did not —
          //    let the caller surface the partial result via the result
          //    builder).
          const successfulCount = countSuccessfulToolResults(
            resultStore,
            Object.values(STORAGE_KEY_MAP),
          );
          if (successfulCount >= MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW) {
            return null;
          }

          // 6. Retry if no tools were called and the response looks
          //    incomplete (Claude asking a question). v1 catalog
          //    preserved verbatim. Note: v1 only triggers retry when
          //    successfulToolCount === 0; mirror that.
          if (successfulCount > 0) return null;
          if (!isIncompleteWorkflow(finalText)) return null;

          const originalMessage = this.extractOriginalUserMessage();
          // v1 explicitly does NOT clear the store on this branch
          // (workout-logger/agent.ts:407-409) so previously-completed
          // tools' results stay available for retry execution. Don't
          // call clearStoreForRetry here.
          return {
            retryPrompt: this.buildRetryPrompt(originalMessage, finalText),
            reason: "tool_not_called_or_incomplete",
          };
        },
      },
      correlation: {
        conversationId: context.conversationId,
        coachId: context.coachId,
      },
    };

    this.agent = new Agent<WorkoutLoggerContext>(config);
    logger.info(
      "🔥 WorkoutLoggerAgentV2 initialized with prompt-caching support",
    );
  }

  /**
   * Public entry point — equivalent to v1's `logWorkout()`. Returns the
   * same `WorkoutLogResult` shape so the build-workout handler can
   * consume it without changes.
   */
  async logWorkout(
    userMessage: string,
    imageS3Keys?: string[],
  ): Promise<WorkoutLogResult> {
    logger.info("WorkoutLoggerAgentV2 starting", {
      messageLength: userMessage.length,
      hasImages: !!(imageS3Keys && imageS3Keys.length > 0),
      userId: this.context.userId,
      conversationId: this.context.conversationId,
    });
    try {
      const result = await this.agent.run({ userMessage, imageS3Keys });
      // Use last-turn text rather than the accumulated transcript so the
      // regex fallback that pulls a `workout_<id>` out of the assistant's
      // narrative can't false-match an ID mentioned in a tool_use preamble
      // from an earlier turn (Bugbot ec6c75b5; mirrors program-designer's
      // 3fec1de7 fix).
      //
      // No `?? finalResponseText` fallback by design: when the run ends
      // without a terminal turn (e.g. max-iterations exhausted entirely
      // on tool_use turns), `lastTurnResponseText` stays `""` and we
      // *want* the empty string. Falling back to the full transcript
      // would reintroduce the false-match risk above. The downstream
      // result builder already handles `agentResponse === ""` cleanly
      // via its workflow-incomplete branch.
      const built = this.buildResultFromToolData(result.lastTurnResponseText);
      logger.info("WorkoutLoggerAgentV2 completed", {
        success: built.success,
        workoutId: built.workoutId,
        toolsUsed: result.toolsUsed,
        iterations: result.iterations,
      });
      return built;
    } catch (error: unknown) {
      logger.error("WorkoutLoggerAgentV2 error", { error });
      return {
        success: false,
        skipped: true,
        reason:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Build WorkoutLogResult from tool execution data.
   *
   * Mirrors v1's `buildResultFromToolData`
   * (workout-logger/agent.ts:746-927) including the unique
   * duplicate-skip path. Multi-workout aggregation surfaces every
   * successful save in `allWorkouts`.
   */
  private buildResultFromToolData(agentResponse: string): WorkoutLogResult {
    const store = this.agent.getResultStore();

    // Raw arrays preserve sparse holes from positional puts (e.g. saves
    // landed at indices 0 and 2 leave index 1 undefined). Cross-reference
    // lookups like `rawExtractions[primary.originalIndex]` MUST use the
    // raw arrays so the index aligns with the slot the corresponding
    // save was written to. The compacted `allX` views are only safe for
    // length / count / "any defined entry" checks.
    const rawSaves = store.getAll<any>("save") ?? [];
    const rawExtractions = store.getAll<any>("extraction") ?? [];
    const rawValidations = store.getAll<any>("validation") ?? [];
    const rawNormalizations = store.getAll<any>("normalization") ?? [];

    const allSaves = rawSaves.filter((s: any) => s !== undefined);
    const allExtractions = rawExtractions.filter((e: any) => e !== undefined);
    const allValidations = rawValidations.filter((v: any) => v !== undefined);
    const allNormalizations = rawNormalizations.filter(
      (n: any) => n !== undefined,
    );

    const successfulSaves = rawSaves
      .map((save: any, originalIndex: number) => ({ save, originalIndex }))
      .filter(
        (entry) =>
          entry.save &&
          entry.save.success &&
          entry.save.workoutId &&
          !entry.save.duplicate,
      );

    // Tool-level timeout (typically extract_workout_data) is an
    // infrastructure issue, not user-input rejection. Mark skipped:false
    // so the handler doesn't conflate it with planning-detection skips.
    const timedOutAlias = Object.values(STORAGE_KEY_MAP).find((alias) => {
      const arr = store.getAll<any>(alias) ?? [];
      return arr.some((r: any) => r && r.ok === false && r.code === "timeout");
    });
    if (timedOutAlias && successfulSaves.length === 0) {
      return {
        success: false,
        skipped: false,
        reason:
          "Workout logging timed out. This is an infrastructure issue — please retry the request.",
      };
    }

    // Link-failed path: workout was written to DynamoDB but the linkback
    // to the program template failed (S3 transient, retries exhausted).
    // Surface as a structured failure WITHOUT forwarding workoutId so the
    // build-workout handler's missing-workoutId test fires its revert
    // path; otherwise the template sits at status="completed",
    // linkedWorkoutId=null and the UI hangs on "Processing…" until the
    // polling timeout.
    const linkFailedSaves = allSaves.filter(
      (s: any) =>
        s &&
        !s.success &&
        s.workoutId &&
        s.templateLinked === false &&
        !s.duplicate,
    );
    if (
      allSaves.length > 0 &&
      successfulSaves.length === 0 &&
      linkFailedSaves.length === allSaves.length
    ) {
      const firstLinkFailed = linkFailedSaves[0];
      logger.error(
        "❌ Building link-failed result (workout saved to DDB but template linking failed)",
        {
          orphanedWorkoutId: firstLinkFailed.workoutId,
          skipCount: linkFailedSaves.length,
        },
      );
      return {
        success: false,
        skipped: false,
        reason:
          firstLinkFailed.reason ||
          "Workout saved but failed to link to program template — please retry.",
      };
    }

    // Duplicate-skip path: every save attempted but all reported the
    // workout already exists. Surface that explicitly so the caller
    // doesn't fabricate success or fall through to text-parsing.
    const duplicateSkips = allSaves.filter(
      (s: any) => s && s.duplicate && s.skipped,
    );
    if (
      allSaves.length > 0 &&
      successfulSaves.length === 0 &&
      duplicateSkips.length === allSaves.length
    ) {
      const firstDuplicate = duplicateSkips[0];
      logger.info("⚠️ Building duplicate-skip result (no new saves occurred)", {
        skipCount: duplicateSkips.length,
        existingWorkoutId: firstDuplicate.existingWorkoutId,
      });
      // Only surface workoutId when the existing workout was
      // (re)linked to the template. The build-workout handler treats
      // a missing workoutId on the failure path as the signal to
      // revert the optimistic template completion — leaving it set
      // after a failed relink would strand the template at
      // status="completed", linkedWorkoutId=null.
      return {
        success: false,
        skipped: true,
        reason:
          firstDuplicate.reason ||
          "A workout for this session already exists — skipped duplicate save.",
        ...(firstDuplicate.templateLinked
          ? { workoutId: firstDuplicate.existingWorkoutId }
          : {}),
      };
    }

    if (successfulSaves.length > 0) {
      const primary = successfulSaves[0];
      // Index by raw arrays so the slot aligns with `rawSaves`. Fall
      // back to the last *defined* sibling when the positional slot is
      // missing (e.g. validation never ran for this workout but did for
      // a sibling).
      const primaryExtraction = rawExtractions[primary.originalIndex];
      const primaryValidation =
        rawValidations[primary.originalIndex] ??
        allValidations[allValidations.length - 1];
      const primaryNormalization =
        rawNormalizations[primary.originalIndex] ??
        allNormalizations[allNormalizations.length - 1];

      logger.info("✅ Building success result from save tool", {
        totalSaves: allSaves.length,
        successfulSaves: successfulSaves.length,
        primaryIndex: primary.originalIndex,
      });

      const primaryResult: WorkoutLogResult = {
        success: true,
        workoutId: primary.save.workoutId,
        discipline: primaryExtraction?.workoutData?.discipline,
        workoutName: primaryExtraction?.workoutData?.workout_name,
        confidence:
          primaryValidation?.confidence ||
          primaryExtraction?.workoutData?.metadata?.data_confidence,
        completeness: primaryValidation?.completeness,
        extractionMetadata: {
          generationMethod: primaryExtraction?.generationMethod,
          confidence: primaryValidation?.confidence,
        },
        normalizationSummary: primaryNormalization?.normalizationSummary,
      };

      if (successfulSaves.length > 1) {
        primaryResult.allWorkouts = successfulSaves.map((entry) => {
          const extraction = rawExtractions[entry.originalIndex];
          return {
            workoutId: entry.save.workoutId,
            workoutName: extraction?.workoutData?.workout_name,
            discipline: extraction?.workoutData?.discipline,
            saved: true,
          };
        });
        logger.info("📋 Multi-workout aggregation:", {
          totalSaves: allSaves.length,
          totalExtractions: allExtractions.length,
          successfulWorkouts: primaryResult.allWorkouts.length,
          failedSaves: allSaves.length - successfulSaves.length,
        });
      }

      return primaryResult;
    }

    // Validation explicitly blocked save: surface flags + reason.
    const blockedValidation = allValidations.find(
      (v: any) => v && v.shouldSave === false,
    );
    if (blockedValidation) {
      return {
        success: false,
        skipped: true,
        reason: blockedValidation.reason || agentResponse,
        blockingFlags: blockedValidation.blockingFlags,
        confidence: blockedValidation.confidence,
      };
    }

    // No tools called at all — Claude is asking a clarifying question
    // or has produced a free-text response. Surface as skip with the
    // text as the reason. Same shape as v1.
    if (
      allExtractions.length === 0 &&
      allValidations.length === 0 &&
      allNormalizations.length === 0 &&
      allSaves.length === 0
    ) {
      return {
        success: false,
        skipped: true,
        reason: agentResponse || "Agent requested clarification",
      };
    }

    // Partial execution: try the v1 fallback regex match for a workoutId
    // mention in the response text. Rare path but preserved for parity.
    const workoutIdMatch = agentResponse.match(/workout_[a-z0-9_]+/i);
    if (workoutIdMatch) {
      const latestExtraction = allExtractions[allExtractions.length - 1];
      const latestValidation = allValidations[allValidations.length - 1];
      return {
        success: true,
        workoutId: workoutIdMatch[0],
        discipline: latestExtraction?.workoutData?.discipline,
        workoutName: latestExtraction?.workoutData?.workout_name,
        confidence: latestValidation?.confidence,
      };
    }

    return {
      success: false,
      skipped: true,
      reason:
        agentResponse ||
        "Workflow incomplete - could not determine workout log result",
    };
  }

  private extractOriginalUserMessage(): string {
    const history = this.agent.getHistory();
    const firstUser = history.find((msg) => msg.role === "user");
    if (!firstUser) return "";
    if (Array.isArray(firstUser.content)) {
      const textBlock = (firstUser.content as any[]).find(
        (block: any) => typeof block?.text === "string",
      );
      return textBlock?.text ?? "";
    }
    if (typeof firstUser.content === "string") return firstUser.content;
    return "";
  }

  private buildRetryPrompt(
    originalMessage: string,
    aiResponse: string,
  ): string {
    return `CRITICAL OVERRIDE: You did not complete the workflow. This is a FIRE-AND-FORGET system where the user CANNOT respond to questions.

Your incomplete response was: "${aiResponse.substring(0, 200)}..."

You MUST now complete the workflow by:
- Using your tools to extract, validate, normalize, and save the workout
- Making reasonable assumptions for missing information (intensity: 5/10, time: current time, etc.)
- NOT asking questions or requesting clarification
- Proceeding with the data available in the original message

Original message to process:
"${originalMessage}"

Complete the workout logging workflow now using your tools.`;
  }

  /**
   * Clear the result store before a timeout retry. Preserves cheap
   * deterministic results (`discipline`) so the retry round doesn't
   * redundantly re-classify what was already classified — the timeout
   * was almost always in `extract_workout_data` or `save_workout_to_database`.
   * Mirrors program-designer/v2's clearStoreForRetry pattern.
   */
  private clearStoreForRetry(store: ToolResultStore): void {
    const disciplineEntries = store.getAll<unknown>("discipline") ?? [];
    const isPreservable = (r: any) =>
      r && typeof r === "object" && !r.error && r.ok !== false;
    store.clear();
    disciplineEntries.forEach((entry, idx) => {
      if (isPreservable(entry)) {
        store.put("detect_discipline", entry, { index: idx });
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/*  v1 retry decision regex catalogs — preserved verbatim from agent.ts       */
/*  (lines 530-613 and 629-714). Kept as module-level helpers because they    */
/*  are pure functions of the response text and don't depend on agent state.  */
/* -------------------------------------------------------------------------- */

/**
 * Detect when Claude correctly identified non-workout content (planning,
 * advice, reflection, future intent, etc.) and responded with an
 * appropriate blocking message WITHOUT calling tools. This is correct
 * behaviour and must not trigger a retry.
 */
function isValidBlockingResponse(response: string): boolean {
  const responseLower = response.toLowerCase();

  // Pattern 1: Warning emoji with workout-related content (strongest signal)
  const hasWarningEmoji = response.includes("⚠️");
  const hasWorkoutContext =
    responseLower.includes("workout") ||
    responseLower.includes("log") ||
    responseLower.includes("exercise") ||
    responseLower.includes("training");
  if (hasWarningEmoji && hasWorkoutContext) return true;

  // Pattern 2: Negation patterns indicating blocking
  const negationPatterns = [
    /unable to (log|save|record|process|extract|complete)/i,
    /cannot (log|save|record|process|extract|complete)/i,
    /can'?t (log|save|record|process|extract|complete)/i,
    /couldn'?t (log|save|record|process|extract|complete)/i,
    /won'?t be able to (log|save|record|process)/i,
    /not a (workout|completed workout|valid workout|loggable workout)/i,
    /this is(n't| not) a (workout|completed workout|valid workout)/i,
    /doesn'?t (appear|seem|look) (to be |like )?(a )?workout/i,
    /no (workout|performance|exercise|training) data/i,
    /no (actionable|loggable|extractable) (data|information)/i,
    /insufficient (data|information|details|context)/i,
    /missing (data|information|details|required|key|essential)/i,
    /lack(s|ing)? (sufficient |enough |the )?(data|information|details)/i,
    /nothing to (log|save|record|extract)/i,
    /no (data|information|details) to (log|save|extract)/i,
  ];
  if (negationPatterns.some((p) => p.test(response))) return true;

  // Pattern 3: Non-workout content type identification
  const nonWorkoutTypes = [
    /this is (a |an )?(planning|reflection|advice|question|inquiry)/i,
    /(planning|future|upcoming) (question|request|inquiry|workout|session)/i,
    /workout.*(you'?re |you are )?(planning|going to|will|intend)/i,
    /plan(ning)? to (do|complete|perform)/i,
    /(asking|seeking|looking) (for )?(advice|help|guidance|recommendations)/i,
    /question about (workout|training|exercise|fitness)/i,
    /advice (on|about|regarding|for)/i,
    /reflect(ion|ing) (on|about)/i,
    /thinking (about|back on)/i,
    /remember(ing)? (when|that|my)/i,
    /not (a )?(completed|finished|done) workout/i,
    /workout.*(not|hasn'?t|wasn'?t).*(completed|finished|done)/i,
    /haven'?t (yet )?(completed|finished|done)/i,
    /future (workout|training|intention|plan)/i,
    /(tomorrow|next|later|upcoming).*(workout|training|session)/i,
    /going to (do|complete|perform|try)/i,
    /will (do|complete|perform|try)/i,
    /intend(ing)? to/i,
  ];
  if (nonWorkoutTypes.some((p) => p.test(response))) return true;

  // Pattern 4: Explicit blocking statements
  const explicitBlocking = [
    /i (can'?t|cannot|won'?t|am unable to) (log|save|record) this/i,
    /this (message|request|input) (is|isn'?t|does|doesn'?t)/i,
    /not (a )?valid (workout )?log/i,
    /no (valid |actual )?(workout|exercise) (was )?(performed|completed|done)/i,
    /only (log|save|record) (completed|actual|real) workouts/i,
  ];
  if (explicitBlocking.some((p) => p.test(response))) return true;

  return false;
}

/**
 * Detect when Claude is asking a clarifying question or otherwise stalled
 * on a request that needs user input. Triggers a retry that pushes the
 * model to make assumptions and proceed.
 */
function isIncompleteWorkflow(response: string): boolean {
  // Pattern 1: Direct questions
  if (response.includes("?")) return true;

  // Pattern 2: Request / clarification phrases
  const requestPatterns = [
    /could you (please )?(provide|share|tell|give|clarify|specify|confirm)/i,
    /can you (please )?(provide|share|tell|give|clarify|specify|confirm)/i,
    /would you (please )?(provide|share|tell|give|clarify|specify|confirm)/i,
    /will you (please )?(provide|share|tell|give|clarify|specify|confirm)/i,
    /please (provide|share|confirm|clarify|tell|specify|give|let me know)/i,
    /need (more |additional )?(information|details|data|context|specifics)/i,
    /require (more |additional )?(information|details|data|context)/i,
    /looking for (more |additional )?(information|details|data|specifics)/i,
  ];
  if (requestPatterns.some((p) => p.test(response))) return true;

  // Pattern 3: Confirmation requests
  const confirmationPatterns = [
    /(can|could|would|will) you (please )?confirm/i,
    /please (confirm|verify|validate|check)/i,
    /(confirm|verify|validate) (that|this|the|if|whether)/i,
    /let me know (if|when|what|which|whether|about)/i,
    /get back to me/i,
    /respond (with|when|if)/i,
    /await(ing)? (your|a|the) (response|reply|confirmation|answer)/i,
    /waiting (for|on) (your|a|the)/i,
  ];
  if (confirmationPatterns.some((p) => p.test(response))) return true;

  // Pattern 4: Incomplete action indicators
  const incompletePatterns = [
    /i (need|require|would need|will need) (to|more|additional)/i,
    /i'?d need (to|more|additional)/i,
    /should i (proceed|continue|assume|go ahead|start|begin)/i,
    /shall i (proceed|continue|assume|go ahead|start|begin)/i,
    /do you want me to (proceed|continue|assume|go ahead)/i,
    /before i (can|could|am able to|proceed|continue)/i,
    /in order to (log|save|process|extract|complete)/i,
    /to (proceed|continue|complete), i (need|require|would need)/i,
    /once you (provide|share|confirm|tell|give|specify)/i,
    /when you (provide|share|confirm|tell|give|specify)/i,
    /after you (provide|share|confirm|tell|give|specify)/i,
    /if you (provide|share|confirm|tell|give|specify)/i,
  ];
  if (incompletePatterns.some((p) => p.test(response))) return true;

  // Pattern 5: Conditional / dependent statements paired with a "then I'd
  // proceed" tail — only counts when both halves match.
  const conditionalPatterns = [
    /if (you |this |the |that )/i,
    /assuming (you |this |the |that )/i,
    /depending on/i,
    /based on (your|the|what)/i,
    /without (more |additional |further |this |the )/i,
  ];
  const hasConditional = conditionalPatterns.some((p) => p.test(response));
  const suggestsWaiting =
    /then i (can|could|will|would)/i.test(response) ||
    /i (can|could|will|would) (then|proceed|continue)/i.test(response);
  if (hasConditional && suggestsWaiting) return true;

  return false;
}

// Exported for the tests so they can exercise the regex catalogs in
// isolation without standing up a full Agent / runtime.
export const __test = { isValidBlockingResponse, isIncompleteWorkflow };
