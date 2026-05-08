/**
 * v2 agent framework barrel. Import via:
 *
 *   import { Agent, defineTool, ContextBuilder, SyncRuntime } from
 *     "../libs/agents/core/v2";
 */

export { Agent } from "./agent";
export type {
  AgentConfigV2,
  AgentRunInput,
  AgentRunResult,
  AgentPolicy,
  RetryDecision,
} from "./agent";

export { defineTool } from "./tools/define-tool";
export type { DefineToolSpec } from "./tools/define-tool";

export { adaptLegacyTool } from "./tools/legacy-adapter";
export type { AdaptLegacyToolOptions } from "./tools/legacy-adapter";

export { ToolResultStore } from "./tools/tool-result-store";
export type { PutOptions } from "./tools/tool-result-store";

export { ToolScheduler } from "./tools/tool-scheduler";
export type {
  ParsedToolUse,
  ScheduledResult,
  BlockingDecision,
  BlockingFn,
  ContextBuilderFn,
} from "./tools/tool-scheduler";

export type {
  Tool,
  ToolResult,
  ToolErrorCode,
  ToolMiddleware,
  ToolExecutionContext,
  ToolCallRecord,
  ToolValidator,
  ToolSuccess,
  ToolFailure,
  ToolHumanInputRequired,
} from "./tools/tool-types";

export { ContextBuilder } from "./context/context-builder";
export type { SectionName, SectionOptions } from "./context/context-builder";

export { SyncRuntime } from "./runtime/sync-runtime";
export type {
  RuntimeAdapter,
  ModelTurn,
  ModelTurnUsage,
  InvokeTurnInput,
} from "./runtime/runtime";

export { RunMetrics } from "./observability/metrics";
export {
  correlationStore,
  getCorrelation,
  withCorrelation,
  withToolCorrelation,
  withIterationCorrelation,
} from "./observability/correlation";
export type { CorrelationContext } from "./observability/correlation";

export type { AgentEvent } from "./events/events";

export {
  AgentError,
  TimeoutError,
  ToolNotFoundError,
  ConfigError,
} from "./errors/agent-errors";
