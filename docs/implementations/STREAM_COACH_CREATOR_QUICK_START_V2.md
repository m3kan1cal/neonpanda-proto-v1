# Stream Coach Creator Session - Quick Start Implementation Guide V2

> **Version 2 Updates**:
> - Added Pinecone queries (RAG context)
> - Added memory retrieval (not saving)
> - Backend outputs configuration for Lambda Function URL
> - Updated effort estimates

> **Goal**: Convert `update-coach-creator-session` to streaming using Lambda Function URL, with Pinecone and memory context retrieval.

## 🎯 TL;DR

Copy `stream-coach-conversation` pattern, simplify to single AI call, **ADD** Pinecone + memory retrieval for context.

**New Features**:
- ✅ Pinecone queries for methodology context
- ✅ Memory retrieval for user personalization
- ✅ Lambda Function URL in backend outputs
- ❌ No memory saving (retrieval only)
- ❌ No contextual updates (single AI call)
- ❌ No workout detection

**Estimated Time**: 27-38 hours total (17-26 hours core + 10-12 hours for contexts)

---

## 📋 Pre-Implementation Checklist

- [ ] Read `STREAM_COACH_CREATOR_SCOPING_V2.md` for full context
- [ ] Review `STREAM_COACH_CREATOR_CODE_COMPARISON.md` for patterns
- [ ] Have `stream-coach-conversation/handler.ts` open as reference
- [ ] Have `update-coach-creator-session/handler.ts` open as reference
- [ ] Have `libs/coach-conversation/memory-processing.ts` open for memory query pattern
- [ ] Have `libs/pinecone/query-helpers.ts` or equivalent for Pinecone pattern
- [ ] Ensure Pinecone environment variables configured
- [ ] Ensure local environment has streaming enabled in config

---

## 🚀 Step-by-Step Implementation

### Step 1: Update Non-Streaming Handler (3-4 hours)

**File**: `amplify/functions/update-coach-creator-session/handler.ts`

**Why First?**: Validate Pinecone + memory integration in simpler non-streaming context before adding streaming complexity.

**Actions**:

1. **Add imports**:
```typescript
import { queryPinecone } from '../libs/pinecone/query-helpers';
import { queryMemories } from '../libs/coach-conversation/memory-processing';
```

2. **Add context gathering** (after loading session, before building prompt):
```typescript
// Line ~70-90 area (after session load)
const session = await getCoachCreatorSession(userId, sessionId);
const userProfile = await getUserProfile(userId);
const currentQuestion = getCurrentQuestion(session.attributes.userContext);

// NEW: Query Pinecone for methodology context
let pineconeContext = '';
let pineconeMatches: any[] = [];

try {
  const searchQuery = `${userResponse} ${currentQuestion?.text || ''}`;
  const pineconeResults = await queryPinecone(
    searchQuery,
    'methodologies', // namespace
    5 // top 5 matches
  );

  pineconeMatches = pineconeResults.matches || [];
  if (pineconeMatches.length > 0) {
    pineconeContext = pineconeMatches
      .map((match: any) => match.metadata?.text || '')
      .filter(text => text.length > 0)
      .join('\n\n');

    console.info('📚 Pinecone context retrieved:', {
      matches: pineconeMatches.length,
      contextLength: pineconeContext.length
    });
  }
} catch (pineconeError) {
  console.warn('⚠️ Pinecone query failed (non-critical):', pineconeError);
  // Continue without Pinecone context
}

// NEW: Query user memories
let userMemories: any[] = [];
let memoryContext = '';

try {
  const messageContext = session.attributes.questionHistory
    .slice(-3)
    .map((item: any) => `Q: ${item.question}\nA: ${item.userResponse}`)
    .join('\n');

  const memoryResults = await queryMemories(
    userId,
    'coach-creator', // coachId for coach creator scope
    userResponse,
    messageContext
  );

  userMemories = memoryResults.memories || [];
  if (userMemories.length > 0) {
    memoryContext = userMemories
      .map((mem: any) => `- ${mem.memoryText}`)
      .filter(text => text.length > 0)
      .join('\n');

    console.info('🧠 User memories retrieved:', {
      count: userMemories.length,
      contextLength: memoryContext.length
    });
  }
} catch (memoryError) {
  console.warn('⚠️ Memory query failed (non-critical):', memoryError);
  // Continue without memories
}

// Build prompt with contexts
const questionPrompt = buildQuestionPrompt(
  currentQuestion,
  session.attributes.userContext,
  session.attributes.questionHistory,
  userProfile?.attributes?.criticalTrainingDirective,
  pineconeContext, // NEW
  memoryContext    // NEW
);
```

