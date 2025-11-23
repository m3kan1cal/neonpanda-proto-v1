
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';


export const buildConversationSummary = defineFunction({
  name: 'build-conversation-summary',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 300, // 5 minutes for AI processing
  memoryMB: 2048 // More memory for AI processing
});