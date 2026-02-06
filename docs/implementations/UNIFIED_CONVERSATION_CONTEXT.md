# Unified Conversation Context

## Shared Context Between Coach Conversations & Program Designer

**Created:** 2026-02-05
**Updated:** 2026-02-06
**Status:** Phase 0 Complete, Phase 1 Partially Complete
**Priority:** High
**Related Fix:** Cross-screen context boundary prompt guardrail (v1.0.20260205-beta)

---

## Progress Log

### Phase 0: Foundation (Completed 2026-02-06, v1.0.20260206-beta)

Before implementing cross-context summary sharing, we addressed foundational quality and architecture issues in the Pinecone summary and retrieval layer:

**Summary Quality Upgrades:**

- Upgraded `generateCoachCreatorSessionSummary()` from template-based concatenation of raw user responses to AI-powered (Bedrock Haiku 4) 3-4 sentence narratives capturing athlete profile, methodology, personality, and training preferences
- Upgraded `generateProgramDesignerSessionSummary()` from template-based concatenation to AI-powered 3-4 sentence narratives capturing program requirements, design decisions, structure, and user context
- Both now produce semantically rich text suitable for Pinecone embedding and cross-context retrieval (previously, raw pipe-delimited user responses performed poorly in semantic search)

**Query Architecture Refactor:**

- Refactored `queryUserNamespace()` from a single combined Pinecone query (all record types sharing one `topK: 30`) to per-type parallel queries, each with its own `topK` budget
- This eliminates type crowding where high-volume types (e.g., 80+ workout summaries) would push out low-volume types (e.g., 3 program summaries) before the reranker could evaluate them
- New `querySingleRecordType()` helper issues focused single-type Pinecone queries; `queryUserNamespace` runs all enabled types via `Promise.all` and combines results for reranking

**Cross-Context Retrieval Enablement:**

- Added `program_summary` as a queryable record type in coach conversations (previously invisible to the coach)
- Added `TRAINING PROGRAM CONTEXT` formatting section in `formatPineconeContext()`
- Program designer now queries with `conversationTopK: 8` (higher budget) and a broader query string for stronger cross-context retrieval of coaching conversation summaries
- Coach conversations now query with `programTopK: 3` to surface relevant training program context

**Files Changed:**

- `amplify/functions/libs/coach-creator/session-management.ts`
- `amplify/functions/libs/program-designer/session-management.ts`
- `amplify/functions/libs/agents/coach-creator/tools.ts`
- `amplify/functions/build-program/handler.ts`
- `amplify/functions/libs/api-helpers.ts`
- `amplify/functions/libs/pinecone-utils.ts`
- `amplify/functions/libs/coach-conversation/context.ts`
- `amplify/functions/libs/agents/program-designer/tools.ts`
- `amplify/functions/libs/program/program-generator.ts`
- `amplify/functions/libs/coach-creator/coach-generation.ts`
- `amplify/functions/libs/agents/coach-creator/types.ts`

---

## Problem Statement

Coach conversations and program designer sessions currently operate in isolated silos. Each conversation stores its full message history as an embedded array inside a single DynamoDB record, making that history inaccessible to other contexts.

This creates real user-facing issues:

- A user discusses swapping an exercise with their coach, gets directed to Program Designer, and the designer has no idea what was discussed
- The coach can't reference what the user built or modified in Program Designer
- Users perceive the coach as having "short-term memory" when context doesn't carry across screens
- Currently mitigated with a prompt guardrail instructing the coach not to imply context carries over, but users would benefit from actual continuity

---

## Current Architecture

```
┌─────────────────────────────────┐     ┌─────────────────────────────────┐
│     Coach Conversation          │     │     Program Designer Session     │
│     (DynamoDB Record)           │     │     (DynamoDB Record)            │
│                                 │     │                                  │
│  pk: user#userId                │     │  pk: user#userId                 │
│  sk: conversation#convId        │     │  sk: program_session#sessionId   │
│                                 │     │                                  │
│  attributes: {                  │     │  attributes: {                   │
│    messages: [                  │     │    messages: [                   │
│      { role, content, ts },     │     │      { role, content, ts },      │
│      { role, content, ts },     │     │      { role, content, ts },      │
│      ...embedded array...       │     │      ...embedded array...        │
│    ]                            │     │    ]                             │
│  }                              │     │  }                               │
└─────────────────────────────────┘     └─────────────────────────────────┘
         ↑ isolated                              ↑ isolated
         no cross-reference                      no cross-reference
```

