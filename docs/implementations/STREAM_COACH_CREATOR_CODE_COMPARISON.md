# Stream Coach Creator - Code Pattern Comparison

This document provides side-by-side code comparisons to guide implementation of `stream-coach-creator-session` based on the proven `stream-coach-conversation` pattern.

---

## Handler Structure Comparison

### Main Handler Pattern

#### stream-coach-conversation/handler.ts
```typescript
// Existing Pattern
const streamingHandler: StreamingHandler = async (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context
) => {
  const eventGenerator = createCoachConversationEventStream(event, context);
  const sseEventStream = Readable.from(eventGenerator);
  await pipeline(sseEventStream, responseStream);
};
```

#### stream-coach-creator-session/handler.ts (NEW)
```typescript
// New Pattern (identical structure)
const streamingHandler: StreamingHandler = async (
  event: AuthenticatedLambdaFunctionURLEvent,
  responseStream: any,
  context: Context
) => {
  const eventGenerator = createCoachCreatorEventStream(event, context);
  const sseEventStream = Readable.from(eventGenerator);
  await pipeline(sseEventStream, responseStream);
};
```

---

## Route Pattern Configuration

### Streaming Routes Constant

#### Current (stream-coach-conversation)
```typescript
// amplify/functions/libs/streaming/constants.ts
export const STREAMING_ROUTE_PATTERNS = {
  COACH_CONVERSATION: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}/stream',
};

const COACH_CONVERSATION_ROUTE = STREAMING_ROUTE_PATTERNS.COACH_CONVERSATION;
```

#### Updated (add coach creator)
```typescript
// amplify/functions/libs/streaming/constants.ts
export const STREAMING_ROUTE_PATTERNS = {
  COACH_CONVERSATION: '/users/{userId}/coaches/{coachId}/conversations/{conversationId}/stream',
  COACH_CREATOR_SESSION: '/users/{userId}/coach-creator-sessions/{sessionId}/stream', // NEW
};

const COACH_CREATOR_ROUTE = STREAMING_ROUTE_PATTERNS.COACH_CREATOR_SESSION;
```

---

## Parameter Validation

### Coach Conversation (Complex)
```typescript
async function validateAndExtractParams(event: AuthenticatedLambdaFunctionURLEvent) {
  const pathParams = extractPathParameters(event.rawPath, COACH_CONVERSATION_ROUTE);
  const { userId, coachId, conversationId } = pathParams;

  const validation = validateRequiredPathParams(pathParams, [
    "userId", "coachId", "conversationId"
  ]);

  // Parse body
  const body = JSON.parse(event.body);
  const { userResponse, messageTimestamp, imageS3Keys } = body;

  // Validations...

  return {
    userId, coachId, conversationId,
    userResponse, messageTimestamp, imageS3Keys
  };
}
```

### Coach Creator (Simpler - fewer parameters)
```typescript
async function validateAndExtractParams(event: AuthenticatedLambdaFunctionURLEvent) {
  const pathParams = extractPathParameters(event.rawPath, COACH_CREATOR_ROUTE);
  const { userId, sessionId } = pathParams; // Only 2 parameters vs 3

  const validation = validateRequiredPathParams(pathParams, [
    "userId", "sessionId" // Simpler validation
  ]);

  // Parse body (same structure)
  const body = JSON.parse(event.body);
  const { userResponse, messageTimestamp, imageS3Keys } = body;

  // Same validations as coach conversation...

  return {
    userId, sessionId, // Simpler params
    userResponse, messageTimestamp, imageS3Keys
  };
}
```

---

## Data Loading

