# Coach Creator Question Flow Redesign
**Date**: 2025-11-16
**Status**: ✅ APPROVED - Implementation in Progress
**Approach**: To-Do List Based Conversational Flow
**Related Issues**: #2 (Repetitive Questions), #3 (Mechanical Flow), #5 (Q&A Pairing)

---

## Executive Summary

The current coach creator uses a **rigid scripted question array** with **hardcoded question appending**, causing three interrelated problems:
1. **AI cannot skip questions** when user has already provided the information
2. **Mechanical conversation flow** - system overrides AI's natural responses
3. **Q&A pairing mismatches** - initial greeting not stored correctly

This document proposes a **To-Do List based conversational flow** that:
- ✅ Stores a to-do list in DynamoDB that tracks what info is collected
- ✅ AI updates the to-do list after each user response
- ✅ AI decides what to ask next based on the to-do list
- ✅ Feels like a natural conversation, not a rigid form
- ✅ Maintains data quality and completeness

---

## Problems with Current Architecture

### Problem #1: Hardcoded Question Appending (Root Cause)

**Current Flow** (`stream-coach-creator-session/handler.ts` lines 416-420):
```typescript
nextQuestion: processedResponse.nextQuestion
  ? processedResponse.nextQuestion.versions[sophisticationLevel] || ...
  : null,
```

**What happens**:
1. AI generates response based on user's answer
2. **System unconditionally appends** the next scripted question (overriding AI)
3. Frontend displays: AI response + scripted question
4. User sees repetitive/mechanical responses

