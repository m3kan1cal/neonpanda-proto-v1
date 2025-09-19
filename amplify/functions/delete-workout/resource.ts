
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const deleteWorkout = defineFunction({
  name: 'delete-workout',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});