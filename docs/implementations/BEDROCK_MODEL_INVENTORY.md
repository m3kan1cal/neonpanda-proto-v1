# Bedrock Model Inventory and UTILITY Model Category

**Date:** 2026-02-23
**Branch:** feature/misc-upgrades
**Status:** Implemented — UTILITY tier backed by Amazon Nova 2 Lite; strict mode removed globally

---

## Overview

This document catalogs every non-streaming Bedrock Converse API call in the codebase, introduces a recommended new **UTILITY** model tier backed by NVIDIA Nemotron Nano 12B v2, and identifies which call sites are strong candidates for migration to that tier.

"Non-streaming" means calls that use `ConverseCommand` (via `callBedrockApi`, `callBedrockApiMultimodal`, `callBedrockApiWithJsonOutput`, or `callBedrockApiForAgent`). All `*Stream*` variants (`callBedrockApiStream`, `callBedrockApiStreamForAgent`, `callBedrockApiMultimodalStream`) are excluded from this inventory.

---

## Model Tier Reference

| Tier        | Model ID                                      | Display Name       | Streaming Capable | Use Case                                                                    |
| ----------- | --------------------------------------------- | ------------------ | ----------------- | --------------------------------------------------------------------------- |
| PLANNER     | `us.anthropic.claude-sonnet-4-6`              | claude-sonnet-4.6  | Yes               | Orchestration, complex reasoning, extended thinking, agent ReAct loops      |
| EXECUTOR    | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | claude-4.5-haiku   | Yes               | Sub-agent work, structured extraction, moderate complexity, streamed output |
| CONTEXTUAL  | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | claude-4.5-haiku   | Yes               | Real-time UI updates, intent classification, direct user-facing content     |
| **UTILITY** | `us.amazon.nova-2-lite-v1:0`                  | amazon-nova-2-lite | **No**            | Non-interactive classification, detection, simple structured extraction     |

> **Note:** CONTEXTUAL and EXECUTOR currently share the same underlying model. The distinction is semantic — CONTEXTUAL signals that the output surfaces directly to the user (even if brief), while EXECUTOR signals a background processing step.

---

## UTILITY Model Tier

### Rationale

The existing tier classification assumes all calls may need to stream output to users at some point. However, a large portion of non-streaming `callBedrockApi` calls are purely internal: binary classification, enum detection, single-word extraction, and small-schema structured outputs that are consumed programmatically and never rendered in the chat UI.

The UTILITY tier provides a semantic distinction for these calls — so that it is always explicit at a call site that this output is non-interactive and must never be used in a streaming code path.

### Amazon Nova 2 Lite — Current UTILITY Model (2026-02-23)

Amazon Nova 2 Lite (`us.amazon.nova-2-lite-v1:0`) is now the UTILITY model. It supports tool calling via the Bedrock Converse API `toolConfig` mechanism. At TEMPERATURE_PRESETS.STRUCTURED (0.2), it reliably follows tool schemas for classification and simple extraction tasks.

**Evaluation history:**

- **Nemotron Nano 12B** (2026-02-22): Ruled out. Does not support tool calling via Converse `toolConfig`. Returns `ValidationException` at runtime when invoked with tool definitions.
- **Claude Haiku 4.5** (2026-02-22): Interim UTILITY model after Nemotron was ruled out. Provided semantic separation but no cost advantage over EXECUTOR.
- **Nova 2 Lite** (2026-02-23): Current model. Cost-optimized, supports tool calling, no streaming requirement.

### Nova Schema Compatibility

Nova 2 Lite's documented `ToolInputSchema` supports `type`, `properties`, and `required` at the top level. The codebase sends schemas that also include `additionalProperties: false` and `enum` arrays. If Nova rejects schemas with `additionalProperties`, a runtime stripping function will be added. Test with `test-build-workout.ts` after migration.

### Strict Mode Removal (2026-02-23)

`strict: true` on `toolSpec` is a Bedrock-specific flag for server-side JSON schema enforcement that only Claude models support. It has been removed globally so that non-Claude models (Nova 2 Lite) can be used in tool-calling paths.

Compensation strategy:

- **Tight schemas**: All tool schemas have `additionalProperties: false`, `required` arrays, `enum` constraints, and property `description` fields
- **Client-side validation**: `validateToolResponse()` in `libs/tool-validation.ts` uses `ajv` to validate tool responses against their schemas. Validation runs inside `extractToolUseResult()` when the `tools` parameter is threaded through from the call site
- **`skipValidation` escape hatch**: Large-schema call sites (see below) set `skipValidation: true` in `BedrockApiOptions` to bypass `ajv` for outputs that are cleaned downstream by evaluator-optimizer patterns rather than rejected. The schema is still sent to the model as guidance.
- **Retry logic**: Validation errors throw, which integrates with existing retry mechanisms in callers

### UTILITY vs. EXECUTOR Decision Criteria

Use **UTILITY** when ALL of the following are true:

1. The call uses `callBedrockApi` (non-streaming, `ConverseCommand`)
2. The output is consumed programmatically — it is NOT streamed or displayed directly in the chat UI
3. The task is classification, detection, or simple structured extraction
4. The tool schema (if any) is small — roughly under 100 lines; avoids deeply nested objects with many optional fields
5. The task does not use `enableThinking: true`

