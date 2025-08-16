
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const getWorkouts = defineFunction({
  name: 'get-workouts',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});