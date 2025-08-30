import { defineFunction } from '@aws-amplify/backend';

export const createMemory = defineFunction({
  name: 'create-memory',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
});
