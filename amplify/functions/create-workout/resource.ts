import 'dotenv/config';
import { defineFunction, secret } from '@aws-amplify/backend';
import { NODEJS_RUNTIME } from '../libs/configs';

export const createWorkout = defineFunction({
  name: 'create-workout',
  entry: './handler.ts',
  runtime: NODEJS_RUNTIME,
  timeoutSeconds: 30,
  memoryMB: 1024,
});