Use **EXECUTOR** (or CONTEXTUAL) when any of the following is true:

- Output streams to the user or contributes to a coach persona voice
- The task requires nuanced judgment, creativity, or contextual reasoning
- The tool schema is large or complex (`enableThinking: true` workloads, workout normalization, program generation, coach config generation)
- The call path could eventually be converted to streaming

### `MODEL_IDS` Entry

`UTILITY_MODEL_FULL` and `UTILITY_MODEL_DISPLAY` are defined in [`amplify/functions/libs/api-helpers.ts`](../../amplify/functions/libs/api-helpers.ts) and resolve to `NOVA_2_LITE_MODEL_ID` (`us.amazon.nova-2-lite-v1:0`) / `NOVA_2_LITE_DISPLAY`. Callers should use `TEMPERATURE_PRESETS.STRUCTURED` (0.2) for reliable tool use.

---

## Full Non-Streaming Converse API Inventory

Organized by domain. Each entry shows the call function, the internal purpose, the number of tools passed, the current model tier, and the UTILITY migration assessment.

Legend: **Yes** = strong candidate, **Maybe** = needs testing, **No** = should stay on current model

---

### Coach Conversation

| File                                            | Function / Purpose                                                                                 | Tools                    | Schema Size | Current Tier | UTILITY?                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------ | ----------- | ------------ | ------------------------- |
| `libs/coach-conversation/contextual-updates.ts` | `generateContextualUpdate` — generates a single-sentence ephemeral progress update shown in the UI | 0                        | n/a         | CONTEXTUAL   | **Yes** ⚠️                |
| `libs/coach-conversation/contextual-updates.ts` | `generateContextualUpdateV2` — generates a single-sentence progress update (newer variant)         | 0                        | n/a         | CONTEXTUAL   | **Yes** ⚠️                |
| `libs/coach-conversation/contextual-updates.ts` | `classifyUserIntent` — binary COMPLEX/SIMPLE classification of user message                        | 0                        | n/a         | **UTILITY**  | ✅ Migrated               |
| `libs/coach-conversation/detection.ts`          | `detectComplexity` — classifies message for conversation summarization triggers                    | 1 (`analyze_complexity`) | ~40 lines   | **UTILITY**  | ✅ Migrated               |
| `libs/coach-conversation/detection.ts`          | `analyzeSmartRouterRequest` — comprehensive routing analysis for all processing modules            | 1 (`analyze_request`)    | ~300 lines  | EXECUTOR     | **No** — schema too large |

> ⚠️ **Borderline note for `generateContextualUpdate` and `generateContextualUpdateV2`:** These two calls return text that IS displayed to the user as ephemeral status messages in the UI (e.g. "Analyzing your workout..."). The output never enters the main conversation stream — it is sent as a separate SSE contextual event — but users do read it. Nemotron can handle brief, factual single-sentence outputs, but the coaching persona tone of these updates should be validated before migrating. Recommend testing against a sample of update types before committing. `classifyUserIntent` returns only "COMPLEX" or "SIMPLE" and never surfaces to the user, so it is unambiguously a strong candidate.

---

### Memory

| File                       | Function / Purpose                                                                     | Tools                               | Schema Size     | Current Tier | UTILITY?                   |
| -------------------------- | -------------------------------------------------------------------------------------- | ----------------------------------- | --------------- | ------------ | -------------------------- |
| `libs/memory/detection.ts` | `analyzeSemanticRetrieval` — determines if memory retrieval would improve the response | 1 (`analyze_semantic_retrieval`)    | ~40 lines       | **UTILITY**  | ✅ Migrated                |
| `libs/memory/detection.ts` | `detectMemoryRequest` — detects if user is requesting to save a memory                 | 1 (`detect_memory_request`)         | ~40 lines       | **UTILITY**  | ✅ Migrated                |
| `libs/memory/detection.ts` | `detectMemoryCharacteristics` — classifies memory type, importance, scope, and tags    | 1 (`detect_memory_characteristics`) | ~100 lines      | EXECUTOR     | **Maybe**                  |
| `libs/memory/detection.ts` | `consolidatedMemoryAnalysis` — combined retrieval + save analysis in a single call     | 1 (`analyze_memory_needs`)          | Largest in file | EXECUTOR     | **No** — schema complexity |

---

### Workout Domain