3. **Update streaming path too** (for API Gateway streaming):
In `handleCoachCreatorStreamingResponse` function, add same context gathering before building prompt.

**Validation**:
- [ ] Non-streaming works with contexts
- [ ] Contexts appear in logs
- [ ] Gracefully continues if Pinecone/memory fails

---

### Step 2: Update `buildQuestionPrompt` Helper (1-2 hours)

**File**: `amplify/functions/libs/coach-creator/question-management.ts`

**Actions**:

1. **Update function signature**:
```typescript
export function buildQuestionPrompt(
  currentQuestion: Question,
  userContext: UserContext,
  questionHistory: QuestionHistoryItem[],
  criticalTrainingDirective?: CriticalTrainingDirective,
  pineconeContext?: string,  // NEW
  memoryContext?: string     // NEW
): string {
  // ... implementation
}
```

2. **Update implementation**:
```typescript
export function buildQuestionPrompt(
  currentQuestion: Question,
  userContext: UserContext,
  questionHistory: QuestionHistoryItem[],
  criticalTrainingDirective?: CriticalTrainingDirective,
  pineconeContext?: string,
  memoryContext?: string
): string {
  let systemPrompt = `You are an expert AI fitness coach creator helping design a personalized AI coach for this user.

Your role is to:
- Ask thoughtful, adaptive questions about their fitness goals, experience, and preferences
- Detect their sophistication level (beginner, intermediate, advanced)
- Gather comprehensive information to create a highly personalized coach

