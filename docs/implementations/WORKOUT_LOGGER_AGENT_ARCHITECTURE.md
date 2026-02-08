# Workout Logger Agent - Storage Architecture & Multi-Workout Handling

## Current Architecture (v1.0.20260208b)

### Tool Result Storage

The `WorkoutLoggerAgent` stores tool results in a `Map<string, any>` using fixed semantic keys:

```
detect_discipline    → "discipline"
extract_workout_data → "extraction"
validate_workout_completeness → "validation"
normalize_workout_data → "normalization"
generate_workout_summary → "summary"
save_workout_to_database → "save"
```

Each tool retrieves previous tool results via `context.getToolResult("extraction")`, which returns the single value stored under that key. This is a 1:1 mapping: one storage slot per tool type.

### Multi-Workout Problem (Discovered 2026-02-08)

When a user message contains multiple distinct workouts, Claude correctly identifies all of them and may attempt to call the same tool multiple times in a single response (e.g., two `detect_discipline` calls). Because the storage uses fixed keys, the second result silently overwrites the first, causing data loss.

### Current Fix: Prompt Guidance + Code Enforcement

Three layers of defense were implemented:

1. **Prompt rule** (prompts.ts, rule 8): Instructs Claude to process one workout at a time through the full pipeline before starting the next.
2. **Code guard** (agent.ts, `handleToolUse`): An `executedToolIds` Set blocks duplicate tool types within a single turn, returning an error message to Claude that guides it to process sequentially.
3. **Overwrite warning** (agent.ts, `storeToolResult`): Logs a warning if extraction data is overwritten before being saved.

This approach works because when Claude processes workouts sequentially (detect -> extract -> validate -> summarize -> save -> repeat), each storage overwrite happens _after_ the previous workout has already been persisted to DynamoDB/Pinecone via the save tool.

## Long-Term Architecture: Indexed Multi-Workout Storage

The current fix is effective but relies on enforcing sequential behavior. A more robust long-term approach would refactor the storage layer to natively support multiple results per tool type, allowing Claude to process workouts in parallel if it chooses to.

### Design Goals

- Support N workout extractions in a single agent invocation without data loss
- Maintain backward compatibility with existing tool implementations
- Allow Claude to decide processing strategy (sequential or parallel)
- Return results for all processed workouts, not just the last one

### Proposed Storage Changes

#### 1. Array-Based Storage with Backward-Compatible Retrieval

Replace the single-value `Map` with array-based storage:

```typescript
// Current: Map<string, any>
private toolResults: Map<string, any> = new Map();

// Proposed: Map<string, any[]>
private toolResults: Map<string, any[]> = new Map();
```

The `storeToolResult` method would push to arrays instead of overwriting:

```typescript
private storeToolResult(toolId: string, result: any): void {
  const storageKey = STORAGE_KEY_MAP[toolId] || toolId;
  if (!this.toolResults.has(storageKey)) {
    this.toolResults.set(storageKey, []);
  }
  this.toolResults.get(storageKey)!.push(result);
}
```

#### 2. Backward-Compatible Retrieval

The `getToolResult` method used by all tools would default to returning the latest item (preserving current behavior), with an optional index for explicit access:

```typescript
// In the augmented context passed to tools
getToolResult: (key: string, index?: number): any => {
  const results = this.toolResults.get(key);
  if (!results || results.length === 0) return undefined;
  if (index !== undefined) return results[index];
  return results[results.length - 1]; // Default: latest result
};

// New: get all results for a key
getAllToolResults: (key: string): any[] => {
  return this.toolResults.get(key) || [];
};
```

This means existing tool code (`context.getToolResult("extraction")`) continues to work without changes -- it gets the latest extraction. Tools that need to be multi-workout aware can use `getAllToolResults` or an explicit index.

#### 3. Workout Pipeline Tracking

Add a pipeline tracker to know which workout is currently being processed:

