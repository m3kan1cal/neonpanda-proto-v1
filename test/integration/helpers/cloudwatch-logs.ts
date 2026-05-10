/**
 * Shared CloudWatch log fetching for integration tests.
 *
 * Used by test/integration/test-build-program.ts and
 * test/integration/test-build-coach-config.ts to retrieve the logs of a
 * Lambda invocation, summarize them, and persist them next to the JSON
 * result file for forensic inspection.
 *
 * The legacy approach in those two scripts was a blind 30s sleep with
 * dead `CloudWatchLogsClient` / `FilterLogEventsCommand` imports. This
 * module replaces that with a real fetch.
 */

import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import * as fs from "fs";
import * as path from "path";

export interface CloudWatchLogEvent {
  timestamp: number;
  message: string;
  logStreamName?: string;
}

export interface FetchLogsOptions {
  /**
   * Substring markers to count in the fetched logs. Useful for asserting
   * on instrumentation (e.g. cache hits, parallel-batch counts). Returned
   * in `markerCounts` keyed by the same key the caller provides.
   */
  markers?: Record<string, string>;
  /** Pre-fetch sleep so logs have time to land in CloudWatch. Default 30000ms. */
  waitMs?: number;
  /** Time-window buffer (ms) before/after the captured startTime. Default 5000ms. */
  bufferMs?: number;
  /** Max events per FilterLogEvents page. Default 5000. */
  pageLimit?: number;
  /** Cap on total events retrieved across pagination. Default 50000. */
  totalLimit?: number;
}

/**
 * Parsed numeric fields extracted from a single `agent.run.completed`
 * structured log line emitted by the v2 framework's RunMetrics.
 *
 * One entry per agent.run.completed line — multi-iteration test runs
 * (e.g. retry scenarios) can produce more than one.
 */
export interface AgentRunMetrics {
  iterations?: number;
  parallelToolBatches?: number;
  modelFallbacks?: number;
  toolRetries?: number;
  toolTimeouts?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadInputTokens?: number;
  totalDurationMs?: number;
  agentId?: string;
  runId?: string;
  modelId?: string;
}

export interface CloudWatchLogsSummary {
  /** Raw events ordered by timestamp ascending. */
  events: CloudWatchLogEvent[];
  /** Pre-formatted "ISO\tmessage" lines suitable for writing to a .log file. */
  fullLogs: string[];
  /** Unique Lambda execution RequestIds observed in this window. */
  requestIds: string[];
  /** Duration (ms) from the most recent REPORT line. */
  durationMs?: number;
  /** Billed duration (ms) from the most recent REPORT line. */
  billedDurationMs?: number;
  /** Max memory used (MB) from the most recent REPORT line. */
  maxMemoryMb?: number;
  /** Bedrock prompt-cache read tokens summed across all turns. */
  cacheReadInputTokens: number;
  /** Bedrock prompt-cache write tokens summed across all turns. */
  cacheWriteInputTokens: number;
  /** Lines matching ERROR / ❌. */
  errors: string[];
  /** Lines matching WARN / ⚠️. */
  warnings: string[];
  /** Caller-supplied marker counts (substring matches in fullLogs). */
  markerCounts: Record<string, number>;
  /**
   * Structured metrics parsed out of every `agent.run.completed` log line
   * in the window. Empty array if no v2 agent ran (or didn't reach
   * completion). Replaces ad-hoc substring markers like
   * `parallelToolBatches: "🚀 Executing"` which never matched cleanly.
   */
  agentRunMetrics: AgentRunMetrics[];
  /** Truncation flag if totalLimit was hit. */
  truncated: boolean;
}

const REPORT_RE =
  /Duration:\s+([\d.]+)\s+ms.*Billed Duration:\s+([\d.]+)\s+ms.*Max Memory Used:\s+(\d+)\s+MB/;
