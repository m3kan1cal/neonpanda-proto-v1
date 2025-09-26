# Create Lambda Function for SSE Streaming**

Create a new AWS Lambda function that enables Server-Sent Events (SSE) streaming for coach conversations using AWS Bedrock's ConverseStream API. This function will be accessed via Lambda Function URL (not API Gateway) to enable true streaming responses.

## **File Structure to Create**

```
amplify/functions/stream-coach-conversation/
├── handler.ts
├── resource.ts
```

## **Function Signature & Requirements**

**Base this on the existing `send-coach-conversation-message` Lambda but modify for streaming:**

### **Input Parameters** (same as send-coach-conversation-message):
- **Event Type**: `LambdaFunctionURLEvent` (NOT APIGatewayProxyEvent since this uses Function URL)
- **Path Parameters**: Extract from event.rawPath: `/users/{userId}/coaches/{coachId}/conversations/{conversationId}/stream`
- **Request Body**:
```typescript
{
  userResponse: string,           // The user's message
  messageTimestamp?: string       // When user sent the message
}
```

### **Authentication**:
- Extract JWT token from `event.headers.authorization` or `event.headers.Authorization`
- Validate token using same pattern as existing functions (JWT decode + custom:user_id claim)
- Ensure `authenticatedUserId` matches `userId` from path

### **Core Functionality**:
1. **Validate authentication & authorization** (same as existing)
2. **Load conversation context** (same as existing - use same helper functions)
3. **Store user message** in DynamoDB (same as existing)
4. **Stream AI response** using Bedrock ConverseStream API
5. **Store complete AI response** after streaming finishes

## **Streaming Implementation Details**

### **Response Format**:
```typescript
// Use awslambda.streamifyResponse wrapper
export const handler = awslambda.streamifyResponse(
  async (event: LambdaFunctionURLEvent, responseStream, context) => {
    // Set SSE headers
    responseStream.setContentType('text/event-stream');

    // Send initial SSE headers
    responseStream.write('data: {"type":"start","status":"initialized"}\n\n');

    // Stream chunks from Bedrock
    // Send completion event
    // Handle errors gracefully
  }
);
```

### **Bedrock Integration**:
- Use `bedrock.converseStream()` instead of `bedrock.converse()`
- Same model: `CLAUDE_SONNET_4_MODEL_ID`
- Same system prompt building logic as existing function
- Stream each chunk as SSE format: `data: {"type":"chunk","content":"..."}\n\n`

### **Error Handling**:
- Wrap entire handler in try-catch
- Send error events via SSE: `data: {"type":"error","message":"..."}\n\n`
- Log errors to CloudWatch but don't break stream
- Always end stream gracefully with `responseStream.end()`

## **Key Differences from send-coach-conversation-message**

1. **Event Type**: `LambdaFunctionURLEvent` instead of `APIGatewayProxyEvent`
2. **Response Type**: Use `awslambda.streamifyResponse` wrapper - no return statement
3. **Streaming Logic**: Use `for await (const chunk of stream.stream)` pattern
4. **Headers**: Set `Content-Type: text/event-stream` for SSE
5. **Response Format**: Write SSE events instead of JSON response

## **Import Structure**:
```typescript
import type { LambdaFunctionURLEvent } from 'aws-lambda';
// Import all existing helper functions from send-coach-conversation-message
// Import Bedrock client and types
// Import DynamoDB operations
```

## **SSE Event Types to Send**:
```typescript
// Start streaming
data: {"type":"start","status":"initialized"}

// Each content chunk from Bedrock
data: {"type":"chunk","content":"Hello"}

// Stream completion
data: {"type":"complete","messageId":"msg_123","status":"finished"}

// Error case
data: {"type":"error","message":"Something went wrong"}
```

## **Additional Requirements**:

1. **Path Parsing**: Extract userId, coachId, conversationId from `event.rawPath`
2. **CORS Headers**: Not needed for Lambda Function URLs (different from API Gateway)
3. **Conversation Context**: Use same conversation loading logic as existing function
4. **Memory Retrieval**: Use same Pinecone integration for coach context
5. **Logging**: Same CloudWatch logging patterns
6. **Message Storage**: Store both user message and final AI response in DynamoDB

## **Testing Considerations**:
- Function URL will be configured separately with RESPONSE_STREAM invoke mode
- Test with curl: `curl -N -H "Accept: text/event-stream" [function-url]`
- Frontend will use EventSource API to consume the stream

## **Code Organization**:
- Keep same modular structure as existing functions
- Extract common logic into shared utilities where possible
- Use same error handling patterns
- Follow same TypeScript typing conventions

---

**Generate the complete implementation focusing on:**
1. Proper streaming response handling with awslambda.streamifyResponse
2. Bedrock ConverseStream integration with proper error handling
3. SSE format compliance for frontend EventSource consumption
4. Same authentication/authorization patterns as existing functions
5. Proper conversation context loading and message storage

The goal is to create a drop-in streaming alternative to send-coach-conversation-message that provides real-time response streaming to eliminate the current 5-15 second wait times.
