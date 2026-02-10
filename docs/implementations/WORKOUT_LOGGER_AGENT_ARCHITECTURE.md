# Workout Logger Agent - Storage Architecture & Multi-Workout Handling

## Current Architecture (v1.0.20260210)

### Tool Result Storage

The `WorkoutLoggerAgent` stores tool results in a `Map<string, any[]>` using fixed semantic keys, with each key holding an array of results:

```
detect_discipline    → "discipline"    → [result0, result1, ...]
extract_workout_data → "extraction"    → [result0, result1, ...]
validate_workout_completeness → "validation" → [result0, result1, ...]
normalize_workout_data → "normalization" → [result0, result1, ...]
generate_workout_summary → "summary"   → [result0, result1, ...]
save_workout_to_database → "save"      → [result0, result1, ...]
```

Results are stored via `storeToolResult` which pushes to the array. Retrieval is via:

- `getToolResult(key, index?)` — returns the result at the given index, or the latest result if no index is provided (backward-compatible with single-workout flows).
- `getAllToolResults(key)` — returns the full array for a given key (used for aggregation).

### Index-Aware Tool Pipeline

Tools that operate on a specific workout's data accept an optional `workoutIndex` parameter in their input schema:

| Tool                            | workoutIndex? | Uses it to retrieve                                                                                                                                                                |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `detect_discipline`             | No            | First in pipeline, no dependencies                                                                                                                                                 |
| `extract_workout_data`          | No            | Uses latest discipline detection                                                                                                                                                   |
| `validate_workout_completeness` | Yes           | `getToolResult("extraction", workoutIndex)`                                                                                                                                        |
| `normalize_workout_data`        | Yes           | `getToolResult("validation", workoutIndex)`, `getToolResult("extraction", workoutIndex)`                                                                                           |
| `generate_workout_summary`      | Yes           | `getToolResult("normalization", workoutIndex)`, `getToolResult("validation", workoutIndex)`, `getToolResult("extraction", workoutIndex)`                                           |
| `save_workout_to_database`      | Yes           | `getToolResult("extraction", workoutIndex)`, `getToolResult("validation", workoutIndex)`, `getToolResult("normalization", workoutIndex)`, `getToolResult("summary", workoutIndex)` |

Claude naturally uses a "stage-parallel" execution pattern when processing multiple workouts:

1. `detect_discipline` × N (one per workout)
2. `extract_workout_data` × N
3. `validate_workout_completeness(workoutIndex=0)` + `validate_workout_completeness(workoutIndex=1)` + ...
4. `normalize_workout_data(workoutIndex=0)` + `normalize_workout_data(workoutIndex=1)` + ...
5. `generate_workout_summary(workoutIndex=0)` + `generate_workout_summary(workoutIndex=1)` + ...
6. `save_workout_to_database(workoutIndex=0)` + `save_workout_to_database(workoutIndex=1)` + ...

### Multi-Workout Result Aggregation

`buildResultFromToolData` checks `getAllToolResults("save")` and `getAllToolResults("extraction")`. When multiple saves are detected, it builds an `allWorkouts` array on the `WorkoutLogResult`:

```typescript
interface WorkoutLogResult {
  success: boolean;
  workoutId?: string; // Primary workout (backward compat)
  allWorkouts?: {
    // All processed workouts
    workoutId: string;
    workoutName?: string;
    discipline?: string;
    saved: boolean;
  }[];
  // ... existing fields
}
```

The `build-workout` Lambda handler passes `allWorkouts` through in its response.

### Validation Blocking (enforceToolBlocking)

The `enforceToolBlocking` method extracts `workoutIndex` from tool input to check the correct workout's validation result. This prevents the normalize/summary/save tools from running if validation failed for that specific workout, without blocking other workouts that passed validation.

### Prompt Guidance

Prompt rule 8 instructs Claude on multi-workout parallel processing, explaining the `workoutIndex` parameter usage and the stage-parallel pattern. Claude is free to process workouts in parallel rather than being forced into sequential processing.

## History

### Original Architecture (v1.0.20260208b)