| File                                  | Function / Purpose                                                                     | Tools                       | Schema Size     | Current Tier     | UTILITY?    |
| ------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------- | --------------- | ---------------- | ----------- |
| `libs/workout/discipline-detector.ts` | `detectDiscipline` — classifies workout discipline from message text                   | 1 (`classify_discipline`)   | 38 lines        | **UTILITY**      | ✅ Migrated |
| `libs/workout/extraction.ts`          | `checkWorkoutComplexity` — 2-class classification for whether to use extended thinking | 1 (`classify_complexity`)   | 58 lines        | **UTILITY**      | ✅ Migrated |
| `libs/workout/extraction.ts`          | `extractWorkoutTime` — extracts a completion time value from user text                 | 0, prefill `{`              | n/a             | **UTILITY**      | ✅ Migrated |
| `libs/workout/extraction.ts`          | `classifyDisciplineAsQualitative` — binary classification of discipline type           | 0, prefill `{`              | n/a             | **UTILITY**      | ✅ Migrated |
| `libs/workout/extraction.ts`          | `generateWorkoutSummary` — generates a 1-2 sentence factual workout summary            | 0                           | n/a             | EXECUTOR         | **Maybe**   |
| `libs/workout/validation-helpers.ts`  | `classifyWorkoutType` — classifies workout as qualitative vs. quantitative             | 1 (`classify_workout_type`) | 22 lines        | **UTILITY**      | ✅ Migrated |
| `libs/workout/validation-helpers.ts`  | `validateExerciseStructure` — returns `{hasExercises, reasoning}` boolean check        | 0, prefill `{`              | n/a             | **UTILITY**      | ✅ Migrated |
| `libs/workout/validation.ts`          | `performNormalization` — full workout normalization to Universal Workout Schema        | 0                           | Complex output  | default (Sonnet) | **No**      |
| `libs/workout/detection.ts`           | `validateWorkoutContent` — returns `{hasPerformanceData, hasLoggingIntent}`            | 0, prefill `{`              | n/a             | **UTILITY**      | ✅ Migrated |
| `libs/workout/detection.ts`           | `extractQuickWorkoutContext` — extracts ~12 contextual fields from message             | 0, prefill `{`              | n/a             | EXECUTOR         | **Maybe**   |
| `libs/workout/tool-generation.ts`     | `classifyDiscipline` — classifies discipline during normalization pipeline             | 1 (`classify_discipline`)   | 38 lines        | **UTILITY**      | ✅ Migrated |
| `libs/workout/tool-generation.ts`     | `generateNormalization` — full workout normalization to Universal Workout Schema       | 1 (`normalize_workout`)     | Large composite | EXECUTOR         | **No**      |

---

### Workout Creator / Logger

| File                                                                              | Function / Purpose                                                        | Tools                      | Schema Size                       | Current Tier | UTILITY? |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------- | --------------------------------- | ------------ | -------- |
| `libs/workout-creator/todo-extraction.ts`                                         | `extractWorkoutCreatorInfo` (text path)                                   | 1 (`extract_workout_info`) | Large                             | EXECUTOR     | **No**   |
| `libs/workout-creator/todo-extraction.ts`                                         | `extractWorkoutCreatorInfo` (multimodal path)                             | 1 (`extract_workout_info`) | Same                              | EXECUTOR     | **No**   |
| `amplify/functions/log-workout-template/handler.ts`                               | `analyzeScaling` — generates scaling analysis JSON for workout template   | 0, prefill `{`             | Complex nested output             | EXECUTOR     | **No**   |
| `libs/agents/workout-logger/tools.ts` (`callBedrockApi`)                          | `extractWorkoutData` primary — structured workout extraction from message | 1 (`generate_workout`)     | Large composite, `enableThinking` | PLANNER      | **No**   |
| `libs/agents/workout-logger/tools.ts` (`callBedrockApi`)                          | `extractWorkoutData` fallback — text-based fallback for extraction        | 0                          | Same complexity                   | PLANNER      | **No**   |
| `libs/agents/core/agent.ts` (`callBedrockApiForAgent`) → **Workout Logger Agent** | Full ReAct loop                                                           | **6 tools**                | Multi-tool agent                  | PLANNER      | **No**   |

---

### Exercise

| File                             | Function / Purpose                                                       | Tools                          | Schema Size | Current Tier | UTILITY?    |
| -------------------------------- | ------------------------------------------------------------------------ | ------------------------------ | ----------- | ------------ | ----------- |
| `libs/exercise/normalization.ts` | `normalizeExerciseNames` — maps exercise names to canonical snake_case   | 1 (`NORMALIZE_EXERCISES_TOOL`) | 47 lines    | **UTILITY**  | ✅ Migrated |
| `libs/exercise/normalization.ts` | `normalizeExerciseNamesWithUserContext` — same with stored-name matching | 1 (`NORMALIZE_EXERCISES_TOOL`) | 47 lines    | **UTILITY**  | ✅ Migrated |

---

### Program Domain