**Limitations:**

- Messages are embedded inside parent records, not independently queryable
- No way for one context to read another context's messages
- Conversation summaries exist (for Pinecone) but aren't shared across contexts
- DynamoDB record size grows with message count (400KB limit risk for long sessions)

---

## Proposed Architecture: Shared Message Store

Promote messages from embedded arrays to first-class DynamoDB items with a shared key structure. Each UI context (coach conversation, program designer, future features) writes to and reads from the same message store.

```
┌─────────────────────────────────────────────────────┐
│              Shared Message Store (DynamoDB)          │
│                                                      │
│  pk: user#userId                                     │
│  sk: msg#2026-02-05T18:30:00.000Z#abc123             │
│                                                      │
│  attributes: {                                       │
│    messageId: "msg_userId_1738776600_abc123"          │
│    role: "user" | "assistant"                        │
│    content: "Can we swap barbell hip thrusts for..."  │
│    timestamp: "2026-02-05T18:30:00.000Z"             │
│    sourceContext: "coach_conversation"                │
│    sourceId: "conv_userId_1738776500_xyz789"          │
│    coachId: "user_userId_coach_..."                   │
│    mode: "chat" | "program_design" | "workout_log"   │
│    metadata: { ... }                                 │
│  }                                                   │
└─────────────────────────────────────────────────────┘
         ↑                              ↑
         │                              │
┌────────┴──────────┐    ┌──────────────┴──────────────┐
│ Coach Conversation │    │    Program Designer Session  │
│ (Session Record)   │    │    (Session Record)          │
│                    │    │                              │
│ Metadata only:     │    │ Metadata only:               │
│ - sessionId        │    │ - sessionId                  │
│ - status           │    │ - status                     │
│ - mode             │    │ - mode                       │
│ - startedAt        │    │ - programId                  │
│ - lastMessageAt    │    │ - phase/step                 │
│ - messageCount     │    │ - startedAt                  │
│                    │    │ - lastMessageAt              │
│ Reads/writes msgs  │    │ Reads/writes msgs            │
│ from shared store  │    │ from shared store             │
└────────────────────┘    └──────────────────────────────┘
```

### Key Design Decisions

**Message Record Schema:**

| Field           | Type                    | Purpose                                                   |
| --------------- | ----------------------- | --------------------------------------------------------- |
| `pk`            | `user#userId`           | Standard user-scoped partition key                        |
| `sk`            | `msg#timestamp#shortId` | Sortable by time, globally unique                         |
| `messageId`     | String                  | Entity ID following standard pattern                      |
| `role`          | String                  | `user`, `assistant`, `system`                             |
| `content`       | String                  | Message content                                           |
| `timestamp`     | ISO 8601                | When the message was sent                                 |
| `sourceContext` | String                  | `coach_conversation`, `program_designer`, future contexts |
| `sourceId`      | String                  | The session/conversation ID this message belongs to       |
| `coachId`       | String                  | Which coach personality generated/received this           |
| `mode`          | String                  | Conversation mode at time of message                      |
| `metadata`      | Map                     | Context-specific metadata (images, tool use, etc.)        |

**Session Record Schema (slim):**

| Field           | Type                                                    | Purpose                                            |
| --------------- | ------------------------------------------------------- | -------------------------------------------------- |
| `pk`            | `user#userId`                                           | Standard partition key                             |
| `sk`            | `conversation#sessionId` or `program_session#sessionId` | Session identifier                                 |
| `entityType`    | String                                                  | `coach_conversation` or `program_designer_session` |
| `status`        | String                                                  | `active`, `completed`, `archived`                  |
| `mode`          | String                                                  | Current mode                                       |
| `coachId`       | String                                                  | Associated coach                                   |
| `messageCount`  | Number                                                  | Count for display purposes                         |
| `startedAt`     | ISO 8601                                                | Session start                                      |
| `lastMessageAt` | ISO 8601                                                | Most recent activity                               |
| `summary`       | String                                                  | AI-generated session summary                       |

