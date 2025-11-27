import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';

export const buildProgram = defineFunction({
  name: 'build-program',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 900, // 15 minutes for AI generation (program structure + all phase workouts)
  memoryMB: 2048 // More memory for AI processing
});
