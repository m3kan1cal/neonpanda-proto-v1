/**
 * Coach Creator Agent — v2 framework migration.
 *
 * Drop-in replacement for `CoachCreatorAgent` (in `./agent.ts`) that runs on
 * the v2 framework: declarative AgentPolicy for blocking + retry, shared
 * ToolResultStore (semantic aliases), parallel scheduler for the
 * personality+methodology pair, structured RunMetrics + correlation
 * propagation. v1 tools are wrapped via `adaptLegacyTool` so we don't have
 * to rewrite all eight in Zod for the migration; per-tool Zod rewrites
 * happen incrementally.
 *
 * Selection between v1 and v2 is gated by `AGENT_V2_COACH_CREATOR=true` in
 * the build-coach-config Lambda env. v1 stays untouched as the rollback.
 *
 * Phase 3 — see plan §8.
 */

import { Agent, type AgentConfigV2 } from "../core/v2/agent";
import { adaptLegacyTool } from "../core/v2/tools/legacy-adapter";
import { SyncRuntime } from "../core/v2/runtime/sync-runtime";
import {
  normaliseLegacyToolResult,
  countSuccessfulToolResults,
} from "../core/v2/legacy-result-helpers";
import {
  loadSessionRequirementsTool,
  selectPersonalityTemplateTool,
  selectMethodologyTemplateTool,
  generateCoachPromptsTool,
  assembleCoachConfigTool,
  validateCoachConfigTool,
  normalizeCoachConfigTool,
  saveCoachConfigToDatabaseTool,
} from "./tools";
import { buildCoachCreatorPrompt } from "./prompts";
import { enforceValidationBlocking } from "./helpers";
import type { CoachCreatorContext, CoachCreatorResult } from "./types";
import { MODEL_IDS } from "../../api-helpers";
import { logger } from "../../logger";

/**
 * Tool ID -> semantic storage key. Mirrors v1's STORAGE_KEY_MAP exactly so
 * existing tools that read prior outputs via `getToolResult(key)` keep
 * working unchanged. The v2 ToolResultStore handles the alias rewrite.
 */
const STORAGE_KEY_MAP: Record<string, string> = {
  load_session_requirements: "requirements",
  select_personality_template: "personality_selection",
  select_methodology_template: "methodology_selection",
  generate_coach_prompts: "coach_prompts",
  assemble_coach_config: "assembled_config",
  validate_coach_config: "validation",
  normalize_coach_config: "normalization",
  save_coach_config_to_database: "save",
};

const MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW = 5;

export class CoachCreatorAgentV2 {
  private readonly agent: Agent<CoachCreatorContext>;
  private readonly creationTimestamp: string;

