import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const createTrainingProgram = defineFunction({
  name: 'create-training-program',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
