import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const buildTrainingProgram = defineFunction({
  name: 'build-training-program',
  entry: './handler.ts',
  timeoutSeconds: 3600, // 60 minutes for AI generation (program structure + all phase workouts)
  memoryMB: 2048 // More memory for AI processing
});