  constructor(private readonly context: CoachCreatorContext) {
    this.creationTimestamp = new Date().toISOString();

    const fullPrompt = buildCoachCreatorPrompt(context);

    const config: AgentConfigV2<CoachCreatorContext> = {
      agentId: "coach-creator",
      context,
      runtime: new SyncRuntime<CoachCreatorContext>(),
      modelId: MODEL_IDS.PLANNER_MODEL_FULL,
      staticPrompt: fullPrompt,
      dynamicPrompt:
        `\n## CURRENT CREATION SESSION\n` +
        `- User ID: ${context.userId}\n` +
        `- Session ID: ${context.sessionId}\n` +
        `- Timestamp: ${this.creationTimestamp}`,
      tools: [
        adaptLegacyTool(loadSessionRequirementsTool),
        // Most of these tools call Bedrock internally (personality/methodology
        // selection, prompt generation, coach name generation in assemble,
        // AI validation in validate, callBedrockApi in normalize). The
        // legacy-adapter default is 25s; the framework's own guidance is
        // "Use 60_000+ for tools that call Bedrock." Bumping these to 60s
        // so coach creation doesn't time out under normal production
        // latency once AGENT_V2_COACH_CREATOR is flipped on.
        // personality + methodology selection are independent and can run
        // concurrently when the model emits both in a single tool_use turn.
        adaptLegacyTool(selectPersonalityTemplateTool, {
          parallelSafe: true,
          timeoutMs: 60_000,
        }),
        adaptLegacyTool(selectMethodologyTemplateTool, {
          parallelSafe: true,
          timeoutMs: 60_000,
        }),
        // generate_coach_prompts measured 50–56s in production (one Sonnet
        // call producing 7 prompts, ~5K output tokens). 60s left only
        // 4–10s of headroom against p99 Bedrock latency — bumped to 120s
        // so a slow Bedrock turn doesn't spuriously trip the scheduler
        // timeout and fail the whole workflow.
        adaptLegacyTool(generateCoachPromptsTool, { timeoutMs: 120_000 }),
        adaptLegacyTool(assembleCoachConfigTool, { timeoutMs: 60_000 }),
        adaptLegacyTool(validateCoachConfigTool, { timeoutMs: 60_000 }),
        // normalize_coach_config issues up to 7 Nova-Lite calls when
        // validation flags fixes. Measured 24s in the worst observed run;
        // 90s gives headroom for fan-out + per-call variance.
        adaptLegacyTool(normalizeCoachConfigTool, { timeoutMs: 90_000 }),
        // save tool writes to DDB + Pinecone; 60s gives safe headroom over
        // the 25s default if Pinecone is slow.
        adaptLegacyTool(saveCoachConfigToDatabaseTool, { timeoutMs: 60_000 }),
      ],
      resultStoreAliases: STORAGE_KEY_MAP,
      // save_coach_config_to_database is the workflow's terminal action;
      // we read the saved record straight out of the result store in
      // buildResultFromToolData, so the otherwise-required post-tool
      // model acknowledgement turn is pure overhead (~10s and a full
      // Sonnet round-trip per coach creation). Short-circuit it.
      terminalTools: ["save_coach_config_to_database"],
      maxIterations: 20,
      policy: {
        blocking: (toolId, _input, store) => {
          // Validation result is stored under the alias `validation` because
          // STORAGE_KEY_MAP rewrites `validate_coach_config` -> `validation`.
          // adaptLegacyTool wraps thrown exceptions or `{ error }` returns
          // in v2 ToolResult shape (`{ ok: false, code, message, ... }`),
          // which `enforceValidationBlocking` doesn't recognize. Normalize
          // back to v1's `{ error }` shape so the defense-in-depth block
          // fires on validation failures *and* validation exceptions.
          const raw = store.get<any>("validation");
          const validation = normaliseLegacyToolResult(raw);
          const decision = enforceValidationBlocking(toolId, validation);
          if (!decision) return null;
          return {
            reason: decision.reason,
            details: { validationIssues: decision.validationIssues },
          };
        },
        maxRetries: 1,
        shouldRetry: ({ toolsUsed, resultStore, finalText }) => {
          // Mirror v1 logic: count successful tool results, retry if below
          // threshold AND the model's final text reads incomplete.
          const successfulCount = countSuccessfulToolResults(resultStore, Object.values(STORAGE_KEY_MAP));
          if (successfulCount >= MIN_REQUIRED_TOOLS_FOR_COMPLETE_WORKFLOW) {
            return null;
          }
          if (resultStore.has("save")) {
            const save = resultStore.get<any>("save");
            if (save?.success && save?.coachConfigId) return null;
          }
          const lower = finalText.toLowerCase();
          const looksIncomplete =
            finalText.includes("?") ||
            lower.includes("need to") ||
            lower.includes("should i") ||
            lower.includes("would you like") ||
            lower.includes("can you confirm");
          if (!looksIncomplete) return null;
          return {
            retryPrompt: this.buildRetryPrompt(finalText, resultStore),
            reason: "tool_not_called_or_incomplete",
          };
        },
      },
      correlation: {
        sessionId: context.sessionId,
      },
    };

    this.agent = new Agent<CoachCreatorContext>(config);
    logger.info("CoachCreatorAgentV2 initialized");
  }

