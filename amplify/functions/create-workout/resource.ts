import 'dotenv/config';
import { defineFunction, secret } from '@aws-amplify/backend';

export const createWorkout = defineFunction({
  name: 'create-workout',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024,
});
