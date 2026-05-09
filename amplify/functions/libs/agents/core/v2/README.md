## core/v2 — Phase 0 skeleton

This directory is the in-progress home of the unified agent framework described
in the agent-upgrade plan. Phase 0 lands only the directory structure and
module placeholders so later phases can fill them in without churning imports.

**v1 (`amplify/functions/libs/agents/core/`) is untouched and will remain so
until every domain agent has been migrated to v2 behind its `AGENT_V2_*`
env flag.** See the plan file for the full phased rollout.

Phase mapping:

| Path | Phase |
|------|-------|
| `agent.ts`, `runtime/sync-runtime.ts`, `tools/*`, `events/*`, `errors/*`, `observability/*` | Phase 1 |
| `runtime/streaming-runtime.ts` | Phase 2 |
| `context/context-builder.ts` | Phase 3+ (per agent) |
| `retry/*`, `fallback/*`, `async/*` | Phase 9 |
| `hitl/*` | Phase 8 |