| File                                  | Function / Purpose                                                         | Tools                          | Schema Size                         | Current Tier           | UTILITY?    |
| ------------------------------------- | -------------------------------------------------------------------------- | ------------------------------ | ----------------------------------- | ---------------------- | ----------- |
| `libs/program/duration-normalizer.ts` | `normalizeDuration` — maps ambiguous duration text to normalized string    | 1 (`normalize_duration`)       | Small (~30 lines)                   | **UTILITY**            | ✅ Migrated |
| `libs/program/phase-generator.ts`     | `generatePhaseStructure` primary — generates multi-week phase plan         | 1 (`generate_phase_structure`) | Large, `enableThinking: true`       | PLANNER                | **No**      |
| `libs/program/phase-generator.ts`     | `generatePhaseStructure` fallback                                          | 0, prefill `{`                 | Same complexity                     | PLANNER                | **No**      |
| `libs/program/phase-generator.ts`     | `generateSinglePhaseWorkouts` primary — generates all workouts for a phase | 1 (`generate_program_phase`)   | Large, `enableThinking: true`       | PLANNER                | **No**      |
| `libs/program/phase-generator.ts`     | `generateSinglePhaseWorkouts` fallback                                     | 0, prefill `{`                 | Same                                | PLANNER                | **No**      |
| `libs/program/normalization.ts`       | `normalizeProgram` primary (`callBedrockApiWithJsonOutput`)                | 0 (JSON output format)         | Large NORMALIZATION_RESPONSE_SCHEMA | dynamic (Sonnet/Haiku) | **No**      |
| `libs/program/normalization.ts`       | `normalizeProgram` fallback                                                | 0, prefill `{`                 | Same                                | same dynamic           | **No**      |
| `libs/program/summary.ts`             | `generateProgramSummary` — narrative text summary for Pinecone             | 0                              | n/a                                 | default (Sonnet)       | **No**      |

---

### Program Designer (Conversation Flow)

| File                                                                                | Function / Purpose                                      | Tools                       | Schema Size                      | Current Tier       | UTILITY?  |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------- | -------------------------------- | ------------------ | --------- |
| `libs/program-designer/todo-extraction.ts` (text path)                              | `extractProgramInfo`                                    | 1 (`extract_program_info`)  | Large                            | EXECUTOR           | **No**    |
| `libs/program-designer/todo-extraction.ts` (multimodal path)                        | `extractProgramInfo`                                    | 1 (`extract_program_info`)  | Same                             | EXECUTOR           | **No**    |
| `libs/program-designer/session-management.ts`                                       | `generateSessionSummary` — text paragraph for Pinecone  | 0                           | n/a                              | EXECUTOR           | **Maybe** |
| `libs/program-designer/question-generator.ts`                                       | `generateNextQuestion` — single conversational question | 0                           | n/a                              | EXECUTOR, CREATIVE | **Maybe** |
| `libs/agents/program-designer/tools.ts`                                             | `pruneExcessWorkouts` — selects training days to remove | 1 (`select_days_to_remove`) | Moderate, `enableThinking: true` | PLANNER            | **No**    |
| `libs/agents/core/agent.ts` (`callBedrockApiForAgent`) → **Program Designer Agent** | Full ReAct loop                                         | **8 tools**                 | Multi-tool agent                 | PLANNER            | **No**    |

---

### Coach Creator

| File                                                                             | Function / Purpose                                                                      | Tools                                           | Schema Size                          | Current Tier       | UTILITY?                           |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------ | ------------------ | ---------------------------------- |
| `libs/coach-creator/data-extraction.ts`                                          | `extractGenderPreference` — returns single word: `"male"`, `"female"`, or `"neutral"`   | 0                                               | n/a                                  | **UTILITY**        | ✅ Migrated                        |
| `libs/coach-creator/data-extraction.ts`                                          | `extractTrainingDays` — returns single integer 1–7                                      | 0                                               | n/a                                  | **UTILITY**        | ✅ Migrated                        |
| `libs/coach-creator/data-extraction.ts`                                          | `extractGoalTimeline` — returns short phrase like `"6 months"`                          | 0                                               | n/a                                  | **UTILITY**        | ✅ Migrated                        |
| `libs/coach-creator/data-extraction.ts`                                          | `extractTrainingIntensity` — returns single word: `"high"`, `"moderate"`, or `"low"`    | 0                                               | n/a                                  | **UTILITY**        | ✅ Migrated                        |
| `libs/coach-creator/data-extraction.ts`                                          | `extractSafetyProfile` — extracts injuries, contraindications, equipment, modifications | 1 (`SAFETY_PROFILE_EXTRACTION_SCHEMA`)          | Moderate                             | **UTILITY**        | ✅ Migrated                        |
| `libs/coach-creator/data-extraction.ts`                                          | `extractMethodologyPreferences` — extracts focus areas, preferences, avoidances         | 1 (`METHODOLOGY_PREFERENCES_EXTRACTION_SCHEMA`) | Moderate                             | **UTILITY**        | ✅ Migrated                        |
| `libs/coach-creator/data-extraction.ts`                                          | `extractSpecializations` — returns array of specialization enum values                  | 1 (`SPECIALIZATIONS_EXTRACTION_SCHEMA`)         | Small                                | **UTILITY**        | ✅ Migrated                        |
| `libs/coach-creator/todo-extraction.ts`                                          | `extractCoachCreatorInfo` — extracts all coach intake info from conversation            | 1 (`extract_coach_creator_info`)                | 22 optional objects                  | EXECUTOR           | **No**                             |
| `libs/coach-creator/tool-generation.ts`                                          | `selectPersonalityTemplate` — selects coach personality from templates                  | 1 (`PERSONALITY_SELECTION_SCHEMA`)              | Moderate                             | PLANNER            | **No** — nuanced matching          |
| `libs/coach-creator/tool-generation.ts`                                          | `selectMethodologyTemplate` — selects training methodology                              | 1 (`METHODOLOGY_SELECTION_SCHEMA`)              | Moderate                             | PLANNER            | **No** — nuanced matching          |
| `libs/coach-creator/tool-generation.ts`                                          | `generateCoachPrompts` — generates 7 full coach personality prompts                     | 1 (`COACH_PROMPTS_SCHEMA`)                      | Complex, CREATIVE                    | PLANNER            | **No**                             |
| `libs/coach-creator/tool-generation.ts`                                          | `validateCoachConfig` — validates coach config quality with scores                      | 1 (`VALIDATION_RESULT_SCHEMA`)                  | Moderate                             | **UTILITY**        | ✅ Migrated                        |
| `libs/coach-creator/tool-generation.ts`                                          | `generateCoachName` — generates a creative coach name                                   | 1 (`COACH_NAME_SCHEMA`)                         | Small, temp 1.0                      | EXECUTOR           | **Maybe** — creativity may degrade |
| `libs/coach-creator/coach-generation.ts`                                         | `generateCoachConfig` primary — full coach config generation                            | 1 (`generate_coach_config`)                     | Very large                           | PLANNER            | **No**                             |
| `libs/coach-creator/coach-generation.ts`                                         | `generateCoachConfig` fallback                                                          | 0                                               | Complex                              | PLANNER            | **No**                             |
| `libs/coach-creator/session-management.ts`                                       | `generateSessionSummary` — text paragraph for Pinecone                                  | 0                                               | n/a                                  | **UTILITY**        | ✅ Migrated                        |
| `libs/coach-creator/question-generator.ts`                                       | `generateNextQuestion` (non-streaming)                                                  | 0                                               | n/a                                  | EXECUTOR, CREATIVE | **Maybe**                          |
| `libs/coach-creator/question-generator.ts`                                       | `generateCompletionMessage` — short coach message on session complete                   | 0                                               | n/a                                  | **UTILITY**        | ✅ Migrated                        |
| `libs/agents/coach-creator/tools.ts`                                             | `normalizeCoachConfig` prompt repair — rephrases a single prompt field                  | 1 (`fixed_prompt_output`)                       | Small `{fixed_prompt, changes_made}` | **UTILITY**        | ✅ Migrated                        |
| `libs/agents/core/agent.ts` (`callBedrockApiForAgent`) → **Coach Creator Agent** | Full ReAct loop                                                                         | **8 tools**                                     | Multi-tool agent                     | PLANNER            | **No**                             |

