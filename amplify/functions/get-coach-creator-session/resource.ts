import { defineFunction } from '@aws-amplify/backend';

export const getCoachCreatorSession = defineFunction({
  name: 'get-coach-creator-session',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  }
});
