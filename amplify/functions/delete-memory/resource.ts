import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const deleteMemory = defineFunction({
  name: 'delete-memory',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