---

### Pinecone / Utilities

| File                           | Function / Purpose                                                         | Tools          | Schema Size | Current Tier     | UTILITY?                   |
| ------------------------------ | -------------------------------------------------------------------------- | -------------- | ----------- | ---------------- | -------------------------- |
| `libs/pinecone-utils.ts`       | `shouldUseSemanticSearch` — binary decision on whether to query Pinecone   | 0, prefill `{` | n/a         | **UTILITY**      | ✅ Migrated                |
| `libs/pinecone-utils.ts`       | `analyzeMethodologyIntent` — classifies methodology type from message      | 0, prefill `{` | 5 fields    | **UTILITY**      | ✅ Migrated                |
| `libs/pinecone-compression.ts` | `compressContent` — intelligent semantic compression for Pinecone metadata | 0              | n/a         | PLANNER (Sonnet) | **No** — quality-sensitive |

---

### Analytics

| File                              | Function / Purpose                                                                  | Tools | Schema Size | Current Tier                    | UTILITY? |
| --------------------------------- | ----------------------------------------------------------------------------------- | ----- | ----------- | ------------------------------- | -------- |
| `libs/analytics/normalization.ts` | `normalizeAnalytics` — normalizes analytics data to Universal Analytics Schema      | 0     | Complex     | default (Sonnet)                | **No**   |
| `libs/analytics/data-fetching.ts` | `generateAnalytics` — generates full analytics response with `enableThinking: true` | 0     | Complex     | PLANNER, `enableThinking: true` | **No**   |

---

### Lambda Handlers

| File                                                      | Function / Purpose                                                             | Tools                               | Schema Size | Current Tier         | UTILITY?                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------- | ----------- | -------------------- | ----------------------------- |
| `amplify/functions/build-conversation-summary/handler.ts` | `buildConversationSummary` — rich narrative summary for long-term memory       | 1 (`generate_conversation_summary`) | Moderate    | default (Sonnet)     | **No** — quality-sensitive    |
| `amplify/functions/generate-greeting/handler.ts`          | `generateGreeting` — short personalized greeting text                          | 0                                   | n/a         | CONTEXTUAL, CREATIVE | **Maybe** — persona-dependent |
| `amplify/functions/explain-term/handler.ts`               | `explainTerm` — educational explanation of exercise or equipment term          | 0                                   | n/a         | EXECUTOR             | **Maybe** — quality matters   |
| `amplify/functions/warmup-platform/handler.ts`            | Schema warmup calls (both `callBedrockApi` and `callBedrockApiWithJsonOutput`) | 1 per entry                         | Varies      | Varies               | N/A — warmup only             |

---

## Migration Candidate Summary

### Strong "Yes" Candidates (27 call sites)

