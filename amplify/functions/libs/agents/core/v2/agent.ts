/**
 * Agent<TContext> — the v2 orchestrator. Hosts the ReAct loop, tool
 * dispatch, blocking/retry policy, result store, metrics, and correlation
 * propagation. Pluggable runtime adapter (sync or streaming) decides how
 * each turn talks to Bedrock.
 *
 * Phase 1 — see plan §1.
 */

import type { AgentContext, AgentMessage } from "../types";
import { MESSAGE_TYPES } from "../../../coach-conversation/types";
import type {
  Tool,
  ToolCallRecord,
  ToolExecutionContext,
  ToolResult,
} from "./tools/tool-types";
import {
  ToolScheduler,
  type BlockingDecision,
  type ParsedToolUse,
  type ScheduledResult,
} from "./tools/tool-scheduler";
import { ToolResultStore } from "./tools/tool-result-store";
import type { RuntimeAdapter, ModelTurn } from "./runtime/runtime";
import type {
  StreamingRuntimeAdapter,
  TurnStreamEvent,
} from "./runtime/streaming-runtime";
import type { AgentEvent } from "./events/events";
import { RunMetrics } from "./observability/metrics";
import {
  correlationStore,
  type CorrelationContext,
} from "./observability/correlation";
import { generateEntityId } from "../../../id-utils";
import { buildMultimodalContent } from "../../../streaming/multimodal-helpers";
import { logger } from "../../../logger";
import { MODEL_IDS } from "../../../api-helpers";

const DEFAULT_MAX_ITERATIONS = 20;

export interface RetryDecision {
  retryPrompt: string;
  /** Free-form tag emitted in the retry log. */
  reason?: string;
}

export interface AgentPolicy<TContext extends AgentContext> {
  /** Synchronous (or async) blocking decision. Return `null` to allow the
   *  call. Triggered before any middleware on the tool itself. */
  blocking?: (
    toolId: string,
    toolInput: unknown,
    resultStore: ToolResultStore,
    agentContext: TContext,
  ) => BlockingDecision | Promise<BlockingDecision>;
  /** Workflow-level retry decision. Called after the loop ends with a
   *  non-error stop reason; if it returns a prompt, we feed that prompt
   *  back to the model and run one more round. Capped by `maxRetries`. */
  shouldRetry?: (snapshot: {
    toolsUsed: string[];
    resultStore: ToolResultStore;
    finalText: string;
    iterations: number;
  }) => RetryDecision | null;
  /** Default 1. */
  maxRetries?: number;
}

export interface AgentRunInput {
  userMessage: string;
  imageS3Keys?: string[];
  documentS3Keys?: string[];
}

export interface AgentRunResult {
  status: "ok" | "max_iterations" | "stopped" | "paused" | "error";
  /**
   * All assistant text the run produced, concatenated across every
   * iteration — including preambles emitted on intermediate `tool_use`
   * turns. Mirrors what was streamed to the client in the streaming
   * runtime. Use this for full-transcript display.
   */
  finalResponseText: string;
  /**
   * Text from the most recent terminal (non-`tool_use`) turn only. The
   * v1 `Agent.converse()` API returned this directly; v2 surfaces it
   * alongside `finalResponseText` so callers that need to mirror v1
   * semantics — surfacing a clean reason string, parsing for an entity
   * id, etc. — don't have to scan a multi-turn haystack.
   */
  lastTurnResponseText: string;
  iterations: number;
  toolsUsed: string[];
  toolCalls: ToolCallRecord[];
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens?: number;
  modelId: string;
  /** Set when stopped because of an error or guardrail. */
  errorMessage?: string;
}

export interface AgentConfigV2<TContext extends AgentContext> {
  agentId: string;
  context: TContext;
  tools: Tool<TContext>[];
  modelId?: string;
  staticPrompt?: string;
  dynamicPrompt?: string;
  /** Used only when `staticPrompt`/`dynamicPrompt` are not set. */
  systemPrompt?: string;
  maxIterations?: number;
  policy?: AgentPolicy<TContext>;
  resultStoreAliases?: Record<string, string>;
  /** Pluggable runtime — `SyncRuntime` for sync, `StreamingRuntime`
   *  (Phase 2) when running through `Agent.runStream()`. */
  runtime: RuntimeAdapter<TContext>;
  /** Optional correlation fields (userId, conversationId, etc.) propagated
   *  via AsyncLocalStorage. The agent always overrides `agentRunId` and
   *  `iteration` itself. */
  correlation?: Partial<CorrelationContext>;
}