Be conversational, empathetic, and adjust your language based on their responses.`;

  // Add recent Q&A history for context
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
    systemPrompt += `\nUse these memories to personalize your questions and understand their background. Reference specific details they've shared before to make the conversation more personal.`;
  }

  // NEW: Add Pinecone context if available
  if (pineconeContext && pineconeContext.trim()) {
    systemPrompt += `\n\nRelevant training knowledge and methodologies:\n${pineconeContext}\n`;
    systemPrompt += `\nUse this knowledge to inform your questions and help the user understand concepts. Don't directly quote this information, but use it to provide context and depth to your questions.`;
  }

  // Add sophistication level context
  if (userContext.sophisticationLevel && userContext.sophisticationLevel !== 'UNKNOWN') {
    systemPrompt += `\n\nDetected sophistication level: ${userContext.sophisticationLevel}`;
    systemPrompt += `\nAdjust your language and depth accordingly.`;
  }

  // Add critical training directive if present
  if (criticalTrainingDirective?.enabled && criticalTrainingDirective?.directive) {
    systemPrompt += `\n\n🚨 CRITICAL TRAINING DIRECTIVE: ${criticalTrainingDirective.directive}`;
    systemPrompt += `\nThis is a critical consideration that should influence your questions.`;
  }

  // Add current question
  systemPrompt += `\n\nCurrent question to address: ${currentQuestion.text}`;
  systemPrompt += `\n\nProvide a thoughtful response and naturally transition to the next relevant question.`;

  return systemPrompt;
}
```

**Validation**:
- [ ] Function compiles with new signature
- [ ] Prompt includes contexts when provided
- [ ] Prompt works without contexts (graceful)
- [ ] No type errors

---

### Step 3: Create Streaming Handler File (5-7 hours)

**File**: `amplify/functions/stream-coach-creator-session/handler.ts`

**Actions**:

1. **Copy base structure** from `stream-coach-conversation/handler.ts`

2. **Simplify to coach creator pattern** (remove smart router, contextual updates, workout detection)

3. **Add context gathering** in event generator:

```typescript
async function* createCoachCreatorEventStream(
  event: AuthenticatedLambdaFunctionURLEvent,
  context: Context
): AsyncGenerator<string, void, unknown> {
  yield formatStartEvent();
  console.info("📡 Yielded start event immediately");

  try {
    // Step 1: Validate parameters
    const params = await validateAndExtractParams(event);

    // Step 2: Load session data
    const sessionData = await loadSessionData(params.userId, params.sessionId);

    const currentQuestion = getCurrentQuestion(sessionData.session.attributes.userContext);
    if (!currentQuestion) {
      throw new Error('No current question found');
    }

    // Step 3: NEW - Query Pinecone for context
    let pineconeContext = '';
    let pineconeMatches: any[] = [];

    try {
      const searchQuery = `${params.userResponse} ${currentQuestion?.text || ''}`;
      console.info('🔍 Querying Pinecone for methodologies:', {
        query: searchQuery.substring(0, 100)
      });

      const pineconeResults = await queryPinecone(
        searchQuery,
        'methodologies',
        5
      );

      pineconeMatches = pineconeResults.matches || [];
      if (pineconeMatches.length > 0) {
        pineconeContext = pineconeMatches
          .map((match: any) => match.metadata?.text || '')
          .filter(text => text.length > 0)
          .join('\n\n');

        console.info('✅ Pinecone context retrieved:', {
          matches: pineconeMatches.length,
          contextLength: pineconeContext.length
        });
      } else {
        console.info('ℹ️ No Pinecone matches found');
      }
    } catch (pineconeError) {
      console.warn('⚠️ Pinecone query failed (non-critical):', pineconeError);
      // Continue without Pinecone context
    }

    // Step 4: NEW - Query user memories
    let userMemories: any[] = [];
    let memoryContext = '';

    try {
      const messageContext = sessionData.session.attributes.questionHistory
        .slice(-3)
        .map((item: any) => `Q: ${item.question}\nA: ${item.userResponse}`)
        .join('\n');

      console.info('🔍 Querying user memories');

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
          .filter(text => text.length > 0)
          .join('\n');

        console.info('✅ User memories retrieved:', {
          count: userMemories.length,
          contextLength: memoryContext.length
        });
      } else {
        console.info('ℹ️ No user memories found');
      }
    } catch (memoryError) {
      console.warn('⚠️ Memory query failed (non-critical):', memoryError);
      // Continue without memories
    }

    // Step 5: Build question prompt with contexts
    const questionPrompt = buildQuestionPrompt(
      currentQuestion,
      sessionData.session.attributes.userContext,
      sessionData.session.attributes.questionHistory,
      sessionData.userProfile?.attributes?.criticalTrainingDirective,
      pineconeContext,  // NEW
      memoryContext     // NEW
    );

    // Step 6: Stream AI response (single call)
    let fullAIResponse = '';

    try {
      console.info('🚀 Starting AI response streaming...');

      let responseStream: AsyncGenerator<string, void, unknown>;

      // Check if images are present
      if (params.imageS3Keys && params.imageS3Keys.length > 0) {
        console.info('🖼️ Processing with images:', {
          imageCount: params.imageS3Keys.length
        });

        const messages = [{
          id: `msg_${Date.now()}_user`,
          role: 'user' as const,
          content: params.userResponse || '',
          timestamp: new Date(params.messageTimestamp),
          messageType: 'text_with_images' as const,
          imageS3Keys: params.imageS3Keys,
        }];

        const converseMessages = await buildMultimodalContent(messages);
        responseStream = await callBedrockApiMultimodalStream(
          questionPrompt,
          converseMessages,
          MODEL_IDS.CLAUDE_SONNET_4_FULL
        );
      } else {
        responseStream = await callBedrockApiStream(
          questionPrompt,
          params.userResponse
        );
      }

      // Stream AI response chunks
      for await (const chunk of responseStream) {
        fullAIResponse += chunk;
        yield formatChunkEvent(chunk);
      }

      console.info('✅ AI response streaming completed:', {
        responseLength: fullAIResponse.length
      });
    } catch (aiError) {
      console.error('❌ Error in AI response generation:', aiError);
      fullAIResponse = "I apologize, but I'm having trouble generating a response right now. Your message has been saved and I'll be back to help you soon!";
    }

    // Step 7: Process response
    const processedResponse = await processSessionUpdate(
      params,
      fullAIResponse,
      sessionData,
      currentQuestion
    );

    // Step 8: Save and yield complete
    const completeEvent = await saveSessionAndYieldComplete(
      params,
      processedResponse,
      sessionData
    );
    yield completeEvent;

  } catch (error) {
    console.error('❌ Processing error:', error);
    const errorEvent = formatValidationErrorEvent(
      error instanceof Error ? error : new Error('Unknown error occurred')
    );
    yield errorEvent;
  }
}
```

**Validation**:
- [ ] Handler compiles without errors
- [ ] Context queries are non-blocking
- [ ] Single AI call with enriched context
- [ ] Proper error handling

---

### Step 4: Update Backend Configuration (2-3 hours)

**File**: `amplify/backend.ts`

**Critical**: Must add Lambda Function URL to outputs for frontend access!

**Actions**:

1. **Import new function**:
```typescript
import { streamCoachCreatorSession } from './functions/stream-coach-creator-session/resource';
```

2. **Add to backend definition** (add to functions list)

3. **Configure Lambda Function URL**:
```typescript
// Define Lambda Function URL with streaming support
const streamCoachCreatorSessionUrl = streamCoachCreatorSession.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  invokeMode: lambda.InvokeMode.RESPONSE_STREAM, // CRITICAL for streaming!
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.PUT, lambda.HttpMethod.OPTIONS],
    allowedHeaders: ['*'],
    maxAge: Duration.hours(1),
  },
});
```

4. **Grant permissions**:
```typescript
// DynamoDB access
dynamoDBTable.grantReadWriteData(streamCoachCreatorSession);

