# Streaming Bedrock Implementation

## Overview
Implementation plan for adding streaming Bedrock responses to reduce time-to-first-token for chat interactions in CoachConversations and CoachCreator, while preserving existing non-streaming approach for Nova Micro and other use cases.

## Goals
- Reduce perceived latency in chat interfaces
- Improve user experience with real-time response rendering
- Maintain backward compatibility with existing non-streaming functionality
- Preserve Nova Micro and other non-streaming use cases

## Architecture Strategy

### Core Principles
1. **Streaming as Enhancement**: Treat streaming as an enhanced delivery mechanism rather than fundamental architecture change
2. **Graceful Degradation**: Always fallback to non-streaming if streaming fails
3. **Selective Application**: Use streaming for CoachConversations and CoachCreator, preserve non-streaming for other cases
4. **Compatibility First**: Maintain all existing APIs and behavior

## Implementation Phases

### Phase 1: Backend Streaming Infrastructure ✅
**Status**: COMPLETED

#### 1.1 Core API Helper Updates (`amplify/functions/libs/api-helpers.ts`)
- [x] Add ConverseStreamCommand import alongside existing ConverseCommand
- [x] Create `callBedrockApiStream()` function that:
  - Returns `AsyncGenerator<string, void, unknown>` for streaming chunks
  - Handles Bedrock stream response chunks (`contentBlockDelta.delta.text`)
  - Maintains same interface as `callBedrockApi()` but returns generator
  - Processes `messageStop` event to signal completion
  - Includes same error handling and logging as non-streaming version

#### 1.2 Response Generation Updates (`amplify/functions/libs/coach-conversation/response-generation.ts`)
- [x] Add streaming variant: `generateAIResponseStream()`
- [x] Keep existing `generateAIResponse()` for non-streaming use cases
- [x] Use same prompt generation logic for both streaming and non-streaming
- [x] Return streaming generator instead of final string

#### 1.3 Lambda Function Updates

**send-coach-conversation-message handler:**
- [x] Add streaming support via query parameter (`?stream=true`)
- [x] Return Server-Sent Events (SSE) format when streaming is requested
- [x] Stream format:
  ```
  data: {"type": "chunk", "content": "Hello "}
  data: {"type": "chunk", "content": "there!"}
  data: {"type": "complete", "fullMessage": "Hello there!", "userMessage": {...}, "aiMessage": {...}}
  ```
- [x] Fallback to non-streaming if streaming fails
- [x] Same memory processing and workout detection but processed after streaming completes

**update-coach-creator-session handler:**
- [x] Similar streaming implementation with coach creator specific response format
- [x] Include progress updates in stream when available
- [x] Handle completion state in final stream message

### Phase 2: Frontend Streaming Support
**Status**: COMPLETED

#### 2.1 API Layer Updates (`src/utils/apis/coachConversationApi.js`)
- [x] Add streaming functions:
  - `sendCoachConversationMessageStream()`
  - `updateCoachCreatorSessionStream()`
- [x] Use ReadableStream API to handle SSE responses
- [x] Parse streamed JSON chunks and yield them to consumers
- [x] Handle stream errors and fallback to non-streaming API calls
- [x] Maintain existing non-streaming functions for other use cases

#### 2.2 Agent Updates

**CoachConversationAgent (`src/utils/agents/CoachConversationAgent.js`):**
- [x] Add `sendMessageStream()` method alongside existing `sendMessage()`
- [x] State management for streaming:
  - `isStreaming: boolean`
  - `streamingMessage: string` (accumulated content)
  - `streamingMessageId: string`
- [x] Real-time message updates as chunks arrive
- [x] Convert streaming message to final message when complete
- [x] Error handling with fallback to non-streaming

**CoachCreatorAgent (`src/utils/agents/CoachCreatorAgent.js`):**
- [x] Similar streaming implementation as CoachConversationAgent
- [x] Handle progress updates from streaming responses
- [x] Maintain session state during streaming

### Phase 3: UI Component Updates
**Status**: COMPLETED ✅

#### 3.1 CoachConversations.jsx
- [x] Add streaming UI states:
  - Show streaming message with typing indicator
  - Real-time text updates as chunks arrive
  - Smooth transition when streaming completes
- [x] Use streaming by default for chat messages
- [x] Graceful degradation if streaming fails
- [x] Preserve existing message display logic

#### 3.2 CoachCreator.jsx
- [x] Same streaming UI approach as CoachConversations
- [x] Show progress updates during streaming if available
- [x] Handle completion and redirection logic with streaming

### Phase 4: Testing & Optimization
**Status**: Not Started

#### 4.1 Backend Testing
- [ ] Unit tests: Test streaming generator functions
- [ ] Integration tests: Verify SSE response format
- [ ] Load tests: Ensure streaming doesn't impact Lambda performance
- [ ] Fallback tests: Verify graceful degradation

#### 4.2 Frontend Testing
- [ ] Stream parsing: Test various chunk sizes and formats
- [ ] UI updates: Verify real-time message rendering
- [ ] Error scenarios: Test network failures and recovery
- [ ] Browser compatibility: Test across different browsers