export class Agent<TContext extends AgentContext = AgentContext> {
  protected readonly runId: string;
  protected readonly history: AgentMessage[] = [];
  protected readonly resultStore: ToolResultStore;
  protected readonly metrics = new RunMetrics();
  protected readonly toolCalls: ToolCallRecord[] = [];
  protected readonly toolsUsed: string[] = [];
  protected readonly scheduler: ToolScheduler<TContext>;
  protected currentIteration = 0;
  protected fullResponseText = "";
  /** Text emitted by the most recent terminal (non-tool_use) turn. v1's
   *  shouldRetryWorkflow inspected only the final converse() return; the
   *  accumulator above includes every turn's text including preambles, so
   *  use this for v1-equivalent retry heuristics. */
  protected lastTurnResponseText = "";
  protected inputTokens = 0;
  protected outputTokens = 0;
  protected cacheReadInputTokens = 0;
  protected modelId: string;

  constructor(protected readonly config: AgentConfigV2<TContext>) {
    this.runId = generateEntityId("run", config.context.userId);
    this.resultStore = new ToolResultStore(config.resultStoreAliases);
    this.scheduler = new ToolScheduler(config.tools, this.metrics);
    this.modelId = config.modelId ?? MODEL_IDS.PLANNER_MODEL_FULL;
  }

  /* ----------------------------- Public API ----------------------------- */

  async run(input: AgentRunInput): Promise<AgentRunResult> {
    const baseCorr: CorrelationContext = {
      userId: this.config.context.userId,
      agentId: this.config.agentId,
      agentRunId: this.runId,
      iteration: 0,
      ...this.config.correlation,
    };
    return correlationStore.run(baseCorr, () => this.runInner(input));
  }

  /**
   * Streaming run. Yields AgentEvent values as the model produces text and
   * as tools execute; returns the final AgentRunResult once complete.
   *
   * Requires the configured runtime to implement `invokeTurnStream`. Use
   * `formatAgentEventToSSE` (in `core/v2/runtime/sse-formatter`) to
   * serialise events for an SSE response.
   *
   * Note: AsyncLocalStorage doesn't reliably propagate across `yield`
   * boundaries in async generators, so streaming runs don't inject
   * correlation IDs into nested log lines. The final `agent.run.completed`
   * line still carries the run-level correlation via the metrics emitter.
   */
  async *runStream(
    input: AgentRunInput,
  ): AsyncGenerator<AgentEvent, AgentRunResult, void> {
    const runtime = this.config.runtime as Partial<StreamingRuntimeAdapter<TContext>>;
    if (typeof runtime.invokeTurnStream !== "function") {
      throw new Error(
        "Agent.runStream() requires a runtime that implements invokeTurnStream (use StreamingRuntime).",
      );
    }
    return yield* this.streamInner(input, runtime as StreamingRuntimeAdapter<TContext>);
  }

  getRunId(): string {
    return this.runId;
  }
  getToolCalls(): ToolCallRecord[] {
    return this.toolCalls;
  }
  getToolsUsed(): string[] {
    return this.toolsUsed;
  }
  getResultStore(): ToolResultStore {
    return this.resultStore;
  }
  getFullResponseText(): string {
    return this.fullResponseText;
  }
  getHistory(): AgentMessage[] {
    return this.history;
  }
  getMetrics(): RunMetrics {
    return this.metrics;
  }

  /* ------------------------------ Run loop ------------------------------ */

  protected async runInner(input: AgentRunInput): Promise<AgentRunResult> {
    const userContent = await this.buildUserContent(input);
    this.history.push({ role: "user", content: userContent });

    const max = this.config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    let stopReason: ModelTurn["stopReason"] | null = null;
    let errorMessage: string | undefined;

    try {
      stopReason = await this.runLoop(max);

      // Discriminated return: undefined = no retry attempted (keep
      // current stopReason); otherwise the retry's terminal stopReason
      // (which may itself be null when the retry hit max-iter). The
      // earlier `if (retryStatus)` check conflated the two and reported
      // a max-iter retry as "ok".
      const retryOutcome = await this.maybeRetry(stopReason, max);
      if (retryOutcome !== undefined) stopReason = retryOutcome;
    } catch (error: any) {
      errorMessage = error?.message ?? String(error);
      logger.error("agent.run.error", { runId: this.runId, errorMessage });
      this.emitMetrics({ status: "error" });
      return this.buildResult("error", errorMessage);
    }

    const status: AgentRunResult["status"] =
      stopReason === "end_turn" || stopReason === "stop_sequence"
        ? "ok"
        : this.currentIteration >= max
          ? "max_iterations"
          : "stopped";

    this.emitMetrics({ status });
    return this.buildResult(status, errorMessage);
  }