### Query Patterns

| Query                               | Key Condition                                                       | Use Case                                    |
| ----------------------------------- | ------------------------------------------------------------------- | ------------------------------------------- |
| All messages for a session          | `pk = user#userId` + filter `sourceId = sessionId`                  | Load a specific conversation                |
| Recent messages across all contexts | `pk = user#userId` + `sk begins_with msg#` + ScanIndexForward=false | Cross-context retrieval for prompt building |
| Messages in time range              | `pk = user#userId` + `sk between msg#fromTs and msg#toTs`           | Historical context window                   |
| All sessions for a user             | `pk = user#userId` + `sk begins_with conversation#`                 | List conversations                          |

**GSI Consideration:** A GSI with `pk: sourceId` and `sk: timestamp` would allow efficient retrieval of all messages for a specific session without filtering.

---

## Existing Pinecone Summary Inventory

All conversation types generate and store summaries in Pinecone. As of v1.0.20260206-beta, all five types now use AI-generated summaries suitable for semantic search.

| Conversation Type             | Record Type                | Summary Quality          | Pinecone Function                                                                       | Trigger                                                         | Key Metadata                                                                                                   |
| ----------------------------- | -------------------------- | ------------------------ | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Coach Conversations**       | `conversation_summary`     | AI-generated (Claude)    | `storeCoachConversationSummaryInPinecone()` in `libs/coach-conversation/pinecone.ts`    | `build-conversation-summary` Lambda (async, after conversation) | `conversationId`, `messageCount`, `triggerReason`, `confidence`, goal/progress/emotional flags                 |
| **Coach Creator Sessions**    | `coach_creator_summary`    | AI-generated (Haiku 4)   | `storeCoachCreatorSummaryInPinecone()` in `libs/coach-creator/pinecone.ts`              | `saveCoachConfigToDatabaseTool` in coach-creator tools          | `sessionId`, `coachName`, `selectedPersonality`, `selectedMethodology`, `experienceLevel`, `trainingFrequency` |
| **Program Designer Sessions** | `program_designer_summary` | AI-generated (Haiku 4)   | `storeProgramDesignerSessionSummaryInPinecone()` in `libs/program-designer/pinecone.ts` | `build-program` Lambda (after program creation)                 | `sessionId`, `programId`, `programName`, `conversationTurns`, `trainingGoals`, `equipmentConstraints`          |
| **Training Programs**         | `program_summary`          | AI-generated (Haiku 4)   | `storeProgramSummaryInPinecone()` in `libs/program/pinecone.ts`                         | Program designer tools (after generation)                       | `programId`, `programName`, `totalDays`, `phaseNames`, `trainingGoals`, `adherenceRate`                        |
| **Workout Logging**           | `workout_summary`          | AI-generated (Haiku 4.5) | `storeWorkoutSummaryInPinecone()` in `libs/workout/pinecone.ts`                         | Workout logger tools (after save)                               | `workoutId`, `discipline`, `workoutName`, `completedAt`, `prAchievements`, discipline-specific metrics         |

### Current Retrieval Architecture (Post Phase 0)

Pinecone queries now use per-type parallel queries instead of a single combined query. Each record type gets its own `topK` budget, preventing type crowding:

| Caller              | `workoutTopK` | `conversationTopK` | `programTopK` | `coachCreatorTopK` | `minScore` | Notes                                        |
| ------------------- | ------------- | ------------------ | ------------- | ------------------ | ---------- | -------------------------------------------- |
| Coach Conversations | 8             | 5                  | 3             | 2                  | 0.7        | Standard balanced retrieval                  |
| Program Designer    | 5             | **8**              | 3             | 2                  | **0.5**    | Higher conversation budget for cross-context |
| Program Generator   | 5             | 5                  | 3             | 2                  | 0.7        | Balanced for program building context        |

### Phase 1 Implications

Since all summaries now exist in Pinecone with AI-generated text and per-type retrieval is in place:

