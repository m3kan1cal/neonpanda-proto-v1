import { defineFunction } from '@aws-amplify/backend';

export const getWorkouts = defineFunction({
  name: 'get-workouts',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  },
});