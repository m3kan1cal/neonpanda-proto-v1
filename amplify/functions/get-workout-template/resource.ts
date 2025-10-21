import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getWorkoutTemplate = defineFunction({
  name: 'get-workout-template',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
