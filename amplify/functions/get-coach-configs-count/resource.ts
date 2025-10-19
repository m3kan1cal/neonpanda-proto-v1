import { defineFunction } from '@aws-amplify/backend';

export const getCoachConfigsCount = defineFunction({
  name: 'get-coach-configs-count',
  entry: './handler.ts'
});
