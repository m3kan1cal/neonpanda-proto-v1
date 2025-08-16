import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const createCoachConversation = defineFunction({
  name: 'create-coach-conversation',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
