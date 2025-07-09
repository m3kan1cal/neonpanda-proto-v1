import { defineFunction } from '@aws-amplify/backend';

export const getCoachConfigs = defineFunction({
  name: 'get-coach-configs',
  entry: './handler.ts',
  environment: {
    DYNAMODB_TABLE_NAME: 'CoachForge-ProtoApi-AllItems-V2'
  },
  timeoutSeconds: 30,
  memoryMB: 1024
});
