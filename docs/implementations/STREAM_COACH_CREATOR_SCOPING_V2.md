# Stream Coach Creator Session - Implementation Scoping V2

> **Version 2 Updates**:
> - Added Pinecone queries (RAG context) for methodology retrieval
> - Added memory retrieval (not saving)
> - Updated both streaming and non-streaming handlers
> - Ensured Lambda Function URL is in backend outputs

## Executive Summary

This document scopes the conversion of `update-coach-creator-session` to a streaming version called `stream-coach-creator-session`, following the pattern from `stream-coach-conversation`, with the addition of:

1. **Pinecone RAG Context**: Query relevant methodologies during coach creation
2. **Memory Retrieval**: Access user memories to personalize questions/responses
3. **Backend Outputs**: Properly export Lambda Function URL to `amplify_outputs.json`

**Current State**: The coach creator flow uses API Gateway with `?stream=true` query parameter for streaming (Server-Sent Events through API Gateway). No Pinecone or memory retrieval.

**Target State**:
- Dedicated Lambda Function URL with true SSE streaming
- Pinecone queries to retrieve relevant training methodologies
- Memory retrieval to access user preferences/history
- Properly exported streaming URL in backend outputs
- Automatic fallback to existing non-streaming handler

---

## Updated Architecture Overview

### Enhanced Data Flow

```
User Question/Response
    ↓
Load Session Data
    ↓
Build Question Prompt
    ↓
┌─────────────────────────────────┐
│  NEW: Context Gathering         │
│  ├─ Query Pinecone for          │
│  │  relevant methodologies      │
│  └─ Query user memories         │
└─────────────────────────────────┘
    ↓
Stream AI Response
(with Pinecone + Memory context)
    ↓
Process Response
    ↓
Save Session
```

---

## Updated Complexity Analysis

| Aspect | Coach Conversation | Coach Creator V1 | Coach Creator V2 (NEW) |
|--------|-------------------|------------------|------------------------|
| **Business Logic** | Complex: workout, memory save/retrieve, Pinecone, smart router | Simple: Q&A only | Medium: Q&A + Pinecone + memory retrieve |
| **AI Calls** | Multiple (7) | Single (1) | Single (1) with richer context |
| **Context Gathering** | Workouts + Pinecone + memories | None | Pinecone + memories |
| **Memory Operations** | Retrieve + Save | None | Retrieve only |
| **Data Storage** | Conversation + workouts + memories + summary | Session only | Session only (no memory saving) |
| **Sequential Flow** | Parallel with smart router | Linear | Linear with context |

**Assessment**: Coach Creator V2 is **moderately complex** - simpler than conversation but with contextual awareness.

---

## Feature Integration Details

### 1. Pinecone Query Integration

#### Purpose
Query Pinecone to retrieve relevant training methodologies, programming principles, or coaching concepts that can inform the AI's questions and responses during coach creation.

#### Implementation Pattern

##### Non-Streaming (`update-coach-creator-session/handler.ts`)
```typescript
// Add imports
import { queryPineconeContext } from '../libs/api-helpers';

// In handler, after loading session:
const session = await getCoachCreatorSession(userId, sessionId);
const userProfile = await getUserProfile(userId);

// NEW: Query Pinecone for methodology context
let pineconeContext = '';
let pineconeMatches: any[] = [];

try {
  // Query based on user's current response + session context
  const currentQuestionContext = getCurrentQuestion(session.attributes.userContext);
  const searchQuery = `${userResponse} ${currentQuestionContext?.text || ''}`;

  const pineconeResults = await queryPineconeContext(
    userId,
    searchQuery,
    {
      topK: 5,
      includeMethodology: true,
      includeWorkouts: false,
      includeCoachCreator: false,
      includeConversationSummaries: false,
      enableReranking: true
    }
  );

  pineconeMatches = pineconeResults.matches || [];

  if (pineconeMatches.length > 0) {
    pineconeContext = pineconeMatches
      .map((match: any) => match.content || '')
      .filter(text => text.length > 0)
      .join('\n\n')
      .substring(0, 2000); // Limit to 2000 chars

    console.info('📚 Pinecone methodology context retrieved:', {
      matches: pineconeMatches.length,
      contextLength: pineconeContext.length
    });
  }
} catch (pineconeError) {
  console.warn('⚠️ Pinecone query failed (non-critical):', pineconeError);
  // Continue without Pinecone context
}

// Build prompt with Pinecone context
const questionPrompt = buildQuestionPrompt(
  currentQuestion,
  session.attributes.userContext,
  session.attributes.questionHistory,
  userProfile?.attributes?.criticalTrainingDirective,
  pineconeContext // NEW: Pass Pinecone context
);
```