  /** Returns the stopReason of the final turn, or null if max-iter was hit. */
  protected async runLoop(max: number): Promise<ModelTurn["stopReason"] | null> {
    while (this.currentIteration < max) {
      this.currentIteration++;
      this.metrics.iterations = this.currentIteration;

      const turn = await correlationStore.run(
        { ...correlationStore.getStore()!, iteration: this.currentIteration },
        () => this.config.runtime.invokeTurn(this.invokeInput()),
      );
      this.modelId = turn.modelId;
      this.inputTokens += turn.usage.inputTokens;
      this.outputTokens += turn.usage.outputTokens;
      this.cacheReadInputTokens += turn.usage.cacheReadInputTokens ?? 0;

      // Accumulate text BEFORE stripping so contentOffset on tool-call
      // records reflects everything the user-facing layer would have seen
      // (matches the streaming path's delta accumulator). On the streaming
      // path this happens incrementally in streamTurn; here we accumulate
      // the whole turn's text in one shot.
      this.fullResponseText += extractTextFromContent(turn.assistantContent);

      // Same preamble handling as the streaming path: on tool_use turns,
      // strip leading text blocks before pushing to history so the model
      // doesn't repeat the preamble after the tool result lands.
      const isToolUse = turn.stopReason === "tool_use";
      const contentToAppend = isToolUse
        ? stripLeadingTextBlocks(turn.assistantContent)
        : turn.assistantContent;
      this.appendAssistantContent(contentToAppend);

      // Terminal turn: snapshot just this turn's text. Used by the retry
      // policy to mirror v1's `shouldRetryWorkflow(result, response)`,
      // which received only the final converse() return — not preamble
      // text from earlier tool_use turns.
      if (!isToolUse) {
        this.lastTurnResponseText = extractTextFromContent(
          turn.assistantContent,
        );
      }

      if (turn.stopReason === "tool_use") {
        await this.dispatchTools(turn.assistantContent);
        continue;
      }
      return turn.stopReason;
    }
    return null;
  }

  /**
   * Returns `undefined` when no retry was attempted (caller keeps the
   * original stopReason). Returns the retry's terminal stopReason
   * otherwise — which may be `null` if the retry hit `max` iterations.
   * The `undefined` sentinel lets the caller distinguish "no retry
   * needed" from "retry attempted and exhausted iterations" so the run
   * status reports `max_iterations` correctly in the latter case.
   */
  protected async maybeRetry(
    stopReason: ModelTurn["stopReason"] | null,
    max: number,
  ): Promise<ModelTurn["stopReason"] | null | undefined> {
    const policy = this.config.policy;
    if (!policy?.shouldRetry) return undefined;
    if (stopReason !== "end_turn" && stopReason !== "stop_sequence") return undefined;

    const cap = policy.maxRetries ?? 1;
    let retries = 0;
    let last: ModelTurn["stopReason"] | null = stopReason;
    let ranAtLeastOneRetry = false;

    while (retries < cap && this.currentIteration < max) {
      const decision = policy.shouldRetry({
        toolsUsed: this.toolsUsed,
        resultStore: this.resultStore,
        // v1 parity: only the most recent terminal turn's text, not the
        // accumulator (which would include preambles from earlier
        // tool_use turns and could spuriously trip the looksIncomplete
        // heuristic).
        finalText: this.lastTurnResponseText,
        iterations: this.currentIteration,
      });
      if (!decision) break;

      retries++;
      ranAtLeastOneRetry = true;
      this.metrics.toolRetries++;
      logger.info("agent.run.retry", {
        runId: this.runId,
        retry: retries,
        reason: decision.reason,
      });
      this.history.push({
        role: "user",
        content: [{ text: decision.retryPrompt }],
      });
      last = await this.runLoop(max);
    }
    return ranAtLeastOneRetry ? last : undefined;
  }

