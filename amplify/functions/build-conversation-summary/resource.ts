
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const buildConversationSummary = defineFunction({
  name: 'build-conversation-summary',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes for AI processing
  memoryMB: 2048 // More memory for AI processing
});