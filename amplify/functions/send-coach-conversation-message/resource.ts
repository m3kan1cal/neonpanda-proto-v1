
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const sendCoachConversationMessage = defineFunction({
  name: 'send-coach-conversation-message',
  entry: './handler.ts',
  timeoutSeconds: 300,
  memoryMB: 2048
});
