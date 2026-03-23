# User Memory Upgrade — Implementation Documentation

## Overview

The NeonPanda Memory System was upgraded from a basic explicit-memory store (Phase 1) to a 4-upgrade cognitive architecture that gives each AI coach a persistent, evolving mental model of the user. The system draws on spaced repetition research (FSRS-4.5) and cognitive science to create memory that behaves more like a real coach's — memories strengthen with use, fade when neglected, and the coach proactively follows up on commitments. All four upgrades are fully implemented and operational.

## Architecture Summary

```
Conversation Turn
    ├── Sync Path (per-message, blocking)
    │   ├── Load user memories (DynamoDB + Pinecone hybrid)
    │   ├── Load active prospective memories (DynamoDB filter)
    │   ├── Load Living Profile (from UserProfile)
    │   ├── Load emotional snapshots + weekly trend (parallel, DynamoDB)
    │   ├── Reinforce retrieved memories (FSRS-4.5 stability update)
    │   └── Inject into system prompt: memories, prospective, living profile, emotional context
    │
    ├── Fire-and-Forget (after AI response, non-blocking)
    │   ├── Extract prospective memories from user msg + AI response
    │   └── Save to DynamoDB + Pinecone
    │
    └── Async Chain (after conversation summary, Lambda invocations)
        ├── Extract emotional snapshot → save to DynamoDB
        ├── Extract episodic moments → save to DynamoDB + Pinecone (global memories)
        └── Trigger build-living-profile Lambda → update UserProfile

Daily Batch (EventBridge 3am UTC)
    └── dispatch-memory-lifecycle (coordinator, GSI3 fan-out)
          └── process-memory-lifecycle (per user, parallel)
                ├── Compress decayed memories (retrievability < 0.3, Nova 2 Lite)
                ├── Archive forgotten memories (retrievability < 0.1, remove from Pinecone)
                ├── Expire stale prospective memories
                └── (Sunday only) Weekly behavioral detection + emotional trend calculation
```

## The 4 Upgrades

### Upgrade 1: Prospective Memory

**Purpose:** Forward-looking commitments and events the coach should follow up on at the right time.

**Key files:**

- `amplify/functions/libs/memory/prospective.ts`
- `amplify/functions/libs/schemas/prospective-memory-schema.ts`
- `amplify/functions/libs/memory/types.ts` (ProspectiveMemoryMetadata)

**How it works:**

1. After each conversation turn, `extractAndSaveProspectiveMemories()` runs fire-and-forget
2. Bedrock analyzes both the user message and AI response for future events, commitments, milestones
3. Extracted items are saved as `memoryType: "prospective"` with trigger windows and follow-up prompts
4. On the next conversation turn, `filterActiveProspectiveMemories()` checks which prospective memories are within their trigger window (DynamoDB-only, no AI call)
5. Active items are formatted by `formatProspectiveMemoriesForPrompt()` and injected as a `# FOLLOW-UP ITEMS` section in the system prompt, categorized as TODAY / UPCOMING / FOLLOW UP / GENERAL

**Trigger window logic:**

- Major events (competitions, races): 7 days before, 5 days after
- Medium events (trying something new): 2 days before, 3 days after
- Small commitments: 1 day before, 2 days after
- No-date items: show for 14 days after creation, expire at 30 days

**Lifecycle:** Prospective memories have their own status flow: `pending` → `triggered` → `resolved` or `expired`. The lifecycle Lambda is responsible for expiring stale items.

**Status:** Fully implemented. Extraction, storage, filtering, prompt injection, and expiry detection all work.

### Upgrade 2: Living Profile (Coach's Mental Model)

**Purpose:** A rich, structured "mental model" the coach maintains of the user — the aggregation layer that all other upgrades feed into.

**Key files:**

- `amplify/functions/libs/user/living-profile.ts`
- `amplify/functions/libs/user/types.ts` (LivingProfile interface)
- `amplify/functions/libs/schemas/living-profile-schema.ts`
- `amplify/functions/build-living-profile/handler.ts`

**How it works:**

1. After conversation summary is generated, `build-conversation-summary` invokes `build-living-profile` Lambda asynchronously
2. The Lambda loads: existing profile (if any), conversation summary, and all user memories
3. Sonnet synthesizes or updates the Living Profile with structured sections
4. The profile is saved to `UserProfile.livingProfile` in DynamoDB
5. On the next conversation turn, the profile is loaded from `UserProfile` and formatted by `formatLivingProfileForPrompt()` for injection into the system prompt

**Profile structure:**

- `trainingIdentity` — summary, experience level, training age, disciplines, identity narrative
- `communicationPreferences` — preferred style, response length, motivational triggers, sensitive topics
- `lifeContext` — occupation, schedule, stressors, support factors, constraints
- `goalsAndProgress` — active goals, recent milestones, current phase, trajectory
- `coachingRelationship` — relationship stage (new/developing/established/deep), rapport, dynamic
- `knowledgeGaps` (metamemory) — unknown topics, partially known topics, suggested questions
- `observedPatterns` — behavioral patterns with confidence scores and observation counts
- `highlightReel` — significant shared moments (episodic highlights, up to 10)
- `metadata` — version, last updated, confidence, sources

