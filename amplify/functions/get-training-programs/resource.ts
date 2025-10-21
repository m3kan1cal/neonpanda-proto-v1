import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const getTrainingPrograms = defineFunction({
  name: 'get-training-programs',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});
