import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';

export const getCoachConversationsCount = defineFunction({
  name: 'get-coach-conversations-count',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 30,
  memoryMB: 1024
});
