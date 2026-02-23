# Structured Outputs Strategy

## Overview

This document defines the architectural strategy for Bedrock structured output enforcement across all AI call sites. It explains the three enforcement tiers, Bedrock's grammar compilation limits, the schema inventory, and which schemas are deliberately excluded from grammar enforcement and why.

---

## Three Tiers of Bedrock Structured Output Enforcement

### Tier 1 — Strict Tool Use (`toolConfig` with `strict: true`)

**Mechanism**: Bedrock's Converse API compiles the tool's input schema into a constrained decoding grammar at first use. The model is forced to emit valid JSON matching the schema exactly.

**Cache**: Per-account, 24-hour grammar cache. Only structural schema changes (not name/description changes) invalidate the cache.

**Used for**: Small, agentic tool schemas (classify, detect, select, validate) where schema sizes are well within the 24 optional parameter limit.

**Pre-warmed in**: `warmup-platform/handler.ts` (`WARMUP_SCHEMAS` registry, ~32 entries)

**Auto-enabled via**: `buildToolConfig()` in `api-helpers.ts` — any single-tool call to a Claude model with `strictSchema` not explicitly set to `false` automatically gets `strict: true`.

---

### Tier 2 — JSON Schema Output Format (`outputConfig.textFormat` with `type: "json_schema"`)

**Mechanism**: Bedrock compiles the response schema into a grammar that constrains the model's _text output_ (not tool input). The model returns structured JSON as its text response rather than inside a tool call block.

**Cache**: Same 24-hour grammar cache, same compilation engine as Tier 1.

**Used for**: Moderate-sized data extraction schemas that fit within Bedrock's grammar limits.

**Pre-warmed in**: `warmup-platform/handler.ts` (`JSON_OUTPUT_WARMUP_SCHEMAS` registry, 2 entries)

**Called via**: `callBedrockApiWithJsonOutput` / `callBedrockApiMultimodalWithJsonOutput` in `api-helpers.ts`

---

### Tier 3 — Unguarded Tool Use (`strictSchema: false`)

**Mechanism**: The schema is passed as a tool definition but Bedrock does NOT compile a grammar. The model follows the schema voluntarily via tool definition context and general instruction following. Output is parsed with `parseJsonWithFallbacks` / `fixDoubleEncodedProperties` as a safety net.

**Used for**: Large schemas that exceed Bedrock's grammar compilation limits. Both Tier 1 and Tier 2 use the same compiler — there is no alternative mechanism that handles larger schemas.

**Called via**: `callBedrockApi` / `callBedrockApiMultimodal` with `strictSchema: false`

**Not pre-warmed** (no grammar to compile)

---

## Bedrock Grammar Compilation Limits

Both Tier 1 (strict tool use) and Tier 2 (JSON output format) share the **same compilation engine** with the same hard limits:

| Limit                       | Value                                                            |
| --------------------------- | ---------------------------------------------------------------- |
| Maximum optional parameters | 24                                                               |
| Grammar size cap            | Yes (exact threshold undocumented; empirically ~50-100KB schema) |
| Compilation timeout         | ~3 minutes (Lambda default)                                      |
| Cache duration              | 24 hours per account                                             |
| Cache invalidation trigger  | Structural schema changes only                                   |

These limits were confirmed empirically in warmup testing. Both `normalize_workout` (230 optional params) and `extract_workout_info` (grammar compilation timeout) failed under Tier 2 with identical errors to Tier 1.

**Critical finding — structural timeout:** The 24 optional parameter limit is necessary but **not sufficient**. Schemas with many optional _objects_ at the top level (each containing nested enum fields) cause combinatorial grammar explosion even when the total param count is under 24. For `N` optional top-level objects the compiler evaluates `2^N` presence/absence combinations × internal enum cardinality. At N=22, that is ~4 million paths before accounting for nested structure — enough to time out a 3-minute Lambda. This affects `extract_coach_creator_info` (22 objects), `extract_workout_info` (~22 objects), and `extract_program_info` (~24 objects) identically.

**Critical finding — grammar size regression:** `generate_coach_config` previously compiled successfully but subsequently failed with "grammar too large" on recompile after cache expiry. This indicates AWS either tightened the grammar size cap or the cap is inconsistently enforced. Schemas near the boundary cannot be relied on to compile deterministically across cache refresh cycles.