  /* --------------------------- Helpers (loop) --------------------------- */

  protected invokeInput() {
    return {
      history: this.history,
      staticPrompt: this.config.staticPrompt,
      dynamicPrompt: this.config.dynamicPrompt,
      systemPrompt: this.config.systemPrompt,
      tools: this.config.tools,
      modelId: this.modelId,
    };
  }

  protected appendAssistantContent(content: any[]): void {
    this.history.push({ role: "assistant", content });
  }

  protected async dispatchTools(assistantContent: any[]): Promise<void> {
    const uses = this.extractToolUses(assistantContent);
    if (uses.length === 0) return;

    const policy = this.config.policy;
    // Match the scheduler's BlockingFn signature `(toolId, toolInput, ctx)`
    // exactly and source `resultStore` / `agentContext` from the
    // ToolExecutionContext rather than capturing `this.*`. Functionally
    // equivalent (the scheduler builds ctx from this same instance) but
    // the type contract is now honoured end-to-end.
    const blockingFn = policy?.blocking
      ? (toolId: string, toolInput: unknown, ctx: ToolExecutionContext<TContext>) =>
          policy.blocking!(toolId, toolInput, ctx.resultStore as ToolResultStore, ctx.agentContext)
      : undefined;

    const scheduled = await this.scheduler.execute(
      uses,
      (toolUseId, signal) => ({
        agentContext: this.config.context,
        resultStore: this.resultStore,
        toolUseId,
        signal,
        iteration: this.currentIteration,
      }),
      blockingFn,
    );

    const toolResultBlocks = scheduled.map((s) => this.toResultBlock(s));
    this.history.push({ role: "user", content: toolResultBlocks });

    for (const s of scheduled) {
      this.recordToolCall(s, uses);
      // resultStore writes happen inside the scheduler so blocking
      // callbacks for later tools in the same tool_use turn observe
      // earlier tools' results (defense-in-depth on validate+save).
      this.toolsUsed.push(s.toolName);
    }
  }

  protected recordToolCall(
    s: ScheduledResult,
    uses: ParsedToolUse[],
  ): ToolCallRecord {
    const tool = this.config.tools.find((t) => t.id === s.toolName);
    const matchingUse = uses.find((u) => u.toolUseId === s.toolUseId);
    const status: ToolCallRecord["status"] = s.result.ok
      ? "complete"
      : "error";
    const record: ToolCallRecord = {
      toolUseId: s.toolUseId,
      toolName: s.toolName,
      status,
      iteration: this.currentIteration,
      contentOffset: this.fullResponseTextSoFar().length,
      startedAtMs: Date.now() - s.durationMs,
      durationMs: s.durationMs,
      toolInput: tool?.redactInput ? undefined : matchingUse?.input,
      resultSummary: s.result.ok ? s.result.summary : undefined,
      errorMessage: !s.result.ok
        ? s.result.code === "human_input_required"
          ? s.result.prompt
          : s.result.message
        : undefined,
      errorCode: !s.result.ok ? s.result.code : undefined,
    };
    this.toolCalls.push(record);
    return record;
  }

  protected toResultBlock(s: ScheduledResult): any {
    if (s.result.ok) {
      const conversationContent =
        s.result.conversationSummary ?? s.result.data;
      return {
        toolResult: {
          toolUseId: s.toolUseId,
          content: [{ json: conversationContent }],
          status: "success",
        },
      };
    }

    const errorPayload = errorPayloadFor(s.result);
    return {
      toolResult: {
        toolUseId: s.toolUseId,
        content: [{ json: errorPayload }],
        status: "error",
      },
    };
  }

  protected extractToolUses(assistantContent: any[]): ParsedToolUse[] {
    const out: ParsedToolUse[] = [];
    for (const block of assistantContent) {
      if (block?.toolUse) {
        out.push({
          toolUseId: block.toolUse.toolUseId,
          toolName: block.toolUse.name,
          input: block.toolUse.input,
        });
      }
    }
    return out;
  }

  protected collectAssistantText(): string {
    let buf = "";
    for (const msg of this.history) {
      if (msg.role !== "assistant" || !Array.isArray(msg.content)) continue;
      for (const block of msg.content as any[]) {
        if (typeof block?.text === "string") {
          if (buf.length > 0) buf += "\n";
          buf += block.text;
        }
      }
    }
    return buf;
  }

