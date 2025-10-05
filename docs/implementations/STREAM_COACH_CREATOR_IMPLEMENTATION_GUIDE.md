# Stream Coach Creator Session - Final Implementation Guide

> **Version 2 - All Questions Answered**
> This is the definitive implementation guide with all clarifications from user Q&A.

## Configuration Summary

### ✅ Confirmed Details

| Aspect | Configuration |
|--------|---------------|
| **Pinecone Namespace** | `methodology` (singular) |
| **Memory Query Scope** | ALL coaches (pass `null` for coachId) |
| **Memory Detection** | Use `analyzeMemoryNeeds()` from `../libs/memory/detection` |
| **Methodology Query** | Use `queryPineconeContext()` from `../libs/api-helpers` |
| **Backend Outputs** | Structured format with `functionUrl` and `region` |
| **Testing Approach** | Sequential (non-streaming first, then streaming) |
| **Context Limits** | 2000 chars each (methodologies + memories) |
| **Memory Saving** | Retrieval only (no saving in V2) |
| **Environment Variables** | Already configured in `api-helpers.ts` |

---

## Implementation Steps

### Step 1: Update Non-Streaming Handler (3-4 hours)

**File**: `amplify/functions/update-coach-creator-session/handler.ts`

#### Add Imports

```typescript
import { queryPineconeContext } from '../libs/api-helpers';
import { queryMemories } from '../libs/coach-conversation/memory-processing';
import { analyzeMemoryNeeds } from '../libs/memory/detection';
```

#### Add Context Gathering (after session load, before building prompt)

```typescript
// After loading session
const session = await getCoachCreatorSession(userId, sessionId);
const userProfile = await getUserProfile(userId);
const currentQuestion = getCurrentQuestion(session.attributes.userContext);

// STEP 1: Query Pinecone for methodology context (always query)
let pineconeContext = '';
let pineconeMatches: any[] = [];

try {
  const searchQuery = `${userResponse} ${currentQuestion?.text || ''}`;

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

// STEP 2: Smart memory detection + retrieval (only query if needed)
let userMemories: any[] = [];
let memoryContext = '';

try {
  const messageContext = session.attributes.questionHistory
    .slice(-3)
    .map((item: any) => `Q: ${item.question}\nA: ${item.userResponse}`)
    .join('\n');

  // Detect if memory retrieval is needed (lightweight AI call with Haiku/Nova)
  const memoryAnalysis = await analyzeMemoryNeeds(
    userResponse,
    messageContext,
    'Coach Creator' // coachName
  );

  console.info('🧠 Memory analysis:', {
    needsRetrieval: memoryAnalysis.needsRetrieval,
    reason: memoryAnalysis.reason
  });

  // Only query memories if needed
  if (memoryAnalysis.needsRetrieval) {
    const memoryResults = await queryMemories(
      userId,
      null, // Query across ALL coaches
      userResponse,
      messageContext
    );

    userMemories = memoryResults.memories || [];

    if (userMemories.length > 0) {
      memoryContext = userMemories
        .map((mem: any) => `- ${mem.memoryText || mem.content}`)
        .filter(text => text.length > 2)
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

// Build prompt with both contexts
const questionPrompt = buildQuestionPrompt(
  currentQuestion,
  session.attributes.userContext,
  session.attributes.questionHistory,
  userProfile?.attributes?.criticalTrainingDirective,
  pineconeContext,  // NEW
  memoryContext     // NEW
);
```

#### Also Update Streaming Path in Same Handler

Add the same context gathering in `handleCoachCreatorStreamingResponse` function (lines ~230-310).

---

### Step 2: Create Streaming Handler (5-7 hours)

**File**: `amplify/functions/stream-coach-creator-session/handler.ts`

#### Copy Structure from Coach Conversation

1. Copy `stream-coach-conversation/handler.ts` as starting point
2. Rename all `CoachConversation` → `CoachCreator`
3. Update route: `/users/{userId}/coach-creator-sessions/{sessionId}/stream`

#### Simplify Event Generator

Remove:
- Smart router analysis
- Contextual updates (5 stages)
- Workout detection
- Keep single AI call with enriched context

