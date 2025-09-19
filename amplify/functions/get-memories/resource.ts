import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const getMemories = defineFunction({
  name: 'get-memories',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