// Lambda invoke permission for async coach config generation
buildCoachConfig.grantInvoke(streamCoachCreatorSession);
```

5. **Set environment variables**:
```typescript
streamCoachCreatorSession.addEnvironment('DYNAMODB_TABLE', dynamoDBTable.tableName);
streamCoachCreatorSession.addEnvironment('PINECONE_API_KEY', process.env.PINECONE_API_KEY || '');
streamCoachCreatorSession.addEnvironment('PINECONE_INDEX_NAME', process.env.PINECONE_INDEX_NAME || '');
streamCoachCreatorSession.addEnvironment('PINECONE_ENVIRONMENT', process.env.PINECONE_ENVIRONMENT || '');
streamCoachCreatorSession.addEnvironment('BUILD_COACH_CONFIG_FUNCTION_NAME', buildCoachConfig.functionName);
// ... other env vars as needed
```

6. **CRITICAL: Add URL to backend outputs**:
```typescript
// Option 1: Using stack.addOutput (CDK native)
stack.addOutput('streamCoachCreatorSessionUrl', {
  value: streamCoachCreatorSessionUrl.url,
  description: 'Lambda Function URL for streaming coach creator sessions',
  exportName: `${stack.stackName}-StreamCoachCreatorSessionUrl`,
});

// Option 2: Using backend.addOutput (Amplify custom outputs)
backend.addOutput({
  custom: {
    streamCoachCreatorSessionUrl: streamCoachCreatorSessionUrl.url,
  }
});

// Use whichever pattern matches your existing code
// Both will make the URL available in amplify_outputs.json
```

**Validation**:
- [ ] Backend compiles without errors
- [ ] Function URL is created
- [ ] Environment variables are set
- [ ] IAM permissions granted
- [ ] **CRITICAL**: URL appears in `amplify_outputs.json` after deployment

---

### Step 5: Frontend - Update API Config (2-3 hours)

#### 5.1 Update apiConfig.js

**File**: `src/utils/apis/apiConfig.js`

**Actions**:

1. **Import amplify outputs**:
```javascript
import outputs from '../../../amplify_outputs.json';
```

2. **Update streaming config**:
```javascript
// Get streaming URLs from amplify outputs
export const STREAMING_CONFIG = {
  COACH_CONVERSATION_URL: outputs.custom?.streamCoachConversationUrl || null,
  COACH_CREATOR_SESSION_URL: outputs.custom?.streamCoachCreatorSessionUrl || null, // NEW
};