**Relationship stage rules:**

- new: 1-3 conversations
- developing: 4-10 conversations
- established: 11-30 conversations
- deep: 30+ conversations

**Status:** Fully implemented. Generation, storage, prompt injection, and incremental updates all work.

### Upgrade 3: Memory Lifecycle — FSRS-Based Temporal Decay

**Purpose:** Replace flat 30-day recency scoring with a real forgetting curve. Memories that are used often grow stronger (higher stability); neglected memories fade and eventually compress/archive.

**Key files:**

- `amplify/functions/libs/memory/lifecycle.ts`
- `amplify/functions/libs/memory/types.ts` (MemoryLifecycleMetadata)
- `amplify/dynamodb/memory.ts` (calculateDecayScore integration in query sorting)
- `amplify/functions/memory/dispatch-memory-lifecycle/handler.ts` (coordinator)
- `amplify/functions/memory/process-memory-lifecycle/handler.ts` (per-user processor)

**FSRS-4.5 Algorithm (core math):**

The system uses FSRS-4.5 constants (DECAY=-0.5, FACTOR=19/81) rather than FSRS v6 trainable parameters because we are not training on user review data. The forgetting curve formula is identical; only the parameter source differs.

The system implements three key functions from the Free Spaced Repetition Scheduler:

**Retrievability** — how "fresh" a memory is right now:

```
R(t, S) = (1 + FACTOR * t / S)^DECAY
```

Where `DECAY = -0.5`, `FACTOR = 0.9^(1/DECAY) - 1`, `t` = days since last reinforcement, `S` = stability in days.

**Stability update** — how much stronger a memory gets after use:

```
S' = S * (e^0.5 * (11 - D) * S^-0.2 * (e^(0.1*(1-R)) - 1) + 1)
```

The "desirable difficulty" effect: memories reinforced at lower retrievability gain MORE stability (spaced repetition benefit).

**Compression threshold** — when to consider compressing:

```
I(r, S) = (r^(1/DECAY) - 1) / FACTOR * S
```

**Initial stability by importance:**

- High importance: 30 days
- Medium importance: 15 days
- Low importance: 7 days

**Difficulty mapping (inverse of importance):**

- High importance → 0.3 difficulty (easier to retain)
- Medium importance → 0.5 difficulty
- Low importance → 0.7 difficulty (harder to retain)

**Lifecycle states:** `active` → `compressed` → `archived`

- Compress when: retrievability < 0.3, active, < 3 reinforcements, older than 60 days
- Archive when: already compressed, retrievability < 0.1, compressed > 90 days ago
- Archived memories are excluded from all queries

**What's implemented:**

- Core FSRS-4.5 math functions (retrievability, stability update, compression threshold)
- `calculateDecayScore()` — drop-in replacement for flat recency scoring, used in DynamoDB query sorting
- `reinforceMemory()` — called when memories are retrieved during conversation, updates stability and resets decay clock
- `shouldCompressMemory()` and `shouldArchiveMemory()` — threshold checks
- `initializeLifecycle()` — creates initial lifecycle metadata for new memories; called when creating memories in `detectAndProcessMemory()`, `buildProspectiveMemories()`, and `buildEpisodicMemories()`
- `dispatch-memory-lifecycle` + `process-memory-lifecycle` Lambda fan-out batch system, scheduled daily at 3am UTC via EventBridge
- Per-user compression (Nova 2 Lite), archival with Pinecone deletion, and prospective expiry all run in production

### Upgrade 4: Emotional Intelligence

**Purpose:** Track the user's emotional state across conversations to enable the coach to adapt tone and approach.

**Key files:**

- `amplify/functions/libs/memory/emotional.ts`
- `amplify/functions/libs/memory/emotional-types.ts`
- `amplify/functions/libs/schemas/emotional-snapshot-schema.ts`

**How it works:**

1. After conversation summary is generated, `extractEmotionalSnapshot()` runs fire-and-forget
2. Haiku analyzes the summary to produce calibrated scores (1-10 scale) for: motivation, energy, confidence, stress, coach satisfaction
3. Also extracts: dominant emotion label, emotional narrative, triggers, conversation topics
4. `calculateEmotionalTrends()` aggregates snapshots into weekly/monthly trends (pure math, no AI)
5. `formatEmotionalContextForPrompt()` produces coaching-oriented guidance for prompt injection
6. `shouldAlertCoach()` detects concerning patterns (sustained low motivation, stress spikes, declining satisfaction)

**Coaching hints injected based on state:**

- High stress (>=7): "Consider lighter check-in, emphasize recovery"
- Low motivation (<=3): "Focus on small wins and intrinsic rewards"
- High confidence + motivation (>=8): "Good time for challenges or new goals"

**What's implemented:**

