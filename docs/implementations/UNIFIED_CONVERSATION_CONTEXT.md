# Unified Conversation Context

## Shared Context Between Coach Conversations & Program Designer

**Created:** 2026-02-05
**Status:** Proposed
**Priority:** High
**Related Fix:** Cross-screen context boundary prompt guardrail (v1.0.20260205-beta)

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

All conversation types already generate and store summaries in both DynamoDB and Pinecone. This is a significant advantage for Phase 1, as no new summary generation infrastructure is needed — we only need to query existing summaries cross-contextually.

| Conversation Type             | Record Type                | Pinecone Function                                                                       | Trigger                                                         | Key Metadata                                                                                                   |
| ----------------------------- | -------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Coach Conversations**       | `conversation_summary`     | `storeCoachConversationSummaryInPinecone()` in `libs/coach-conversation/pinecone.ts`    | `build-conversation-summary` Lambda (async, after conversation) | `conversationId`, `messageCount`, `triggerReason`, `confidence`, goal/progress/emotional flags                 |
| **Coach Creator Sessions**    | `coach_creator_summary`    | `storeCoachCreatorSummaryInPinecone()` in `libs/coach-creator/pinecone.ts`              | `saveCoachConfigToDatabaseTool` in coach-creator tools          | `sessionId`, `coachName`, `selectedPersonality`, `selectedMethodology`, `experienceLevel`, `trainingFrequency` |
| **Program Designer Sessions** | `program_designer_summary` | `storeProgramDesignerSessionSummaryInPinecone()` in `libs/program-designer/pinecone.ts` | `build-program` Lambda (after program creation)                 | `sessionId`, `programId`, `programName`, `conversationTurns`, `trainingGoals`, `equipmentConstraints`          |
| **Training Programs**         | `program_summary`          | `storeProgramSummaryInPinecone()` in `libs/program/pinecone.ts`                         | Program designer tools (after generation)                       | `programId`, `programName`, `totalDays`, `phaseNames`, `trainingGoals`, `adherenceRate`                        |
| **Workout Logging**           | `workout_summary`          | `storeWorkoutSummaryInPinecone()` in `libs/workout/pinecone.ts`                         | Workout logger tools (after save)                               | `workoutId`, `discipline`, `workoutName`, `completedAt`, `prAchievements`, discipline-specific metrics         |

### Phase 1 Implications

Since all summaries already exist in Pinecone with rich metadata:

- **No new summary generation needed** — the data is already there
- **Pinecone semantic search** can find the most relevant cross-context summaries by topic
- **Metadata filtering** can scope queries by `recordType`, `coachId`, and time range
- Phase 1 reduces to: query Pinecone for recent summaries from _other_ contexts, format them, and inject into the system prompt

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

All five summary types already exist in Pinecone (see inventory above). Phase 1 is purely a **read-side change**: query recent summaries from other contexts and include them in the system prompt. No new summary generation, no schema changes, no migration.

**Implementation:**

1. In `prompt-generation.ts`, add a Pinecone query for recent summaries from other contexts:
   - **Coach conversation starting** → query recent `program_designer_summary` and `program_summary` records (last 24-48 hours, max 3-5)
   - **Program designer session starting** → query recent `conversation_summary` records (last 24-48 hours, max 3-5)
2. Filter by `coachId` to keep context scoped to the relevant coach relationship
3. Format summaries and inject into the system prompt as a "Recent Activity" section
4. Include timestamp and source context so the AI can frame references appropriately

**Pinecone query example:**

```typescript
// In prompt-generation.ts, when building system prompt for coach conversation:
const recentCrossContextSummaries = await queryPinecone({
  namespace: userId,
  filter: {
    recordType: { $in: ["program_designer_summary", "program_summary"] },
    coachId: coachId,
    // Only recent activity (timestamp filtering)
  },
  topK: 3,
  // Could also use semantic search with the user's first message as query
});
```

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
- Can be implemented in `prompt-generation.ts` with a few additional Pinecone queries
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

| File                                                             | Relevance                                                                                 |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `amplify/functions/libs/coach-conversation/prompt-generation.ts` | System prompt building, cross-context boundary guardrail, Phase 1 summary injection point |
| `amplify/functions/stream-coach-conversation/handler.ts`         | Message write path for coach conversations                                                |
| `amplify/functions/libs/coach-conversation/detection.ts`         | Program designer mention detection                                                        |
| `amplify/dynamodb/operations.ts`                                 | DynamoDB operations, new message record operations                                        |
| `amplify/functions/build-conversation-summary/handler.ts`        | Summary generation, Phase 1 cross-context summaries                                       |
| `amplify/functions/libs/program/question-generator.ts`           | Program designer conversation flow                                                        |
| `amplify/functions/libs/api-helpers.ts`                          | Pinecone query helpers for semantic search                                                |

---

## Open Questions

- Should cross-context messages be visible in the UI (e.g., "From your coach conversation 2 hours ago...") or only used for AI context?
- Should the coach explicitly acknowledge cross-context awareness ("I see you were working on X in the Program Designer") or use it subtly?
- For Phase 1, how many recent summaries should be included? Token budget considerations.
- Should there be a user preference to opt out of cross-context sharing?
