import 'dotenv/config';
import { defineFunction } from '@aws-amplify/backend';

export const deleteWorkout = defineFunction({
  name: 'delete-workout',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'CoachForge-ProtoApi-AllItems-V2'
  },
  timeoutSeconds: 30,
  memoryMB: 1024
});