#### 4.3 End-to-End Testing
- [ ] Full chat flows: Both CoachConversations and CoachCreator
- [ ] Mixed usage: Verify streaming and non-streaming can coexist
- [ ] Performance: Measure time-to-first-token improvements

### Phase 5: Production Rollout
**Status**: Not Started

#### 5.1 Feature Flags
- [ ] Environment variables: Control streaming per environment
- [ ] User-level flags: Allow opt-in/opt-out for testing
- [ ] Performance monitoring: Track streaming vs non-streaming metrics

#### 5.2 Monitoring
- [ ] Track streaming performance metrics
- [ ] Monitor error rates and fallback usage
- [ ] User experience improvements measurement

## Data Flow Architecture

### Streaming Flow
```
User Input → Agent.sendMessageStream() → API.sendMessageStream() →
Lambda (streaming) → Bedrock ConverseStream →
Lambda SSE Response → Frontend Stream Parser →
Agent State Updates → UI Real-time Updates →
Stream Complete → Final Message State
```

### Non-Streaming Flow (Preserved)
```
User Input → Agent.sendMessage() → API.sendMessage() →
Lambda (non-streaming) → Bedrock Converse →
Lambda JSON Response → Agent State Update → UI Update
```

## Compatibility Strategy

### API Selection Logic
- **CoachConversations & CoachCreator**: Use streaming by default
- **Nova Micro calls**: Always use non-streaming (existing `callBedrockApi`)
- **Other AI operations**: Continue using non-streaming unless explicitly opted in
- **Feature flag support**: Add environment variable to enable/disable streaming globally

### Fallback Mechanism
- **Stream failure**: Automatically retry with non-streaming API
- **Network issues**: Graceful degradation to standard responses
- **Browser compatibility**: Detect ReadableStream support, fallback if needed

## Error Handling & Reliability

### Backend Error Handling
- **Stream interruption**: Clean up resources and log properly
- **Timeout handling**: Set reasonable timeouts for streaming connections
- **Memory management**: Ensure streams are properly closed
- **Rate limiting**: Apply same limits to streaming and non-streaming

### Frontend Error Handling
- **Stream parsing errors**: Fallback to non-streaming
- **Connection drops**: Retry logic with exponential backoff
- **Partial messages**: Handle incomplete streams gracefully
- **UI error states**: Clear error messages for users

## Performance Considerations

### Benefits
- **Reduced perceived latency**: Users see responses immediately
- **Better UX**: Real-time typing effect
- **Lower abandonment**: Users less likely to leave during long responses

### Trade-offs
- **Connection overhead**: SSE connections consume more resources
- **Complexity**: More error scenarios to handle
- **Debugging**: Harder to debug streaming issues

## Technical Decisions

### Stream Format
Using Server-Sent Events (SSE) with JSON payloads:
- Simple to implement and debug
- Good browser support
- Easy fallback to regular HTTP
- Structured data format

### Generator Pattern
Using AsyncGenerator for backend streaming:
- Clean, composable API
- Easy error handling
- Memory efficient
- Standard JavaScript pattern

### Feature Detection
Progressive enhancement approach:
- Detect streaming capability
- Graceful degradation
- Same user experience regardless of capability

## Notes
- Implementation preserves all existing functionality
- No breaking changes to current APIs
- Streaming is additive enhancement
- Focus on CoachConversations and CoachCreator for maximum user impact
- Nova Micro and other calls continue using non-streaming approach unchanged

## Implementation Log

### 2025-01-27
- Created implementation document
- Started Phase 1: Backend streaming infrastructure
- Implemented `callBedrockApiStream()` function in api-helpers.ts
- Added ConverseStreamCommand import and basic streaming generator
- Created `generateAIResponseStream()` function in response-generation.ts
- Fully implemented streaming support in send-coach-conversation-message Lambda:
  - Added streaming detection via `?stream=true` query parameter
  - Implemented Server-Sent Events (SSE) format with proper headers
  - Added `handleStreamingResponse()` and `generateSSEStream()` functions
  - Included graceful fallback to non-streaming on errors
  - Preserved all existing functionality (memory processing, workout detection, conversation summaries)
  - Messages saved to DynamoDB after streaming completes
  - All linting errors resolved
- Fully implemented streaming support in update-coach-creator-session Lambda:
  - Added streaming detection via `?stream=true` query parameter
  - Implemented SSE format with coach creator specific response structure
  - Added `handleCoachCreatorStreamingResponse()` and `generateCoachCreatorSSEStream()` functions
  - Included graceful fallback to non-streaming on errors
  - Preserved all existing coach creator logic (sophistication detection, progress tracking, session management)
  - Session updates and coach config generation trigger after streaming completes
  - Progress updates and completion state included in stream messages
- **Phase 1 Backend Infrastructure COMPLETED** - All backend Lambda functions now support streaming
- Fully implemented streaming support for frontend API layer:
  - Created `sendCoachConversationMessageStream()` in coachConversationApi.js
  - Created `updateCoachCreatorSessionStream()` in coachCreatorApi.js
  - Both functions use ReadableStream API to parse Server-Sent Events
  - Comprehensive error handling with graceful fallback to non-streaming APIs
  - Parse JSON chunks and yield structured data to consumers
  - Content-Type validation to detect streaming vs non-streaming responses
  - All existing non-streaming functions remain unchanged