const REQUEST_ID_RE = /RequestId:\s+([0-9a-f-]{36})/i;
const CACHE_READ_RE = /cacheReadInputTokens['":\s]+(\d+)/;
const CACHE_WRITE_RE = /cacheWriteInputTokens['":\s]+(\d+)/;
const AGENT_RUN_COMPLETED_RE = /agent\.run\.completed\s*\{/;

// RunMetrics emits via util.inspect, producing JS-object syntax (single
// quotes, unquoted keys). Per-key extractors below tolerate the actual
// CloudWatch formatting (whitespace, line breaks, optional quoting on
// either keys or string values).
const NUMERIC_FIELD_RES: Record<keyof AgentRunMetrics, RegExp> = {
  iterations: /\biterations[\s'"]?:\s*(\d+)/,
  parallelToolBatches: /\bparallelToolBatches[\s'"]?:\s*(\d+)/,
  modelFallbacks: /\bmodelFallbacks[\s'"]?:\s*(\d+)/,
  toolRetries: /\btoolRetries[\s'"]?:\s*(\d+)/,
  toolTimeouts: /\btoolTimeouts[\s'"]?:\s*(\d+)/,
  inputTokens: /\binputTokens[\s'"]?:\s*(\d+)/,
  outputTokens: /\boutputTokens[\s'"]?:\s*(\d+)/,
  cacheReadInputTokens: /\bcacheReadInputTokens[\s'"]?:\s*(\d+)/,
  totalDurationMs: /\btotalDurationMs[\s'"]?:\s*(\d+)/,
  // Stringy fields — populated by separate regexes below since the value
  // type is not numeric. The shared loop just skips these entries.
  agentId: /^_/,
  runId: /^_/,
  modelId: /^_/,
};
const STRING_FIELD_RES: Record<"agentId" | "runId" | "modelId", RegExp> = {
  agentId: /\bagentId[\s'"]?:\s*['"]([^'"]+)['"]/,
  runId: /\brunId[\s'"]?:\s*['"]([^'"]+)['"]/,
  modelId: /\bmodelId[\s'"]?:\s*['"]([^'"]+)['"]/,
};

/**
 * Parse a single CloudWatch event message that contains an
 * `agent.run.completed { ... }` block into a typed metrics object.
 * Returns `null` when the message is not an agent-run line.
 */
export function parseAgentRunCompleted(
  message: string,
): AgentRunMetrics | null {
  if (!AGENT_RUN_COMPLETED_RE.test(message)) return null;

  const out: AgentRunMetrics = {};
  for (const [field, re] of Object.entries(NUMERIC_FIELD_RES) as Array<
    [keyof AgentRunMetrics, RegExp]
  >) {
    if (field === "agentId" || field === "runId" || field === "modelId") {
      continue;
    }
    const match = message.match(re);
    if (match) {
      (out as any)[field] = parseInt(match[1], 10);
    }
  }
  for (const [field, re] of Object.entries(STRING_FIELD_RES) as Array<
    ["agentId" | "runId" | "modelId", RegExp]
  >) {
    const match = message.match(re);
    if (match) out[field] = match[1];
  }
  return out;
}

/**
 * Fetch logs for a Lambda invocation in a given time window and produce
 * a structured summary.
 */
export async function fetchLambdaLogs(
  client: CloudWatchLogsClient,
  functionName: string,
  startTime: number,
  options: FetchLogsOptions = {},
): Promise<CloudWatchLogsSummary> {
  const {
    markers = {},
    waitMs = 30_000,
    bufferMs = 5_000,
    pageLimit = 5_000,
    totalLimit = 50_000,
  } = options;

  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const logGroupName = `/aws/lambda/${functionName}`;
  const events: CloudWatchLogEvent[] = [];
  let nextToken: string | undefined;
  let truncated = false;

  do {
    const command = new FilterLogEventsCommand({
      logGroupName,
      startTime: startTime - bufferMs,
      endTime: Date.now() + bufferMs,
      limit: pageLimit,
      nextToken,
    });
    const response = await client.send(command);
    for (const e of response.events ?? []) {
      if (e.timestamp == null || e.message == null) continue;
      events.push({
        timestamp: e.timestamp,
        message: e.message,
        logStreamName: e.logStreamName,
      });
      if (events.length >= totalLimit) {
        truncated = true;
        break;
      }
    }
    if (truncated) break;
    nextToken = response.nextToken;
  } while (nextToken);

  events.sort((a, b) => a.timestamp - b.timestamp);

  const summary: CloudWatchLogsSummary = {
    events,
    fullLogs: events.map(
      (e) =>
        `${new Date(e.timestamp).toISOString()}\t${e.message.trimEnd()}`,
    ),
    requestIds: [],
    cacheReadInputTokens: 0,
    cacheWriteInputTokens: 0,
    errors: [],
    warnings: [],
    markerCounts: Object.fromEntries(
      Object.keys(markers).map((k) => [k, 0]),
    ),
    agentRunMetrics: [],
    truncated,
  };

  const seenReqIds = new Set<string>();

  for (const { message } of events) {
    const reqMatch = message.match(REQUEST_ID_RE);
    if (reqMatch && !seenReqIds.has(reqMatch[1])) {
      seenReqIds.add(reqMatch[1]);
      summary.requestIds.push(reqMatch[1]);
    }
    const reportMatch = message.match(REPORT_RE);
    if (reportMatch) {
      summary.durationMs = parseFloat(reportMatch[1]);
      summary.billedDurationMs = parseFloat(reportMatch[2]);
      summary.maxMemoryMb = parseInt(reportMatch[3], 10);
    }
    const cacheReadMatch = message.match(CACHE_READ_RE);
    if (cacheReadMatch) {
      summary.cacheReadInputTokens += parseInt(cacheReadMatch[1], 10);
    }
    const cacheWriteMatch = message.match(CACHE_WRITE_RE);
    if (cacheWriteMatch) {
      summary.cacheWriteInputTokens += parseInt(cacheWriteMatch[1], 10);
    }
    if (message.includes("ERROR") || message.includes("❌")) {
      summary.errors.push(message.trim());
    }
    if (message.includes("WARN") || message.includes("⚠️")) {
      summary.warnings.push(message.trim());
    }
    for (const [name, substr] of Object.entries(markers)) {
      if (message.includes(substr)) summary.markerCounts[name]++;
    }
    const agentRun = parseAgentRunCompleted(message);
    if (agentRun) summary.agentRunMetrics.push(agentRun);
  }

  return summary;
}

/**
 * Serialise a summary to disk as a plain `.log` file. The file contains
 * a short header with request metadata followed by one event per line.
 */
export function writeLogsFile(
  filePath: string,
  summary: CloudWatchLogsSummary,
  meta: { testName: string; functionName: string },
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const header = [
    `# Test: ${meta.testName}`,
    `# Function: ${meta.functionName}`,
    `# RequestIds: ${summary.requestIds.join(", ") || "(none)"}`,
    `# Duration: ${summary.durationMs ?? "?"} ms`,
    `# Billed: ${summary.billedDurationMs ?? "?"} ms`,
    `# MaxMemory: ${summary.maxMemoryMb ?? "?"} MB`,
    `# CacheReadInputTokens: ${summary.cacheReadInputTokens}`,
    `# CacheWriteInputTokens: ${summary.cacheWriteInputTokens}`,
    `# Errors: ${summary.errors.length}`,
    `# Warnings: ${summary.warnings.length}`,
    `# AgentRuns: ${summary.agentRunMetrics.length}`,
    ...summary.agentRunMetrics.map(
      (m, i) =>
        `#   [${i}] iter=${m.iterations ?? "?"}, parallelBatches=${m.parallelToolBatches ?? "?"}, retries=${m.toolRetries ?? "?"}, timeouts=${m.toolTimeouts ?? "?"}, fallbacks=${m.modelFallbacks ?? "?"}, in=${m.inputTokens ?? "?"}, out=${m.outputTokens ?? "?"}, cacheRead=${m.cacheReadInputTokens ?? "?"}, totalMs=${m.totalDurationMs ?? "?"}`,
    ),
    `# Events: ${summary.events.length}${summary.truncated ? " (TRUNCATED)" : ""}`,
    "",
  ].join("\n");
  fs.writeFileSync(filePath, header + summary.fullLogs.join("\n") + "\n");
}

/**
 * JSON-friendly subset of the summary for embedding in the per-test
 * `_result.json`. Excludes the bulky `events` and `fullLogs` arrays.
 */
export function logsSummaryForJson(
  summary: CloudWatchLogsSummary,
): Omit<CloudWatchLogsSummary, "events" | "fullLogs"> {
  const { events: _events, fullLogs: _fullLogs, ...rest } = summary;
  return rest;
}

/**
 * Print a one-block summary of fetched logs to stdout. Designed to be
 * unobtrusive but informative when watching a test run live.
 */
export function printLogsSummary(
  summary: CloudWatchLogsSummary,
  options: { prefix?: string } = {},
): void {
  const p = options.prefix ?? "   ";
  console.info(`${p}📋 CloudWatch logs:`);
  console.info(
    `${p}   events=${summary.events.length}${summary.truncated ? " (truncated)" : ""}, requestIds=${summary.requestIds.length}, errors=${summary.errors.length}, warnings=${summary.warnings.length}`,
  );
  if (summary.durationMs != null) {
    console.info(
      `${p}   duration=${summary.durationMs}ms, billed=${summary.billedDurationMs}ms, maxMem=${summary.maxMemoryMb}MB`,
    );
  }
  if (
    summary.cacheReadInputTokens > 0 ||
    summary.cacheWriteInputTokens > 0
  ) {
    console.info(
      `${p}   bedrock cache: read=${summary.cacheReadInputTokens} tokens, write=${summary.cacheWriteInputTokens} tokens`,
    );
  }
  const markerEntries = Object.entries(summary.markerCounts).filter(
    ([, count]) => count > 0,
  );
  if (markerEntries.length > 0) {
    console.info(
      `${p}   markers: ${markerEntries.map(([k, v]) => `${k}=${v}`).join(", ")}`,
    );
  }
  if (summary.agentRunMetrics.length > 0) {
    summary.agentRunMetrics.forEach((m, i) => {
      const idLabel =
        summary.agentRunMetrics.length > 1 ? ` [${i}]` : "";
      console.info(
        `${p}   agent.run${idLabel}: iter=${m.iterations ?? "?"}, ` +
          `parallelBatches=${m.parallelToolBatches ?? "?"}, ` +
          `retries=${m.toolRetries ?? "?"}, ` +
          `timeouts=${m.toolTimeouts ?? "?"}, ` +
          `fallbacks=${m.modelFallbacks ?? "?"}, ` +
          `tokens=${m.inputTokens ?? "?"}/${m.outputTokens ?? "?"}, ` +
          `cacheRead=${m.cacheReadInputTokens ?? "?"}, ` +
          `totalMs=${m.totalDurationMs ?? "?"}`,
      );
    });
  }
}
