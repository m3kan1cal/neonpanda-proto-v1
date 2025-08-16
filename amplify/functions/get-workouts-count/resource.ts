
import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';


export const getWorkoutsCount = defineFunction({
  name: 'get-workouts-count',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 1024
});