##### Streaming (`stream-coach-creator-session/handler.ts`)
```typescript
// In createCoachCreatorEventStream generator:
async function* createCoachCreatorEventStream(event, context) {
  yield formatStartEvent();

  const params = await validateAndExtractParams(event);
  const sessionData = await loadSessionData(params.userId, params.sessionId);

  const currentQuestion = getCurrentQuestion(sessionData.session.attributes.userContext);

  // NEW: Query Pinecone for context
  let pineconeContext = '';
  let pineconeMatches: any[] = [];

  try {
    const searchQuery = `${params.userResponse} ${currentQuestion?.text || ''}`;
    const pineconeResults = await queryPinecone(
      searchQuery,
      'methodologies',
      5
    );

    pineconeMatches = pineconeResults.matches || [];
    if (pineconeMatches.length > 0) {
      pineconeContext = pineconeMatches
        .map((match: any) => match.metadata?.text || '')
        .join('\n\n');
    }
  } catch (error) {
    console.warn('⚠️ Pinecone query failed:', error);
  }

  // Build prompt with context
  const questionPrompt = buildQuestionPrompt(
    currentQuestion,
    sessionData.session.attributes.userContext,
    sessionData.session.attributes.questionHistory,
    sessionData.userProfile?.attributes?.criticalTrainingDirective,
    pineconeContext // NEW: Pass context
  );

  // Continue with AI streaming...
}
```

#### Update `buildQuestionPrompt` Function

**Location**: `amplify/functions/libs/coach-creator/question-management.ts`

```typescript
export function buildQuestionPrompt(
  currentQuestion: Question,
  userContext: UserContext,
  questionHistory: QuestionHistoryItem[],
  criticalTrainingDirective?: CriticalTrainingDirective,
  pineconeContext?: string // NEW parameter
): string {
  let systemPrompt = `You are an expert AI fitness coach creator...`;

  // Add recent Q&A history
  if (questionHistory && questionHistory.length > 0) {
    const recentHistory = questionHistory.slice(-3);
    systemPrompt += `\n\nRecent conversation:\n`;
    recentHistory.forEach(item => {
      systemPrompt += `Q: ${item.question}\nA: ${item.userResponse}\n`;
    });
  }

  // NEW: Add Pinecone context if available
  if (pineconeContext && pineconeContext.trim()) {
    systemPrompt += `\n\nRelevant training knowledge:\n${pineconeContext}\n`;
    systemPrompt += `Use this knowledge to inform your questions and understand the user's responses in context.`;
  }

  // Add critical training directive if present
  if (criticalTrainingDirective?.enabled && criticalTrainingDirective?.directive) {
    systemPrompt += `\n\nCritical Training Directive: ${criticalTrainingDirective.directive}`;
  }

  // Add current question
  systemPrompt += `\n\nCurrent question: ${currentQuestion.text}`;

  return systemPrompt;
}
```

---

### 2. Memory Retrieval Integration

#### Purpose
Query user memories to access their preferences, training history, goals, and personal information that can help personalize the coach creation questions and responses.

#### Implementation Pattern

##### Non-Streaming (`update-coach-creator-session/handler.ts`)
```typescript
// Add imports
import { queryMemories } from '../libs/coach-conversation/memory-processing';
import { analyzeMemoryNeeds } from '../libs/memory/detection';

// In handler, after Pinecone query:
const pineconeResults = await queryPineconeContext(...);

// NEW: Smart memory detection + retrieval (only query if needed)
let userMemories: any[] = [];
let memoryContext = '';