  /**
   * Public entry point — equivalent to v1's `createCoach()`. Returns the
   * same `CoachCreatorResult` shape so the build-coach-config handler can
   * consume it without changes.
   */
  async createCoach(): Promise<CoachCreatorResult> {
    logger.info("CoachCreatorAgentV2 starting", {
      userId: this.context.userId,
      sessionId: this.context.sessionId,
    });
    try {
      const userMessage = `Create a personalized AI fitness coach for this user. Use timestamp: ${this.creationTimestamp}`;
      const result = await this.agent.run({ userMessage });
      const built = this.buildResultFromToolData(result.finalResponseText);
      logger.info("CoachCreatorAgentV2 completed", {
        success: built.success,
        coachConfigId: built.coachConfigId,
        toolsUsed: result.toolsUsed,
        iterations: result.iterations,
      });
      return built;
    } catch (error: unknown) {
      logger.error("CoachCreatorAgentV2 error", { error });
      return {
        success: false,
        skipped: true,
        reason:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  private buildResultFromToolData(agentResponse: string): CoachCreatorResult {
    const store = this.agent.getResultStore();
    const requirements = store.get<any>("requirements");
    const personalitySelection = store.get<any>("personality_selection");
    const methodologySelection = store.get<any>("methodology_selection");
    // Normalise v2 failure envelopes (`{ ok: false, code, message }`) back
    // to the v1 shape so the `isValid: false` branch below also fires when
    // the validate tool *threw* rather than returned a structured failure.
    const validation = normaliseLegacyToolResult(store.get<any>("validation")) as any;
    const save = store.get<any>("save");

    if (save?.success && save?.coachConfigId) {
      return {
        success: true,
        coachConfigId: save.coachConfigId,
        coachName: save.coachName,
        primaryPersonality: personalitySelection?.primaryTemplate,
        primaryMethodology: methodologySelection?.primaryMethodology,
        genderPreference: requirements?.genderPreference,
        generationMethod: "tool",
        pineconeStored: save.pineconeStored,
        pineconeRecordId: save.pineconeRecordId,
      };
    }

    if (validation && validation.isValid === false) {
      return {
        success: false,
        skipped: true,
        reason: `Coach validation failed: ${
          validation.validationIssues?.join(", ") || "Unknown issues"
        }`,
        validationIssues: validation.validationIssues,
      };
    }

    if (
      !requirements &&
      !personalitySelection &&
      !validation &&
      !save
    ) {
      return {
        success: false,
        skipped: true,
        reason:
          agentResponse || "Agent workflow incomplete - no tools called",
      };
    }

    return {
      success: false,
      skipped: true,
      reason:
        agentResponse ||
        "Workflow incomplete - coach was not saved to database",
    };
  }

  private buildRetryPrompt(
    aiResponse: string,
    resultStore: ReturnType<Agent<CoachCreatorContext>["getResultStore"]>,
  ): string {
    const has = (key: string) => {
      const r = resultStore.get<any>(key);
      if (!r || typeof r !== "object") return false;
      // v1 stored failures as `{ error: <truthy msg> }`; v2's adaptLegacyTool
      // stores them as `{ ok: false, code, message }`. Match the adapter's
      // truthiness check (not key-presence) so success-shape objects that
      // incidentally carry `error: null` / `error: false` (e.g. methodology
      // lookups) aren't miscounted as failures and re-instructed to the
      // model as "not done yet".
      if (r.error) return false;
      if (r.ok === false) return false;
      return true;
    };
    return `CRITICAL OVERRIDE: You did not complete the coach creation workflow.

Your previous response: "${aiResponse.substring(0, 200)}..."

You MUST now complete the workflow by calling ALL required tools:
1. load_session_requirements ${has("requirements") ? "(✓ ALREADY DONE)" : ""}
2. select_personality_template ${has("personality_selection") ? "(✓ ALREADY DONE)" : ""}
3. select_methodology_template ${has("methodology_selection") ? "(✓ ALREADY DONE)" : ""}
4. generate_coach_prompts ${has("coach_prompts") ? "(✓ ALREADY DONE)" : ""}
5. assemble_coach_config ${has("assembled_config") ? "(✓ ALREADY DONE)" : ""}
6. validate_coach_config
7. normalize_coach_config (if needed)
8. save_coach_config_to_database

CRITICAL INSTRUCTIONS:
- DO NOT ask any questions
- CALL YOUR TOOLS to create and save the coach
- Make reasonable assumptions for any missing information
- Use timestamp: ${this.creationTimestamp}

Now create the coach using your tools.`;
  }
}

// `normaliseLegacyToolResult` and `countSuccessfulToolResults` live in
// core/v2/legacy-result-helpers.ts so coach-creator and program-designer
// share the same translation logic — see imports at the top of this file.