### Coach Conversation (Complex - Multiple Sources)
```typescript
async function loadConversationData(
  userId: string,
  coachId: string,
  conversationId: string,
  userResponse: string,
  shouldQueryPinecone?: boolean,
  userProfile?: any
): Promise<ConversationData> {
  // 1. Load conversation
  const existingConversation = await getCoachConversation(userId, coachId, conversationId);

  // 2. Load coach config
  const coachConfig = await getCoachConfig(userId, coachId);

  // 3. Load or reuse user profile
  const profile = userProfile || await getUserProfile(userId);

  // 4. Gather complex context (workouts + Pinecone)
  const context = await gatherConversationContext(userId, userResponse, shouldQueryPinecone);

  return { existingConversation, coachConfig, context, userProfile: profile };
}
```

### Coach Creator (Simple - Single Source)
```typescript
async function loadSessionData(
  userId: string,
  sessionId: string
): Promise<SessionData> {
  // 1. Load session (contains all needed data)
  const session = await getCoachCreatorSession(userId, sessionId);
  if (!session) {
    throw new Error('Session not found or expired');
  }

  // 2. Load user profile for critical training directive (optional)
  const userProfile = await getUserProfile(userId);

  // No complex context gathering needed - just session history
  return { session, userProfile };
}
```

---

## Event Stream Generator

### Coach Conversation (Complex with Contextual Updates)
```typescript
async function* createCoachConversationEventStream(event, context) {
  yield formatStartEvent();

  const params = await validateAndExtractParams(event);
  const userProfile = await getUserProfile(params.userId);

  // SMART ROUTER - Single AI call to determine processing needs
  const routerAnalysis = await analyzeRequestCapabilities(
    params.userResponse,
    undefined,
    0,
    userTimezone,
    criticalTrainingDirective
  );

  const conversationData = await loadConversationData(...);

  // Contextual Update 1: Initial acknowledgment
  if (routerAnalysis.showContextualUpdates) {
    const acknowledgment = await generateContextualUpdate(...);
    yield formatChunkEvent(acknowledgment + '\n\n');
  }

  // Contextual Update 2: Workout analysis
  if (routerAnalysis.workoutDetection.isWorkoutLog) {
    const workoutUpdate = await generateContextualUpdate(...);
    yield formatChunkEvent(workoutUpdate + '\n\n');
    workoutResult = await processWorkoutDetection(...);
  }

  // Contextual Update 3: Memory processing
  if (routerAnalysis.memoryProcessing.needsRetrieval) {
    const memoryUpdate = await generateContextualUpdate(...);
    yield formatChunkEvent(memoryUpdate + '\n\n');
    memoryResult = await processMemory(...);
  }

  // Contextual Update 4: Pattern analysis
  const patternUpdate = await generateContextualUpdate(...);
  yield formatChunkEvent(patternUpdate + '\n\n');

  // Main AI Response Stream
  const streamResult = await generateAIResponseStream(...);
  for await (const chunk of optimizedChunkStream) {
    fullAIResponse += chunk;
    yield formatChunkEvent(chunk);
  }

  // Save and complete
  const completeEvent = await saveConversationAndYieldComplete(...);
  yield completeEvent;
}
```

### Coach Creator (Simple - Linear Flow)
```typescript
async function* createCoachCreatorEventStream(event, context) {
  yield formatStartEvent();

  const params = await validateAndExtractParams(event);

  // Load session (simple)
  const sessionData = await loadSessionData(params.userId, params.sessionId);

  // Get current question
  const currentQuestion = getCurrentQuestion(sessionData.session.attributes.userContext);
  if (!currentQuestion) {
    throw new Error('No current question found');
  }

  // Build question prompt (simple)
  const userProfile = await getUserProfile(params.userId);
  const questionPrompt = buildQuestionPrompt(
    currentQuestion,
    sessionData.session.attributes.userContext,
    sessionData.session.attributes.questionHistory,
    userProfile?.attributes?.criticalTrainingDirective
  );

  // Single AI Response Stream (no contextual updates needed)
  let fullAIResponse = '';
  const streamResult = await generateAIResponseStream(questionPrompt, params);

  for await (const chunk of streamResult) {
    fullAIResponse += chunk;
    yield formatChunkEvent(chunk);
  }

  // Process response (sophistication detection, progress tracking)
  const processedResponse = await processSessionUpdate(
    params,
    fullAIResponse,
    sessionData,
    currentQuestion
  );

  // Save and complete
  const completeEvent = await saveSessionAndYieldComplete(
    params,
    processedResponse,
    sessionData
  );
  yield completeEvent;
}
```

