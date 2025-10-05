import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const createCoachConfig = defineFunction({
  name: 'create-coach-config',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
});