try {
  // Build message context from recent Q&A
  const messageContext = questionHistory.slice(-3)
    .map(item => `Q: ${item.question}\nA: ${item.userResponse}`)
    .join('\n');

  // STEP 1: Detect if memory retrieval is needed (lightweight AI call)
  const memoryAnalysis = await analyzeMemoryNeeds(
    userResponse,
    messageContext,
    'Coach Creator' // coachName
  );

  console.info('🧠 Memory analysis:', {
    needsRetrieval: memoryAnalysis.needsRetrieval,
    reason: memoryAnalysis.reason
  });

  // STEP 2: Only query memories if needed
  if (memoryAnalysis.needsRetrieval) {
    const memoryResults = await queryMemories(
      userId,
      null, // Query across ALL coaches (not scoped to specific coachId)
      userResponse,
      messageContext
    );

    userMemories = memoryResults.memories || [];

    if (userMemories.length > 0) {
      memoryContext = userMemories
        .map((mem: any) => `- ${mem.memoryText || mem.content}`)
        .filter(text => text.length > 2) // Filter empty
        .join('\n')
        .substring(0, 2000); // Limit to 2000 chars

      console.info('🧠 User memories retrieved:', {
        count: userMemories.length,
        contextLength: memoryContext.length
      });
    } else {
      console.info('📭 No relevant memories found');
    }
  } else {
    console.info('⏭️ Memory retrieval not needed for this response');
  }
} catch (memoryError) {
  console.warn('⚠️ Memory processing failed (non-critical):', memoryError);
  // Continue without memories
}

// Build prompt with both Pinecone + memory context
const questionPrompt = buildQuestionPrompt(
  currentQuestion,
  session.attributes.userContext,
  session.attributes.questionHistory,
  userProfile?.attributes?.criticalTrainingDirective,
  pineconeContext,
  memoryContext // NEW: Pass memory context
);
```

##### Streaming (`stream-coach-creator-session/handler.ts`)
```typescript
// In createCoachCreatorEventStream generator, after Pinecone:
const pineconeResults = await queryPinecone(...);

// NEW: Query user memories
let userMemories: any[] = [];
let memoryContext = '';

try {
  const messageContext = sessionData.session.attributes.questionHistory
    .slice(-3)
    .map((item: any) => `Q: ${item.question}\nA: ${item.userResponse}`)
    .join('\n');

  const memoryResults = await queryMemories(
    params.userId,
    'coach-creator',
    params.userResponse,
    messageContext
  );

  userMemories = memoryResults.memories || [];
  if (userMemories.length > 0) {
    memoryContext = userMemories
      .map((mem: any) => `- ${mem.memoryText}`)
      .join('\n');
  }
} catch (error) {
  console.warn('⚠️ Memory query failed:', error);
}

// Build prompt with both contexts
const questionPrompt = buildQuestionPrompt(
  currentQuestion,
  sessionData.session.attributes.userContext,
  sessionData.session.attributes.questionHistory,
  sessionData.userProfile?.attributes?.criticalTrainingDirective,
  pineconeContext,
  memoryContext // NEW: Pass memory context
);
```

#### Update `buildQuestionPrompt` Function (Enhanced)

```typescript
export function buildQuestionPrompt(
  currentQuestion: Question,
  userContext: UserContext,
  questionHistory: QuestionHistoryItem[],
  criticalTrainingDirective?: CriticalTrainingDirective,
  pineconeContext?: string,
  memoryContext?: string // NEW parameter
): string {
  let systemPrompt = `You are an expert AI fitness coach creator...`;

  // Add recent Q&A history
  if (questionHistory && questionHistory.length > 0) {
    const recentHistory = questionHistory.slice(-3);
    systemPrompt += `\n\nRecent conversation:\n`;
    recentHistory.forEach(item => {
      systemPrompt += `Q: ${item.question}\nA: ${item.userResponse}\n`;
    });
  }

  // Add user memories if available
  if (memoryContext && memoryContext.trim()) {
    systemPrompt += `\n\nWhat I remember about this user:\n${memoryContext}\n`;
    systemPrompt += `Use these memories to personalize your questions and understand their context.`;
  }

  // Add Pinecone context if available
  if (pineconeContext && pineconeContext.trim()) {
    systemPrompt += `\n\nRelevant training knowledge:\n${pineconeContext}\n`;
    systemPrompt += `Use this knowledge to inform your questions and responses.`;
  }

  // Add critical training directive if present
  if (criticalTrainingDirective?.enabled && criticalTrainingDirective?.directive) {
    systemPrompt += `\n\nCritical Training Directive: ${criticalTrainingDirective.directive}`;
  }

  // Add current question
  systemPrompt += `\n\nCurrent question: ${currentQuestion.text}`;

  return systemPrompt;
}
```

---

### 3. Backend Outputs Configuration

#### Purpose
Export the Lambda Function URL to `amplify_outputs.json` so the frontend can access it via configuration.

#### Implementation

**Location**: `amplify/backend.ts`

```typescript
import { defineBackend } from '@aws-amplify/backend';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';