These are recommended for immediate UTILITY migration with low risk. All are non-streaming, behind-the-scenes, with small or no tool schemas, and outputs that are consumed programmatically.

| #   | File                                            | Function                                            |
| --- | ----------------------------------------------- | --------------------------------------------------- |
| 1   | `libs/coach-conversation/contextual-updates.ts` | `classifyUserIntent` (COMPLEX/SIMPLE) ✅ Migrated   |
| 2   | `libs/coach-conversation/detection.ts`          | `detectComplexity` ✅ Migrated                      |
| 3   | `libs/workout/discipline-detector.ts`           | `detectDiscipline` ✅ Migrated                      |
| 4   | `libs/workout/extraction.ts`                    | `checkWorkoutComplexity` ✅ Migrated                |
| 5   | `libs/workout/extraction.ts`                    | `extractWorkoutTime` ✅ Migrated                    |
| 6   | `libs/workout/extraction.ts`                    | `classifyDisciplineAsQualitative` ✅ Migrated       |
| 7   | `libs/workout/validation-helpers.ts`            | `classifyWorkoutType` ✅ Migrated                   |
| 8   | `libs/workout/validation-helpers.ts`            | `validateExerciseStructure` ✅ Migrated             |
| 9   | `libs/workout/detection.ts`                     | `validateWorkoutContent` ✅ Migrated                |
| 10  | `libs/workout/tool-generation.ts`               | `classifyDiscipline` ✅ Migrated                    |
| 11  | `libs/exercise/normalization.ts`                | `normalizeExerciseNames` ✅ Migrated                |
| 12  | `libs/exercise/normalization.ts`                | `normalizeExerciseNamesWithUserContext` ✅ Migrated |
| 13  | `libs/program/duration-normalizer.ts`           | `normalizeDuration` ✅ Migrated                     |
| 14  | `libs/coach-creator/data-extraction.ts`         | `extractGenderPreference` ✅ Migrated               |
| 15  | `libs/coach-creator/data-extraction.ts`         | `extractTrainingDays` ✅ Migrated                   |
| 16  | `libs/coach-creator/data-extraction.ts`         | `extractGoalTimeline` ✅ Migrated                   |
| 17  | `libs/coach-creator/data-extraction.ts`         | `extractTrainingIntensity` ✅ Migrated              |
| 18  | `libs/coach-creator/data-extraction.ts`         | `extractSafetyProfile` ✅ Migrated                  |
| 19  | `libs/coach-creator/data-extraction.ts`         | `extractMethodologyPreferences` ✅ Migrated         |
| 20  | `libs/coach-creator/data-extraction.ts`         | `extractSpecializations` ✅ Migrated                |
| 21  | `libs/coach-creator/tool-generation.ts`         | `validateCoachConfig` ✅ Migrated                   |
| 22  | `libs/memory/detection.ts`                      | `analyzeSemanticRetrieval` ✅ Migrated              |
| 23  | `libs/memory/detection.ts`                      | `detectMemoryRequest` ✅ Migrated                   |
| 24  | `libs/pinecone-utils.ts`                        | `shouldUseSemanticSearch` ✅ Migrated               |
| 25  | `libs/pinecone-utils.ts`                        | `analyzeMethodologyIntent` ✅ Migrated              |
| 26  | `libs/agents/coach-creator/tools.ts`            | prompt repair normalization ✅ Migrated             |
| 27  | `libs/coach-conversation/contextual-updates.ts` | `generateContextualUpdate` ⚠️                       |
| 28  | `libs/coach-conversation/contextual-updates.ts` | `generateContextualUpdateV2` ⚠️                     |

> ⚠️ Items 23 and 24 (`generateContextualUpdate`, `generateContextualUpdateV2`): These generate text that IS displayed to users as ephemeral status messages in the UI (e.g. "Analyzing your workout..."). The Bedrock call is non-streaming (`ConverseCommand`), but the result surfaces in the UI. Nemotron can produce brief factual sentences, but coaching persona tone should be validated against a representative sample of update types before committing this migration. `classifyUserIntent` (item 1) has no such concern — it returns only `"COMPLEX"` or `"SIMPLE"` and is never shown to users.

### "Maybe" Candidates (6 call sites)

These require testing before migration. Primary concerns are coaching persona voice, moderate schema complexity, or creative output requirements.

| #   | File                                       | Function                               | Concern                                            |
| --- | ------------------------------------------ | -------------------------------------- | -------------------------------------------------- |
| 1   | `libs/workout/extraction.ts`               | `generateWorkoutSummary`               | Short free text but factual; quality check needed  |
| 2   | `libs/workout/detection.ts`                | `extractQuickWorkoutContext`           | ~12 fields extracted; borderline schema complexity |
| 3   | `libs/coach-creator/tool-generation.ts`    | `generateCoachName`                    | Creative task at temp 1.0; may degrade             |
| 4   | `libs/coach-creator/session-management.ts` | `generateSessionSummary`               | Persona-flavored text paragraph                    |
| 5   | `libs/coach-creator/question-generator.ts` | `generateNextQuestion` (non-streaming) | Coaching persona voice                             |
| 6   | `libs/memory/detection.ts`                 | `detectMemoryCharacteristics`          | Moderate schema complexity                         |