**Key Differences**:
- Coach Conversation: Multiple AI calls (router + contextual updates + main response)
- Coach Creator: Single AI call (just the question response)
- Coach Conversation: 4-5 contextual update stages
- Coach Creator: Single streaming response (no intermediate updates)

---

## AI Response Generation

### Coach Conversation (Multimodal + Complex Context)
```typescript
const streamResult = await generateAIResponseStream(
  coachConfig,              // Complex system prompt
  conversationContext,      // Workouts + Pinecone + recent messages
  workoutResult,            // Workout detection results
  memoryRetrieval,          // Memory query results
  params.userResponse,
  existingMessages,
  conversationContext,
  params.userId,
  params.coachId,
  params.conversationId,
  userProfile,
  params.imageS3Keys
);
```

### Coach Creator (Simpler - Question/Answer)
```typescript
// Check if images are present
if (params.imageS3Keys && params.imageS3Keys.length > 0) {
  // Build multimodal content
  const messages = [{
    id: `msg_${Date.now()}_user`,
    role: 'user',
    content: params.userResponse || '',
    timestamp: new Date(params.messageTimestamp),
    messageType: 'text_with_images',
    imageS3Keys: params.imageS3Keys,
  }];

  const converseMessages = await buildMultimodalContent(messages);
  responseStream = await callBedrockApiMultimodalStream(
    questionPrompt,
    converseMessages,
    MODEL_IDS.CLAUDE_SONNET_4_FULL
  );
} else {
  // Simple text streaming
  responseStream = await callBedrockApiStream(
    questionPrompt,
    params.userResponse
  );
}
```

---

## Post-Processing

### Coach Conversation (Complex State Management)
```typescript
async function saveConversationAndYieldComplete(results, params, conversationData, routerAnalysis) {
  const { newUserMessage, newAiMessage } = results;

  // Save messages
  const saveResult = await sendCoachConversationMessage(
    params.userId,
    params.coachId,
    params.conversationId,
    [newUserMessage, newAiMessage]
  );

  // Trigger async conversation summary if enabled
  if (FEATURE_FLAGS.ENABLE_CONVERSATION_SUMMARY) {
    const updatedConversation = await getCoachConversation(...);
    await detectAndProcessConversationSummary(...);
  }

  // Return complex completion event with Pinecone context
  return formatCompleteEvent({
    messageId: newAiMessage.id,
    userMessage: newUserMessage,
    aiMessage: newAiMessage,
    conversationId: params.conversationId,
    pineconeContext: { ... },
    conversationSize: { ... }
  });
}
```

### Coach Creator (Simple Session Update)
```typescript
async function saveSessionAndYieldComplete(params, processedResponse, sessionData) {
  const { cleanedResponse, detectedLevel, isComplete, progressDetails } = processedResponse;

  // Update session attributes
  sessionData.session.attributes.userContext = storeUserResponse(
    sessionData.session.attributes.userContext,
    currentQuestion,
    params.userResponse
  );

  addQuestionHistory(
    sessionData.session.attributes,
    currentQuestion,
    params.userResponse,
    cleanedResponse,
    detectedLevel,
    params.imageS3Keys
  );

  // Update session context
  const nextQuestion = getNextQuestion(sessionData.session.attributes.userContext);
  const isOnFinalQuestion = nextQuestion === null;

  sessionData.session.attributes.userContext = updateSessionContext(
    sessionData.session.attributes.userContext,
    detectedLevel,
    detectedSignals,
    isOnFinalQuestion
  );

  if (isComplete) {
    markSessionComplete(sessionData.session.attributes);
  }

  // Save session
  await saveCoachCreatorSession(sessionData.session.attributes);

  // Trigger async coach config generation if complete
  if (isComplete) {
    const buildCoachConfigFunction = process.env.BUILD_COACH_CONFIG_FUNCTION_NAME;
    await invokeAsyncLambda(buildCoachConfigFunction, {
      userId: params.userId,
      sessionId: params.sessionId
    }, 'coach config generation');
  }

  // Return simple completion event
  return formatCompleteEvent({
    type: 'complete',
    fullMessage: cleanedResponse,
    aiResponse: cleanedResponse,
    isComplete,
    sessionId: params.sessionId,
    progressDetails,
    nextQuestion: nextQuestion?.versions[sophisticationLevel] || null,
    coachConfigGenerating: isComplete,
    onFinalQuestion: isOnFinalQuestion && !isComplete
  });
}
```