// Check if streaming is enabled (at least one URL available)
export const isStreamingEnabled = () => {
  return !!(
    STREAMING_CONFIG.COACH_CONVERSATION_URL ||
    STREAMING_CONFIG.COACH_CREATOR_SESSION_URL
  );
};
```

3. **Update getStreamingUrl function**:
```javascript
export const getStreamingUrl = (path) => {
  // Allow environment variable override for local development
  const baseUrl = process.env.REACT_APP_STREAMING_BASE_URL;
  if (baseUrl) {
    return `${baseUrl}/${path}`;
  }

  // Determine which streaming URL to use based on path
  if (path.includes('coach-creator-sessions')) {
    if (!STREAMING_CONFIG.COACH_CREATOR_SESSION_URL) {
      throw new Error('Coach creator streaming URL not configured');
    }
    // Lambda Function URL already includes the base path
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

#### 5.2 Add Lambda Streaming Function

**File**: `src/utils/apis/streamingLambdaApi.js`

**Actions**: Add new function (copy pattern from `sendCoachConversationMessageStreamLambda`):

```javascript
/**
 * Streams a coach creator session update using Lambda Function URL
 * @param {string} userId - The user ID
 * @param {string} sessionId - The session ID
 * @param {string} userResponse - The user's response
 * @param {string[]} imageS3Keys - Optional array of S3 keys for images
 * @returns {AsyncGenerator} - Stream of SSE events
 */
export async function* streamCoachCreatorSessionLambda(
  userId, sessionId, userResponse, imageS3Keys = []
) {
  if (!isStreamingEnabled()) {
    throw new Error('Lambda Function URL streaming is not enabled or configured');
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

    console.info('🚀 Streaming to Lambda Function URL:', {
      url: url.substring(0, 50) + '...',
      hasImages: imageS3Keys.length > 0
    });

    const response = await fetch(url, {
      method: 'PUT', // Update semantics
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Streaming failed: ${response.status} ${response.statusText}`);
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.info('✅ Stream completed');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            yield data;
          } catch (parseError) {
            console.warn('⚠️ Failed to parse SSE data:', line);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Lambda streaming error:', error);
    throw error;
  }
}
```

#### 5.3 Update Coach Creator API

**File**: `src/utils/apis/coachCreatorApi.js`

**Actions**: Update `updateCoachCreatorSessionStream` to use Lambda URL first:

```javascript
import { streamCoachCreatorSessionLambda } from './streamingLambdaApi';
import { isStreamingEnabled } from './apiConfig';

