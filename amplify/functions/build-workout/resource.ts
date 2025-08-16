import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const buildWorkout = defineFunction({
  name: 'build-workout',
  entry: './handler.ts',
  timeoutSeconds: 300, // 5 minutes for AI extraction
  memoryMB: 2048 // More memory for AI processing
});