---

## Frontend API Layer

### streamingLambdaApi.js

#### Coach Conversation (Existing)
```javascript
export async function* sendCoachConversationMessageStreamLambda(
  userId, coachId, conversationId, userResponse, imageS3Keys = []
) {
  const path = `users/${userId}/coaches/${coachId}/conversations/${conversationId}/stream`;
  const url = getStreamingUrl(path);

  const requestBody = {
    userResponse,
    messageTimestamp: new Date().toISOString()
  };

  if (imageS3Keys && imageS3Keys.length > 0) {
    requestBody.imageS3Keys = imageS3Keys;
  }

  const response = await fetch(url, {
    method: 'POST', // Creating a message
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(requestBody),
  });

  // ... SSE parsing logic ...
}
```

#### Coach Creator (NEW - Nearly Identical)
```javascript
export async function* streamCoachCreatorSessionLambda(
  userId, sessionId, userResponse, imageS3Keys = []
) {
  const path = `users/${userId}/coach-creator-sessions/${sessionId}/stream`;
  const url = getStreamingUrl(path);

  const requestBody = {
    userResponse,
    messageTimestamp: new Date().toISOString()
  };

  if (imageS3Keys && imageS3Keys.length > 0) {
    requestBody.imageS3Keys = imageS3Keys;
  }

  const response = await fetch(url, {
    method: 'PUT', // Updating a session (RESTful semantics)
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(requestBody),
  });

  // ... same SSE parsing logic ...
}
```

**Only Differences**:
1. Path: `conversations/{id}/stream` → `coach-creator-sessions/{id}/stream`
2. Method: `POST` → `PUT` (RESTful semantics for update vs create)
3. Parameters: 3 path params → 2 path params

---

## Agent Integration

### CoachConversationAgent.js
```javascript
async sendMessageStream(messageContent, imageS3Keys = []) {
  try {
    let messageStream;

    if (isStreamingEnabled()) {
      try {
        // Try Lambda Function URL first
        messageStream = sendCoachConversationMessageStreamLambda(
          this.userId,
          this.coachId,
          this.conversationId,
          messageContent.trim(),
          imageS3Keys
        );
      } catch (lambdaError) {
        // Fallback to API Gateway
        messageStream = sendCoachConversationMessageStream(...);
      }
    } else {
      // Direct to API Gateway
      messageStream = sendCoachConversationMessageStream(...);
    }

    // Process stream...
  } catch (error) {
    // Fallback to non-streaming
    await handleStreamingFallback(...);
  }
}
```

### CoachCreatorAgent.js (Already has streaming pattern!)
```javascript
async sendMessageStream(messageContent, imageS3Keys = []) {
  try {
    // Get streaming response
    // This will now use Lambda URL first, then API Gateway fallback
    const messageStream = updateCoachCreatorSessionStream(
      this.userId,
      this.sessionId,
      messageContent.trim(),
      imageS3Keys
    );

    // Process the stream (existing code works perfectly)
    return await processStreamingChunks(messageStream, {
      onChunk: async (content) => { ... },
      onComplete: async (chunk) => { ... },
      onFallback: async (data) => { ... },
      onError: async (errorMessage) => { ... }
    });
  } catch (streamError) {
    // Fallback to non-streaming
    return await handleStreamingFallback(...);
  }
}
```

