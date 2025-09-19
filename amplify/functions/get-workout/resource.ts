
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const getWorkout = defineFunction({
  name: 'get-workout',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});