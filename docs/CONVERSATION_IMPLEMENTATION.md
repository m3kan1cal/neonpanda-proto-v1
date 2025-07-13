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
- [ ] After X number of messages?
- [ ] When conversation reaches certain length/complexity?

**What gets summarized?**
- [ ] Individual conversations or conversation sessions?
- [ ] Key insights, goals, preferences, progress notes?
- [ ] User's emotional state and motivation patterns?
- [ ] Specific commitments or plans made?

**How detailed should summaries be?**
- [ ] Brief bullet points (50-100 words)
- [ ] Comprehensive narratives (200-500 words)
- [ ] Structured data format (JSON with categories)
- [ ] Hybrid approach (structured + narrative)

### 2. Storage Architecture

**DynamoDB Structure:**
- [ ] New dedicated table for conversation summaries?
- [ ] Extend existing conversation table with summary fields?
- [ ] Separate table with references to conversations?

**Table Design Options:**
```
Option A: Dedicated Summary Table
- PK: userId
- SK: summaryId (timestamp-based)
- GSI: conversationId, timeRange

Option B: Extend Conversation Table
- Add summary fields to existing conversation records
- Aggregate summaries at conversation level

Option C: User Memory Table
- PK: userId
- SK: memoryType (e.g., "weekly-summary", "goals", "preferences")
- Hierarchical memory structure
```

**Pinecone Integration:**
- [ ] Do we need semantic search for conversation history?
- [ ] How to chunk and embed conversation summaries?
- [ ] Separate index or share with workout data?

### 3. Memory Retrieval & Context Injection

**When to retrieve conversation history?**
- [ ] Every message (expensive but comprehensive)
- [ ] Only at conversation start (efficient but limited)
- [ ] When contextually relevant (smart but complex)

**How much history to include?**
- [ ] Last N conversations (e.g., 5-10)
- [ ] Last X days (e.g., 30 days)
- [ ] Semantic relevance-based selection
- [ ] Tiered approach (recent + relevant)

**Where to inject in system prompt?**
- [ ] Before coach personality section
- [ ] After current context, before user message
- [ ] Separate "memory" section in prompt
- [ ] Integrated throughout prompt contextually

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

**Trigger Mechanisms:**
- [ ] Manual trigger (admin action)
- [ ] Scheduled (cron-based)
- [ ] Event-driven (conversation end)
- [ ] Threshold-based (message count, time elapsed)

### 5. Data Privacy & Management

**Summary Retention:**
- [ ] How long to keep conversation memories?
- [ ] Automatic expiration policies?
- [ ] User-controlled retention settings?

**User Control:**
- [ ] Can users view their conversation summaries?
- [ ] Can users delete their conversation history?
- [ ] Can users edit or correct memories?

**Data Sensitivity:**
- [ ] What gets summarized vs. what stays private?
- [ ] How to handle sensitive personal information?
- [ ] Anonymization or encryption requirements?

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
