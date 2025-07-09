import { defineFunction } from '@aws-amplify/backend';

export const updateWorkout = defineFunction({
  name: 'update-workout',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  },
});