export async function* updateCoachCreatorSessionStream(
  userId, sessionId, userResponse, imageS3Keys = []
) {
  // Try Lambda Function URL first if enabled
  if (isStreamingEnabled()) {
    try {
      console.info('🚀 Attempting Lambda Function URL streaming');
      yield* streamCoachCreatorSessionLambda(userId, sessionId, userResponse, imageS3Keys);
      return; // Success - exit
    } catch (lambdaError) {
      console.warn('⚠️ Lambda Function URL streaming failed, falling back to API Gateway:', lambdaError);
      // Continue to API Gateway fallback
    }
  }

  // Fallback to API Gateway streaming (existing code)
  console.info('🔄 Using API Gateway fallback for coach creator streaming');
  const url = `${getApiUrl('')}/users/${userId}/coach-creator-sessions/${sessionId}?stream=true`;

  // ... existing API Gateway streaming code ...
  yield* handleStreamingApiRequest(url, requestBody, {
    method: 'PUT',
    fallbackFunction: updateCoachCreatorSession,
    fallbackParams: [userId, sessionId, userResponse, imageS3Keys],
    operationName: 'coach creator session update',
    errorMessages: {
      notFound: 'Session not found or expired',
      serviceUnavailable: 'Service temporarily unavailable - request took too long'
    }
  });
}
```

**Validation**:
- [ ] Frontend compiles without errors
- [ ] Streaming URL is imported from amplify outputs
- [ ] Fallback chain works (Lambda → API Gateway → non-streaming)
- [ ] No TypeScript/ESLint errors

---

## 🧪 Testing Checklist

### Backend Testing (4-5 hours)

#### Unit Tests - Context Retrieval
- [ ] Test Pinecone query with results
- [ ] Test Pinecone query with no results
- [ ] Test Pinecone query with error (should continue gracefully)
- [ ] Test memory retrieval with memories
- [ ] Test memory retrieval with no memories
- [ ] Test memory retrieval with error (should continue gracefully)
- [ ] Test prompt building with both contexts
- [ ] Test prompt building with one context
- [ ] Test prompt building with no contexts

#### Unit Tests - Streaming
- [ ] Test streaming handler with contexts
- [ ] Test streaming with images + contexts
- [ ] Test streaming without contexts (graceful)
- [ ] Test session update and save
- [ ] Test session completion trigger

#### Integration Tests
- [ ] Test Lambda URL end-to-end with contexts
- [ ] Verify Pinecone query in logs
- [ ] Verify memory query in logs
- [ ] Verify contexts in AI prompt
- [ ] Test API Gateway fallback with contexts
- [ ] Test non-streaming fallback

### Frontend Testing (3-4 hours)

#### Manual Testing - Lambda URL
```bash
# Enable streaming in browser console
localStorage.setItem('useStreamingLambdaUrls', 'true');
```

- [ ] Start new coach creator session
- [ ] Provide response that should match Pinecone methodologies (e.g., "I do CrossFit")
- [ ] Check Network tab: Should hit Lambda Function URL
- [ ] Observe streaming in real-time
- [ ] Check AI response: Should reference relevant methodologies
- [ ] Provide response about preferences (should be saved as memory later in coaching)
- [ ] Complete session and verify coach config generation

#### Manual Testing - Fallbacks
- [ ] Test API Gateway fallback (disable Lambda URL)
- [ ] Test non-streaming fallback (simulate timeout)
- [ ] Test with images + contexts
- [ ] Test error scenarios (invalid session, network error)

#### Context Quality Testing
- [ ] Verify AI responses use Pinecone methodology context appropriately
- [ ] Verify AI responses reference user memories when relevant
- [ ] Verify contexts improve personalization without being obvious
- [ ] Test with user who has many memories vs few memories
- [ ] Test with various Pinecone matches (high relevance vs low relevance)

### Verification Checklist

- [ ] **amplify_outputs.json contains new URL**:
  ```json
  {
    "custom": {
      "streamCoachConversationUrl": "https://xxx.lambda-url...",
      "streamCoachCreatorSessionUrl": "https://yyy.lambda-url..."
    }
  }
  ```
- [ ] CloudWatch logs show Pinecone queries
- [ ] CloudWatch logs show memory queries
- [ ] Contexts appear in prompt (check logs)
- [ ] No errors when contexts unavailable
- [ ] Streaming works smoothly
- [ ] Fallbacks work correctly

---

## 🔍 Common Issues & Solutions

### Issue: Backend outputs not in amplify_outputs.json
**Symptoms**: Frontend can't find streaming URL

**Solution**: Check `backend.ts` configuration:
```typescript
// Make sure you're using ONE of these patterns:

// Pattern 1: Stack outputs
stack.addOutput('streamCoachCreatorSessionUrl', {
  value: streamCoachCreatorSessionUrl.url,
  description: 'Lambda Function URL for streaming',
});

