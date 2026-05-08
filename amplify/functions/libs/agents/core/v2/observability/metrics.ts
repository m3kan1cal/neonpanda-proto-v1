/**
 * Per-run metrics aggregator. Emitted as a single structured log line on
 * `Agent.run()` completion so CloudWatch Insights can query latency / token
 * / retry / fallback distributions across runs.
 *
 * Phase 1 — see plan §7.2.
 */

import { logger } from "../../../../logger";
import { getCorrelation } from "./correlation";

export class RunMetrics {
  iterations = 0;
  parallelToolBatches = 0;
  modelFallbacks = 0;
  toolRetries = 0;
  inputTokens = 0;
  outputTokens = 0;
  cacheReadInputTokens = 0;
  /** Tool latency samples, keyed by tool id. */
  private toolLatencies = new Map<string, number[]>();
  private startMs = Date.now();

  recordToolLatency(toolId: string, durationMs: number): void {
    const arr = this.toolLatencies.get(toolId) ?? [];
    arr.push(durationMs);
    this.toolLatencies.set(toolId, arr);
  }

  emit(extra: Record<string, unknown> = {}): void {
    const correlation = getCorrelation();
    logger.info("agent.run.completed", {
      ...correlation,
      iterations: this.iterations,
      parallelToolBatches: this.parallelToolBatches,
      modelFallbacks: this.modelFallbacks,
      toolRetries: this.toolRetries,
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      cacheReadInputTokens: this.cacheReadInputTokens,
      totalDurationMs: Date.now() - this.startMs,
      toolLatencyP50: this.percentilesByTool(50),
      toolLatencyP95: this.percentilesByTool(95),
      ...extra,
    });
  }

  private percentilesByTool(p: number): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [tool, samples] of this.toolLatencies.entries()) {
      out[tool] = percentile(samples, p);
    }
    return out;
  }
}

function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = samples.slice().sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))];
}
