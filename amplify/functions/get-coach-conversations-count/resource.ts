import { defineFunction } from '@aws-amplify/backend';

export const getCoachConversationsCount = defineFunction({
  name: 'get-coach-conversations-count',
  entry: './handler.ts'
});
