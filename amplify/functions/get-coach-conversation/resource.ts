import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const getCoachConversation = defineFunction({
  name: 'get-coach-conversation',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