- Snapshots extracted and persisted to DynamoDB after every conversation summary
- Recent snapshots (up to 5) + latest weekly trend loaded in parallel with other data on every V2 agent conversation turn
- `emotionalContext` formatted by `formatEmotionalContextForPrompt()` and injected into the dynamic prompt section of `buildConversationAgentPrompt()`
- Weekly trend calculation runs in the Sunday `process-memory-lifecycle` batch from the last 20 snapshots
- Emotional data is global (accessible to all coaches)

## Supporting Modules

### Episodic Memory

**File:** `amplify/functions/libs/memory/episodic.ts`

Extracts "highlight moments" from conversation summaries — significant shared experiences that build rapport. Uses Sonnet for emotional nuance. Moments include emotional valence, significance, themes, and original exchange paraphrases.

**Status:** Fully wired. Runs fire-and-forget after every conversation summary in `build-conversation-summary/handler.ts`. Episodic memories are stored as global (`coachId: null`) so all coaches benefit from them.

### Behavioral Pattern Detection

**File:** `amplify/functions/libs/memory/behavioral.ts`

Detects implicit patterns from conversation history: training patterns, communication patterns, adherence patterns, emotional patterns, avoidance patterns. Uses Sonnet for longitudinal pattern synthesis. Minimum 0.5 confidence to report; patterns need evidence across 2-3+ conversations.

**Status:** Fully wired. Runs weekly (Sunday) inside `process-memory-lifecycle` using the last 2 weeks of conversation summaries. Behavioral memories are stored as global (`coachId: null`) so all coaches benefit from cross-conversation patterns.

## DynamoDB Schema Changes

### New Memory Types

The `memoryType` field now supports: `preference`, `goal`, `constraint`, `instruction`, `context`, `prospective`, `episodic`, `behavioral`.

### New Metadata Fields

```typescript
metadata: {
  // Existing fields...
  prospective?: ProspectiveMemoryMetadata;  // For prospective memories
  lifecycle?: MemoryLifecycleMetadata;       // For FSRS temporal decay
}
```

### New DynamoDB Entity Patterns

- `emotionalSnapshot#{snapshotId}` — entityType: `emotionalSnapshot`, pk: `user#${userId}`, persisted after every conversation summary
- `emotionalTrend#{period}#{periodStart}` — entityType: `emotionalTrend`, pk: `user#${userId}`, computed and saved weekly

### Query Sorting Change

Memory queries now use `calculateDecayScore()` which returns FSRS-based retrievability \* 30 (same 0-30 range as old flat scoring), falling back to flat scoring for memories without lifecycle data.

## API Changes

### New Endpoint

`PUT /users/{userId}/memories/{memoryId}` — Update memory fields. Used for content edits, lifecycle state changes, and prospective memory resolution.

### New Lambda Functions

- `build-living-profile` — Async, triggered after conversation summary
- `memory/dispatch-memory-lifecycle` — Scheduled (EventBridge daily 3am UTC), coordinator that fans out per-user processors
- `memory/process-memory-lifecycle` — Async invoked per user by dispatcher; runs compress, archive, expire, weekly behavioral + trends
- `memory/update-memory` — Sync API handler for PUT endpoint

All memory CRUD Lambdas (`create-memory`, `get-memories`, `update-memory`, `delete-memory`) are organized under `amplify/functions/memory/` subfolder.

## Prompt Integration Order (Dynamic Section)

1. Current date and time (temporal anchor)
2. Living Profile (coach's mental model)
3. Emotional Context (recent snapshots + weekly trend, formatted coaching guidance)
4. Prospective Follow-Up Items
5. User Memories (grouped by type)
6. User Context (name, goals, session number)
7. Recent Workout Context
8. Pinecone Semantic Context

## Implementation Completeness Matrix

| Component                | Code | Integration  | Storage | Prompt | Status       |
| ------------------------ | ---- | ------------ | ------- | ------ | ------------ |
| Prospective Memory       | Done | Done         | Done    | Done   | **Complete** |
| Living Profile           | Done | Done         | Done    | Done   | **Complete** |
| FSRS-4.5 Decay Scoring   | Done | Done (query) | N/A     | N/A    | **Complete** |
| FSRS-4.5 Reinforcement   | Done | Done         | Done    | N/A    | **Complete** |
| FSRS-4.5 Lifecycle Init  | Done | Done         | N/A     | N/A    | **Complete** |
| FSRS Compression/Archive | Done | Done         | N/A     | N/A    | **Complete** |
| Lifecycle Batch Job      | Done | Done         | N/A     | N/A    | **Complete** |
| Emotional Extraction     | Done | Done         | Done    | Done   | **Complete** |
| Emotional Trends         | Done | Done         | Done    | Done   | **Complete** |
| Episodic Extraction      | Done | Done         | Done    | N/A    | **Complete** |
| Behavioral Detection     | Done | Done         | Done    | N/A    | **Complete** |

## All Components Implemented

The memory system is fully operational across all four upgrades. The FSRS-4.5 lifecycle runs daily, emotional intelligence data flows into every conversation, episodic and behavioral memories accumulate in the background, and all memory Lambdas are organized under `amplify/functions/memory/`.