### Excluded (Not Candidates)

These call sites should remain on their current model. They use complex schemas, require extended reasoning, generate nuanced content, or are part of streaming agent loops.

| File                                                | Function                              | Reason                                               |
| --------------------------------------------------- | ------------------------------------- | ---------------------------------------------------- |
| `libs/workout/validation.ts`                        | `performNormalization`                | Full workout schema output; on Sonnet intentionally  |
| `libs/workout/tool-generation.ts`                   | `generateNormalization`               | Large composite workout schema                       |
| `libs/workout-creator/todo-extraction.ts`           | `extractWorkoutCreatorInfo`           | Complex schema                                       |
| `libs/program/phase-generator.ts`                   | All 4 calls                           | Complex program generation, `enableThinking: true`   |
| `libs/program/normalization.ts`                     | Both calls                            | Large normalization schema                           |
| `libs/program/summary.ts`                           | `generateProgramSummary`              | Quality narrative; on Sonnet intentionally           |
| `libs/program-designer/todo-extraction.ts`          | `extractProgramInfo`                  | Complex schema                                       |
| `libs/program-designer/session-management.ts`       | `generateSessionSummary`              | Persona text (see Maybe list)                        |
| `libs/program-designer/question-generator.ts`       | `generateNextQuestion`                | Persona voice (see Maybe list)                       |
| `libs/coach-creator/todo-extraction.ts`             | `extractCoachCreatorInfo`             | 22 optional nested objects; schema too large         |
| `libs/coach-creator/tool-generation.ts`             | `selectPersonalityTemplate`           | Nuanced matching; on Sonnet intentionally            |
| `libs/coach-creator/tool-generation.ts`             | `selectMethodologyTemplate`           | Same                                                 |
| `libs/coach-creator/tool-generation.ts`             | `generateCoachPrompts`                | 7 full personality prompts; complex + creative       |
| `libs/coach-creator/coach-generation.ts`            | `generateCoachConfig` (both paths)    | Very large schema; on Sonnet intentionally           |
| `libs/coach-creator/question-generator.ts`          | `generateCompletionMessage`           | Persona voice (see Maybe list)                       |
| `libs/agents/*/agent.ts` (`callBedrockApiForAgent`) | All three agent ReAct loops           | Multi-tool orchestration; on Sonnet intentionally    |
| `libs/agents/program-designer/tools.ts`             | `pruneExcessWorkouts`                 | `enableThinking: true`; nuanced structural reasoning |
| `libs/coach-conversation/detection.ts`              | `analyzeSmartRouterRequest`           | ~300-line schema; routing complexity                 |
| `libs/memory/detection.ts`                          | `consolidatedMemoryAnalysis`          | Largest schema in file; combined analysis            |
| `libs/coach-conversation/response-orchestrator.ts`  | Both `callBedrockApiMultimodal` calls | Main conversation turn; quality paramount            |
| `libs/pinecone-compression.ts`                      | `compressContent`                     | Semantic compression; on Sonnet intentionally        |
| `libs/analytics/normalization.ts`                   | `normalizeAnalytics`                  | Complex schema; on Sonnet intentionally              |
| `libs/analytics/data-fetching.ts`                   | `generateAnalytics`                   | `enableThinking: true`; complex analytics            |
| `build-conversation-summary/handler.ts`             | `buildConversationSummary`            | Rich summary; quality-sensitive                      |
| `log-workout-template/handler.ts`                   | `analyzeScaling`                      | Complex nested scaling JSON                          |

---

## Implementation Notes

### UTILITY tier status (2026-02-23, updated 2026-02-26)

