import { defineFunction } from '@aws-amplify/backend';

export const getWorkoutsCount = defineFunction({
  name: 'get-workouts-count',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  },
});