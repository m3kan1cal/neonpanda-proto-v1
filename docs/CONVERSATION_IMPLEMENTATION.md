# Conversation Memory Implementation Plan

## 🎯 Feature Overview

**Goal**: Give the AI coach memory of previous conversations with each user to provide continuity, personalization, and relationship building across coaching sessions.

### What We're Building:
A system that enables the AI coach to:
- Remember user preferences, goals, and context from past conversations
- Reference previous discussions naturally in responses
- Provide continuity across coaching sessions
- Build a meaningful relationship over time
- Avoid asking users to repeat information they've already shared

---

## 🔍 Key Implementation Questions

### 1. Conversation Summarization Strategy

**When do we summarize?**
- [ ] After each conversation ends?
- [ ] Weekly batch processing?
- [x] **After X number of messages (every 5 messages - user + AI combined)**
- [x] **When conversation reaches certain complexity/importance threshold**
- [x] **HYBRID APPROACH: Combine both triggers above for optimal memory capture**

**Complexity triggers include:**
- User sets new goals or changes existing ones
- Significant emotional language (frustrated, excited, breakthrough, etc.)
- Major workout achievements or setbacks
- Changes in routine, schedule, or preferences
- User asks for major program changes
- Discussion of injuries, limitations, or health changes

**What gets summarized?**
- [x] **Cumulative conversation memory that builds upon previous summaries**
- [x] **Key insights, goals, preferences, progress notes**
- [x] **User's emotional state and motivation patterns (crucial for relationship building)**
- [x] **Specific commitments or plans made**
- [x] **Personal context that affects training (schedule, stress, life events)**
- [x] **Communication style and what resonates with the user**

**Summary Strategy:**
- Each new summary replaces the existing conversation summary in Pinecone
- New summary incorporates previous context + new information from latest 5 messages
- Creates evolving, cumulative memory like a human coach would have
- Focuses on building relationship and emotional connection, not just facts

**How detailed should summaries be?**
- [ ] Brief bullet points (50-100 words)
- [ ] Comprehensive narratives (200-500 words)
- [ ] Structured data format (JSON with categories)
- [x] **Hybrid approach (structured + narrative)**

**Hybrid Summary Structure:**
```json
{
  "narrative_summary": "A flowing narrative that captures the emotional journey, relationship context, and conversational tone (150-300 words)",
  "key_facts": {
    "current_goals": [...],
    "recent_progress": [...],
    "preferences": [...],
    "constraints": [...],
    "schedule_context": [...]
  },
  "emotional_state": "Current motivation level, concerns, breakthroughs, communication style",
  "action_items": [...],
  "last_updated": "timestamp",
  "conversation_id": "reference to source conversation"
}
```

**Benefits:**
- Narrative enables emotional connection and relationship building
- Structured data allows quick fact retrieval and semantic search
- Comprehensive but manageable length (200-400 words total)
- Optimized for Pinecone semantic search capabilities

### 2. Storage Architecture

**DynamoDB Structure:**
- [ ] New dedicated table for conversation summaries?
- [ ] Extend existing conversation table with summary fields?
- [x] **New entityType within existing table structure**

**Chosen Approach:**
```json
{
  "pk": "user#{userId}",
  "sk": "conversation#{conversationId}#summary",
  "entityType": "conversationSummary",
  "createdAt": "2025-06-20T15:30:00Z",
  "updatedAt": "2025-06-20T15:30:00Z",
  "attributes": {
    "conversationId": "conversationId",
    "summary_data": {
      "narrative_summary": "A flowing narrative that captures the emotional journey, relationship context, and conversational tone (150-300 words)",
      "key_facts": {
        "current_goals": [...],
        "recent_progress": [...],
        "preferences": [...],
        "constraints": [...],
        "schedule_context": [...]
      },
      "emotional_state": "Current motivation level, concerns, breakthroughs, communication style",
      "action_items": [...],
      "last_updated": "timestamp",
      "conversation_id": "reference to source conversation"
    }
  }
}
```

**Benefits:**
- Follows existing DynamoDB entityType pattern
- Enables single query to get conversation + summary: `begins_with(SK, "conversation#{conversationId}")`
- Logical grouping of related entities in sort order
- Independent updates without affecting conversation messages
- Efficient access patterns for common use cases

**Pinecone Integration:**
- [x] **Yes, semantic search for conversation history to enable contextual coaching**
- [x] **Single embedding per conversation summary (narrative + structured data as natural language)**
- [x] **Same index as workout data, user-based namespaces: `user_{userId}`**

**Implementation Strategy:**
- Use existing `queryPineconeContext()` function from `amplify/functions/libs/api-helpers.ts`
- Same trigger logic as workout summaries in `send-coach-conversation-message/handler.ts`
- Store conversation summaries with record ID pattern: `conversation_summary_{userId}_{conversationId}`
- Embed both narrative summary and structured data converted to natural language
- Query when user references past conversations, emotions, or relationship context

### 3. Memory Retrieval & Context Injection

**When to retrieve conversation history?**
- [ ] Every message (expensive but comprehensive)
- [ ] Only at conversation start (efficient but limited)
- [x] **When contextually relevant (same trigger-based approach as workout summaries)**