// Pattern 2: Backend custom outputs
backend.addOutput({
  custom: {
    streamCoachCreatorSessionUrl: streamCoachCreatorSessionUrl.url,
  }
});
```

Then redeploy and verify the URL appears in `amplify_outputs.json`.

### Issue: Pinecone queries failing
**Symptoms**: Warning logs about Pinecone failures

**Solutions**:
1. Check environment variables are set:
   - `PINECONE_API_KEY`
   - `PINECONE_INDEX_NAME`
   - `PINECONE_ENVIRONMENT`
2. Verify Pinecone index has `methodologies` namespace
3. Check IAM permissions allow Bedrock embedding calls (if using Bedrock for embeddings)
4. Verify query helper function signature matches

### Issue: Memory queries failing
**Symptoms**: Warning logs about memory failures

**Solutions**:
1. Check DynamoDB table permissions
2. Verify user has memories in the system
3. Check `coach-creator` coachId is valid
4. Verify query function parameters are correct

### Issue: Contexts not improving responses
**Symptoms**: AI responses don't reference contexts

**Solutions**:
1. Check context is actually being retrieved (logs should show matches)
2. Verify context is being passed to prompt builder
3. Check prompt builder is including contexts in system prompt
4. Increase context size (more matches) if too sparse
5. Improve prompt instructions to use contexts more explicitly

### Issue: Token limit exceeded
**Symptoms**: AI errors about token limits

**Solutions**:
1. Reduce number of Pinecone matches (5 → 3)
2. Reduce number of memories retrieved (5 → 3)
3. Trim context text to max characters (~2000 per context)
4. Reduce question history size (3 → 2)

---

## 📊 Updated Effort Estimate

| Phase | Task | Hours |
|-------|------|-------|
| **Phase 1** | Update non-streaming handler with contexts | 3-4 |
| **Phase 2** | Update buildQuestionPrompt helper | 1-2 |
| **Phase 3** | Create streaming handler with contexts | 5-7 |
| **Phase 4** | Update backend config + outputs | 2-3 |
| **Phase 5** | Update frontend API layer | 2-3 |
| **Phase 6** | Backend testing | 4-5 |
| **Phase 7** | Frontend testing | 3-4 |
| **Phase 8** | Context quality testing | 2-3 |
| **TOTAL** | | **27-38 hours** |

**Breakdown**:
- Core streaming implementation: 17-26 hours (from V1)
- Pinecone + memory integration: 10-12 hours

---

## ✅ Definition of Done

### Functional Requirements
- [ ] Non-streaming handler retrieves Pinecone + memory contexts
- [ ] Streaming handler retrieves Pinecone + memory contexts
- [ ] Contexts are optional (graceful degradation if unavailable)
- [ ] Lambda Function URL streaming works
- [ ] Fallback to API Gateway works
- [ ] Fallback to non-streaming works
- [ ] Lambda Function URL in `amplify_outputs.json`
- [ ] Frontend uses Lambda URL from outputs
- [ ] Session updates correctly with contexts
- [ ] Image support works with contexts
- [ ] Session completion triggers coach config generation

### Quality Requirements
- [ ] Contexts demonstrably improve response quality
- [ ] AI references relevant methodologies when appropriate
- [ ] AI references user memories when appropriate
- [ ] No errors when contexts unavailable
- [ ] First token latency < 1.5 seconds (with context queries)
- [ ] All tests pass
- [ ] No linting errors
- [ ] Browser compatibility verified

### Documentation Requirements
- [ ] Code comments explain context retrieval
- [ ] Logs clearly show context usage
- [ ] Error handling documented
- [ ] Backend outputs configuration documented

---

## 🎯 Key Takeaways

1. **Contexts are Optional**: Pinecone and memory queries should NEVER fail the request. Wrap in try-catch and continue without contexts if they fail.

2. **Backend Outputs are Critical**: The Lambda Function URL MUST be in `amplify_outputs.json` for the frontend to access it. Use `stack.addOutput()` or `backend.addOutput()`.

3. **Test Non-Streaming First**: Validate Pinecone + memory integration in the simpler non-streaming handler before adding streaming complexity.

4. **Context Size Limits**: Keep contexts reasonably sized (5 matches, ~2000 chars each) to avoid token limits.

5. **Graceful Degradation**: The system should work perfectly fine with zero contexts, and get progressively better as contexts are available.

---

**Remember**: This is still fundamentally a **simplification** of the coach conversation pattern, just with added context retrieval. The single AI call structure remains the same - we're just enriching the prompt with more relevant information. 🚀