  protected fullResponseTextSoFar(): string {
    // Use the live accumulator instead of recomputing from history. History
    // has had `stripLeadingTextBlocks` applied on tool_use iterations, so
    // collectAssistantText() under-counts; the accumulator mirrors what was
    // actually streamed/produced in order.
    return this.fullResponseText;
  }

  protected async buildUserContent(input: AgentRunInput): Promise<any> {
    const hasImages = input.imageS3Keys && input.imageS3Keys.length > 0;
    const hasDocs = input.documentS3Keys && input.documentS3Keys.length > 0;
    if (!hasImages && !hasDocs) {
      return [{ text: input.userMessage }];
    }

    const messageType = hasImages
      ? hasDocs
        ? MESSAGE_TYPES.TEXT_WITH_ATTACHMENTS
        : MESSAGE_TYPES.TEXT_WITH_IMAGES
      : MESSAGE_TYPES.TEXT_WITH_ATTACHMENTS;

    const multimodal = await buildMultimodalContent([
      {
        role: "user",
        content: input.userMessage,
        messageType,
        imageS3Keys: input.imageS3Keys,
        documentS3Keys: input.documentS3Keys,
      },
    ] as any);
    return multimodal[0]?.content ?? [{ text: input.userMessage }];
  }

  protected emitMetrics(extra: Record<string, unknown>): void {
    this.metrics.inputTokens = this.inputTokens;
    this.metrics.outputTokens = this.outputTokens;
    this.metrics.cacheReadInputTokens = this.cacheReadInputTokens;
    this.metrics.emit({
      agentId: this.config.agentId,
      runId: this.runId,
      modelId: this.modelId,
      ...extra,
    });
  }

  protected buildResult(
    status: AgentRunResult["status"],
    errorMessage?: string,
  ): AgentRunResult {
    return {
      status,
      finalResponseText: this.fullResponseText,
      lastTurnResponseText: this.lastTurnResponseText,
      iterations: this.currentIteration,
      toolsUsed: this.toolsUsed.slice(),
      toolCalls: this.toolCalls.slice(),
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      cacheReadInputTokens: this.cacheReadInputTokens || undefined,
      modelId: this.modelId,
      errorMessage,
    };
  }

  /* --------------------------- Streaming run loop ------------------------- */

  protected async *streamInner(
    input: AgentRunInput,
    runtime: StreamingRuntimeAdapter<TContext>,
  ): AsyncGenerator<AgentEvent, AgentRunResult, void> {
    yield {
      type: "run_start",
      runId: this.runId,
      agentId: this.config.agentId,
    };

    const userContent = await this.buildUserContent(input);
    this.history.push({ role: "user", content: userContent });
    const max = this.config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    let stopReason: ModelTurn["stopReason"] | null = null;
    let errorMessage: string | undefined;

    try {
      stopReason = yield* this.streamLoop(runtime, max);
      // Same discriminated-return contract as the sync path's maybeRetry.
      const retryOutcome = yield* this.maybeRetryStream(runtime, stopReason, max);
      if (retryOutcome !== undefined) stopReason = retryOutcome;
    } catch (error: any) {
      errorMessage = error?.message ?? String(error);
      logger.error("agent.runStream.error", { runId: this.runId, errorMessage });
      this.emitMetrics({ status: "error" });
      const result = this.buildResult("error", errorMessage);
      yield {
        type: "run_complete",
        iterations: result.iterations,
        toolsUsed: result.toolsUsed,
        modelId: result.modelId,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        cacheReadInputTokens: result.cacheReadInputTokens,
        status: "error",
      };
      return result;
    }

    const status: AgentRunResult["status"] =
      stopReason === "end_turn" || stopReason === "stop_sequence"
        ? "ok"
        : this.currentIteration >= max
          ? "max_iterations"
          : "stopped";
    this.emitMetrics({ status });
    const result = this.buildResult(status, errorMessage);
    yield {
      type: "run_complete",
      iterations: result.iterations,
      toolsUsed: result.toolsUsed,
      modelId: result.modelId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      cacheReadInputTokens: result.cacheReadInputTokens,
      status,
    };
    return result;
  }