- **No new summary generation needed** — all five types produce rich, semantically searchable text
- **Cross-context retrieval already active** — program designer queries conversation summaries with `conversationTopK: 8`, coach conversations query program summaries with `programTopK: 3`
- **Remaining Phase 1 work** is adding explicit cross-context prompt sections (e.g., "RECENT ACTIVITY IN OTHER CONTEXTS") and potentially time-based filtering via Pinecone metadata to scope queries to recent activity

### Gaps to Consider for Phase 1

- **Timing**: Coach conversation summaries are generated asynchronously after the conversation ends (via `build-conversation-summary` Lambda). If a user switches to Program Designer mid-conversation, the most recent coach conversation summary may not yet exist. Consider generating a lightweight "in-progress" summary when the user navigates away, or using the last few messages directly.
- **Recency**: Need to define "recent" for cross-context queries. Summaries from hours ago are relevant; summaries from weeks ago probably aren't. A 24-48 hour window with a cap of 3-5 summaries would be a reasonable starting point.
- **Relevance vs. noise**: Not all recent activity is relevant. A workout log summary probably doesn't help the Program Designer. Metadata filtering by `recordType` can scope queries to the most useful types for each context.

---

## Incremental Implementation Path

### Phase 1: Share Summaries Across Contexts (Lightweight)

**Effort:** Small
**Risk:** Low
**Benefit:** Immediate cross-context awareness
**Status:** Partially complete (foundation done, prompt injection remaining)

#### Completed (Phase 0 / v1.0.20260206-beta)

- All five summary types now use AI-generated text (coach_creator and program_designer upgraded from template-based)
- Per-type parallel Pinecone queries eliminate type crowding and ensure each record type gets fair representation
- `program_summary` records now queryable by coach conversations (previously invisible)
- Program designer queries `conversation_summary` with higher budget (`conversationTopK: 8`) and broader query string for cross-context retrieval
- `formatPineconeContext()` includes `TRAINING PROGRAM CONTEXT` section for program summaries

#### Remaining Work

The cross-context summaries are now being retrieved and included in the general `SEMANTIC CONTEXT` section of the system prompt. What remains is:

1. **Explicit cross-context prompt section** — Add a dedicated "RECENT ACTIVITY IN OTHER CONTEXTS" section in `prompt-generation.ts` that clearly labels summaries from other contexts with source and timestamp, so the AI can frame references appropriately rather than treating them as general background context
2. **Time-based filtering** — Add Pinecone metadata filtering to scope cross-context queries to recent activity (e.g., `createdAt` within last 24-48 hours) so stale summaries don't pollute the context
3. **Prompt guardrail update** — Once cross-context summaries are reliably flowing, soften or remove the "CRITICAL: Cross-Screen Context Boundaries" guardrail in the coach prompt that currently instructs the coach never to imply context carries over

**Prompt addition example:**

```
# RECENT ACTIVITY IN OTHER CONTEXTS
The user recently had the following interactions in other parts of the platform.
Use this for continuity, but don't assume actions were completed unless confirmed.

[Program Designer - 2 hours ago]: User was modifying their Deadlift Prep program.
They wanted to swap barbell hip thrusts for banded glute bridges due to limited
equipment at home. The change was discussed but may not have been completed.
```

**What this buys you:**

- Coach can reference what happened in Program Designer (and vice versa)
- No database schema changes required
- No new summary generation — uses existing Pinecone data
- Low token cost (summaries are concise by design)

**Limitation to note:** Coach conversation summaries are generated asynchronously after the conversation ends. If a user switches screens mid-conversation, the latest summary may not exist yet. This can be addressed in Phase 2 with real-time message access, or with a lightweight "in-progress summary" generation on navigation.

### Phase 2: Shared Message Store (Full Implementation)

**Effort:** Medium-Large
**Risk:** Medium (migration required)
**Benefit:** Full cross-context continuity, independent message querying

Migrate from embedded message arrays to first-class DynamoDB message records as described above.

**Implementation Steps:**

1. **Define message and session schemas** in DynamoDB operations
2. **Create write path** - new messages go to shared store instead of embedded array
3. **Create read path** - conversation loading queries shared store filtered by sourceId
4. **Update prompt building** - `generateSystemPrompt()` can now query messages across contexts
5. **Update streaming handler** - `stream-coach-conversation` writes to shared store
6. **Update program designer** - reads/writes to shared store
7. **Migration script** - extract embedded messages from existing records into shared store
8. **Update conversation summary generation** - summaries now span cross-context history

