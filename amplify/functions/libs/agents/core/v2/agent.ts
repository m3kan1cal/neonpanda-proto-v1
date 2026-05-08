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
import type { Tool, ToolCallRecord } from "./tools/tool-types";
import type { ToolResult } from "./tools/tool-types";
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
  finalResponseText: string;
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

      const retryStatus = await this.maybeRetry(stopReason, max);
      if (retryStatus) stopReason = retryStatus;
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

      this.appendAssistantContent(turn.assistantContent);

      if (turn.stopReason === "tool_use") {
        await this.dispatchTools(turn.assistantContent);
        continue;
      }
      this.fullResponseText = this.collectAssistantText();
      return turn.stopReason;
    }
    return null;
  }

  protected async maybeRetry(
    stopReason: ModelTurn["stopReason"] | null,
    max: number,
  ): Promise<ModelTurn["stopReason"] | null> {
    const policy = this.config.policy;
    if (!policy?.shouldRetry) return null;
    if (stopReason !== "end_turn" && stopReason !== "stop_sequence") return null;

    const cap = policy.maxRetries ?? 1;
    let retries = 0;
    let last: ModelTurn["stopReason"] | null = stopReason;

    while (retries < cap && this.currentIteration < max) {
      const decision = policy.shouldRetry({
        toolsUsed: this.toolsUsed,
        resultStore: this.resultStore,
        finalText: this.fullResponseText,
        iterations: this.currentIteration,
      });
      if (!decision) return last;

      retries++;
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
    return last;
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
    const blockingFn = policy?.blocking
      ? (toolId: string, toolInput: unknown) =>
          policy.blocking!(toolId, toolInput, this.resultStore, this.config.context)
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
      if (s.result.ok) {
        this.resultStore.put(s.toolName, s.result.data, {
          index: s.result.toolStoreIndex,
          uniqueKey: s.result.toolStoreKey,
        });
      } else {
        // store failures too, so blocking middleware can read them
        this.resultStore.put(s.toolName, s.result);
      }
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
    return this.collectAssistantText();
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
      const retryStatus = yield* this.maybeRetryStream(runtime, stopReason, max);
      if (retryStatus) stopReason = retryStatus;
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
      if (!isToolUse && this.fullResponseText.length === 0) {
        this.fullResponseText = (turn.assistantContent ?? [])
          .filter((b: any) => typeof b?.text === "string")
          .map((b: any) => b.text as string)
          .join("\n");
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
    const blockingFn = policy?.blocking
      ? (toolId: string, toolInput: unknown) =>
          policy.blocking!(toolId, toolInput, this.resultStore, this.config.context)
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

      if (s.result.ok) {
        this.resultStore.put(s.toolName, s.result.data, {
          index: s.result.toolStoreIndex,
          uniqueKey: s.result.toolStoreKey,
        });
      } else {
        this.resultStore.put(s.toolName, s.result);
      }
      this.toolsUsed.push(s.toolName);
    }
  }

  protected async *maybeRetryStream(
    runtime: StreamingRuntimeAdapter<TContext>,
    stopReason: ModelTurn["stopReason"] | null,
    max: number,
  ): AsyncGenerator<AgentEvent, ModelTurn["stopReason"] | null, void> {
    const policy = this.config.policy;
    if (!policy?.shouldRetry) return null;
    if (stopReason !== "end_turn" && stopReason !== "stop_sequence") return null;

    const cap = policy.maxRetries ?? 1;
    let retries = 0;
    let last: ModelTurn["stopReason"] | null = stopReason;
    while (retries < cap && this.currentIteration < max) {
      const decision = policy.shouldRetry({
        toolsUsed: this.toolsUsed,
        resultStore: this.resultStore,
        finalText: this.fullResponseText,
        iterations: this.currentIteration,
      });
      if (!decision) return last;
      retries++;
      this.metrics.toolRetries++;
      this.history.push({
        role: "user",
        content: [{ text: decision.retryPrompt }],
      });
      last = yield* this.streamLoop(runtime, max);
    }
    return last;
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
