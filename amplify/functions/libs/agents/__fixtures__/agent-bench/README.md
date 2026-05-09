## agent-bench — v1 vs v2 baseline corpus

This corpus is the input to the per-agent flag-flip checklist in plan §10.1a.
For each agent's migration phase, we run the relevant subset of `prompts.json`
through both v1 and v2 and diff the results to gate the env-flag flip.

### Format

`prompts.json` is an array of prompt objects. Each prompt names exactly one
agent and supplies the input shape that agent expects.

```jsonc
[
  {
    "id": "wkt-edit-001",
    "agent": "workout-editor",
    "description": "Single-set rep correction on yesterday's workout",
    "input": {
      "userId": "user_REPLACE",
      "coachId": "coach_REPLACE",
      "workoutId": "workout_REPLACE",
      "userMessage": "actually I did 8 reps on the third set, not 10"
    },
    "expected": {
      "minIterations": 1,
      "maxIterations": 3,
      "requiredTools": ["apply_workout_edits"]
    }
  }
]
```

Anonymize all userIds / coachIds / workoutIds before checking real data into
git. Production references should be replaced with `_REPLACE` placeholders and
populated from a local `.env`-style override at run time.

### Target corpus size

20 prompts total, distributed across agents:

- workout-editor: 2
- coach-creator: 3 (including one full-flow multi-turn)
- coach-creator-session: 1
- program-designer: 3 (including one 4-week generation)
- program-designer-session: 1
- workout-logger: 4 (single-clear, single-ambiguous, multi-workout, low-quality)
- conversation: 6 (text, text+image, text+image+document, long-thread, RAG-heavy, HITL-trigger)

### Baseline capture mechanism (decided in Phase 1)

The plan's Phase 0 calls for capturing baseline metrics (p50/p95 latency, token
counts, cache-read tokens, iteration distribution) before any v2 code touches
production. Two options for capture, decided once Phase 1's `RunMetrics` lands:

1. **CloudWatch sampling** (preferred — zero extra Bedrock spend): once Phase 1
   adds the structured `agent.run.completed` log line, query CloudWatch Insights
   for a one-week window per agent before that agent's migration phase. Store
   resulting percentiles in `baselines/<agent>-v1.json`.
2. **Offline corpus replay** (only if production traffic is too sparse): write
   a `scripts/run-agent-bench.ts` that invokes the Lambda handlers locally with
   mock events. Costs Bedrock spend per run.

### Outputs

`baselines/<agent>-v1-<yyyy-mm-dd>.json` and `<agent>-v2-<yyyy-mm-dd>.json`,
one pair per agent, captured in the migration phase for that agent.