#### Add Context Gathering

```typescript
async function* createCoachCreatorEventStream(event, context) {
  yield formatStartEvent();

  const params = await validateAndExtractParams(event);
  const sessionData = await loadSessionData(params.userId, params.sessionId);

  const currentQuestion = getCurrentQuestion(sessionData.session.attributes.userContext);

  // Query Pinecone for methodology context
  let pineconeContext = '';
  try {
    const searchQuery = `${params.userResponse} ${currentQuestion?.text || ''}`;
    const pineconeResults = await queryPineconeContext(
      params.userId,
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

    if (pineconeResults.matches && pineconeResults.matches.length > 0) {
      pineconeContext = pineconeResults.matches
        .map((match: any) => match.content || '')
        .filter(text => text.length > 0)
        .join('\n\n')
        .substring(0, 2000);
    }
  } catch (error) {
    console.warn('⚠️ Pinecone query failed:', error);
  }

  // Smart memory detection + retrieval
  let memoryContext = '';
  try {
    const messageContext = sessionData.session.attributes.questionHistory
      .slice(-3)
      .map((item: any) => `Q: ${item.question}\nA: ${item.userResponse}`)
      .join('\n');

    const memoryAnalysis = await analyzeMemoryNeeds(
      params.userResponse,
      messageContext,
      'Coach Creator'
    );

    if (memoryAnalysis.needsRetrieval) {
      const memoryResults = await queryMemories(
        params.userId,
        null, // All coaches
        params.userResponse,
        messageContext
      );

      if (memoryResults.memories && memoryResults.memories.length > 0) {
        memoryContext = memoryResults.memories
          .map((mem: any) => `- ${mem.memoryText || mem.content}`)
          .filter(text => text.length > 2)
          .join('\n')
          .substring(0, 2000);
      }
    }
  } catch (error) {
    console.warn('⚠️ Memory processing failed:', error);
  }

  // Build prompt with contexts
  const questionPrompt = buildQuestionPrompt(
    currentQuestion,
    sessionData.session.attributes.userContext,
    sessionData.session.attributes.questionHistory,
    sessionData.userProfile?.attributes?.criticalTrainingDirective,
    pineconeContext,
    memoryContext
  );

  // Stream AI response (single call)
  let fullAIResponse = '';
  const streamResult = await generateAIResponseStream(...);

  for await (const chunk of streamResult) {
    fullAIResponse += chunk;
    yield formatChunkEvent(chunk);
  }

  // Process and save session
  // ... rest of implementation
}
```

---

### Step 3: Update `buildQuestionPrompt` Helper (1-2 hours)

**File**: `amplify/functions/libs/coach-creator/question-management.ts`

#### Update Function Signature

```typescript
export function buildQuestionPrompt(
  currentQuestion: Question,
  userContext: UserContext,
  questionHistory: QuestionHistoryItem[],
  criticalTrainingDirective?: CriticalTrainingDirective,
  pineconeContext?: string,  // NEW
  memoryContext?: string     // NEW
): string
```

#### Update Implementation

```typescript
export function buildQuestionPrompt(
  currentQuestion: Question,
  userContext: UserContext,
  questionHistory: QuestionHistoryItem[],
  criticalTrainingDirective?: CriticalTrainingDirective,
  pineconeContext?: string,
  memoryContext?: string
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

  // NEW: Add user memories if available
  if (memoryContext && memoryContext.trim()) {
    systemPrompt += `\n\nWhat I remember about this user:\n${memoryContext}\n`;
    systemPrompt += `\nUse these memories to personalize your questions and understand their background.`;
  }

  // NEW: Add Pinecone methodology context if available
  if (pineconeContext && pineconeContext.trim()) {
    systemPrompt += `\n\nRelevant training knowledge and methodologies:\n${pineconeContext}\n`;
    systemPrompt += `\nUse this knowledge to inform your questions and provide context.`;
  }

  // Add sophistication level
  if (userContext.sophisticationLevel && userContext.sophisticationLevel !== 'UNKNOWN') {
    systemPrompt += `\n\nDetected sophistication level: ${userContext.sophisticationLevel}`;
  }

  // Add critical training directive
  if (criticalTrainingDirective?.enabled && criticalTrainingDirective?.directive) {
    systemPrompt += `\n\n🚨 CRITICAL TRAINING DIRECTIVE: ${criticalTrainingDirective.directive}`;
  }

  // Add current question
  systemPrompt += `\n\nCurrent question: ${currentQuestion.text}`;

  return systemPrompt;
}
```

