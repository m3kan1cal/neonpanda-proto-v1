import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const logWorkoutTemplate = defineFunction({
  name: 'log-workout-template',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