**Note**: CoachCreatorAgent already has excellent streaming support! The only change needed is in `coachCreatorApi.js` to use Lambda URL first.

---

## Backend Configuration

### backend.ts

#### Coach Conversation (Existing)
```typescript
// Define Lambda Function URL
const streamCoachConversationUrl = streamCoachConversation.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  invokeMode: lambda.InvokeMode.RESPONSE_STREAM, // Critical!
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.POST, lambda.HttpMethod.OPTIONS],
    allowedHeaders: ['*'],
    maxAge: Duration.hours(1),
  },
});

// Add to custom outputs
streamCoachConversationUrl: streamCoachConversationUrl.url,
```

#### Coach Creator (NEW - Copy Pattern)
```typescript
// Define Lambda Function URL (same pattern)
const streamCoachCreatorSessionUrl = streamCoachCreatorSession.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  invokeMode: lambda.InvokeMode.RESPONSE_STREAM, // Same!
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.PUT, lambda.HttpMethod.OPTIONS], // PUT instead of POST
    allowedHeaders: ['*'],
    maxAge: Duration.hours(1),
  },
});

// Add to custom outputs
streamCoachCreatorSessionUrl: streamCoachCreatorSessionUrl.url,
```

---

## Complete Diff Summary

### What Stays the Same
✅ Streaming infrastructure (`libs/streaming/`)
✅ Auth middleware (`withStreamingAuth`)
✅ Event format (SSE: start, chunk, complete)
✅ Frontend streaming helpers (`streamingAgentHelper.js`)
✅ Error handling and fallback patterns
✅ Image support (multimodal)

### What Changes
🔧 Route path (3 params → 2 params)
🔧 HTTP method (POST → PUT)
🔧 Business logic (complex → simple)
🔧 No smart router
🔧 No contextual updates
🔧 No Pinecone queries
🔧 No memory processing
🔧 Simpler progress tracking

### Lines of Code Estimate
- `stream-coach-conversation/handler.ts`: ~800 lines
- `stream-coach-creator-session/handler.ts`: **~400-500 lines** (simpler!)

---

## Implementation Checklist with Code References

### Backend
- [ ] Copy `stream-coach-conversation/handler.ts` → `stream-coach-creator-session/handler.ts`
- [ ] Remove smart router logic (lines 320-370 in conversation)
- [ ] Remove contextual updates (lines 372-527 in conversation)
- [ ] Simplify to single AI stream
- [ ] Update validation (3 params → 2 params)
- [ ] Update data loading (conversation → session)
- [ ] Update post-processing (conversation save → session save)
- [ ] Copy `stream-coach-conversation/resource.ts` → `stream-coach-creator-session/resource.ts`
- [ ] Update backend.ts configuration (add new Lambda URL)
- [ ] Add route pattern to streaming constants

### Frontend
- [ ] Add `streamCoachCreatorSessionLambda` to `streamingLambdaApi.js` (copy pattern)
- [ ] Update `coachCreatorApi.js` to use Lambda URL first
- [ ] Verify `CoachCreatorAgent.js` works (already has streaming!)
- [ ] Test fallback paths

### Testing
- [ ] Test Lambda URL streaming
- [ ] Test API Gateway fallback
- [ ] Test non-streaming fallback
- [ ] Test with images
- [ ] Test session completion
- [ ] Test progress tracking

---

## Key Insight

The coach creator streaming implementation is essentially **stream-coach-conversation MINUS the complex features**:

```
stream-coach-creator-session =
  stream-coach-conversation
  - smart router
  - contextual updates
  - Pinecone queries
  - memory processing
  - workout detection
  + simpler session management
```

This makes it a **straightforward extraction** rather than a new implementation.