**Why it's flawed**:
- AI has no control over what question comes next
- System ignores whether user already answered
- Creates "two questions at once" effect (Issue #3)
- Prevents natural conversation flow

### Problem #2: Initial Message Pairing Mismatch

**Current Flow**:
- `create-coach-creator-session` returns initial greeting but doesn't store it
- Frontend displays: "What are your fitness goals?"
- User responds: "I want to build strength..."
- **Stored in `questionHistory`**: `questionId: 1` (but this should be Q0)
- When extraction functions look for Q1 response, they get Q0's answer ❌

**Impact**:
- All Q&A pairs are off by 1
- Extraction functions pull wrong data
- On page refresh, conversation looks broken

### Problem #3: Question Array Rigidity

**Current Structure** (`question-management.ts`):
```typescript
const COACH_CREATOR_QUESTIONS = [
  { id: 1, category: "coach_gender_preference", ... },
  { id: 2, category: "goals_and_timeline", ... },
  { id: 3, category: "age_and_life_stage", ... },
  // ... 11 total questions
];
```

**Limitations**:
- Every user gets the exact same 11 questions in the exact same order
- AI cannot adapt based on user's responses
- Cannot skip redundant questions when user volunteers information
- Cannot ask follow-ups when user is vague
- Cannot abbreviate for advanced users who provide detailed initial responses

---

## Design Goals

### Core Principles

1. **Context-Aware**: AI should understand what information has been collected vs. what's still needed
2. **Natural Conversation**: Flow should feel like a conversation with a human coach, not a form
3. **Adaptive**: Adjust questions based on user's sophistication level and response depth
4. **Complete**: Must still collect all required data for coach config generation
5. **Efficient**: Advanced users shouldn't need 11 questions if they provide rich initial responses
6. **Backwards Compatible**: Existing extraction functions should continue to work (with updates)

### Success Criteria

- ✅ No repeated questions when user already provided information
- ✅ Natural completion when user says "I'm ready" (no extra questions)
- ✅ Proper Q&A pairing from the start (initial greeting = Q0)
- ✅ All required data fields collected by end of session
- ✅ AI can skip/combine questions based on user responses
- ✅ Maintains data quality for coach config generation

---

## Proposed Solution: To-Do List Based Conversational Flow

### Architecture Overview

Replace **scripted question array** with **AI-driven conversational agent** using a **To-Do List**:
1. **To-Do List** stored in DynamoDB tracks what info is collected vs. needed
2. **AI updates** the to-do list after each user response
3. **AI generates** next question based on what's still pending in the list
4. **Progress tracked** by counting completed vs. pending items
5. **Natural conversation** - AI decides what to ask, not hardcoded logic

### Core Components

#### 1. **To-Do List Schema** (Stored in DynamoDB)

Define ALL the information we need from the current 11 questions:

```typescript
interface CoachCreatorTodoList {
  // Question 1: Coach Gender Preference
  coach_gender_preference: TodoItem;

  // Question 2: Goals and Timeline
  primary_goals: TodoItem;
  goal_timeline: TodoItem;

  // Question 3: Age and Life Stage
  age: TodoItem;
  life_stage_context: TodoItem;

  // Question 4: Experience Level
  experience_level: TodoItem;
  training_history: TodoItem;

  // Question 5: Training Frequency and Time
  training_frequency: TodoItem;
  session_duration: TodoItem;
  time_of_day_preference: TodoItem;

  // Question 6: Injuries and Limitations
  injury_considerations: TodoItem;
  movement_limitations: TodoItem;

  // Question 7: Equipment and Environment
  equipment_access: TodoItem;
  training_environment: TodoItem;

  // Question 8: Movement Focus and Preferences
  movement_preferences: TodoItem;
  movement_dislikes: TodoItem;

  // Question 9: Coaching Style and Motivation
  coaching_style_preference: TodoItem;
  motivation_style: TodoItem;

  // Question 10: Success Metrics
  success_metrics: TodoItem;
  progress_tracking_preferences: TodoItem;

  // Question 11: Competition Goals (Optional)
  competition_goals: TodoItem;
  competition_timeline: TodoItem;
}

interface TodoItem {
  status: 'pending' | 'in_progress' | 'complete';
  value: any | null;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
  extractedFrom?: string; // Which message was this extracted from
}
```

#### 2. **Session Schema** (DynamoDB Record)

The complete session stored in DynamoDB:

```typescript
interface CoachCreatorSession {
  // DynamoDB keys
  pk: string; // "user#{userId}"
  sk: string; // "coach_creator_session#{sessionId}"

  // Session metadata
  userId: string;
  sessionId: string;
  status: 'in_progress' | 'ready_to_generate' | 'generating' | 'completed';
  sophisticationLevel: SophisticationLevel;

  // THE TO-DO LIST (core of new approach)
  todoList: CoachCreatorTodoList;

  // Conversation history
  conversationHistory: Array<{
    role: 'ai' | 'user';
    content: string;
    timestamp: string;
  }>;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

#### 3. **Dynamic Question Generator**

AI-powered question generator that considers context:

```typescript
async function generateNextQuestion(context: ConversationContext): Promise<string | null> {
  // Check what's missing
  const missingRequired = getMissingRequirements(context.collectedData);

  // If nothing missing, session is complete
  if (missingRequired.length === 0) {
    return null; // AI will naturally say "we're all set!"
  }

  // Build prompt for AI
  const prompt = `
  You are a fitness coach conducting an intake conversation.

  CONVERSATION SO FAR:
  ${context.messages.map(m => `${m.role}: ${m.content}`).join('\n')}

  INFORMATION COLLECTED:
  ${JSON.stringify(context.collectedData, null, 2)}

  STILL NEEDED:
  ${missingRequired.join(', ')}

  INSTRUCTIONS:
  1. Review the conversation - has the user already mentioned any of the missing info?
  2. If yes, acknowledge it and move to the next gap
  3. If no, ask about the MOST IMPORTANT missing item naturally
  4. Be conversational, not robotic
  5. Adapt to user's sophistication level: ${context.sophisticationLevel}

  Generate your next response (acknowledgment + question OR just question):
  `;

  const aiResponse = await callBedrockApi(prompt, '', MODEL_IDS.CLAUDE_SONNET_4_FULL);
  return aiResponse;
}
```

#### 4. **Information Extraction Layer**

After each user response, extract structured data:

```typescript
async function extractInformationFromResponse(
  userResponse: string,
  conversationHistory: Message[],
  missingRequirements: string[]
): Promise<ExtractedInfo> {
  const prompt = `
  Analyze this user response and extract any fitness coach intake information:

  USER RESPONSE:
  "${userResponse}"

  CONTEXT (previous messages):
  ${conversationHistory.slice(-3).map(m => `${m.role}: ${m.content}`).join('\n')}

  WHAT WE'RE LOOKING FOR:
  ${missingRequirements.join(', ')}

  Return JSON with any information found:
  {
    "coach_gender_preference": "male|female|neutral" or null,
    "primary_goals": "extracted goals" or null,
    "age_range": number or null,
    "experience_level": "beginner|intermediate|advanced" or null,
    "training_frequency": number (days per week) or null,
    "equipment_access": ["equipment", "items"] or null,
    "injury_considerations": "details" or "none" or null,
    "coaching_style_preference": "style details" or null
  }
  `;

  const extracted = await callBedrockApi(prompt, '', MODEL_IDS.CLAUDE_HAIKU_4_FULL);
  return parseJsonWithFallbacks(extracted);
}
```

#### 5. **Updated Handler Flow**

```typescript
// In stream-coach-creator-session/handler.ts

async function handleUserResponse(userId, sessionId, userResponse) {
  // 1. Load session context
  const session = await getCoachCreatorSession(userId, sessionId);
  const context = session.conversationContext;

  // 2. Store user message
  context.messages.push({
    id: context.messages.length + 1,
    role: 'user',
    content: userResponse,
    timestamp: new Date().toISOString()
  });

  // 3. Extract information from user response
  const extracted = await extractInformationFromResponse(
    userResponse,
    context.messages,
    getMissingRequirements(context.collectedData)
  );

  // 4. Update collected data
  context.collectedData = { ...context.collectedData, ...extracted };

  // 5. Check if we have everything
  const missingRequired = getMissingRequirements(context.collectedData);

  if (missingRequired.length === 0) {
    // All required info collected - generate completion message
    const completionMessage = await generateCompletionMessage(context);

    context.messages.push({
      id: context.messages.length + 1,
      role: 'ai',
      content: completionMessage,
      timestamp: new Date().toISOString()
    });

    context.completionStatus = 'ready_to_generate';
  } else {
    // 6. Generate next question
    const nextQuestion = await generateNextQuestion(context);

    context.messages.push({
      id: context.messages.length + 1,
      role: 'ai',
      content: nextQuestion,
      timestamp: new Date().toISOString()
    });
  }

  // 7. Save updated context
  await updateCoachCreatorSession(userId, sessionId, context);

  // 8. Stream the AI response to user
  return streamAiResponse(context.messages[context.messages.length - 1].content);
}
```

---

## Migration Strategy

### Phase 1: Hybrid Approach (Backwards Compatible)

Keep existing question array but add AI override capability:

```typescript
// Add AI decision layer BEFORE appending nextQuestion
const shouldAskNext = await shouldAskNextQuestion(
  session.questionHistory,
  processedResponse,
  COACH_CREATOR_QUESTIONS[currentQuestion]
);

if (!shouldAskNext) {
  // AI determined user already answered - skip to next
  currentQuestion++;
}

// Only append if AI says we should ask
nextQuestion: shouldAskNext ? getNextQuestion(...) : null
```

**Benefits**:
- Low risk - existing flow still works
- Can test AI decision quality
- Easy rollback if needed

**Drawbacks**:
- Doesn't solve Q&A pairing issue
- Still somewhat mechanical
- Extra AI call overhead

### Phase 2: Full Dynamic Flow (Recommended)

Replace question array entirely with context-aware conversation:

**Migration Steps**:

1. **Update Data Model** (Week 1)
   - Add `ConversationContext` to session schema
   - Add `CoachCreatorRequirements` tracking
   - Migrate existing sessions to new format (backwards compat)

2. **Implement Extraction Layer** (Week 1)
   - Build `extractInformationFromResponse()` function
   - Test extraction accuracy with historical data
   - Create validation layer for extraction quality

3. **Implement Question Generator** (Week 2)
   - Build `generateNextQuestion()` with AI
   - Test question quality and relevance
   - Add fallback to scripted questions if AI fails

4. **Update Handler** (Week 2)
   - Refactor `stream-coach-creator-session` to use new flow
   - Remove hardcoded `nextQuestion` appending
   - Add completion detection logic

5. **Update Extraction Functions** (Week 2)
   - Refactor `data-extraction.ts` functions to work with context
   - Instead of accessing by questionId, extract from collected data
   - Add fallback parsing from conversation transcript

6. **Frontend Updates** (Week 3)
   - Remove expectation of `nextQuestion` field
   - Display conversation naturally (no separate question appending)
   - Update progress tracking (completion % instead of question count)

7. **Testing & Refinement** (Week 3)
   - A/B test old vs. new flow
   - Measure: completion rate, time to complete, coach quality
   - Iterate on AI prompts based on results

---

## Handling Initial Message (Fixes Issue #5)

### Current Problem

Initial greeting is returned but not stored in `questionHistory`:
```typescript
// create-coach-creator-session returns this but doesn't store it
const initialMessage = "Hi! I'm here to help...";
```

User's response to initial greeting gets stored as Q1, but Q1 should be the gender question ❌

### Solution Option A: Store as Message 0

```typescript
// In create-coach-creator-session/handler.ts
const initialMessage = "Hi! I'm here to help create your perfect AI coach. Let's start with the basics - what are your primary fitness goals?";

const conversationContext = {
  messages: [{
    id: 0,
    role: 'ai',
    content: initialMessage,
    timestamp: new Date().toISOString()
  }],
  collectedData: {},
  sophisticationLevel: 'UNKNOWN',
  completionStatus: 'in_progress'
};

// When user responds, their message becomes id: 1
// AI's next response becomes id: 2
// Perfect pairing!
```

### Solution Option B: Dual Storage (Hybrid)

Keep `questionHistory` array for backwards compatibility, but also store in `messages`:

```typescript
questionHistory: [{
  questionId: 0,
  aiResponse: initialMessage,
  userResponse: "", // Empty until user responds
  timestamp: new Date().toISOString()
}],
messages: [{
  id: 0,
  role: 'ai',
  content: initialMessage,
  timestamp: new Date().toISOString()
}]
```

When user responds:
```typescript
// Update questionHistory[0]
questionHistory[0].userResponse = userResponse;

// Add to messages
messages.push({
  id: 1,
  role: 'user',
  content: userResponse,
  timestamp: new Date().toISOString()
});
```

**Recommended**: Option A (simpler, cleaner)

---

## Data Extraction Updates

### Current Approach (Question ID Based)

```typescript
export const extractGenderPreference = (questionHistory: QuestionHistoryEntry[]): string => {
  const entry = questionHistory.find(e => e.questionId === 1);
  return entry?.userResponse || 'neutral';
};
```

**Problem**: Assumes Question 1 is always gender. In dynamic flow, this breaks.

### New Approach (Requirement Based)

```typescript
export const extractGenderPreference = (context: ConversationContext): string => {
  // Option 1: Use structured data if available
  if (context.collectedData.coach_gender_preference) {
    return context.collectedData.coach_gender_preference;
  }

  // Option 2: Fallback to conversation parsing
  const genderMessage = context.messages.find(m =>
    m.role === 'user' &&
    (m.content.includes('male') || m.content.includes('female') || m.content.includes('neutral'))
  );

  if (genderMessage) {
    // Parse the message for gender preference
    return parseGenderFromText(genderMessage.content);
  }

  return 'neutral'; // Default
};
```

**Benefits**:
- Works regardless of question order
- More robust parsing
- Can extract from ANY message in conversation
- Maintains backwards compatibility with structured data

---

## Fallback & Safety Mechanisms

### If AI Extraction Fails

```typescript
// Always validate AI extraction
const extracted = await extractInformationFromResponse(...);

if (!validateExtraction(extracted)) {
  // Fallback: Ask directly with structured options
  return generateStructuredQuestion(missingField);
}
```

### If Question Generation Fails

```typescript
try {
  const nextQuestion = await generateNextQuestion(context);
} catch (error) {
  // Fallback: Use scripted question for this field
  return FALLBACK_QUESTIONS[missingRequirement];
}
```

### Completion Validation

```typescript
// Before allowing coach generation, validate we have everything
function canGenerateCoach(context: ConversationContext): {valid: boolean, missing: string[]} {
  const missing = getMissingRequirements(context.collectedData);

  if (missing.length > 0) {
    return {
      valid: false,
      missing,
      message: `Still need: ${missing.join(', ')}. Please answer a few more questions.`
    };
  }

  return { valid: true, missing: [] };
}
```

---

## Performance Considerations

### AI Call Overhead

**Current**: 1 AI call per question (for detecting sophistication + generating response)
**New**: 2-3 AI calls per question (sophistication + extraction + next question)

**Optimization**:
1. **Batch Operations**: Combine extraction + next question generation in one call
2. **Use Haiku for Extraction**: Cheaper, faster model for structured extraction
3. **Cache Common Patterns**: Store extraction patterns for common responses
4. **Prompt Caching**: Cache system prompts for extraction and generation

### Cost Estimate

**Current Flow** (11 questions):
- 11 sophistication checks (Haiku) = ~$0.01
- 11 response generations (Sonnet) = ~$0.05
- **Total**: ~$0.06 per session

**New Flow** (8-10 dynamic questions):
- 8-10 sophistication checks (Haiku) = ~$0.01
- 8-10 extractions (Haiku) = ~$0.01
- 8-10 question generations (Sonnet) = ~$0.04
- **Total**: ~$0.06 per session (similar cost)

---

## Testing Plan

### Unit Tests

1. **Extraction Accuracy**: Test extraction functions with varied user responses
2. **Requirement Tracking**: Verify all required fields get collected
3. **Question Quality**: Evaluate AI-generated questions for relevance

### Integration Tests

1. **Complete Flow**: User completes entire conversation, verify coach config generated
2. **Skip Logic**: User volunteers info early, verify questions skipped correctly
3. **Error Handling**: Test fallbacks when AI fails
4. **Edge Cases**: Very brief responses, very long responses, off-topic responses

### A/B Testing (Production)

**Metrics to Track**:
- Completion rate (% users who finish vs. abandon)
- Time to complete (average minutes)
- Coach quality scores (user satisfaction)
- Repetition incidents (user reports same question twice)
- Data completeness (% of required fields populated)

**Success Criteria**:
- Completion rate ≥ current (or +10%)
- Time to complete ≤ current (or -20%)
- Zero repetition incidents
- 100% data completeness
- Coach quality maintained or improved

---

## Rollout Plan

### Week 1: Foundation
- Implement new data model
- Build extraction functions
- Write unit tests

### Week 2: Core Logic
- Build question generator
- Update handlers
- Write integration tests

### Week 3: Migration
- Deploy with feature flag (10% of users)
- Monitor metrics
- Iterate on prompts

### Week 4: Rollout
- Increase to 50% of users
- Continue monitoring
- Address edge cases

### Week 5: Completion
- Full rollout (100% of users)
- Deprecate old question array
- Update documentation

---

## Risks & Mitigation

### Risk: AI generates poor questions

**Mitigation**:
- Use Claude Sonnet 4 (high quality)
- Provide extensive prompt engineering
- Fallback to scripted questions
- A/B test before full rollout

### Risk: Extraction misses information

**Mitigation**:
- Use Haiku + Sonnet validation layer
- Fallback to regex parsing for critical fields
- Ask clarifying questions if confidence low
- Manual review sample during testing

### Risk: Performance degradation

**Mitigation**:
- Use prompt caching aggressively
- Batch AI calls where possible
- Monitor latency metrics
- Add timeout/fallback mechanisms

### Risk: Backwards compatibility breaks

**Mitigation**:
- Keep old extraction functions as fallback
- Migrate sessions gradually
- Support both data formats during transition
- Provide migration tool for existing sessions

---

## Open Questions

1. **Question Count**: Should we enforce a minimum/maximum number of questions?
2. **Time Limits**: Should we add a "fast track" for advanced users?
3. **UI Changes**: Do we need to update progress indicators?
4. **Data Migration**: How do we handle in-progress sessions during migration?
5. **Fallback Triggers**: What constitutes an "AI failure" that triggers fallback?

---

## Approval Required

Please review and provide feedback on:
1. ✅ Overall approach (dynamic flow vs. hybrid)
2. ✅ Migration strategy (Phase 1 vs. Phase 2)
3. ✅ Timeline (5 weeks realistic?)
4. ✅ Any additional concerns or requirements

Once approved, I can begin implementation with Phase 1 or Phase 2.

---

## References

- **Related Issues**: #2, #3, #5 in `COACH_CREATOR_IMPROVEMENT_PLAN.md`
- **Current Implementation**: `question-management.ts`, `stream-coach-creator-session/handler.ts`
- **Extraction Functions**: `data-extraction.ts`
- **Similar Patterns**: `WorkoutAgent.js` (dynamic conversation), `CoachConversationAgent.js` (context tracking)

---

## ✅ IMPLEMENTATION PLAN

### Phase 1: Backend Foundation (Week 1)

#### Step 1.1: Update Types & Schema
**Files**: `amplify/functions/libs/coach-creator/types.ts`
- [ ] Add `TodoItem` interface
- [ ] Add `CoachCreatorTodoList` interface
- [ ] Update `CoachCreatorSession` to include `todoList` and `conversationHistory`
- [ ] Keep `questionHistory` for backwards compatibility (mark as deprecated)

#### Step 1.2: Create To-Do List Utilities
**Files**: `amplify/functions/libs/coach-creator/todo-list-utils.ts` (NEW)
- [ ] `createEmptyTodoList()` - Initialize all items as 'pending'
- [ ] `getTodoProgress()` - Count completed/pending items, return percentage
- [ ] `getPendingItems()` - Get list of incomplete items
- [ ] `getRequiredPendingItems()` - Get required items (exclude optional competition goals)
- [ ] `isSessionComplete()` - Check if all required items are complete

#### Step 1.3: Create AI Extraction Function
**Files**: `amplify/functions/libs/coach-creator/todo-extraction.ts` (NEW)
- [ ] `extractAndUpdateTodoList()` - AI analyzes user response and updates to-do list
- [ ] Uses Claude Haiku 4.5 for fast, cheap extraction
- [ ] Returns updated todo list + confidence scores
- [ ] Validates extraction quality

#### Step 1.4: Create AI Question Generator
**Files**: `amplify/functions/libs/coach-creator/question-generator.ts` (NEW)
- [ ] `generateNextQuestion()` - AI generates next question based on todo list
- [ ] Uses Claude Sonnet 4 for high-quality conversational responses
- [ ] Considers conversation history + todo list
- [ ] Returns natural question or completion message

### Phase 2: Handler Updates (Week 1-2)

#### Step 2.1: Update Create Session Handler
**Files**: `amplify/functions/create-coach-creator-session/handler.ts`
- [ ] Initialize `todoList` with all items as 'pending'
- [ ] Initialize `conversationHistory` with initial AI greeting
- [ ] Store initial message in conversation history (fixes Issue #5)
- [ ] Remove old `questionHistory` initialization (keep for migration)

#### Step 2.2: Refactor Stream Handler
**Files**: `amplify/functions/stream-coach-creator-session/handler.ts`
- [ ] Remove hardcoded `nextQuestion` appending logic
- [ ] Add user message to `conversationHistory`
- [ ] Call `extractAndUpdateTodoList()` after each user response
- [ ] Update session's `todoList` in DynamoDB
- [ ] Check if session is complete (all required items done)
- [ ] If complete: generate completion message
- [ ] If not complete: call `generateNextQuestion()`
- [ ] Add AI response to `conversationHistory`
- [ ] Stream AI response to frontend
- [ ] Save updated session to DynamoDB

#### Step 2.3: Update or Deprecate Update Handler
**Files**: `amplify/functions/update-coach-creator-session/handler.ts`
- [ ] Apply same logic as stream handler
- [ ] Or deprecate if only using streaming flow

### Phase 3: Data Extraction Updates (Week 2)

#### Step 3.1: Update Extraction Functions
**Files**: `amplify/functions/libs/coach-creator/data-extraction.ts`
- [ ] Update all extraction functions to work with `todoList` instead of `questionHistory`
- [ ] `extractGenderPreference()` → read from `todoList.coach_gender_preference.value`
- [ ] `extractSafetyProfile()` → read from injury/limitation todo items
- [ ] `extractMethodologyPreferences()` → read from goals/preferences todo items
- [ ] Keep fallback logic that parses `conversationHistory` if todo item is null
- [ ] Maintain backwards compatibility with old sessions

#### Step 3.2: Update Coach Generation
**Files**: `amplify/functions/libs/coach-creator/coach-generation.ts`
- [ ] Update `generateCoachConfig()` to accept session with `todoList`
- [ ] Use todo list values for coach config generation
- [ ] Fallback to old extraction if todo list incomplete

### Phase 4: Frontend Updates (Week 2)

#### Step 4.1: Update Coach Creator Agent
**Files**: `src/utils/agents/CoachCreatorAgent.js`
- [ ] Remove expectation of `nextQuestion` field in API response
- [ ] Display conversation naturally (just AI + user messages)
- [ ] Calculate progress from `todoList` completion percentage
- [ ] Update `loadExistingSession()` to use `conversationHistory`

#### Step 4.2: Update Coach Creator UI
**Files**: `src/components/CoachCreator.jsx`
- [ ] Update progress display: "75% complete" instead of "8 of 11 questions"
- [ ] Remove any hardcoded question display logic
- [ ] Show natural conversation flow

### Phase 5: Testing & Migration (Week 3)

#### Step 5.1: Data Migration
- [ ] Create migration utility for in-progress sessions
- [ ] Convert `questionHistory` to `conversationHistory` + partial `todoList`
- [ ] Run migration on staging
- [ ] Verify migrated sessions work correctly

#### Step 5.2: Testing
- [ ] Unit tests for to-do list utilities
- [ ] Unit tests for extraction function
- [ ] Unit tests for question generator
- [ ] Integration tests for full conversation flow
- [ ] Test with 10-20 real users
- [ ] Compare metrics: completion rate, time, quality

#### Step 5.3: Rollout
- [ ] Deploy with feature flag (10% traffic)
- [ ] Monitor CloudWatch logs
- [ ] Check DynamoDB for correct todo list updates
- [ ] Verify coach quality unchanged
- [ ] Increase to 50%, then 100%

### Phase 6: Cleanup (Week 4)

#### Step 6.1: Deprecation
- [ ] Mark `questionHistory` as deprecated
- [ ] Update documentation
- [ ] Remove fallback logic after 30 days
- [ ] Delete old question array constants

---

## Implementation Checklist

### Backend
- [x] `types.ts` - Add TodoItem, CoachCreatorTodoList, update Session ✅
- [x] `todo-list-utils.ts` (NEW) - Utility functions ✅
- [x] `todo-extraction.ts` (NEW) - AI extraction function ✅
- [x] `question-generator.ts` (NEW) - AI question generator ✅
- [x] `create-coach-creator-session/handler.ts` - Initialize with todoList ✅
- [x] `stream-coach-creator-session/handler.ts` - Refactor to use todoList ✅
- [x] `data-extraction.ts` - Update to use todoList ✅
- [x] `coach-generation.ts` - Update to use todoList ✅

### Frontend
- [x] `CoachCreatorAgent.js` - Already compatible (handles optional nextQuestion) ✅
- [x] `CoachCreator.jsx` - Already compatible (uses progress from API) ✅

### Testing
- [ ] Unit tests for utilities ⏳
- [ ] Integration tests for flow ⏳
- [ ] Manual testing with real users ⏳
- [ ] Migration testing ⏳

### Documentation
- [x] Update this document with implementation notes ✅
- [ ] Update `COACH_CREATOR_IMPROVEMENT_PLAN.md` with completion status ⏳
- [ ] Create migration guide ⏳

---

## ✅ CLEAN BREAK COMPLETED (2025-11-16)

### Code Removed: ~900 Lines

**data-extraction.ts**: 895 → 391 lines (-504 lines)
- Removed all keyword-based extraction functions
- Replaced with AI-powered extraction using Claude Haiku 4.5
- All `*FromSession()` functions now use AI for robust parsing

**types.ts**: 394 → 307 lines (-87 lines)
- Removed `UserContext`, `Question`, `QuestionHistoryEntry` interfaces
- Made `todoList`, `conversationHistory`, `sophisticationLevel` required (not optional)
- Cleaned up legacy deprecated fields

**stream-coach-creator-session/handler.ts**: 982 → 699 lines (-283 lines)
- Removed entire legacy question-based flow
- Single clean to-do list approach only
- Simplified branching logic

**session-management.ts**: 398 → 237 lines (-161 lines)
- Removed `createCoachCreatorSession()`, `getProgress()`, `checkUserWantsToFinish()`, `updateSessionContext()`
- Simplified `generateCoachCreatorSessionSummary()` to use conversation history

**create-coach-creator-session/handler.ts**: 51 → 51 lines (refactored, no net change)
- Removed dependency on `createCoachCreatorSession()`
- Now creates session inline with to-do list approach

**coach-generation.ts**: Updated function calls to use async extraction
- All `extractX` calls now `await extractXFromSession()`
- `buildCoachConfigPrompts()` is now async

**Total Removed**: ~1,035 lines of legacy code
**All AI Extraction**: Replaced keyword matching with Claude Haiku 4.5
**No Linter Errors**: ✅ Clean build

---

## ✅ IMPLEMENTATION COMPLETE

**Date Completed**: 2025-11-16

### What Was Built

**Core Architecture:**
1. ✅ **To-Do List System** - 22 fields tracking all required information
2. ✅ **AI Extraction** - Automatic extraction from user responses
3. ✅ **AI Question Generator** - Dynamic, context-aware question generation
4. ✅ **Backwards Compatibility** - Both old and new systems work simultaneously

**Files Created:**
- `types.ts` - Added `TodoItem`, `CoachCreatorTodoList`, `ConversationMessage`
- `todo-list-utils.ts` - Progress tracking, completion detection
- `todo-extraction.ts` - AI-powered information extraction
- `question-generator.ts` - AI-driven question generation

**Files Updated:**
- `create-coach-creator-session/handler.ts` - Initialize to-do list
- `stream-coach-creator-session/handler.ts` - New conversational flow
- `data-extraction.ts` - Session-based extraction (supports both approaches)
- `coach-generation.ts` - Uses new extraction functions

**Frontend:**
- No changes needed - already compatible! ✨

### How It Works

**New Session Flow:**
1. User creates session → to-do list initialized (all items = 'pending')
2. AI greeting stored in `conversationHistory`
3. User responds → AI extracts info → updates to-do list
4. AI generates next question based on what's missing
5. Repeat until all required items = 'complete'
6. AI generates completion message → coach created

**Backwards Compatibility:**
- Old sessions: Use `questionHistory` + hardcoded questions (legacy flow)
- New sessions: Use `todoList` + `conversationHistory` (new flow)
- Detection: `if (session.todoList)` determines which path

### Benefits Delivered

✅ **Natural Conversation** - AI adapts to user responses
✅ **No Repetition** - AI won't ask what user already shared
✅ **Flexible Order** - Information collected organically
✅ **Complete Data** - All required fields validated
✅ **Backwards Compatible** - Existing sessions unaffected

### Next Steps for Production

1. **Test with real users** (5-10 sessions)
2. **Monitor CloudWatch logs** for extraction quality
3. **Verify DynamoDB** to-do list updates
4. **Compare coach quality** (old vs new approach)
5. **Gradual rollout** (10% → 50% → 100%)

### Known Limitations

- ⚠️ No automated tests yet (manual testing required)
- ⚠️ Word-based "streaming" simulation (not true streaming from AI)

### ✅ CLEAN BREAK DECISION (2025-11-16)

**Decision**: Remove all legacy question history code
- **Why**: Early beta phase, few active users
- **Impact**: Old incomplete sessions will no longer work
- **Mitigation**: Users will be notified to restart coach creation
- **Benefits**: Cleaner codebase, faster iteration, no dual-path complexity

**What Was Removed:**
- Legacy extraction functions (question ID based)
- Question history storage and management
- Backwards compatibility code in handlers
- Dual-path logic in stream handler

**What Remains:**
- ✅ To-do list approach only
- ✅ Conversation history only
- ✅ Cleaner, maintainable codebase

### Future Enhancements

- Replace keyword-based extraction with AI (Claude Haiku 4.5)
- Add confidence scoring for extracted data
- Implement clarifying questions for low-confidence extractions
- Add progress visualization showing specific items collected
- Store to-do list updates in Pinecone for pattern analysis
- Update tone to match NeonPanda brand voice (playful, electric)