  protected async *streamLoop(
    runtime: StreamingRuntimeAdapter<TContext>,
    max: number,
  ): AsyncGenerator<AgentEvent, ModelTurn["stopReason"] | null, void> {
    while (this.currentIteration < max) {
      this.currentIteration++;
      this.metrics.iterations = this.currentIteration;
      yield { type: "iteration_start", iteration: this.currentIteration };

      const turn = yield* this.streamTurn(runtime);
      this.modelId = turn.modelId;
      this.inputTokens += turn.usage.inputTokens;
      this.outputTokens += turn.usage.outputTokens;
      this.cacheReadInputTokens += turn.usage.cacheReadInputTokens ?? 0;

      const isToolUse = turn.stopReason === "tool_use";
      const contentToAppend = isToolUse
        ? stripLeadingTextBlocks(turn.assistantContent)
        : turn.assistantContent;
      this.history.push({ role: "assistant", content: contentToAppend });
      // The streamTurn delta accumulator has already appended every text
      // chunk the client received (including preamble text from earlier
      // tool_use turns). Don't resync from history — `stripLeadingTextBlocks`
      // means history is shorter than what was streamed, and overwriting
      // would lose the preambles. As a fallback for runtimes that emit
      // assistantContent without text_delta events, pull text from the
      // final turn directly only when the accumulator is still empty.
      // Use the same concatenation rule as the sync path's
      // extractTextFromContent (no separator) so contentOffset values
      // remain identical regardless of which path produced fullResponseText.
      if (!isToolUse && this.fullResponseText.length === 0) {
        this.fullResponseText = extractTextFromContent(turn.assistantContent);
      }
      // Terminal turn: snapshot just this turn's text for v1-parity
      // shouldRetry heuristics (see sync path comment).
      if (!isToolUse) {
        this.lastTurnResponseText = extractTextFromContent(
          turn.assistantContent,
        );
      }

      if (turn.stopReason === "tool_use") {
        yield* this.streamDispatchTools(turn.assistantContent);
        continue;
      }
      return turn.stopReason;
    }
    return null;
  }

  protected async *streamTurn(
    runtime: StreamingRuntimeAdapter<TContext>,
  ): AsyncGenerator<AgentEvent, ModelTurn, void> {
    const turnGen = runtime.invokeTurnStream(this.invokeInput());
    while (true) {
      const { value, done } = await turnGen.next();
      if (done) return value;
      const ev = value as TurnStreamEvent;
      if (ev.type === "text_delta") {
        // Accumulate so contentOffset on subsequent tool calls reflects
        // text the UI has already seen (history may strip leading text).
        this.fullResponseText += ev.text;
        yield { type: "chunk", text: ev.text };
      }
      // tool_use_start/_input_delta/_stop are surfaced as tool_call events
      // _after_ the turn completes (we wait until we have the parsed input
      // to emit the running record). They're not propagated upstream here.
    }
  }

  protected async *streamDispatchTools(
    assistantContent: any[],
  ): AsyncGenerator<AgentEvent, void, void> {
    const uses = this.extractToolUses(assistantContent);
    if (uses.length === 0) return;

    // Emit running records up front so the UI can render placeholder blocks
    // while the scheduler executes.
    const offsetSnapshot = this.fullResponseText.length;
    const runningRecords = uses.map((use) => {
      const tool = this.config.tools.find((t) => t.id === use.toolName);
      const record: ToolCallRecord = {
        toolUseId: use.toolUseId,
        toolName: use.toolName,
        status: "running",
        iteration: this.currentIteration,
        contentOffset: offsetSnapshot,
        startedAtMs: Date.now(),
        toolInput: tool?.redactInput ? undefined : use.input,
      };
      this.toolCalls.push(record);
      return record;
    });
    for (const record of runningRecords) {
      // Emit a snapshot so the consumer's view of "running" doesn't mutate
      // when we update the same record on completion.
      yield { type: "tool_call_start", record: { ...record } };
    }

    const policy = this.config.policy;
    // Match the scheduler's BlockingFn signature `(toolId, toolInput, ctx)`
    // exactly and source `resultStore` / `agentContext` from the
    // ToolExecutionContext rather than capturing `this.*`. Functionally
    // equivalent (the scheduler builds ctx from this same instance) but
    // the type contract is now honoured end-to-end.
    const blockingFn = policy?.blocking
      ? (toolId: string, toolInput: unknown, ctx: ToolExecutionContext<TContext>) =>
          policy.blocking!(toolId, toolInput, ctx.resultStore as ToolResultStore, ctx.agentContext)
      : undefined;

    const scheduled = await this.scheduler.execute(
      uses,
      (toolUseId, signal) => ({
        agentContext: this.config.context,
        resultStore: this.resultStore,
        toolUseId,
        signal,
        iteration: this.currentIteration,
      }),
      blockingFn,
    );

    const toolResultBlocks = scheduled.map((s) => this.toResultBlock(s));
    this.history.push({ role: "user", content: toolResultBlocks });

    for (const s of scheduled) {
      const running = runningRecords.find((r) => r.toolUseId === s.toolUseId);
      if (running) {
        running.status = s.result.ok ? "complete" : "error";
        running.durationMs = s.durationMs;
        running.resultSummary = s.result.ok ? s.result.summary : undefined;
        running.errorMessage = !s.result.ok
          ? s.result.code === "human_input_required"
            ? s.result.prompt
            : s.result.message
          : undefined;
        running.errorCode = !s.result.ok ? s.result.code : undefined;
        yield { type: "tool_call_complete", record: { ...running } };
      }

      // resultStore writes happen inside the scheduler so blocking
      // callbacks for later tools in the same tool_use turn observe
      // earlier tools' results (defense-in-depth on validate+save).
      this.toolsUsed.push(s.toolName);
    }
  }

