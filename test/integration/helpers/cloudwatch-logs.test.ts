import { describe, it, expect } from "vitest";
import { parseAgentRunCompleted } from "./cloudwatch-logs";

// Real-world `agent.run.completed` block as it appears in CloudWatch (from
// test/fixtures/test-programs-20260509/2026-05-10_simple-4week_logs.log).
// loglevel + util.inspect produce JS-object syntax with single-quoted
// string values and unquoted keys.
const REAL_AGENT_RUN_COMPLETED = `2026-05-10T11:55:34.691Z\t4afd7b25-b989-4f32-8d2a-d61b7db97ad2\tINFO\tagent.run.completed {
  userId: '63gocaz-j-AYRsb0094ik',
  agentId: 'program-designer',
  agentRunId: 'run_63gocaz-j-AYRsb0094ik_1778413989930_lmz5kgubs',
  iteration: 0,
  sessionId: 'session_1778413988706_test',
  coachId: 'user_63gocaz-j-AYRsb0094ik_coach_1756078034317',
  iterations: 7,
  parallelToolBatches: 1,
  modelFallbacks: 0,
  toolRetries: 0,
  toolTimeouts: 0,
  inputTokens: 104999,
  outputTokens: 4418,
  cacheReadInputTokens: 52848,
  totalDurationMs: 144761,
  toolLatencyP50: {
    load_program_requirements: 1684,
    generate_phase_workouts: 83345
  },
  toolLatencyP95: {
    load_program_requirements: 1684,
    generate_phase_workouts: 83623
  },
  runId: 'run_63gocaz-j-AYRsb0094ik_1778413989930_lmz5kgubs',
  modelId: 'us.anthropic.claude-sonnet-4-6'
}`;

describe("parseAgentRunCompleted", () => {
  it("returns null when the message is not an agent-run line", () => {
    expect(parseAgentRunCompleted("normal info log line")).toBeNull();
    expect(parseAgentRunCompleted("")).toBeNull();
    expect(
      parseAgentRunCompleted("REPORT RequestId: abc Duration: 100 ms"),
    ).toBeNull();
  });

  it("parses every numeric metric from a real CloudWatch message", () => {
    const metrics = parseAgentRunCompleted(REAL_AGENT_RUN_COMPLETED);
    expect(metrics).not.toBeNull();
    expect(metrics).toMatchObject({
      iterations: 7,
      parallelToolBatches: 1,
      modelFallbacks: 0,
      toolRetries: 0,
      toolTimeouts: 0,
      inputTokens: 104999,
      outputTokens: 4418,
      cacheReadInputTokens: 52848,
      totalDurationMs: 144761,
    });
  });

  it("parses string identifiers (agentId, runId, modelId)", () => {
    const metrics = parseAgentRunCompleted(REAL_AGENT_RUN_COMPLETED);
    expect(metrics?.agentId).toBe("program-designer");
    expect(metrics?.runId).toBe(
      "run_63gocaz-j-AYRsb0094ik_1778413989930_lmz5kgubs",
    );
    expect(metrics?.modelId).toBe("us.anthropic.claude-sonnet-4-6");
  });

  it("tolerates double-quoted JSON variants of the same payload", () => {
    // Future-proof against logger backends that emit strict JSON instead
    // of util.inspect.
    const jsonStyle = `INFO agent.run.completed { "iterations": 3, "parallelToolBatches": 2, "toolTimeouts": 1, "agentId": "coach-creator" }`;
    const metrics = parseAgentRunCompleted(jsonStyle);
    expect(metrics).toMatchObject({
      iterations: 3,
      parallelToolBatches: 2,
      toolTimeouts: 1,
      agentId: "coach-creator",
    });
  });

  it("returns partial metrics when only some fields are present", () => {
    // Defensive: don't blow up if a future RunMetrics version drops a
    // field. Missing fields should just be `undefined`.
    const partial = `INFO agent.run.completed { iterations: 2, parallelToolBatches: 0 }`;
    const metrics = parseAgentRunCompleted(partial);
    expect(metrics).toMatchObject({
      iterations: 2,
      parallelToolBatches: 0,
    });
    expect(metrics?.toolTimeouts).toBeUndefined();
    expect(metrics?.inputTokens).toBeUndefined();
  });

  it("does NOT match `agent.run.completed` when no opening brace follows", () => {
    // Defensive: avoid matching prose mentions of the marker name.
    const prose = `INFO emitted agent.run.completed for diagnostics`;
    expect(parseAgentRunCompleted(prose)).toBeNull();
  });
});
