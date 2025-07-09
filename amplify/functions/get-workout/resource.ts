import { defineFunction } from '@aws-amplify/backend';

export const getWorkout = defineFunction({
  name: 'get-workout',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  },
});