import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getTrainingProgram = defineFunction({
  name: 'get-training-program',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
