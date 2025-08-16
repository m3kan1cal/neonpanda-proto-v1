
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const getConversationsCount = defineFunction({
  name: 'get-conversations-count',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});