// Import functions
import { streamCoachCreatorSession } from './functions/stream-coach-creator-session/resource';

export default defineBackend((stack) => {
  // ... other backend setup ...

  // Define Lambda Function URL for coach creator streaming
  const streamCoachCreatorSessionUrl = streamCoachCreatorSession.addFunctionUrl({
    authType: lambda.FunctionUrlAuthType.NONE,
    invokeMode: lambda.InvokeMode.RESPONSE_STREAM, // Critical for streaming
    cors: {
      allowedOrigins: ['*'],
      allowedMethods: [lambda.HttpMethod.PUT, lambda.HttpMethod.OPTIONS],
      allowedHeaders: ['*'],
      maxAge: Duration.hours(1),
    },
  });

  // Grant necessary permissions
  dynamoDBTable.grantReadWriteData(streamCoachCreatorSession);

  // Add environment variables
  // Note: PINECONE_API_KEY and PINECONE_INDEX_NAME are already configured in api-helpers.ts
  streamCoachCreatorSession.addEnvironment('DYNAMODB_TABLE', dynamoDBTable.tableName);
  streamCoachCreatorSession.addEnvironment('BUILD_COACH_CONFIG_FUNCTION_NAME', buildCoachConfig.functionName);
  // ... other environment variables ...

  // IMPORTANT: Add URL to backend outputs (structured format matching coach conversation)
  // This will appear in amplify_outputs.json under custom.coachCreatorSessionStreamingApi
  backend.addOutput({
    custom: {
      coachCreatorSessionStreamingApi: {
        functionUrl: streamCoachCreatorSessionUrl.url,
        region: backend.streamCoachCreatorSession.stack.region,
      }
    }
  });

  return backend;
});
```

#### Verify in `amplify_outputs.json`

After deployment, verify the URL appears:

```json
{
  "version": "1.0",
  "custom": {
    "streamCoachConversationUrl": "https://xxx.lambda-url.us-east-1.on.aws/",
    "streamCoachCreatorSessionUrl": "https://yyy.lambda-url.us-east-1.on.aws/"
  },
  "storage": {
    ...
  },
  "auth": {
    ...
  }
}
```

#### Frontend Access

**Location**: `src/utils/apis/apiConfig.js`

```javascript
import outputs from '../../../amplify_outputs.json';

// Get streaming URLs from amplify outputs
export const STREAMING_CONFIG = {
  COACH_CONVERSATION_URL: outputs.custom?.streamCoachConversationUrl || null,
  COACH_CREATOR_SESSION_URL: outputs.custom?.streamCoachCreatorSessionUrl || null, // NEW
};

// Check if streaming is enabled
export const isStreamingEnabled = () => {
  return !!(
    STREAMING_CONFIG.COACH_CONVERSATION_URL ||
    STREAMING_CONFIG.COACH_CREATOR_SESSION_URL
  );
};

