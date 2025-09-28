import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const streamCoachConversation = defineFunction({
  name: 'stream-coach-conversation',
  entry: './handler.ts',
  timeoutSeconds: 300, // Same as send-coach-conversation-message for consistency
  memoryMB: 2048,     // Same as send-coach-conversation-message for consistency
  // Lambda Function URL configuration will be handled in backend.ts
  // This function will be configured with RESPONSE_STREAM invoke mode for SSE streaming
  environment: {
    // Environment variables will be set in backend.ts to match other functions
  }
});