  /**
   * Streaming counterpart to `maybeRetry`. Returns `undefined` if no
   * retry was attempted; otherwise the retry's terminal stopReason
   * (which may be `null` if the retry hit max iterations). See sync
   * version for rationale.
   */
  protected async *maybeRetryStream(
    runtime: StreamingRuntimeAdapter<TContext>,
    stopReason: ModelTurn["stopReason"] | null,
    max: number,
  ): AsyncGenerator<AgentEvent, ModelTurn["stopReason"] | null | undefined, void> {
    const policy = this.config.policy;
    if (!policy?.shouldRetry) return undefined;
    if (stopReason !== "end_turn" && stopReason !== "stop_sequence") return undefined;

    const cap = policy.maxRetries ?? 1;
    let retries = 0;
    let last: ModelTurn["stopReason"] | null = stopReason;
    let ranAtLeastOneRetry = false;
    while (retries < cap && this.currentIteration < max) {
      const decision = policy.shouldRetry({
        toolsUsed: this.toolsUsed,
        resultStore: this.resultStore,
        // v1 parity: only the most recent terminal turn's text, not the
        // accumulator (which would include preambles from earlier
        // tool_use turns and could spuriously trip the looksIncomplete
        // heuristic).
        finalText: this.lastTurnResponseText,
        iterations: this.currentIteration,
      });
      if (!decision) break;
      retries++;
      ranAtLeastOneRetry = true;
      this.metrics.toolRetries++;
      this.history.push({
        role: "user",
        content: [{ text: decision.retryPrompt }],
      });
      last = yield* this.streamLoop(runtime, max);
    }
    return ranAtLeastOneRetry ? last : undefined;
  }
}

/**
 * On `tool_use` iterations, drop any leading text block(s) from the assistant
 * content before pushing it to history. Without this, a model that says
 * "Sure! I'll look that up for you." and then immediately calls a tool
 * tends to repeat the same preamble in its post-tool reply.
 *
 * Phase 2 — see plan §1 (pre-existing behaviour to preserve).
 */
export function stripLeadingTextBlocks(content: any[]): any[] {
  if (!Array.isArray(content) || content.length === 0) return content;
  let firstNonText = content.findIndex((b) => !(typeof b?.text === "string"));
  if (firstNonText <= 0) return content; // either all text (keep as-is) or already starts with non-text
  return content.slice(firstNonText);
}

/** Concatenate all text blocks from a Bedrock content array in order. */
function extractTextFromContent(content: any[] | undefined): string {
  if (!Array.isArray(content)) return "";
  let buf = "";
  for (const b of content) {
    if (typeof b?.text === "string") buf += b.text;
  }
  return buf;
}

function errorPayloadFor(result: Exclude<ToolResult<unknown>, { ok: true }>): any {
  if (result.code === "human_input_required") {
    return {
      error: true,
      code: result.code,
      prompt: result.prompt,
      resumeToken: result.resumeToken,
      suggestedReplies: result.suggestedReplies,
    };
  }
  return {
    error: true,
    code: result.code,
    message: result.message,
    retryable: result.retryable,
    details: result.details,
  };
}
