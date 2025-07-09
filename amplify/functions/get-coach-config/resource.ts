import { defineFunction } from '@aws-amplify/backend';

export const getCoachConfig = defineFunction({
  name: 'get-coach-config',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  },
  timeoutSeconds: 30,
  memoryMB: 1024
});
