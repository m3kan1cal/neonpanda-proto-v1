import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const getCoachConversations = defineFunction({
  name: 'get-coach-conversations',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