// Get streaming URL for a specific type
export const getStreamingUrl = (path) => {
  const baseUrl = process.env.REACT_APP_STREAMING_BASE_URL;

  // If environment variable is set, use it (for local dev)
  if (baseUrl) {
    return `${baseUrl}/${path}`;
  }

  // Determine which streaming URL to use based on path
  if (path.includes('coach-creator-sessions')) {
    if (!STREAMING_CONFIG.COACH_CREATOR_SESSION_URL) {
      throw new Error('Coach creator streaming URL not configured');
    }
    return `${STREAMING_CONFIG.COACH_CREATOR_SESSION_URL}${path}`;
  }

  if (path.includes('conversations')) {
    if (!STREAMING_CONFIG.COACH_CONVERSATION_URL) {
      throw new Error('Coach conversation streaming URL not configured');
    }
    return `${STREAMING_CONFIG.COACH_CONVERSATION_URL}${path}`;
  }

  throw new Error(`Unknown streaming path: ${path}`);
};
```

---

## Updated Implementation Checklist

### Phase 1: Backend - Update Existing Non-Streaming Handler (3-4 hours)

**Location**: `amplify/functions/update-coach-creator-session/handler.ts`

**Changes Required**:
- [ ] Add Pinecone query after session load
- [ ] Add memory retrieval after Pinecone query
- [ ] Update `buildQuestionPrompt` function signature
- [ ] Pass contexts to prompt builder
- [ ] Update imports
- [ ] Test non-streaming path with contexts

**Code Pattern** (see detailed examples above):
```typescript
// After loading session
const pineconeResults = await queryPinecone(...);
const memoryResults = await queryMemories(...);
const questionPrompt = buildQuestionPrompt(..., pineconeContext, memoryContext);
```

---

### Phase 2: Backend - Create Streaming Handler (5-7 hours)

**Location**: `amplify/functions/stream-coach-creator-session/`

**Files to Create**:
- [ ] `handler.ts` - Main streaming handler with Pinecone + memory
- [ ] `resource.ts` - Function configuration

**Key Sections**:
1. Validation and parameter extraction (same as V1)
2. Session data loading (same as V1)
3. **NEW**: Pinecone query for methodologies
4. **NEW**: Memory retrieval for user context
5. Build enhanced prompt with both contexts
6. Stream AI response (same as V1)
7. Process and save session (same as V1)

**Estimated Effort**: 5-7 hours (V1 baseline + 2-3 hours for context integration)

---

### Phase 3: Backend - Update Helper Functions (2-3 hours)

**Location**: `amplify/functions/libs/coach-creator/question-management.ts`

**Changes Required**:
- [ ] Update `buildQuestionPrompt` signature to accept `pineconeContext` and `memoryContext`
- [ ] Update function implementation to include contexts in prompt
- [ ] Add proper ordering (history → memories → knowledge → directive → question)
- [ ] Add logging for context usage

---

### Phase 4: Backend - Configuration (2-3 hours)

**Location**: `amplify/backend.ts`

**Changes Required**:
- [ ] Import new `streamCoachCreatorSession` function
- [ ] Configure Lambda Function URL with CORS
- [ ] Set `RESPONSE_STREAM` invoke mode
- [ ] Add environment variables (Pinecone, DynamoDB, etc.)
- [ ] Grant IAM permissions (DynamoDB, Pinecone via Bedrock, Lambda invoke)
- [ ] **CRITICAL**: Add URL to backend outputs using `stack.addOutput()` or `backend.addOutput()`
- [ ] Verify Pinecone environment variables are set

**Example Output Configuration**:
```typescript
stack.addOutput('streamCoachCreatorSessionUrl', {
  value: streamCoachCreatorSessionUrl.url,
  description: 'Lambda Function URL for streaming coach creator sessions',
  exportName: `${stack.stackName}-StreamCoachCreatorSessionUrl`,
});
```

---

### Phase 5: Frontend - API Layer (2-3 hours)

**Location**: `src/utils/apis/streamingLambdaApi.js`

**Changes Required**:
- [ ] Add `streamCoachCreatorSessionLambda` function (copy pattern from coach conversation)
- [ ] Use `getStreamingUrl()` to get correct URL from config

**Location**: `src/utils/apis/coachCreatorApi.js`

**Changes Required**:
- [ ] Update `updateCoachCreatorSessionStream` to use Lambda URL as primary
- [ ] Keep API Gateway as fallback

**Location**: `src/utils/apis/apiConfig.js`

**Changes Required**:
- [ ] Import `amplify_outputs.json`
- [ ] Add `COACH_CREATOR_SESSION_URL` to streaming config
- [ ] Update `getStreamingUrl()` to handle coach creator paths
- [ ] Add environment variable fallback for local dev

---

### Phase 6: Testing (6-10 hours)

#### Backend Unit Tests
- [ ] Test Pinecone query (with results, without results, error)
- [ ] Test memory retrieval (with memories, without memories, error)
- [ ] Test prompt building with various context combinations
- [ ] Test streaming with contexts
- [ ] Test non-streaming with contexts
- [ ] Test fallback when Pinecone/memory fails

#### Integration Tests
- [ ] Test Lambda URL with contexts
- [ ] Test API Gateway fallback with contexts
- [ ] Test non-streaming fallback
- [ ] Test with images + contexts
- [ ] Test session completion with contexts
- [ ] Verify contexts improve response quality

#### Manual Testing
- [ ] Create new coach creator session
- [ ] Provide responses that should trigger Pinecone matches
- [ ] Verify relevant methodologies are referenced
- [ ] Verify user memories are referenced
- [ ] Check network tab for Lambda URL usage
- [ ] Test fallback scenarios

---

## Updated Effort Estimation

| Phase | Task | Hours (V1) | Hours (V2 - Updated) | Delta |
|-------|------|------------|----------------------|-------|
| **Phase 1: Update Non-Streaming** | | | | |
| | Add Pinecone query | - | 1-1.5 | +1-1.5 |
| | Add memory retrieval | - | 1-1.5 | +1-1.5 |
| | Update prompt builder | - | 0.5-1 | +0.5-1 |
| **Phase 2: Create Streaming Handler** | | | | |
| | Create handler.ts | 3-4 | 5-6 | +2 |
| | Create resource.ts | 0.5 | 0.5 | 0 |
| **Phase 3: Update Helpers** | | | | |
| | Update buildQuestionPrompt | - | 1-1.5 | +1-1.5 |
| | Update function signature | - | 0.5-1 | +0.5-1 |
| **Phase 4: Backend Config** | | | | |
| | Update backend.ts | 2-3 | 2-3 | 0 |
| | Add outputs config | - | 0.5 | +0.5 |
| **Phase 5: Frontend** | | | | |
| | Create Lambda streaming function | 1-2 | 1-2 | 0 |
| | Update API config | 1 | 1.5 | +0.5 |
| | Update apiConfig.js | - | 1 | +1 |
| **Phase 6: Testing** | | | | |
| | Backend unit tests | 3-4 | 4-5 | +1 |
| | Integration tests | 2-3 | 3-4 | +1 |
| | Manual testing | 2-3 | 3-4 | +1 |
| **TOTAL** | | **17-26 hours** | **27-38 hours** | **+10-12 hours** |

**V2 Total Estimate**: 27-38 hours
- Core streaming implementation: 17-26 hours (from V1)
- Pinecone + memory integration: 10-12 hours additional
- Backend outputs configuration: included in Phase 4

---

## Updated Risk Assessment

### Low Risk (Unchanged)
- ✅ Pattern already proven with coach conversations
- ✅ Frontend infrastructure already in place
- ✅ Clear fallback strategy
- ✅ Simpler business logic than coach conversations

### Medium Risk (New)
- ⚠️ Pinecone query reliability for methodologies namespace
- ⚠️ Memory retrieval may not always have relevant results
- ⚠️ Context size may increase prompt length (watch token limits)
- **Mitigation**:
  - Make both queries non-blocking (continue if they fail)
  - Limit context size (top 5 Pinecone, top 5 memories)
  - Add proper error handling

### Potential Issues
- Backend outputs not appearing in `amplify_outputs.json` (check CDK stack configuration)
- Context retrieval adding latency to first token
- Contexts not improving response quality enough to justify complexity

**Overall Risk Level**: Low-Medium

---

## Updated Success Criteria

### Functional Requirements
- [ ] Streaming works via Lambda Function URL
- [ ] Fallback to API Gateway works
- [ ] Fallback to non-streaming works
- [ ] **NEW**: Pinecone queries retrieve relevant methodologies
- [ ] **NEW**: Memory retrieval accesses user memories
- [ ] **NEW**: Contexts are included in AI prompts
- [ ] Session updates correctly during streaming
- [ ] Progress tracking works correctly
- [ ] Image support works with contexts
- [ ] Session completion triggers coach config generation
- [ ] Error handling graceful (contexts optional, not required)
- [ ] **NEW**: Lambda Function URL appears in `amplify_outputs.json`

### Performance Requirements
- [ ] First token latency < 1.5 seconds (slightly higher due to Pinecone + memory queries)
- [ ] Pinecone query < 200ms
- [ ] Memory query < 200ms
- [ ] Streaming latency < 100ms per chunk
- [ ] Total response time reasonable with contexts

### Quality Requirements
- [ ] Unit test coverage > 80%
- [ ] Integration tests pass
- [ ] **NEW**: Contexts demonstrably improve response quality
- [ ] **NEW**: Contexts are optional (graceful degradation if unavailable)
- [ ] No linting errors
- [ ] TypeScript type safety maintained
- [ ] Browser compatibility verified

---

## Key Implementation Notes

### 1. Context Queries are Non-Blocking

Both Pinecone and memory queries should be wrapped in try-catch blocks and should NOT fail the entire request if they fail:

```typescript
let pineconeContext = '';
try {
  const results = await queryPinecone(...);
  pineconeContext = results.context;
} catch (error) {
  console.warn('⚠️ Pinecone query failed (non-critical):', error);
  // Continue without Pinecone context
}
```

### 2. Context Size Limits

To avoid token limit issues:
- Pinecone: Top 5 matches, max ~2000 characters
- Memories: Top 5 memories, max ~1000 characters
- Total additional context: ~3000 characters max

### 3. Backend Outputs Priority

The Lambda Function URL MUST be in backend outputs for frontend access. Use one of these patterns:

**Pattern 1: Custom outputs (recommended)**
```typescript
backend.addOutput({
  custom: {
    streamCoachCreatorSessionUrl: streamCoachCreatorSessionUrl.url,
  }
});
```

**Pattern 2: Stack outputs**
```typescript
stack.addOutput('streamCoachCreatorSessionUrl', {
  value: streamCoachCreatorSessionUrl.url,
  description: 'Lambda Function URL for streaming coach creator sessions',
});
```

Either pattern will make the URL available in `amplify_outputs.json`.

### 4. Frontend Configuration

The frontend should gracefully handle missing URLs:

```javascript
export const getStreamingUrl = (path) => {
  // Check for coach creator URL
  if (path.includes('coach-creator-sessions')) {
    if (!STREAMING_CONFIG.COACH_CREATOR_SESSION_URL) {
      console.warn('⚠️ Coach creator streaming URL not configured, will use API Gateway fallback');
      throw new Error('Streaming URL not available');
    }
    return `${STREAMING_CONFIG.COACH_CREATOR_SESSION_URL}${path}`;
  }
  // ...
};
```

---

## Questions Resolved

### Q1: Should we add memory SAVING to coach creator?
**A**: No. Only memory RETRIEVAL. Users' memories are saved during coach conversations, not during coach creation. Coach creator should reference existing memories to personalize questions.

### Q2: Should we add contextual updates like coach conversations?
**A**: Not in V2. Keep single AI call with enriched context. Can add later if UX demands it.

### Q3: Which Pinecone namespace should we use?
**A**: `methodologies` namespace - contains training principles, programming concepts, and coaching methodologies that can inform questions.

### Q4: How do we ensure the URL is in amplify_outputs.json?
**A**: Use `stack.addOutput()` or `backend.addOutput()` in `backend.ts`. Both patterns work - choose based on existing patterns in your codebase.

---

## Conclusion

**V2 Updates Summary**:
1. ✅ Added Pinecone query for methodology context
2. ✅ Added memory retrieval for user personalization
3. ✅ Updated both streaming and non-streaming handlers
4. ✅ Ensured Lambda Function URL in backend outputs
5. ✅ Maintained graceful degradation (contexts optional)

**New Estimate**: 27-38 hours (10-12 hours more than V1)
- Core streaming: 17-26 hours
- Context integration: 10-12 hours

**Complexity**: Medium (was Low in V1)
**Risk**: Low-Medium (was Low in V1)

The context integration makes coach creator sessions more intelligent and personalized while maintaining the simpler single-AI-call structure. The additional complexity is justified by improved response quality and better user experience.