```typescript
interface WorkoutPipeline {
  index: number;
  disciplineIndex: number;   // index into toolResults["discipline"]
  extractionIndex: number;   // index into toolResults["extraction"]
  validationIndex: number;   // index into toolResults["validation"]
  saved: boolean;
}

private workoutPipelines: WorkoutPipeline[] = [];
```

When Claude calls `detect_discipline` for a new workout, a new pipeline entry is created. Each subsequent tool call for that workout references the correct indices.

#### 4. Multi-Result Return from logWorkout

Update `buildResultFromToolData` to return results for all saved workouts:

```typescript
// Current: returns single WorkoutLogResult
// Proposed: returns WorkoutLogResult with all saved workouts
interface WorkoutLogResult {
  success: boolean;
  workoutId?: string; // Primary workout (backward compat)
  allWorkouts?: {
    // All processed workouts
    workoutId: string;
    workoutName: string;
    discipline: string;
    saved: boolean;
  }[];
  // ... existing fields
}
```

### Migration Path

The migration can be done incrementally:

1. **Phase 1**: Change storage to arrays internally, keep `getToolResult` returning latest item. No tool changes needed. Remove the duplicate tool guard (it becomes unnecessary). This is the minimum viable change.

2. **Phase 2**: Update `save_workout_to_database` tool to be pipeline-aware, using explicit indices to save the correct extraction. Add `getAllToolResults` to the context.

3. **Phase 3**: Update `buildResultFromToolData` to aggregate all saved workouts into the response. Update the `build-workout` handler to handle multi-workout results.

4. **Phase 4**: Update the streaming conversation UI to display multiple workout confirmations from a single message.

### Files That Would Need Changes

| File                                               | Phase | Change                                                                   |
| -------------------------------------------------- | ----- | ------------------------------------------------------------------------ |
| `agents/workout-logger/agent.ts`                   | 1     | Storage from `Map<string, any>` to `Map<string, any[]>`, retrieval logic |
| `agents/workout-logger/agent.ts`                   | 1     | Remove `executedToolIds` guard (no longer needed)                        |
| `agents/workout-logger/types.ts`                   | 3     | `WorkoutLogResult` interface update                                      |
| `agents/workout-logger/tools/save-workout.ts`      | 2     | Pipeline-aware extraction retrieval                                      |
| `agents/workout-logger/tools/validate-workout.ts`  | 2     | Pipeline-aware extraction retrieval                                      |
| `agents/workout-logger/tools/normalize-workout.ts` | 2     | Pipeline-aware extraction retrieval                                      |
| `agents/workout-logger/tools/generate-summary.ts`  | 2     | Pipeline-aware extraction retrieval                                      |
| `build-workout/handler.ts`                         | 3     | Handle multi-workout results                                             |
| `stream-coach-conversation/handler.ts`             | 4     | Display multiple workout confirmations                                   |

### Complexity & Risk Assessment

- **Phase 1** is low risk: internal storage change with backward-compatible retrieval means zero tool code changes. Can be shipped independently.
- **Phase 2** is medium risk: tools need to understand which workout they are operating on. Requires careful testing with single and multi-workout scenarios.
- **Phase 3-4** are higher risk: handler and UI changes that affect user-visible behavior.

### When to Implement

The current prompt + code enforcement approach handles the multi-workout case safely. This long-term refactor should be prioritized when:

- Multi-workout messages become more common (currently rare/edge case)
- Performance matters: sequential processing adds latency for multi-workout messages since each workout requires a full agent loop iteration
- The agent framework is being refactored for other reasons (good time to bundle the storage change)

### Decision Record

| Date       | Decision                                         | Rationale                                                                                                             |
| ---------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 2026-02-08 | Implemented prompt + code enforcement            | Lowest risk fix for a rare edge case; prevents silent data loss without touching storage architecture                 |
| 2026-02-08 | Documented indexed storage as long-term approach | User requested architecture documentation for future implementation; addresses the fundamental 1:1 storage limitation |