- **Workout domain (8 call sites):** Migrated. `detectDiscipline`, `checkWorkoutComplexity`, `classifyDisciplineAsQualitative`, `classifyDiscipline`, `classifyWorkoutType`, `validateExerciseStructure`, `extractWorkoutTime`, and `validateWorkoutContent` all use `UTILITY_MODEL_FULL` (Nova 2 Lite). `extractCompletedAtTime` and `classifyDiscipline` (in `extraction.ts`) additionally converted from prefill/text-mode to proper toolConfig/schema pattern.
- **Exercise domain (2 call sites):** Migrated. `normalizeExerciseNames` and `normalizeExerciseNamesWithUserContext` both use `UTILITY_MODEL_FULL` (Nova 2 Lite).
- **Program domain (1 call site):** Migrated. `normalizeDuration` in `libs/program/duration-normalizer.ts` moved from `CONTEXTUAL_MODEL_FULL` to `UTILITY_MODEL_FULL` (Nova 2 Lite). All other program domain functions remain on PLANNER or dynamic model tiers.
- **Coach Creator simple extractors (4 call sites):** Migrated. `extractGenderPreference`, `extractTrainingDays` (frequency), `extractGoalTimeline`, and `extractTrainingIntensity` in `libs/coach-creator/data-extraction.ts` all moved to `UTILITY_MODEL_FULL`. These are AI fallback paths — no tool schemas, single-value outputs.
- **Coach Creator structured extractors (3 call sites):** Migrated. `extractSafetyProfile` (5 string arrays), `extractMethodologyPreferences` (4 fields: 3 string arrays + 1 enum), and `extractSpecializations` (single `string[]` field) in `libs/coach-creator/data-extraction.ts` moved from `EXECUTOR_MODEL_FULL` to `UTILITY_MODEL_FULL`. All use imported schema constants, output consumed programmatically, never shown to users.
- **Coach Creator config validation (1 call site):** Migrated. `validateCoachConfig` in `libs/coach-creator/tool-generation.ts` moved from `EXECUTOR_MODEL_FULL` to `UTILITY_MODEL_FULL`. Uses `VALIDATION_RESULT_SCHEMA` (5 flat fields: bool, number, string arrays), output consumed programmatically.
- **Memory domain (2 call sites):** Migrated. `detectMemoryRetrievalNeed` and `detectMemoryRequest` in `libs/memory/detection.ts` moved to `UTILITY_MODEL_FULL`. Both use small tool schemas (~40 lines). `detectMemoryCharacteristics` (Maybe) and `analyzeMemoryNeeds` (No) remain on EXECUTOR.
- **Pinecone utilities (2 call sites):** Migrated. `shouldUsePineconeSearch` and `analyzeMethodologyIntent` in `libs/pinecone-utils.ts` moved to `UTILITY_MODEL_FULL`. Both use prefill JSON pattern with no tool schemas.
- **Coach Conversation domain (2 call sites):** Migrated. `classifyUserIntent` (binary COMPLEX/SIMPLE classification, no tools) in `libs/coach-conversation/contextual-updates.ts` moved from `CONTEXTUAL_MODEL_FULL` to `UTILITY_MODEL_FULL`. `detectConversationComplexity` (1 tool, ~40-line schema) in `libs/coach-conversation/detection.ts` moved from `EXECUTOR_MODEL_FULL` to `UTILITY_MODEL_FULL`. Neither output surfaces to users. `analyzeSmartRouterRequest` (No) and the two contextual update generators (⚠️ pending tone validation) remain unchanged.
- **Coach Creator agent (1 call site):** Migrated. Prompt repair call in `normalizeCoachConfigTool` (`libs/agents/coach-creator/tools.ts`) moved from `EXECUTOR_MODEL_FULL` to `UTILITY_MODEL_FULL`. Small schema (`{fixed_prompt, changes_made}`), output consumed programmatically.
- **All other domains:** Remain on their original models pending further testing.

### Testing the Nova 2 Lite migration

Run `test/integration/test-build-workout.ts` — all 27 test cases exercise the workout and exercise pipelines which hit all 10 workout/exercise UTILITY call sites. The `normalizeDuration` program domain call site requires a program-building conversation for coverage. Watch for:

- Nova model ID appearing in CloudWatch Bedrock calls
- Any `ValidationException` from schema incompatibility (particularly `additionalProperties: false`)
- Tool use responses being correctly parsed and validated by `validateToolResponse()`
- Discipline detection accuracy (confidence scores, correct classifications) vs. Haiku baseline

If Nova rejects schemas with `additionalProperties: false`, add a schema-stripping function to `buildToolConfig()` that removes unsupported keys before sending to Nova models.

### Strict mode removal and `skipValidation`

`strict: true` has been removed from all `toolSpec` definitions globally (2026-02-23). Client-side schema enforcement via `ajv` is in `libs/tool-validation.ts` and runs inside `extractToolUseResult()`. Callers that pass `tools` to `callBedrockApi` automatically get validation — unless they opt out with `skipValidation: true`.

**Call sites with `skipValidation: true` (large schemas cleaned by downstream evaluator-optimizer):**

| File                                       | Tool                                | Reason                                                                              |
| ------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------- |
| `libs/workout/tool-generation.ts`          | `normalize_workout`                 | Large composite schema; normalization pipeline repairs output                       |
| `libs/agents/workout-logger/tools.ts`      | `generate_workout`                  | Large composite schema with `enableThinking`; agent loop tolerates minor deviations |
| `libs/program/phase-generator.ts`          | `generate_phase_structure`          | Large program schema with `enableThinking: true`                                    |
| `libs/program/phase-generator.ts`          | `generate_program_phase`            | Large program schema with `enableThinking: true`                                    |
| `libs/coach-creator/coach-generation.ts`   | `generate_coach_config`             | Very large schema; coach normalization pipeline repairs output                      |
| `libs/workout-creator/todo-extraction.ts`  | `extract_workout_info` (both paths) | Large extraction schema                                                             |
| `libs/program-designer/todo-extraction.ts` | `extract_program_info` (both paths) | Large extraction schema                                                             |
| `libs/coach-creator/todo-extraction.ts`    | `extract_coach_creator_info`        | 22 optional nested objects                                                          |

**All other tool call sites** validate strictly. Minor deviations trigger a throw and retry.

For future UTILITY migrations, proceed domain by domain and run the relevant integration test after each batch. For `generateContextualUpdate` and `generateContextualUpdateV2`, validate the persona tone of generated updates before committing since those strings surface directly in the UI.