---

### Step 4: Configure Backend (2-3 hours)

**File**: `amplify/backend.ts`

```typescript
import { streamCoachCreatorSession } from './functions/stream-coach-creator-session/resource';

// Define Lambda Function URL
const streamCoachCreatorSessionUrl = streamCoachCreatorSession.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  invokeMode: lambda.InvokeMode.RESPONSE_STREAM, // Critical!
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.PUT, lambda.HttpMethod.OPTIONS],
    allowedHeaders: ['*'],
    maxAge: Duration.hours(1),
  },
});

// Grant permissions
dynamoDBTable.grantReadWriteData(streamCoachCreatorSession);
buildCoachConfig.grantInvoke(streamCoachCreatorSession);

// Environment variables (Pinecone already configured in api-helpers.ts)
streamCoachCreatorSession.addEnvironment('DYNAMODB_TABLE', dynamoDBTable.tableName);
streamCoachCreatorSession.addEnvironment('BUILD_COACH_CONFIG_FUNCTION_NAME', buildCoachConfig.functionName);

// CRITICAL: Add to backend outputs (structured format)
backend.addOutput({
  custom: {
    coachCreatorSessionStreamingApi: {
      functionUrl: streamCoachCreatorSessionUrl.url,
      region: backend.streamCoachCreatorSession.stack.region,
    }
  }
});
```

#### Result in `amplify_outputs.json`

```json
{
  "custom": {
    "coachConversationStreamingApi": {
      "functionUrl": "https://xxx.lambda-url.us-west-2.on.aws/",
      "region": "us-west-2"
    },
    "coachCreatorSessionStreamingApi": {
      "functionUrl": "https://yyy.lambda-url.us-west-2.on.aws/",
      "region": "us-west-2"
    }
  }
}
```

---

### Step 5: Update Frontend (2-3 hours)

#### 5.1 Update API Config

**File**: `src/utils/apis/apiConfig.js`

```javascript
import outputs from '../../../amplify_outputs.json';

export const STREAMING_CONFIG = {
  COACH_CONVERSATION: outputs.custom?.coachConversationStreamingApi || null,
  COACH_CREATOR_SESSION: outputs.custom?.coachCreatorSessionStreamingApi || null,
};

export const isStreamingEnabled = () => {
  return !!(STREAMING_CONFIG.COACH_CONVERSATION || STREAMING_CONFIG.COACH_CREATOR_SESSION);
};

export const getStreamingUrl = (path) => {
  const baseUrl = process.env.REACT_APP_STREAMING_BASE_URL;
  if (baseUrl) {
    return `${baseUrl}/${path}`;
  }

  if (path.includes('coach-creator-sessions')) {
    const config = STREAMING_CONFIG.COACH_CREATOR_SESSION;
    if (!config?.functionUrl) {
      throw new Error('Coach creator streaming URL not configured');
    }
    return `${config.functionUrl}${path}`;
  }

  if (path.includes('conversations')) {
    const config = STREAMING_CONFIG.COACH_CONVERSATION;
    if (!config?.functionUrl) {
      throw new Error('Coach conversation streaming URL not configured');
    }
    return `${config.functionUrl}${path}`;
  }

  throw new Error(`Unknown streaming path: ${path}`);
};
```

#### 5.2 Add Lambda Streaming Function

**File**: `src/utils/apis/streamingLambdaApi.js`