The original implementation used a `Map<string, any>` with single-value storage per tool type. When a user message contained multiple distinct workouts, Claude's natural parallel tool calls caused the second extraction to silently overwrite the first, resulting in data loss.

A three-layer workaround was implemented:

1. **Prompt rule 8**: Instructed Claude to process one workout at a time through the full pipeline.
2. **`executedToolIds` guard**: Blocked duplicate tool types within a single turn.
3. **Overwrite warning**: Logged when extraction data was overwritten before being saved.

This approach forced sequential processing and worked but was fragile — it relied on Claude following prompt instructions perfectly and added unnecessary latency.

### Refactor (v1.0.20260210)

Production logs showed 2 occurrences across 20 users — not a rare edge case. Silent data loss is unacceptable for a system users need to trust. The refactor implemented Phases 1-3 of the indexed storage design:

- **Phase 1**: Array-based storage (`Map<string, any[]>`), push-based writes, backward-compatible retrieval.
- **Phase 2**: Index-aware tools with `workoutIndex` parameter on validate, normalize, summary, and save tools. `enforceToolBlocking` made index-aware.
- **Phase 3**: `buildResultFromToolData` aggregates all saved workouts into `allWorkouts`. Handler passes through in response.

All workarounds removed: `executedToolIds` guard, overwrite warning, sequential prompt rule.

### Remaining

- **Phase 4**: UI support for multiple workout confirmations. Not yet needed — the backend handles multi-workout transparently and Claude's natural conversation response acknowledges all saved workouts.

## Integration Tests

Multi-workout behavior is verified by two test cases in `test/integration/test-build-workout.ts`:

- `multi-workout-two-sessions`: Two distinct cardio workouts in one message.
- `multi-workout-strength-and-cardio`: One strength + one cardio workout in one message.

Tests validate:

- `allWorkouts` array present in Lambda response with correct count.
- Each workout persisted in DynamoDB with expected fields.
- CloudWatch logs confirm `extract_workout_data` and `save_workout_to_database` called N times (parallel processing evidence).

## Decision Record

| Date       | Decision                                                         | Rationale                                                                                                                                                                                                                                                                                         |
| ---------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-02-08 | Implemented prompt + code enforcement                            | Lowest risk fix for what was initially assessed as a rare edge case; prevents silent data loss without touching storage architecture                                                                                                                                                              |
| 2026-02-08 | Documented indexed storage as long-term approach                 | User requested architecture documentation for future implementation; addresses the fundamental 1:1 storage limitation                                                                                                                                                                             |
| 2026-02-09 | Implemented array-based storage + index-aware tools (Phases 1-3) | Production logs showed 2 occurrences across 20 users — not a rare edge case. Silent data loss is unacceptable. Refactored storage to `Map<string, any[]>`, added `workoutIndex` parameter to downstream tools, removed `executedToolIds` guard, and enabled Claude's natural parallel processing. |
| 2026-02-09 | Integration tests validated multi-workout processing             | Both test cases passed: stage-parallel execution, correct `workoutIndex` usage, all workouts saved to DynamoDB, `allWorkouts` aggregation accurate, no errors or warnings.                                                                                                                        |

## Files

| File                                     | Role                                                                                                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agents/workout-logger/agent.ts`         | Array storage, `getToolResult(key, index?)`, `getAllToolResults(key)`, index-aware `enforceToolBlocking`, multi-workout aggregation in `buildResultFromToolData` |
| `agents/workout-logger/types.ts`         | `WorkoutLogResult` with `allWorkouts` field                                                                                                                      |
| `agents/workout-logger/tools.ts`         | `workoutIndex` parameter on validate, normalize, summary, save tools                                                                                             |
| `agents/workout-logger/prompts.ts`       | Rule 8: parallel multi-workout processing guidance                                                                                                               |
| `build-workout/handler.ts`               | Passes `allWorkouts` in Lambda response                                                                                                                          |
| `test/integration/test-build-workout.ts` | Multi-workout test cases with DynamoDB + CloudWatch validation                                                                                                   |
| `test/integration/types.ts`              | `MultiWorkoutValidationExpectations` type                                                                                                                        |
