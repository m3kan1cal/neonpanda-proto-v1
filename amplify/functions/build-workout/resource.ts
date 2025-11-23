import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';

export const buildWorkout = defineFunction({
  name: 'build-workout',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 300, // 5 minutes for AI extraction
  memoryMB: 2048 // More memory for AI processing
});
