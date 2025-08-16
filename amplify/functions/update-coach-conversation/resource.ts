import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const updateCoachConversation = defineFunction({
  name: 'update-coach-conversation',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});