import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const deleteCoachConversation = defineFunction({
  name: 'delete-coach-conversation',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