**What this buys you (beyond Phase 1):**

- Full message-level context sharing, not just summaries
- Coach can reference specific things the user said in Program Designer
- Program Designer can see the coach's recommendations from recent conversations
- No DynamoDB 400KB record size risk (messages are individual items)
- Foundation for future features (unified conversation history view, multi-coach context, etc.)

### Phase 3: Intelligent Context Selection (Future)

**Effort:** Medium
**Risk:** Low (additive)
**Benefit:** Optimal prompt context without token waste

Build on the shared store to intelligently select which cross-context messages to include in prompts.

**Implementation:**

1. **Recency window** - always include last N messages from the current session
2. **Semantic relevance** - use Pinecone to find messages from other contexts that are semantically relevant to the current topic
3. **Explicit references** - detect when a user says "like we talked about" or "continue from where we left off" and pull the most recent related cross-context messages
4. **Token budgeting** - allocate a specific token budget for cross-context messages and optimize within it

---

## Migration Strategy

For the Phase 2 migration from embedded arrays to shared store:

1. **Dual-write period**: New messages written to both embedded array and shared store
2. **Read from shared store**: Once dual-write is stable, switch reads to shared store
3. **Backfill script**: Extract existing embedded messages into shared store
4. **Remove embedded writes**: Stop writing to embedded arrays
5. **Cleanup**: Remove embedded message arrays from old records (optional, can leave for safety)

This allows a zero-downtime migration with rollback capability at each step.

---

## Benefits Summary

| Benefit                                   | Phase 1       | Phase 2            | Phase 3               |
| ----------------------------------------- | ------------- | ------------------ | --------------------- |
| Coach references Program Designer context | Summary-level | Full message-level | Semantically relevant |
| Program Designer references coach context | Summary-level | Full message-level | Semantically relevant |
| Eliminates "short-term memory" perception | Partial       | Full               | Full                  |
| No 400KB record size risk                 | No            | Yes                | Yes                   |
| Foundation for unified history UI         | No            | Yes                | Yes                   |
| Optimal token usage                       | No            | No                 | Yes                   |
| Can remove prompt guardrail workaround    | Partial       | Yes                | Yes                   |

---

## Related Files

| File                                                             | Relevance                                                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `amplify/functions/libs/api-helpers.ts`                          | Per-type parallel Pinecone queries (`queryUserNamespace`, `querySingleRecordType`, `queryPineconeContext`) |
| `amplify/functions/libs/pinecone-utils.ts`                       | `formatPineconeContext()` with `TRAINING PROGRAM CONTEXT` section                                          |
| `amplify/functions/libs/coach-conversation/context.ts`           | Coach conversation context gathering with per-type topK budgets                                            |
| `amplify/functions/libs/coach-conversation/prompt-generation.ts` | System prompt building, cross-context boundary guardrail, Phase 1 remaining prompt injection point         |
| `amplify/functions/libs/agents/program-designer/tools.ts`        | Program designer `load_program_requirements` with cross-context conversation retrieval                     |
| `amplify/functions/libs/coach-creator/session-management.ts`     | AI-powered `generateCoachCreatorSessionSummary()`                                                          |
| `amplify/functions/libs/program-designer/session-management.ts`  | AI-powered `generateProgramDesignerSessionSummary()`                                                       |
| `amplify/functions/libs/program/program-generator.ts`            | Program generator Pinecone query with per-type budgets                                                     |
| `amplify/functions/stream-coach-conversation/handler.ts`         | Message write path for coach conversations                                                                 |
| `amplify/dynamodb/operations.ts`                                 | DynamoDB operations, future shared message store                                                           |
| `amplify/functions/build-conversation-summary/handler.ts`        | Async summary generation for coach conversations                                                           |

---

## Open Questions

- Should cross-context messages be visible in the UI (e.g., "From your coach conversation 2 hours ago...") or only used for AI context?
- Should the coach explicitly acknowledge cross-context awareness ("I see you were working on X in the Program Designer") or use it subtly?
- For Phase 1, how many recent summaries should be included? Token budget considerations.
- Should there be a user preference to opt out of cross-context sharing?
