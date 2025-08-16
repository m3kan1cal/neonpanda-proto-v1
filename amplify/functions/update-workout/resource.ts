
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const updateWorkout = defineFunction({
  name: 'update-workout',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});