```javascript
export async function* streamCoachCreatorSessionLambda(
  userId, sessionId, userResponse, imageS3Keys = []
) {
  if (!isStreamingEnabled()) {
    throw new Error('Lambda Function URL streaming is not enabled');
  }

  const path = `users/${userId}/coach-creator-sessions/${sessionId}/stream`;
  const url = getStreamingUrl(path);

  const requestBody = {
    userResponse,
    messageTimestamp: new Date().toISOString()
  };

  if (imageS3Keys && imageS3Keys.length > 0) {
    requestBody.imageS3Keys = imageS3Keys;
  }

  try {
    const authHeaders = await getAuthHeaders();

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Streaming failed: ${response.status}`);
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          yield data;
        }
      }
    }
  } catch (error) {
    console.error('Lambda streaming error:', error);
    throw error;
  }
}
```

#### 5.3 Update Coach Creator API

**File**: `src/utils/apis/coachCreatorApi.js`

```javascript
import { streamCoachCreatorSessionLambda } from './streamingLambdaApi';
import { isStreamingEnabled } from './apiConfig';

export async function* updateCoachCreatorSessionStream(
  userId, sessionId, userResponse, imageS3Keys = []
) {
  // Try Lambda Function URL first
  if (isStreamingEnabled()) {
    try {
      console.info('🚀 Using Lambda Function URL streaming');
      yield* streamCoachCreatorSessionLambda(userId, sessionId, userResponse, imageS3Keys);
      return;
    } catch (lambdaError) {
      console.warn('⚠️ Lambda streaming failed, falling back to API Gateway:', lambdaError);
    }
  }

  // Fallback to API Gateway streaming
  console.info('🔄 Using API Gateway fallback');
  const url = `${getApiUrl('')}/users/${userId}/coach-creator-sessions/${sessionId}?stream=true`;

  // ... existing API Gateway code ...
}
```

---

## Testing Checklist

### Sequential Testing Approach

**Phase 1: Non-Streaming with Contexts**
- [ ] Update non-streaming handler
- [ ] Test Pinecone methodology queries
- [ ] Test memory detection (analyzeMemoryNeeds)
- [ ] Test memory retrieval when needed
- [ ] Verify contexts appear in prompts
- [ ] Verify graceful degradation if contexts fail
- [ ] Test with images + contexts

**Phase 2: Streaming with Contexts**
- [ ] Create streaming handler
- [ ] Test Lambda URL streaming with contexts
- [ ] Verify real-time token streaming
- [ ] Test with images + contexts
- [ ] Verify session completion triggers coach config

**Phase 3: Fallbacks**
- [ ] Test API Gateway fallback
- [ ] Test non-streaming fallback
- [ ] Verify all three tiers work

---

## Key Implementation Notes

### ✅ Confirmed Patterns

1. **Pinecone**: Use `queryPineconeContext()` with specific flags (not `queryPinecone()`)
2. **Memories**: Use `analyzeMemoryNeeds()` for smart detection, `queryMemories(userId, null, ...)` for retrieval
3. **Backend Outputs**: Structured format with `functionUrl` and `region`
4. **Context Limits**: 2000 chars each (methodologies + memories)
5. **Memory Saving**: V2 does NOT save memories (retrieval only)
6. **Environment Variables**: Already configured in `api-helpers.ts`

### ⚠️ Important Details

- Namespace is `methodology` (singular, not `methodologies`)
- Memory queries are NOT scoped to specific coach (pass `null`)
- Both context queries are non-blocking (graceful degradation)
- Memory detection uses lightweight AI (Haiku/Nova) before querying

---

## Estimated Effort: 27-38 hours

| Phase | Hours |
|-------|-------|
| Update non-streaming handler | 3-4 |
| Update buildQuestionPrompt | 1-2 |
| Create streaming handler | 5-7 |
| Configure backend | 2-3 |
| Update frontend | 2-3 |
| Backend testing | 4-5 |
| Frontend testing | 3-4 |
| Context quality testing | 2-3 |
| **TOTAL** | **27-38** |

---

## Success Criteria

- [ ] Non-streaming works with Pinecone + memory contexts
- [ ] Streaming works with Pinecone + memory contexts
- [ ] Lambda Function URL in `amplify_outputs.json`
- [ ] Frontend reads URL from outputs correctly
- [ ] Contexts demonstrably improve response quality
- [ ] Memory detection reduces unnecessary Pinecone queries
- [ ] Graceful degradation if contexts unavailable
- [ ] All three fallback tiers work
- [ ] Browser compatibility verified

**Ready to implement!** 🚀