**Critical finding — nullable enum rejection:** Bedrock's strict schema validator rejects the combination of `type: ["string", "null"]` (JSON Schema Draft 2020-12 array-form union type for nullable fields) with `enum` arrays. Even though JSON Schema Draft 2020-12 supports this pattern and Bedrock's documentation lists `enum` as supported, the strict validator interprets the type array as a union and then fails to match enum values (e.g., `"push"`) against the declared type `['string', 'null']`. Schemas that use nullable enums throughout (e.g., `generate_workout`'s discipline plugins) receive an immediate `ValidationException` 400 response rather than a grammar compilation error. The workaround is to either change nullable enums to non-nullable (`type: "string"`) or exempt the schema via `strictSchema: false`.

---

## Schema Inventory

### Tier 1 — Strict Tool Use (pre-warmed, ~32 schemas)

| Schema                            | File                                  | Model        | Notes                             |
| --------------------------------- | ------------------------------------- | ------------ | --------------------------------- |
| `classify_complexity`             | `workout-complexity-schema.ts`        | Haiku        | workout complexity classification |
| `classify_discipline`             | `discipline-detection-schema.ts`      | Haiku        | workout discipline detection      |
| `classify_workout_type`           | `workout-classification-schema.ts`    | Haiku        | workout type classification       |
| `normalize_exercises`             | `exercise-normalization-schema.ts`    | Haiku        | exercise name normalization       |
| `analyze_smart_router`            | `router-schemas.ts`                   | Haiku        | smart router analysis             |
| `semantic_retrieval_decision`     | `router-schemas.ts`                   | Haiku        | semantic retrieval decision       |
| `conversation_complexity`         | `router-schemas.ts`                   | Haiku        | conversation complexity analysis  |
| `detect_memory_request`           | `memory-detection-schemas.ts`         | Haiku        | memory request detection          |
| `analyze_consolidated_memory`     | `memory-detection-schemas.ts`         | Haiku        | memory consolidation analysis     |
| `extract_memory_characteristics`  | `memory-detection-schemas.ts`         | Haiku        | memory characteristics extraction |
| `validate_coach_config`           | `coach-creator-tool-schemas.ts`       | Haiku        | coach config validation           |
| `generate_coach_name`             | `coach-creator-tool-schemas.ts`       | Haiku        | coach name generation             |
| `select_personality`              | `coach-creator-tool-schemas.ts`       | Haiku        | personality selection             |
| `select_methodology`              | `coach-creator-tool-schemas.ts`       | Haiku        | methodology selection             |
| `generate_coach_prompts`          | `coach-creator-tool-schemas.ts`       | Haiku        | coach prompt generation           |
| `extract_safety_profile`          | `coach-creator-extraction-schemas.ts` | Haiku        | safety profile extraction         |
| `extract_methodology_preferences` | `coach-creator-extraction-schemas.ts` | Haiku        | methodology preference extraction |
| `extract_specializations`         | `coach-creator-extraction-schemas.ts` | Haiku        | specialization extraction         |
| `generate_conversation_summary`   | `conversation-summary-schema.ts`      | Haiku        | conversation summarization        |
| `structure_phases`                | `program-schema.ts`                   | Haiku/Sonnet | program phase structuring         |
| `structure_phase`                 | `program-schema.ts`                   | Haiku/Sonnet | individual phase structuring      |
| `normalize_duration`              | `program/duration-normalizer.ts`      | Haiku        | duration normalization            |
| `search_knowledge_base`           | `conversation-agent-tool-schemas.ts`  | Haiku        | knowledge base search             |
| `save_memory`                     | `conversation-agent-tool-schemas.ts`  | Haiku        | memory save                       |
| `log_workout`                     | `conversation-agent-tool-schemas.ts`  | Haiku        | workout logging                   |
| `complete_program_workout`        | `conversation-agent-tool-schemas.ts`  | Haiku        | program workout completion        |
| `query_programs`                  | `conversation-agent-tool-schemas.ts`  | Haiku        | program query                     |
| `query_exercise_history`          | `conversation-agent-tool-schemas.ts`  | Haiku        | exercise history query            |
| `extract_workout_data`            | `workout-logger-tool-schemas.ts`      | Haiku        | workout data extraction           |
| `validate_workout_completeness`   | `workout-logger-tool-schemas.ts`      | Haiku        | workout completeness validation   |
| `select_days_to_remove`           | `program-designer-tool-schemas.ts`    | Sonnet       | day removal selection             |
| `fixed_prompt_output`             | inline in warmup-platform/handler.ts  | Haiku        | prompt fixing                     |

### Tier 2 — JSON Schema Output Format (pre-warmed, 2 schemas)

| Schema                     | File                              | Model  | Notes                                |
| -------------------------- | --------------------------------- | ------ | ------------------------------------ |
| `normalize_program_haiku`  | `program-normalization-schema.ts` | Haiku  | program normalization (default tier) |
| `normalize_program_sonnet` | `program-normalization-schema.ts` | Sonnet | program normalization (high tier)    |

### Tier 3 — Unguarded Tool Use (not pre-warmed, 6 schemas)

See [Exempted Schemas](#exempted-schemas) below.

---

## Exempted Schemas

These schemas are deliberately excluded from Bedrock grammar enforcement (Tier 3). Each production call site includes a `// STRUCTURED OUTPUT EXEMPTION` comment block pointing to this document.

| Schema / Tool Name           | File                                       | Optional Param Count | Reason                                                                                                                                                                                                                                       | Date Assessed |
| ---------------------------- | ------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| `normalize_workout`          | `libs/workout/tool-generation.ts`          | ~80 (composed)       | Discipline-aware composition reduces from ~230 to ~80 optional params, but still 3× over limit. Structural decomposition would require 4+ sequential calls.                                                                                  | Feb 2026      |
| `extract_workout_info`       | `libs/workout-creator/todo-extraction.ts`  | 22                   | 22 optional top-level objects with nested enum fields — grammar compilation times out (structural explosion: 2^22 paths). Count is under 24 but structure exceeds compiler capacity.                                                         | Feb 2026      |
| `extract_program_info`       | `libs/program-designer/todo-extraction.ts` | 24                   | Same structural explosion pattern as `extract_workout_info`. Count is at limit but nested object structure causes timeout.                                                                                                                   | Feb 2026      |
| `extract_coach_creator_info` | `libs/coach-creator/todo-extraction.ts`    | 22                   | Same structural explosion pattern — 22 optional objects each with `{value, confidence(enum)}`. Timed out after removing `notes` sub-field to bring count under 24.                                                                           | Feb 2026      |
| `generate_coach_config`      | `libs/coach-creator/coach-generation.ts`   | N/A                  | Schema is too large ("grammar too large" error). Previously compiled successfully then regressed after cache expiry — inconsistent enforcement near the grammar size boundary.                                                               | Feb 2026      |
| `generate_workout`           | `libs/agents/workout-logger/tools.ts`      | ~88 (composed)       | Two independent reasons: (1) composed schema uses `type: ["string", "null"]` + enum pattern throughout discipline plugins — Bedrock strict validator rejects this combination; (2) even if fixed, base schema alone has 59+ optional params. | Feb 2026      |

**Why not decompose these schemas into smaller sub-schemas?**

Schema decomposition (splitting into 2-3 sub-schemas and merging results) was evaluated and rejected for these reasons:

1. **Latency**: Each sub-call adds one full Bedrock round-trip (500ms–2s). For a 3-part split, that is 3 sequential calls instead of 1.
2. **Structural risk**: Splitting a schema that models treat holistically (e.g., workout exercises with discipline-specific fields) risks losing cross-field context and introducing assembly errors.
3. **Grammar cache waste**: Each sub-schema still needs its own grammar compiled and cached.
4. **Diminishing returns**: These are data extraction calls where the model already performs well under unguarded mode. The `parseJsonWithFallbacks` downstream safety net catches any malformed output.

**Mitigation**: The schemas include `additionalProperties: false` on all objects, providing the model with clear structure even without grammar enforcement. Downstream validation catches non-conforming output.

---

## Schema Composition — AI vs Storage Schemas

### Problem

AI-facing schemas must stay lean for Tier 1/2 grammar compilation, but DynamoDB records are a superset of what the AI generates. Backend services add runtime/tracking fields (e.g., `completedWorkouts`, `adherenceRate`, `s3DetailKey`) at save time. Because these schemas use `additionalProperties: false` for structural enforcement, the AI schema alone cannot validate the full stored entity.

Bloating AI schemas with runtime fields is not an option:

1. Increases optional parameter count toward the 24-parameter grammar compilation limit
2. Increases grammar size toward the undocumented size cap
3. Introduces fields the model should never generate, risking hallucinated values

### Pattern

Keep AI-facing schemas lean. Compose full "storage schemas" by merging the AI schema with a separate runtime field definition via `composeStorageSchema(aiSchema, runtimeProperties)` in `libs/schemas/schema-composer.ts`. The utility shallow-merges `runtimeProperties` into `aiSchema.properties`, preserving `additionalProperties: false`, `required`, and all other constraints. Runtime fields are always optional (not added to `required`).

### Naming Convention

| Export Name                   | Purpose                              | Used By                       |
| ----------------------------- | ------------------------------------ | ----------------------------- |
| `{ENTITY}_SCHEMA`             | AI generation contract               | Bedrock Tier 1/2 calls        |
| `{ENTITY}_RUNTIME_PROPERTIES` | Fields added by backend at save time | Composition only              |
| `{ENTITY}_STORAGE_SCHEMA`     | Full stored entity validation        | Tests, server-side validation |

### Implementation

Utility: `composeStorageSchema()` in `libs/schemas/schema-composer.ts`

### Current Implementations

| Storage Schema           | AI Schema        | Runtime Fields | File                |
| ------------------------ | ---------------- | -------------- | ------------------- |
| `PROGRAM_STORAGE_SCHEMA` | `PROGRAM_SCHEMA` | 9 fields       | `program-schema.ts` |

### Future Opportunities

- `WORKOUT_STORAGE_SCHEMA` — workout runtime fields (scoring data, completion status, linked program references)
- `COACH_CONFIG_STORAGE_SCHEMA` — coach config runtime fields (usage stats, last active timestamp)

### Rule

Bedrock calls (normalization, extraction, tool use) always reference the lean `{ENTITY}_SCHEMA`. Storage validation (tests, server-side checks) always references `{ENTITY}_STORAGE_SCHEMA`. Never pass a storage schema to Bedrock.

---

## Future Considerations

If any of the following conditions change, the exempted schemas should be re-evaluated:

1. **Bedrock fixes structural complexity handling** — `extract_workout_info`, `extract_program_info`, and `extract_coach_creator_info` all time out due to optional-object grammar explosion, not param count. If the compiler handles this more efficiently, all three could be re-enabled by simply re-adding them to the warmup registry.
2. **Bedrock resolves grammar size inconsistency** — `generate_coach_config` compiled successfully then regressed. If Bedrock stabilises the grammar size limit, this schema can be moved back to Tier 2.
3. **Workout schema is refactored** to reduce optional fields — if `WORKOUT_SCHEMA` is simplified, `normalize_workout` (currently ~80 optional params after discipline composition) could eventually become Tier 2 eligible.
4. **Schema flattening** — replacing `{value: string, confidence: enum}` objects with flat scalar pairs (e.g., `primaryGoalsValue` + `primaryGoalsConfidence`) would eliminate the optional-object grammar explosion for the 3 extraction schemas, potentially allowing them to compile. This is a non-trivial refactor touching TypeScript types, extraction logic, and to-do list utilities.
5. **Bedrock fixes nullable enum validation** — if Bedrock's strict validator is updated to correctly handle `type: ["string", "null"]` + enum combinations, the discipline schemas for `generate_workout` could be used with strict tool use (subject to the optional param count limit also being resolved).

To check current optional param count on any schema, count the properties that are NOT in the `required` array at each nesting level and sum across all objects in the schema.

---

## Reference

- AWS Bedrock Structured Outputs docs: https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html
- AWS blog post: https://aws.amazon.com/blogs/machine-learning/structured-outputs-on-amazon-bedrock-schema-compliant-ai-responses/
- Warmup implementation: `amplify/functions/warmup-platform/handler.ts`
- API helpers: `amplify/functions/libs/api-helpers.ts` (`callBedrockApiWithJsonOutput`, `callBedrockApi`)