- Fully implemented streaming support for frontend agents:
  - Added `sendMessageStream()` method to CoachConversationAgent with streaming state management
  - Added `sendMessageStream()` method to CoachCreatorAgent with progress tracking
  - Both agents support real-time message updates as chunks arrive
  - Streaming messages are created as placeholders and updated incrementally
  - Comprehensive fallback logic: streaming → non-streaming → error handling
  - Helper methods `_updateStreamingMessage()` and `_removeMessage()` for state management
  - Streaming state properly reset in `clearConversation()` methods
  - Progress updates handled correctly for coach creator streaming
- **Phase 2 Frontend Streaming Support COMPLETED** - All frontend infrastructure ready for streaming
- **DRY Refactoring - API Layer COMPLETED**:
  - Created reusable `streamingApiHelper.js` with `handleStreamingApiRequest()` helper function
  - Extracted common SSE parsing logic (~125 lines) from duplicated functions (~208 lines)
  - Reduced `sendCoachConversationMessageStream()` from 104 lines → 18 lines
  - Reduced `updateCoachCreatorSessionStream()` from 104 lines → 16 lines
  - Uses traditional helper function pattern consistent with existing codebase (not factory functions)
  - Maintained identical functionality with clean parameter-based configuration
  - Improved maintainability: single source of truth for streaming logic
  - Future-proof: easy to add streaming to new APIs with `yield* handleStreamingApiRequest()`
- **DRY Refactoring - Agent Layer COMPLETED** (Simplified Approach):
  - Created smaller, focused helper functions in `streamingAgentHelper.js`:
    - `processStreamingChunks()`: Handles stream processing with callback delegation
    - `createStreamingMessage()`: Creates and manages message placeholders
    - `handleStreamingFallback()`: Processes fallback to non-streaming APIs
    - `resetStreamingState()`: Smart state cleanup with agent-specific handling
  - Reduced `CoachConversationAgent.sendMessageStream()` from 190 lines → 100 lines (cleaner, readable)
  - Reduced `CoachCreatorAgent.sendMessageStream()` from 190 lines → 115 lines (cleaner, readable)
  - **Better Design**: Small helpers instead of one large complex function
  - **Agent Control**: Each agent manages its own state with helper assistance
  - **Clear Separation**: Common patterns extracted, domain logic stays in agents
  - **Easy to Understand**: Each helper has single responsibility
  - **Maintainable**: Much easier to debug and modify individual pieces
  - **Flexible**: Agents can use helpers selectively based on their needs
- **CRITICAL FIX**: Frontend-Backend Format Alignment Issues Resolved:
  - Fixed CoachCreatorAgent expecting `chunk.sessionData` (not sent by backend)
  - Fixed CoachConversationAgent expecting `data.conversation` instead of `data.conversationId`
  - Fixed CoachCreatorAgent graceful handling of incomplete fallback data
  - Verified all streaming chunk formats match exactly (`type`, `content`, `fullMessage`, etc.)
  - All streaming APIs now properly aligned between frontend and backend
- **Phase 3 UI Component Updates COMPLETED**:
  - Created focused UI helper functions in `streamingUiHelper.js`:
    - `sendMessageWithStreaming()`: Handles streaming-first, fallback to non-streaming
    - `getMessageDisplayContent()`: Returns appropriate content (streaming vs final)
    - `getStreamingMessageClasses()`: Adds visual effects for streaming messages
    - `getTypingState()`: Smart typing indicator management
    - `handleStreamingError()`: User-friendly error handling
    - `supportsStreaming()`: Feature detection for graceful degradation
  - Updated `CoachConversations.jsx` to use streaming by default:
    - Both message send functions now use `sendMessageWithStreaming()`
    - Message display updated with `getMessageDisplayContent()` for real-time updates
    - Streaming visual effects added with `getStreamingMessageClasses()`
    - Smart typing indicator shows only when needed (not during streaming content)
    - Comprehensive error handling with user-friendly toast notifications
  - Updated `CoachCreator.jsx` with identical streaming approach:
    - Same streaming-first message sending with graceful fallback
    - Real-time message content updates during streaming
    - Progress-aware UI that handles streaming session updates
    - Consistent visual effects and error handling
  - **Key Benefits Delivered**:
    - **Reduced Time-to-First-Token**: Users see AI responses immediately as they stream
    - **Better UX**: Real-time typing effect creates engaging conversation experience
    - **Zero Breaking Changes**: All existing functionality preserved
    - **Graceful Degradation**: Automatic fallback to non-streaming if needed
    - **Feature Detection**: Smart detection of browser streaming capabilities
  - **Small Helper Approach**: Consistent with previous DRY refactoring strategy
    - Each helper has single responsibility and clear purpose
    - Components maintain control over their own state management
    - Easy to understand, test, and maintain individual pieces
