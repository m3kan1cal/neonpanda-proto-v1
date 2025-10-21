import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const updateTrainingProgram = defineFunction({
  name: 'update-training-program',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