**Conversation history triggers:**
- Relationship references: "remember when", "you told me", "we discussed"
- Progress tracking: "how am I doing", "my progress", "improvement"
- Emotional continuity: "feeling frustrated", "motivation", "struggling"
- Goal references: "my goals", "what I'm working toward"
- Preference mentions: "I prefer", "I like", "works best for me"
- Past conversation context: "last time we talked", "you suggested"

**How much history to include?**
- [ ] Last N conversations (e.g., 5-10)
- [ ] Last X days (e.g., 30 days)
- [x] **Semantic relevance-based selection (most human and coach-like approach)**
- [ ] Tiered approach (recent + relevant)

**Semantic relevance approach:**
- Use Pinecone's semantic search with `topK: 3-5` most relevant conversation summaries
- Let semantic similarity determine which memories are most contextually relevant
- Recent conversations naturally score higher, but important older context isn't lost
- Mimics how human coaches naturally recall relevant past discussions

**Where to inject in system prompt?**
- [ ] Before coach personality section
- [ ] After current context, before user message
- [x] **Separate "memory" section in prompt (follows existing pattern)**
- [ ] Integrated throughout prompt contextually

**Memory section approach:**
- Create dedicated "COACHING RELATIONSHIP MEMORY" or "CONVERSATION HISTORY CONTEXT" section
- Inject when conversation summaries are retrieved via semantic search
- Follows same pattern as existing workout context section
- Keeps memory context organized and easily referenceable for the coach
- Note: Prompt size optimization can be addressed in future iterations

### 4. Implementation Approach

**Architecture Options:**

**Option A: New Lambda Function**
- Create `summarize-conversation` function
- Triggered by conversation end events
- Dedicated processing pipeline

**Option B: Extend Existing Functions**
- Add summarization to `send-coach-conversation-message`
- Process during conversation flow
- Inline with existing logic

**Option C: Scheduled Processing**
- Batch process conversations daily/weekly
- Separate from real-time conversation flow
- More efficient but less immediate

**[CHOSEN] Hybrid Approach: A + B Combined**
- [x] **Trigger detection in `send-coach-conversation-message/handler.ts`**
- [x] **Async invocation of new `build-conversation-summary` Lambda function**
- [x] **Dedicated processing pipeline (summary generation, DynamoDB storage, Pinecone storage)**
- [x] **Non-blocking - conversation continues while summary builds in background**
- [x] **Consistent with existing workout logging architecture pattern**

**Trigger Mechanisms:**
- [ ] Manual trigger (admin action)
- [ ] Scheduled (cron-based)
- [ ] Event-driven (conversation end)
- [x] **Threshold-based (every 5 messages + complexity detection)**

**Implementation Components:**
- Message count tracking in conversation records
- Complexity detection logic (similar to workout detection)
- `invokeAsyncLambda('build-conversation-summary', {...})` call
- New Lambda handles summary generation, storage, and Pinecone integration

### 5. Data Privacy & Management

**Summary Retention:**
- [x] **DEFERRED - Beyond prototype scope**
- [x] **For production: Consider 1-2 years with user control options**

**User Control:**
- [x] **DEFERRED - Beyond prototype scope**
- [x] **For production: Users should be able to view, delete, and potentially correct summaries**

**Data Sensitivity:**
- [x] **DEFERRED - Beyond prototype scope**
- [x] **For production: Focus on coaching-relevant context, avoid overly personal details**

**Prototype Approach:**
- Use standard data retention practices
- Focus on core functionality (summary generation, storage, retrieval)
- Privacy and user control features can be added in production implementation

---

## 🚀 Implementation Phases

### Phase 1: Basic Conversation Summarization
- [ ] Define summarization strategy
- [ ] Implement conversation summary generation
- [ ] Store summaries in DynamoDB
- [ ] Basic retrieval and context injection

### Phase 2: Enhanced Memory System
- [ ] Implement semantic search with Pinecone
- [ ] Add memory categorization (goals, preferences, progress)
- [ ] Optimize context injection strategies

### Phase 3: Advanced Features
- [ ] User memory management interface
- [ ] Memory analytics and insights
- [ ] Cross-conversation pattern recognition

---

## 📊 Success Metrics

**User Experience:**
- Reduced repetition of user information
- Increased conversation continuity
- Higher user engagement and satisfaction

**Technical:**
- Conversation summary quality scores
- Memory retrieval accuracy
- System performance impact

**Business:**
- User retention improvement
- Session length increase
- User satisfaction scores

---

## 🔗 Integration Points

**Existing Systems:**
- `send-coach-conversation-message` - Memory retrieval and context injection
- `get-coach-conversations` - Include summary data
- `update-coach-conversation` - Trigger summarization
- Coach conversation prompt generation - Memory integration

**New Components:**
- Conversation summarization service
- Memory storage and retrieval APIs
- Context injection logic
- Memory management interface

---

## 📝 Decision Log

| Decision | Options Considered | Choice | Rationale | Date |
|----------|-------------------|---------|-----------|------|
| TBD | TBD | TBD | TBD | TBD |

---

## 🎯 Next Steps

1. **Review and discuss each key question**
2. **Make architectural decisions**
3. **Define data structures and schemas**
4. **Create implementation timeline**
5. **Begin Phase 1 development**

---

*This document will be updated as decisions are made and implementation progresses.*
